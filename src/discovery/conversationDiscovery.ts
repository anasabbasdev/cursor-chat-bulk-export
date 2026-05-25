/**
 * Full conversation discovery for a workspace — safe for multi-GB globalStorage.
 */

import * as path from 'path';
import type { ComposerHeader } from '../storage/cursorDiskKV';
import {
  countComposerDataKeys,
  filterComposersByWorkspace,
  hasCursorDiskKV,
  loadBubblesForComposer,
  loadComposerHeaderById,
  openGlobalStorageDb,
  readComposerHeadersForWorkspace,
  discoverComposersExhaustive,
} from '../storage/cursorDiskKV';
import type { DbBackend } from '../storage/dbBackend';
import { closeDatabaseBackend, openDatabaseBackend } from '../storage/sqliteReader';
import {
  discoverGlobalItemTableSessions,
  readWorkspaceChatSessionIndex,
  extractComposerIdsFromPaneKeys,
} from '../chat/itemTableDiscovery';
import {
  scanWorkspaceStorage,
  findMatchingEntries,
  selectPrimaryWorkspaceStorageEntry,
} from '../storage/workspaceScanner';
import { composerToConversation } from '../chat/chatParser';
import { normaliseWsPath } from '../workspace/workspaceMatch';
import type { Conversation, Logger } from '../types';
import { scanDatabaseLight } from './lightDbScan';
import { dedupeConversations } from './dedupeConversations';
import type { DiscoveryResult, RawCandidate, DiscoveryReportData } from './types';
import { buildMismatchExplanation } from './discoveryReport';

export type DiscoveryMode = 'export' | 'diagnostic';

export interface DiscoverOptions {
  workspacePath: string;
  globalStoragePath: string | null;
  wsStoragePath: string | null;
  logger: Logger;
  includePossibleByFolderName?: boolean;
  mode?: DiscoveryMode;
  /** Export only: list conversations fast, load bubble text after user picks */
  deferBubbleLoad?: boolean;
}

