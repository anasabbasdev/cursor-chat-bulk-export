/**
 * VS Code command handlers and QuickPick UI.
 *
 * Registers four commands:
 *   cursorChatExport.exportCurrentWorkspace
 *   cursorChatExport.exportAllWorkspaces
 *   cursorChatExport.openExportFolder
 *   cursorChatExport.diagnose
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { getGlobalStoragePath, getWorkspaceStoragePath } from '../storage/cursorStorage';
import { scanWorkspaceStorage, findMatchingEntries } from '../storage/workspaceScanner';
import {
  openGlobalStorageDb,
  hasCursorDiskKV,
  readAllComposerHeaders,
  loadBubblesForComposer,
  filterComposersByWorkspace,
  type ComposerHeader,
} from '../storage/cursorDiskKV';
import {
  discoverConversationsForWorkspace,
  hydrateConversationsForExport,
} from '../discovery/conversationDiscovery';
import type { DiscoveryResult, RawCandidate } from '../discovery/types';
import {
  buildMismatchExplanation,
  logDiscoveryReportToChannel,
  writeDiscoveryReportFile,
} from '../discovery/discoveryReport';
import type { DbBackend } from '../storage/dbBackend';
import { isTooLargeForSqlJs, getDatabaseSizeBytes, formatSizeMb } from '../storage/dbBackend';
import { findSqlite3Executable } from '../storage/sqliteCliReader';
import {
  openDatabaseBackend,
  closeDatabaseBackend,
  listTablesBackend,
  readItemTableBackend,
} from '../storage/sqliteReader';
import type { WorkspaceStorageEntry } from '../types';
import { filterChatRecords } from '../chat/schemaDiscovery';
import {
  parseConversations as parseLegacyConversations,
} from '../chat/legacyParser';
import { composerToConversation, inferConversationTitle } from '../chat/chatParser';
import { conversationToMarkdown, writeMarkdownFile } from '../export/markdownExporter';
import {
  buildConversationFilename,
  makeUniqueFilename,
} from '../export/filenameSanitizer';
import { writeIndexFile } from '../export/indexGenerator';

import type {
  Conversation,
  ExportResult,
  ExportOptions,
  Logger,
} from '../types';
import { defaultExportOptions, fullExportOptions } from '../types';
import { filterMessages } from '../export/exportFilter';

const EXPORT_FOLDER = '.cursor-chat-export';

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerCommands(context: vscode.ExtensionContext, logger: Logger): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('cursorChatExport.exportCurrentWorkspace', () =>
      cmdExportCurrentWorkspace(logger)
    ),
    vscode.commands.registerCommand('cursorChatExport.exportAllWorkspaces', () =>
      cmdExportAllWorkspaces(logger)
    ),
    vscode.commands.registerCommand('cursorChatExport.openExportFolder', () =>
      cmdOpenExportFolder(logger)
    ),
    vscode.commands.registerCommand('cursorChatExport.diagnose', () =>
      cmdDiagnose(logger)
    ),
    vscode.commands.registerCommand('cursorChatExport.diagnoseDiscovery', () =>
      cmdDiagnoseDiscovery(logger)
    ),
    vscode.commands.registerCommand('cursorChatExport.rawDiscovery', () =>
      cmdRawDiscovery(logger)
    )
  );

  logger.log('Commands registered.');
}

// ---------------------------------------------------------------------------
// Command: Export Current Workspace Chats
// ---------------------------------------------------------------------------

async function cmdExportCurrentWorkspace(logger: Logger): Promise<void> {
  logger.show();
  logger.log('=== Export Current Workspace Chats ===');

  const workspacePath = getActiveWorkspacePath();
  if (!workspacePath) {
    vscode.window.showErrorMessage(
      'Cursor Chat Bulk Export: No workspace folder is currently open.'
    );
    return;
  }
  logger.log(`Active workspace: ${workspacePath}`);

  const globalStoragePath = getGlobalStoragePath(logger);
  if (!globalStoragePath) {
    vscode.window.showErrorMessage(
      'Cursor Chat Bulk Export: Could not locate Cursor globalStorage directory. ' +
        'Make sure you are running this extension inside Cursor IDE.'
    );
    return;
  }

  let conversations: Conversation[] = [];
  let matchedComposers: ComposerHeader[] = [];

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Scanning Cursor storage…',
      cancellable: false,
    },
    async () => {
      const loaded = await loadConversationsForWorkspace(
        globalStoragePath,
        workspacePath,
        logger,
        true
      );
      conversations = loaded.conversations;
      matchedComposers = loaded.composers;
    }
  );

  if (conversations.length === 0) {
    const globalDbPath = path.join(
      getGlobalStoragePath(logger) ?? '',
      'state.vscdb'
    );
    const bytes = fs.existsSync(globalDbPath) ? getDatabaseSizeBytes(globalDbPath) : 0;
    let hint =
      'Check the "Cursor Chat Bulk Export" Output Channel for diagnostics.';
    if (isTooLargeForSqlJs(bytes) && !findSqlite3Executable(logger)) {
      hint =
        `Your Cursor globalStorage database is ${formatSizeMb(bytes)} MB (over the 2 GB limit). ` +
        'Install SQLite CLI: winget install SQLite.SQLite — or download sqlite3.exe from sqlite.org ' +
        'and place it in the extension folder (see README). Then retry export.';
    }
    vscode.window.showInformationMessage(
      `Cursor Chat Bulk Export: No conversations found for the current workspace.\n${hint}`
    );
    logger.show();
    return;
  }

  const selected = await showConversationPicker(conversations);
  if (!selected || selected.length === 0) {
    return;
  }

  const exportOptions = await showExportModePicker();
  if (!exportOptions) {
    return;
  }

  let toExport = selected;
  const needsHydration = selected.some(c => c.messages.length === 0);
  if (needsHydration) {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Loading chat messages…',
        cancellable: false,
      },
      async progress => {
        const total = selected.length;
        toExport = await hydrateConversationsForExport(
          selected,
          matchedComposers,
          globalStoragePath,
          logger,
          (current, tot, label) => {
            progress.report({
              message: `${current}/${tot}: ${label}`,
              increment: 100 / tot,
            });
          }
        );
        toExport = toExport.filter(c => c.messages.length > 0);
      }
    );
    if (toExport.length === 0) {
      vscode.window.showWarningMessage(
        'Cursor Chat Bulk Export: No message content could be loaded for the selected chats.'
      );
      logger.show();
      return;
    }
    if (toExport.length < selected.length) {
      vscode.window.showWarningMessage(
        `Loaded ${toExport.length}/${selected.length} conversations (others have no local message data).`
      );
    }
  }

  const outputDir = path.join(workspacePath, EXPORT_FOLDER);
  await runExport(toExport, workspacePath, outputDir, exportOptions, logger);
}

// ---------------------------------------------------------------------------
// Command: Export All Detected Workspace Chats
// ---------------------------------------------------------------------------

async function cmdExportAllWorkspaces(logger: Logger): Promise<void> {
  logger.show();
  logger.log('=== Export All Detected Workspace Chats ===');

  const globalStoragePath = getGlobalStoragePath(logger);
  if (!globalStoragePath) {
    vscode.window.showErrorMessage(
      'Cursor Chat Bulk Export: Could not locate Cursor globalStorage directory.'
    );
    return;
  }

  let allComposers: ComposerHeader[] = [];

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Scanning all Cursor chats…',
      cancellable: false,
    },
    async () => {
      const db = await openGlobalStorageDb(globalStoragePath, logger);
      if (!db) {
        return;
      }
      try {
        allComposers = readAllComposerHeaders(db, logger);
      } finally {
        closeDatabaseBackend(db, logger);
      }
    }
  );

  if (allComposers.length === 0) {
    vscode.window.showWarningMessage(
      'Cursor Chat Bulk Export: No conversations found in Cursor storage.'
    );
    return;
  }

  // Group by workspace
  const workspaceMap = new Map<string, { label: string; composers: ComposerHeader[] }>();
  for (const c of allComposers) {
    const wsKey = c.workspaceFsPath ?? c.workspaceExternalUri ?? '(unknown workspace)';
    let label = wsKey;
    if (c.workspaceFsPath) {
      label = path.basename(c.workspaceFsPath) + '  ' + c.workspaceFsPath;
    }
    if (!workspaceMap.has(wsKey)) {
      workspaceMap.set(wsKey, { label, composers: [] });
    }
    workspaceMap.get(wsKey)!.composers.push(c);
  }

  const workspaceItems = [...workspaceMap.entries()].map(([key, { label, composers }]) => ({
    label: path.basename(key === '(unknown workspace)' ? 'Unknown' : key),
    description: key,
    detail: `${composers.length} conversation(s)`,
    key,
  }));

  const pickedWs = await vscode.window.showQuickPick(workspaceItems, {
    title: `Select Workspace  (${workspaceItems.length} workspaces found)`,
    placeHolder: 'Choose a workspace to export chats from…',
  });
  if (!pickedWs) {
    return;
  }

  const targetComposers = workspaceMap.get(pickedWs.key)!.composers;

  let conversations: Conversation[] = [];
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Loading conversations…',
      cancellable: false,
    },
    async () => {
      conversations = await loadConversationsFromComposers(
        globalStoragePath,
        targetComposers,
        logger
      );
    }
  );

  if (conversations.length === 0) {
    vscode.window.showInformationMessage(
      `Cursor Chat Bulk Export: No conversation content found for "${pickedWs.label}".`
    );
    return;
  }

  const selected = await showConversationPicker(conversations);
  if (!selected || selected.length === 0) {
    return;
  }

  const exportOptions = await showExportModePicker();
  if (!exportOptions) {
    return;
  }

  const activeWs = getActiveWorkspacePath();
  const outputDir = activeWs
    ? path.join(activeWs, EXPORT_FOLDER)
    : path.join(pickedWs.key, EXPORT_FOLDER);

  await runExport(selected, pickedWs.key, outputDir, exportOptions, logger);
}

// ---------------------------------------------------------------------------
// Command: Open Export Folder
// ---------------------------------------------------------------------------

async function cmdOpenExportFolder(logger: Logger): Promise<void> {
  const workspacePath = getActiveWorkspacePath();
  if (!workspacePath) {
    vscode.window.showErrorMessage(
      'Cursor Chat Bulk Export: No workspace folder is currently open.'
    );
    return;
  }

  const exportDir = path.join(workspacePath, EXPORT_FOLDER);
  if (!fs.existsSync(exportDir)) {
    const create = await vscode.window.showInformationMessage(
      `Export folder does not exist yet: ${exportDir}`,
      'Create it',
      'Cancel'
    );
    if (create === 'Create it') {
      fs.mkdirSync(exportDir, { recursive: true });
    } else {
      return;
    }
  }

  await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(exportDir));
}

// ---------------------------------------------------------------------------
// Command: Diagnose
// ---------------------------------------------------------------------------

async function cmdDiagnose(logger: Logger): Promise<void> {
  logger.show();
  logger.log('=== Diagnose Current Workspace Chat Schema ===');

  const workspacePath = getActiveWorkspacePath();
  if (!workspacePath) {
    logger.warn('No workspace folder is currently open.');
    vscode.window.showWarningMessage('Cursor Chat Bulk Export: Open a workspace folder first.');
    return;
  }
  logger.log(`Active workspace: ${workspacePath}`);

  const globalStoragePath = getGlobalStoragePath(logger);
  if (!globalStoragePath) {
    logger.error('Could not locate globalStorage directory.');
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Diagnosing Cursor storage…',
      cancellable: false,
    },
    async () => {
      const db = await openGlobalStorageDb(globalStoragePath, logger);
      if (!db) {
        logger.error('Could not open globalStorage DB.');
        return;
      }

      try {
        const tables = listTablesBackend(db, logger);
        logger.log(`Tables: ${tables.map(t => t.name).join(', ')}`);

        const hasDKV = hasCursorDiskKV(db, logger);
        logger.log(`Has cursorDiskKV: ${hasDKV}`);

        if (hasDKV) {
          const wsStoragePath = getWorkspaceStoragePath(logger);
          let wsHashes: string[] = [];
          if (wsStoragePath) {
            const entries = scanWorkspaceStorage(wsStoragePath, logger);
            const matchingEntries = findMatchingEntries(entries, workspacePath, logger, {
              includeByFolderName: await getIncludePossibleMatches(),
            });
            wsHashes = matchingEntries.map(e => e.hash);
            logger.log(`workspaceStorage hashes: ${wsHashes.join(', ') || '(none found)'}`);
          }

          const allComposers = readAllComposerHeaders(db, logger);
          logger.log(`\nTotal composers in cursorDiskKV: ${allComposers.length}`);

          const matching = filterComposersByWorkspace(allComposers, workspacePath, logger, wsHashes);
          logger.log(`Composers matching current workspace: ${matching.length}`);

          if (matching.length === 0) {
            logger.warn('No matching composers. Listing all workspace paths found:');
            const paths = new Set(allComposers.map(c => c.workspaceFsPath ?? c.workspaceExternalUri ?? '(none)'));
            for (const p of paths) {
              logger.log(`  ${p}`);
            }
          }

          for (const comp of matching.slice(0, 5)) {
            logger.log(`\nComposer: "${comp.name}" (${comp.composerId})`);
            logger.log(`  isNAL: ${comp.isNAL}`);
            logger.log(`  Headers: ${comp.headers.length}`);
            logger.log(`  Mode: ${comp.unifiedMode}`);

            // Sample first 20 messages
            const bubbles = loadBubblesForComposer(db, comp.composerId, logger);
            logger.log(`  Bubble records loaded: ${bubbles.size}`);

            let sampleCount = 0;
            for (const header of comp.headers.slice(0, 40)) {
              if (!header.isRenderable) {
                continue;
              }
              const bubble = bubbles.get(header.bubbleId);
              const roleStr = header.type === 1 ? 'USER' : header.type === 2 ? 'ASSISTANT' : `TYPE(${header.type})`;
              const textPreview = bubble?.text?.trim().slice(0, 60) ?? '(no bubble record)';
              logger.log(`  [${roleStr}] ${header.bubbleId} — "${textPreview}"`);
              if (++sampleCount >= 20) {
                break;
              }
            }
          }
        } else {
          // Legacy: check ItemTable
          logger.log('Falling back to ItemTable scan...');
          const rows = readItemTableBackend(db, logger, 'ItemTable');
          logger.log(`ItemTable rows: ${rows.length}`);
          const chatRows = filterChatRecords(rows, logger);
          logger.log(`Chat-related rows: ${chatRows.length}`);
          for (const r of chatRows) {
            logger.log(`  Key: "${r.key}"`);
          }
        }
      } finally {
        closeDatabaseBackend(db, logger);
      }
    }
  );

  vscode.window.showInformationMessage(
    'Cursor Chat Bulk Export: Diagnosis complete — see Output Channel for details.',
    'Show Output'
  ).then(action => {
    if (action === 'Show Output') {
      logger.show();
    }
  });
}

// ---------------------------------------------------------------------------
// Command: Diagnose Conversation Discovery
// ---------------------------------------------------------------------------

async function cmdDiagnoseDiscovery(logger: Logger): Promise<void> {
  logger.show();
  logger.log('=== Diagnose Conversation Discovery ===');

  const workspacePath = getActiveWorkspacePath();
  if (!workspacePath) {
    vscode.window.showWarningMessage('Cursor Chat Bulk Export: Open a workspace folder first.');
    return;
  }

  const globalStoragePath = getGlobalStoragePath(logger);
  const wsStoragePath = getWorkspaceStoragePath(logger);
  const includePossible = await getIncludePossibleMatches();

  const uiCountStr = await vscode.window.showInputBox({
    title: 'Cursor UI conversation count (optional)',
    prompt: 'How many conversations does Cursor show for this workspace? (e.g. 47) — leave empty to skip',
    placeHolder: '47',
  });
  const uiCount = uiCountStr ? parseInt(uiCountStr, 10) : null;

  let result: DiscoveryResult | undefined;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Running conversation discovery scan…',
      cancellable: false,
    },
    async () => {
      result = await discoverConversationsForWorkspace({
        workspacePath,
        globalStoragePath,
        wsStoragePath,
        logger,
        includePossibleByFolderName: includePossible,
        mode: 'diagnostic',
      });

      if (uiCount !== null && !isNaN(uiCount)) {
        const mm = buildMismatchExplanation({
          uiCountHint: uiCount,
          totalComposerData: result.report.totalComposerDataInGlobal,
          allComposersParsed: result.allComposersInGlobal.length,
          matchedComposers: result.matchedComposers.length,
          candidates: result.candidates.length,
          beforeDedupe: result.report.conversationsBeforeDedupe,
          afterDedupe: result.conversations.length,
          dedupeRemoved: result.report.dedupeRemoved.length,
        });
        result.report.mismatchCase = mm.mismatchCase;
        result.report.mismatchExplanation = mm.mismatchExplanation;
      }
    }
  );

  if (!result) {
    return;
  }

  const discovery = result;
  logDiscoveryReportToChannel(discovery.report, logger);
  const reportPath = writeDiscoveryReportFile(workspacePath, discovery.report, logger);

  vscode.window.showInformationMessage(
    `Discovery: ${discovery.conversations.length} conversations, ${discovery.candidates.length} candidates. Case ${discovery.report.mismatchCase}. See report.`,
    'Open Report',
    'Show Output'
  ).then(action => {
    if (action === 'Open Report') {
      vscode.commands.executeCommand('vscode.open', vscode.Uri.file(reportPath));
    } else if (action === 'Show Output') {
      logger.show();
    }
  });
}

// ---------------------------------------------------------------------------
// Command: Raw discovery mode
// ---------------------------------------------------------------------------

async function cmdRawDiscovery(logger: Logger): Promise<void> {
  logger.show();
  const workspacePath = getActiveWorkspacePath();
  if (!workspacePath) {
    vscode.window.showWarningMessage('Cursor Chat Bulk Export: Open a workspace folder first.');
    return;
  }

  const globalStoragePath = getGlobalStoragePath(logger);
  const wsStoragePath = getWorkspaceStoragePath(logger);

  let rawResult: DiscoveryResult | undefined;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Scanning raw chat candidates…',
      cancellable: false,
    },
    async () => {
      rawResult = await discoverConversationsForWorkspace({
        workspacePath,
        globalStoragePath,
        wsStoragePath,
        logger,
        includePossibleByFolderName: await getIncludePossibleMatches(),
      });
    }
  );

  if (!rawResult || rawResult.candidates.length === 0) {
    vscode.window.showInformationMessage('No raw candidates found.');
    return;
  }

  type PickItem = vscode.QuickPickItem & { candidate: RawCandidate };
  const items: PickItem[] = rawResult.candidates.map(c => ({
    label: c.parsed ? `$(check) ${c.title ?? c.key}` : `$(warning) ${c.key}`,
    description: `${c.parsed ? 'parsed' : 'not parsed'} — ${path.basename(c.dbPath)}`,
    detail: `${c.tableName} | ${c.valueSizeBytes} bytes | msgs≈${c.messageCountEstimate ?? '?'}`,
    candidate: c,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    title: `Raw candidates (${rawResult.candidates.length}) — parsed: ${rawResult.conversations.length}`,
    placeHolder: 'Inspect raw discovery entries',
    canPickMany: true,
  });

  if (picked?.length) {
    for (const p of picked) {
      logger.log(
        `RAW ${p.candidate.parsed ? 'OK' : 'FAIL'} ${p.candidate.dbPath} ${p.candidate.tableName} "${p.candidate.key}" — ${p.candidate.parseReason ?? 'ok'}`
      );
    }
    logger.show();
  }
}

// ---------------------------------------------------------------------------
// Loading conversations
// ---------------------------------------------------------------------------

async function loadConversationsForWorkspace(
  globalStoragePath: string,
  workspacePath: string,
  logger: Logger,
  deferBubbleLoad = false
): Promise<{ conversations: Conversation[]; composers: ComposerHeader[] }> {
  const wsStoragePath = getWorkspaceStoragePath(logger);
  const includePossible = await getIncludePossibleMatches();

  const result = await discoverConversationsForWorkspace({
    workspacePath,
    globalStoragePath,
    wsStoragePath,
    logger,
    includePossibleByFolderName: includePossible,
    mode: 'export',
    deferBubbleLoad,
  });

  logger.log(
    `Discovery: ${result.allComposersInGlobal.length} composers in global, ` +
      `${result.matchedComposers.length} matched workspace, ` +
      `${result.conversations.length} conversations after dedupe` +
      (deferBubbleLoad ? ' (bubble load deferred)' : '')
  );

  return {
    conversations: result.conversations,
    composers: result.matchedComposers,
  };
}

async function getIncludePossibleMatches(): Promise<boolean> {
  const cfg = vscode.workspace.getConfiguration('cursorChatExport');
  return cfg.get<boolean>('includePossibleWorkspaceMatches', true);
}

/**
 * Fallback: read chats from per-workspace state.vscdb files (usually smaller than globalStorage).
 */
async function loadFromWorkspaceStorageDatabases(
  wsStoragePath: string | null,
  workspacePath: string,
  workspaceHashes: string[],
  logger: Logger
): Promise<Conversation[]> {
  if (!wsStoragePath) {
    return [];
  }

  const entries = findMatchingEntries(
    scanWorkspaceStorage(wsStoragePath, logger),
    workspacePath,
    logger,
    { includeByFolderName: await getIncludePossibleMatches() }
  );

  if (entries.length === 0) {
    logger.warn('No workspaceStorage entries to scan for fallback.');
    return [];
  }

  logger.log(`Workspace DB fallback: scanning ${entries.length} storage folder(s)`);
  const allConversations: Conversation[] = [];

  for (const entry of entries) {
    const convs = await loadConversationsFromWorkspaceEntry(entry, logger);
    allConversations.push(...convs);
  }

  const seen = new Set<string>();
  return allConversations.filter(c => {
    if (seen.has(c.id)) {
      return false;
    }
    seen.add(c.id);
    return true;
  });
}

async function loadConversationsFromWorkspaceEntry(
  entry: WorkspaceStorageEntry,
  logger: Logger
): Promise<Conversation[]> {
  if (!entry.dbPath || !fs.existsSync(entry.dbPath)) {
    return [];
  }

  logger.log(`Opening workspace DB: ${entry.dbPath}`);
  const db = await openDatabaseBackend(entry.dbPath, logger);
  if (!db) {
    return [];
  }

  try {
    if (hasCursorDiskKV(db, logger)) {
      const composers = readAllComposerHeaders(db, logger);
      if (composers.length === 0) {
        return [];
      }
      return loadConversationsFromComposers(entry.storagePath, composers, logger, db);
    }

    const rows = readItemTableBackend(db, logger, 'ItemTable');
    if (rows.length === 0) {
      return [];
    }
    const chatRows = filterChatRecords(rows, logger);
    return parseLegacyConversations(chatRows, entry.storagePath, logger);
  } finally {
    closeDatabaseBackend(db, logger);
  }
}