export async function discoverConversationsForWorkspace(
  opts: DiscoverOptions
): Promise<DiscoveryResult> {
  const includePossible = opts.includePossibleByFolderName !== false;
  const isDiagnostic = opts.mode === 'diagnostic';
  const deferBubbleLoad = opts.deferBubbleLoad === true && !isDiagnostic;
  const logger = opts.logger;
  const workspacePath = opts.workspacePath;
  const normalizedPath = normaliseWsPath(workspacePath);
  const matchOpts = { includeByFolderName: includePossible };

  let workspaceHashes: string[] = [];
  const dbScans = [];
  let matchingWorkspaceEntries: ReturnType<typeof findMatchingEntries> = [];

  if (opts.wsStoragePath) {
    const entries = scanWorkspaceStorage(opts.wsStoragePath, logger);
    matchingWorkspaceEntries = findMatchingEntries(entries, workspacePath, logger, matchOpts);
    workspaceHashes = matchingWorkspaceEntries.map(e => e.hash);

    for (const entry of matchingWorkspaceEntries) {
      if (entry.dbPath) {
        dbScans.push(await scanDatabaseLight(entry.dbPath, logger));
      }
    }
  }

  let globalDb: DbBackend | null = null;
  let totalComposerData = 0;
  let allComposers: ComposerHeader[] = [];
  const unparsedRelevant: DiscoveryReportData['unparsedRelevant'] = [];
  const candidates: RawCandidate[] = [];
  const composerIdsFromIndex = new Set<string>();
  const canonicalSessionIds = new Set<string>();
  const conversationsFromItemTable: Conversation[] = [];
  let usedSqlPrefilter = false;
  const primaryEntry = selectPrimaryWorkspaceStorageEntry(
    matchingWorkspaceEntries,
    workspacePath,
    logger
  );

  if (primaryEntry?.dbPath) {
    const wsDb = await openDatabaseBackend(primaryEntry.dbPath, logger);
    if (wsDb) {
      try {
        // 1. Extract the real composer IDs from the panel-to-composer mapping
        //    (workbench.panel.composerChatViewPane.<tabId> → workbench.panel.aichat.view.<composerId>)
        const paneComposerIds = extractComposerIdsFromPaneKeys(wsDb, logger);
        for (const id of paneComposerIds) {
          canonicalSessionIds.add(id);
          composerIdsFromIndex.add(id);
        }

        // 2. Also read ChatSessionStore.index for any additional IDs
        const { conversations: indexConvs, sessionIds } = readWorkspaceChatSessionIndex(
          wsDb,
          primaryEntry.dbPath,
          logger
        );
        conversationsFromItemTable.push(...indexConvs);
        for (const id of sessionIds) {
          canonicalSessionIds.add(id);
          composerIdsFromIndex.add(id);
        }
        for (const conv of indexConvs) {
          candidates.push(
            makeCandidateFromConversation(
              conv,
              primaryEntry.dbPath!,
              'ItemTable',
              'chat.ChatSessionStore.index',
              false
            )
          );
        }

        logger.log(
          `Workspace panel IDs: ${paneComposerIds.size} from panel keys, ` +
          `${sessionIds.size} from session index, ` +
          `${canonicalSessionIds.size} total canonical IDs`
        );
      } catch (err) {
        logger.warn(`Primary workspace ItemTable scan failed: ${String(err)}`);
      } finally {
        closeDatabaseBackend(wsDb, logger);
      }
    }
  }

  if (opts.globalStoragePath) {
    const globalDbPath = path.join(opts.globalStoragePath, 'state.vscdb');
    dbScans.unshift(await scanDatabaseLight(globalDbPath, logger));

    globalDb = await openGlobalStorageDb(opts.globalStoragePath, logger);
    if (globalDb) {
      try {
        if (hasCursorDiskKV(globalDb, logger)) {
          const loaded = readComposerHeadersForWorkspace(
            globalDb,
            workspacePath,
            workspaceHashes,
            logger
          );
          totalComposerData = loaded.totalInDb;
          allComposers = loaded.headers;
          usedSqlPrefilter = loaded.usedSqlPrefilter;

          const skipExhaustive = canonicalSessionIds.size >= 5;
          if (
            !isDiagnostic &&
            !skipExhaustive &&
            totalComposerData > loaded.headers.length + 20
          ) {
            allComposers = discoverComposersExhaustive(
              globalDb,
              workspacePath,
              workspaceHashes,
              logger,
              includePossible,
              allComposers
            );
          } else if (skipExhaustive) {
            logger.log(
              `Skipping batch composer scan (${canonicalSessionIds.size} sessions in workspace index)`
            );
          }

          logger.log(
            `composerData: ${totalComposerData} total in DB, ${allComposers.length} matched for workspace`
          );
        }

        const globalIndexConvs = discoverGlobalItemTableSessions(
          globalDb,
          globalDbPath,
          logger
        );
        for (const c of globalIndexConvs) {
          canonicalSessionIds.add(c.id);
        }

      } catch (err) {
        logger.error('globalStorage discovery error', err);
      }
    }
  }

  if (globalDb && composerIdsFromIndex.size > 0) {
    const knownIds = new Set(allComposers.map(c => c.composerId));
    let added = 0;
    // Load ALL canonical IDs directly by ID — these may have no workspaceIdentifier
    // but are confirmed by the workspace panel mapping (composerChatViewPane keys)
    const idsToLoad = [...canonicalSessionIds].filter(id => !knownIds.has(id));
    logger.log(`Loading ${idsToLoad.length} composer(s) by canonical ID from workspace panel`);
    for (const id of idsToLoad.slice(0, 150)) {
      const h = loadComposerHeaderById(globalDb, id, logger);
      if (h) {
        allComposers.push(h);
        knownIds.add(id);
        added++;
      }
    }
    if (added > 0) {
      logger.log(`Added ${added} composer(s) by canonical ID lookup`);
    }
  }

  const strictMatched = filterComposersByWorkspace(
    allComposers,
    workspacePath,
    logger,
    workspaceHashes,
    includePossible
  );

  // All canonical IDs (from pane mapping) are trusted workspace conversations
  const matchedComposers = mergeComposersForWorkspace(
    strictMatched,
    allComposers,
    canonicalSessionIds,
    usedSqlPrefilter,
    logger
  );

  const conversationsFromComposers: Conversation[] = [];
  const globalDbPath = opts.globalStoragePath
    ? path.join(opts.globalStoragePath, 'state.vscdb')
    : '';

  if (globalDb) {
    const maxLoads = isDiagnostic ? 0 : matchedComposers.length;

    for (const composer of matchedComposers) {
      candidates.push({
        id: composer.composerId,
        dbPath: globalDbPath,
        tableName: 'cursorDiskKV',
        key: `composerData:${composer.composerId}`,
        valueSizeBytes: 0,
        title: composer.name,
        messageCountEstimate: composer.headers.length,
        bubbleCountEstimate: composer.headers.length,
        parsed: !isDiagnostic,
        parseReason: isDiagnostic ? 'diagnostic (headers only)' : undefined,
        source: 'cursorDiskKV',
        composerId: composer.composerId,
      });

      if (isDiagnostic || deferBubbleLoad) {
        conversationsFromComposers.push(stubConversationFromComposer(composer));
        continue;
      }

      const bubbleIds = composer.headers.map(h => h.bubbleId);
      const bubbles = loadBubblesForComposer(globalDb, composer.composerId, logger, bubbleIds);
      const conv = composerToConversation(composer, bubbles, logger, {
        includeNonRenderable: true,
      });
      if (conv.messages.length > 0) {
        conversationsFromComposers.push(conv);
        updateCandidateParsed(candidates, composer.composerId, conv, globalDbPath);
      }
    }

    const enrichedItemTable = enrichItemTableFromGlobal(
      conversationsFromItemTable,
      globalDb,
      logger,
      isDiagnostic || deferBubbleLoad
    );
    conversationsFromComposers.push(...enrichedItemTable);

    closeDatabaseBackend(globalDb, logger);
    globalDb = null;

    if (deferBubbleLoad) {
      logger.log(
        `Deferred bubble load: ${conversationsFromComposers.length} conversation stub(s) — messages load after you pick chats to export`
      );
    } else if (!isDiagnostic && maxLoads > 0) {
      logger.log(`Loaded bubble content for ${conversationsFromComposers.length} conversations`);
    }
  } else if (conversationsFromItemTable.length > 0) {
    conversationsFromComposers.push(...conversationsFromItemTable);
  }

  const scoped = filterConversationsToWorkspaceScope(
    conversationsFromComposers,
    canonicalSessionIds,
    new Set(matchedComposers.map(c => c.composerId)),
    logger
  );

  const beforeDedupe = [...scoped];
  const { conversations: afterDedupe, removed: dedupeRemoved } = dedupeConversations(beforeDedupe);

  const suspiciousKeyTotal = dbScans.reduce((s, d) => s + d.suspiciousKeys.length, 0);

  const report: DiscoveryReportData = {
    generatedAt: new Date().toISOString(),
    workspacePath,
    normalizedWorkspacePath: normalizedPath,
    workspaceStorageHashes: workspaceHashes,
    includePossibleByFolderName: includePossible,
    globalStorageScanned: !!opts.globalStoragePath,
    globalStoragePath: opts.globalStoragePath,
    dbScans,
    totalComposerDataInGlobal: totalComposerData,
    composerDataAfterWorkspaceFilter: matchedComposers.length,
    suspiciousKeyTotal,
    candidatesFound: candidates.length,
    parsedConversationCount: beforeDedupe.length,
    conversationsBeforeDedupe: beforeDedupe.length,
    conversationsAfterDedupe: afterDedupe.length,
    dedupeRemoved,
    unparsedRelevant,
    ...buildMismatchExplanation({
      uiCountHint: null,
      totalComposerData,
      matchedComposers: matchedComposers.length,
      allComposersParsed: allComposers.length,
      candidates: candidates.length,
      beforeDedupe: beforeDedupe.length,
      afterDedupe: afterDedupe.length,
      dedupeRemoved: dedupeRemoved.length,
    }),
  };

  logger.log(`Discovery summary: ${report.mismatchExplanation}`);

  return {
    report,
    candidates,
    composers: matchedComposers,
    conversations: afterDedupe,
    allComposersInGlobal: allComposers,
    matchedComposers,
  };
}