async function loadConversationsFromComposers(
  globalStoragePath: string,
  composers: ComposerHeader[],
  logger: Logger,
  existingDb?: DbBackend
): Promise<Conversation[]> {
  const conversations: Conversation[] = [];
  let ownDb = false;

  let db: DbBackend | undefined = existingDb;
  if (!db) {
    db = (await openGlobalStorageDb(globalStoragePath, logger)) ?? undefined;
    ownDb = true;
  }

  if (!db) {
    return conversations;
  }

  try {
    for (const composer of composers) {
      logger.log(`\nLoading composer: "${composer.name}" (${composer.composerId})`);
      logger.log(
        `  Headers: ${composer.headers.length}  isNAL: ${composer.isNAL}  mode: ${composer.unifiedMode}`
      );

      const renderableHeaders = composer.headers.filter(h => h.isRenderable);
      logger.log(
        `  Headers: ${composer.headers.length} total, ${renderableHeaders.length} renderable`
      );

      const bubbleIds = composer.headers.map(h => h.bubbleId);
      const bubbles = loadBubblesForComposer(db, composer.composerId, logger, bubbleIds);
      logger.log(`  Bubble records: ${bubbles.size}`);

      const conv = composerToConversation(composer, bubbles, logger, {
        includeNonRenderable: true,
      });

      const msgCountByRole = conv.messages.reduce(
        (acc, m) => { acc[m.role] = (acc[m.role] ?? 0) + 1; return acc; },
        {} as Record<string, number>
      );
      logger.log(`  Messages extracted: ${conv.messages.length}  ${JSON.stringify(msgCountByRole)}`);

      if (conv.messages.length === 0) {
        logger.log('  Skipping — no messages after parse');
        continue;
      }

      conversations.push(conv);
    }
  } finally {
    if (ownDb && db) {
      closeDatabaseBackend(db, logger);
    }
  }

  logger.log(`\nTotal conversations loaded: ${conversations.length}`);
  return conversations;
}

// ---------------------------------------------------------------------------
// QuickPick selection UI
// ---------------------------------------------------------------------------

async function showConversationPicker(
  conversations: Conversation[]
): Promise<Conversation[] | null> {
  type PickItem = vscode.QuickPickItem & { conversation: Conversation };

  const items: PickItem[] = conversations.map((c, i) => {
    const title = inferConversationTitle(c, i + 1);
    const date = c.createdAt ? c.createdAt.slice(0, 10) : 'unknown date';
    const msgCount = c.messages.length;
    const est = c.estimatedMessageCount ?? msgCount;
    const type = c.sessionType ? ` [${c.sessionType}]` : '';
    const userMsgs = c.messages.filter(m => m.role === 'user').length;
    const aiMsgs = c.messages.filter(m => m.role === 'assistant').length;
    const detail =
      msgCount > 0
        ? `${msgCount} messages (User: ${userMsgs}, Assistant: ${aiMsgs})`
        : `~${est} messages (will load on export)`;
    return {
      label: title,
      description: `${date}${type}`,
      detail,
      picked: true,
      conversation: c,
    };
  });

  const picked = await vscode.window.showQuickPick(items, {
    title: `Select Conversations to Export  (${conversations.length} found)`,
    placeHolder: 'Space to toggle • Enter to confirm • Esc to cancel',
    canPickMany: true,
    matchOnDescription: true,
    matchOnDetail: false,
  });

  if (!picked) {
    return null;
  }

  return picked.map(p => p.conversation);
}