function stubConversationFromComposer(composer: ComposerHeader): Conversation {
  return {
    id: composer.composerId,
    title: composer.name,
    createdAt: composer.createdAt ? new Date(composer.createdAt).toISOString() : null,
    updatedAt: composer.lastUpdatedAt ? new Date(composer.lastUpdatedAt).toISOString() : null,
    messages: [],
    storagePath: 'globalStorage/cursorDiskKV',
    sessionType: composer.unifiedMode ?? 'composer',
    estimatedMessageCount: composer.messageCount || composer.headers.length,
  };
}

/**
 * Loads message content for conversations selected in the picker (deferred export).
 */
export async function hydrateConversationsForExport(
  conversations: Conversation[],
  composers: ComposerHeader[],
  globalStoragePath: string,
  logger: Logger,
  onProgress?: (current: number, total: number, label: string) => void
): Promise<Conversation[]> {
  const byId = new Map(composers.map(c => [c.composerId, c]));
  const globalDb = await openGlobalStorageDb(globalStoragePath, logger);
  if (!globalDb) {
    logger.warn('hydrateConversationsForExport: could not open globalStorage');
    return conversations;
  }

  const hydrated: Conversation[] = [];
  try {
    for (let i = 0; i < conversations.length; i++) {
      const stub = conversations[i];
      const composer = byId.get(stub.id);
      if (!composer) {
        logger.warn(`No composer header for ${stub.id}, keeping stub`);
        hydrated.push(stub);
        continue;
      }

      const t0 = Date.now();
      const bubbleIds = composer.headers.map(h => h.bubbleId);
      const bubbles = loadBubblesForComposer(globalDb, composer.composerId, logger, bubbleIds);
      const conv = composerToConversation(composer, bubbles, logger, {
        includeNonRenderable: true,
      });
      const label = composer.name ?? stub.id;
      onProgress?.(i + 1, conversations.length, label);
      logger.log(
        `[${i + 1}/${conversations.length}] "${label}" — ` +
          `${conv.messages.length} messages in ${Date.now() - t0}ms`
      );
      hydrated.push(conv.messages.length > 0 ? conv : stub);
    }
  } finally {
    closeDatabaseBackend(globalDb, logger);
  }

  return hydrated;
}