// ---------------------------------------------------------------------------
// Export mode picker
// ---------------------------------------------------------------------------

async function showExportModePicker(): Promise<ExportOptions | null> {
  const items = [
    {
      label: '$(check) Clean export (recommended)',
      description: 'User & assistant messages only — tool calls and thinking blocks removed',
      options: defaultExportOptions(),
      picked: true,
    },
    {
      label: '$(archive) Full raw export',
      description: 'Everything included — tool calls, thinking blocks, empty messages',
      options: fullExportOptions(),
      picked: false,
    },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    title: 'Export Mode',
    placeHolder: 'Choose how to filter the exported Markdown…',
  });

  return picked ? picked.options : null;
}

// ---------------------------------------------------------------------------
// Export pipeline
// ---------------------------------------------------------------------------

async function runExport(
  conversations: Conversation[],
  workspacePath: string,
  outputDir: string,
  options: ExportOptions,
  logger: Logger
): Promise<void> {
  logger.log(`Exporting ${conversations.length} conversation(s) to: ${outputDir}`);
  logger.log(`Export mode: includeToolCalls=${options.includeToolCalls}, includeThinkingBlocks=${options.includeThinkingBlocks}, includeEmptyMessages=${options.includeEmptyMessages}`);

  const exportedAt = new Date();
  const usedNames = new Set<string>();
  const results: ExportResult[] = [];

  // Pre-populate usedNames from existing files
  if (fs.existsSync(outputDir)) {
    try {
      const existing = fs.readdirSync(outputDir);
      for (const f of existing) {
        if (f.endsWith('.md') && f !== 'INDEX.md') {
          usedNames.add(f.slice(0, -3));
        }
      }
    } catch {
      // non-fatal
    }
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Exporting conversations…',
      cancellable: false,
    },
    async progress => {
      for (let i = 0; i < conversations.length; i++) {
        const c = conversations[i];
        progress.report({
          message: `${i + 1}/${conversations.length}`,
          increment: (1 / conversations.length) * 100,
        });

        const displayTitle = inferConversationTitle(c, i + 1);
        const firstUserMsg = c.messages.find(m => m.role === 'user')?.content ?? null;

        const baseName = buildConversationFilename(
          displayTitle !== `Untitled Chat ${String(i + 1).padStart(2, '0')}` ? displayTitle : null,
          firstUserMsg,
          c.createdAt,
          i + 1
        );
        const filename = makeUniqueFilename(baseName, usedNames);
        const renderResult = conversationToMarkdown(c, workspacePath, exportedAt, options, logger);
        const writeResult = writeMarkdownFile(outputDir, filename, renderResult.markdown, logger);

        const { visibleMessages } = filterMessages(c.messages, options, logger);

        results.push({
          conversation: c,
          outputPath: writeResult.outputPath,
          skipped: writeResult.skipped,
          error: writeResult.error,
          visibleCount: renderResult.visibleCount,
          filteredCount: renderResult.filteredCount,
          visibleMessages,
        });

        logger.log(
          `  "${displayTitle}" — visible: ${renderResult.visibleCount}, filtered: ${renderResult.filteredCount}`
        );
      }
    }
  );

  writeIndexFile(outputDir, workspacePath, results, exportedAt, logger);

  const succeeded = results.filter(r => !r.error && !r.skipped).length;
  const failed = results.filter(r => r.error).length;

  const summary =
    `Exported ${succeeded} conversation(s) to \`${EXPORT_FOLDER}/\`` +
    (failed > 0 ? ` (${failed} failed — see Output channel)` : '');

  const action = await vscode.window.showInformationMessage(
    `Cursor Chat Bulk Export: ${summary}`,
    'Open Folder',
    'Dismiss'
  );

  if (action === 'Open Folder') {
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputDir));
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getActiveWorkspacePath(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return null;
  }
  return folders[0].uri.fsPath;
}