function makeCandidateFromConversation(
  conv: Conversation,
  dbPath: string,
  tableName: string,
  key: string,
  parsed: boolean
): RawCandidate {
  return {
    id: conv.id,
    dbPath,
    tableName,
    key,
    valueSizeBytes: 0,
    title: conv.title,
    messageCountEstimate: conv.messages.length,
    bubbleCountEstimate: conv.messages.length,
    parsed,
    source: tableName,
    composerId: conv.id,
  };
}

function updateCandidateParsed(
  candidates: RawCandidate[],
  composerId: string,
  conv: Conversation,
  dbPath: string
): void {
  const idx = candidates.findIndex(c => c.composerId === composerId);
  if (idx >= 0) {
    candidates[idx] = makeCandidateFromConversation(
      conv,
      dbPath,
      'cursorDiskKV',
      `composerData:${composerId}`,
      true
    );
  }
}

/**
 * Fills ItemTable session stubs from global composerData + bubbles when ids match.
 */
function mergeComposersForWorkspace(
  strictMatched: ComposerHeader[],
  allComposers: ComposerHeader[],
  canonicalSessionIds: Set<string>,
  usedSqlPrefilter: boolean,
  logger: Logger
): ComposerHeader[] {
  const byId = new Map<string, ComposerHeader>();
  for (const c of strictMatched) {
    byId.set(c.composerId, c);
  }

  if (canonicalSessionIds.size > 0) {
    for (const c of allComposers) {
      if (canonicalSessionIds.has(c.composerId)) {
        byId.set(c.composerId, c);
      }
    }
  } else if (usedSqlPrefilter && allComposers.length > strictMatched.length) {
    logger.log(
      `No session index — using ${allComposers.length} SQL-scoped composers (strict: ${strictMatched.length})`
    );
    for (const c of allComposers) {
      byId.set(c.composerId, c);
    }
  }

  const merged = [...byId.values()];
  logger.log(
    `Workspace composers for export: ${merged.length} (strict ${strictMatched.length}, canonical ${canonicalSessionIds.size})`
  );
  return merged;
}

function filterConversationsToWorkspaceScope(
  conversations: Conversation[],
  canonicalSessionIds: Set<string>,
  matchedComposerIds: Set<string>,
  logger: Logger
): Conversation[] {
  if (canonicalSessionIds.size === 0) {
    const kept = conversations.filter(
      c => matchedComposerIds.has(c.id) || c.messages.length > 0
    );
    logger.log(`Scope filter (no index): ${kept.length}/${conversations.length}`);
    return kept;
  }

  const kept = conversations.filter(
    c => canonicalSessionIds.has(c.id) || matchedComposerIds.has(c.id)
  );
  logger.log(
    `Scope filter: ${kept.length}/${conversations.length} (index ${canonicalSessionIds.size}, composers ${matchedComposerIds.size})`
  );
  return kept;
}

function enrichItemTableFromGlobal(
  itemConvs: Conversation[],
  globalDb: DbBackend | null,
  logger: Logger,
  isDiagnostic: boolean
): Conversation[] {
  if (!globalDb || itemConvs.length === 0) {
    return itemConvs;
  }

  const out: Conversation[] = [];
  let enriched = 0;

  for (const stub of itemConvs) {
    if (stub.messages.length > 0) {
      out.push(stub);
      continue;
    }

    const header = loadComposerHeaderById(globalDb, stub.id, logger);
    if (!header) {
      out.push(stub);
      continue;
    }

    if (isDiagnostic) {
      out.push(stubConversationFromComposer(header));
      enriched++;
      continue;
    }

    const bubbleIds = header.headers.map(h => h.bubbleId);
    const bubbles = loadBubblesForComposer(globalDb, stub.id, logger, bubbleIds);
    const conv = composerToConversation(header, bubbles, logger, {
      includeNonRenderable: true,
    });
    if (conv.messages.length > 0) {
      out.push(conv);
      enriched++;
    } else {
      out.push(stubConversationFromComposer(header));
      enriched++;
    }
  }

  if (enriched > 0) {
    logger.log(`Enriched ${enriched}/${itemConvs.length} ItemTable session(s) from globalStorage`);
  }
  return out;
}
