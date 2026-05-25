/**
 * Reader for Cursor's cursorDiskKV table in globalStorage/state.vscdb.
 *
 * VERIFIED SCHEMA (Cursor 0.4x–0.5x, 2026):
 *
 *  Table: cursorDiskKV  (key TEXT, value BLOB)
 *
 *  Key patterns:
 *    composerData:<composerId>      → Full composer object
 *    bubbleId:<composerId>:<bubbleId> → Individual message
 *    agentKv:*                      → Agent key-value (ignored)
 *    checkpointId:*                 → Conversation checkpoints (ignored)
 *
 *  composerData structure (relevant fields):
 *    composerId     : string (UUID)
 *    name           : string | undefined       — conversation title
 *    createdAt      : number (ms)
 *    lastUpdatedAt  : number (ms)
 *    isNAL          : boolean | undefined
 *      true  = conversation state is encrypted/server-synced; local bubbles may exist
 *      undef = local-only composer
 *    workspaceIdentifier : {
 *      id  : string (hash),
 *      uri : { fsPath, external, path, scheme }
 *    }
 *    fullConversationHeadersOnly : Array<{
 *      bubbleId  : string
 *      type      : 1 | 2       (1=user, 2=assistant)
 *      grouping  : {
 *        isRenderable  : boolean
 *        hasText       : boolean | undefined
 *        capabilityType: number | undefined   (tool call)
 *        toolFormerTool: number | undefined
 *        toolCallId    : string | undefined
 *        isSimulatedMsg: boolean | undefined  (auto-generated user msg)
 *        simulatedMsgReason: number | undefined
 *        hasThinking   : boolean | undefined
 *        thinkingDurationMs: number | undefined
 *        isToolGroupable: boolean | undefined
 *      }
 *    }>
 *    subtitle       : string | undefined
 *    unifiedMode    : 'agent' | 'chat' | 'edit'
 *
 *  bubbleId:<composerId>:<bubbleId> structure (relevant fields):
 *    type       : 1 (user) | 2 (assistant)
 *    text       : string   — plain text content
 *    richText   : string   — Lexical JSON (fallback if text is empty)
 *    bubbleId   : string
 *    createdAt  : number (ms) | undefined
 *    capabilityType: number | undefined   (tool call type)
 *    thinking   : string | undefined      (assistant's thinking text)
 *    toolResults: Array | undefined
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Logger } from '../types';
import type { DbBackend } from './dbBackend';
import { formatSizeMb, getDatabaseSizeBytes } from './dbBackend';
import {
  openDatabaseBackend,
  closeDatabaseBackend,
  listTablesBackend,
} from './sqliteReader';
import { buildComposerFilterSql } from './sqliteCliReader';
import {
  filterComposersByWorkspace as filterComposersByWorkspaceMatch,
  type WorkspaceMatchOptions,
} from '../workspace/workspaceMatch';

export type { WorkspaceMatchOptions };

export interface WorkspaceDbFilter {
  workspacePath: string;
  storageHashes: string[];
  /** When true, CLI uses SQL LIKE filter (can miss moved/archived paths). Default false. */
  useSqlPrefilter?: boolean;
}

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

export interface ComposerHeader {
  composerId: string;
  name: string | null;
  createdAt: number | null;
  lastUpdatedAt: number | null;
  isNAL: boolean | undefined;
  workspaceFsPath: string | null;
  workspaceExternalUri: string | null;
  /** The raw workspaceStorage hash ID from workspaceIdentifier.id */
  workspaceStorageId: string | null;
  unifiedMode: string | null;
  subtitle: string | null;
  messageCount: number;
  headers: BubbleHeader[];
}

export interface BubbleHeader {
  bubbleId: string;
  /** 1 = user, 2 = assistant */
  type: number;
  isRenderable: boolean;
  hasText: boolean;
  isSimulatedMsg: boolean;
  capabilityType: number | null;
  toolFormerTool: number | null;
  toolCallId: string | null;
  hasThinking: boolean;
}

export interface BubbleContent {
  bubbleId: string;
  composerId: string;
  /** 1 = user, 2 = assistant */
  type: number;
  text: string;
  richText: string | null;
  createdAt: number | null;
  capabilityType: number | null;
  thinking: string | null;
  /** Whether this is an auto-generated/simulated user message */
  isSimulated: boolean;
}

// ---------------------------------------------------------------------------
// Schema validation helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the database has a cursorDiskKV table (newer Cursor format).
 */
export function hasCursorDiskKV(db: DbBackend, logger: Logger): boolean {
  const tables = listTablesBackend(db, logger);
  return tables.some(t => t.name === 'cursorDiskKV');
}

// ---------------------------------------------------------------------------
// Reading composer headers
// ---------------------------------------------------------------------------

/**
 * Reads all composer metadata from the cursorDiskKV table.
 * Does NOT load individual bubble content (kept separate for performance).
 */
export function readAllComposerHeaders(
  db: DbBackend,
  logger: Logger,
  workspaceFilter?: WorkspaceDbFilter
): ComposerHeader[] {
  const headers: ComposerHeader[] = [];

  let sql = `SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'`;
  if (workspaceFilter?.useSqlPrefilter && db.kind === 'cli') {
    sql = buildComposerFilterSql(
      workspaceFilter.workspacePath,
      workspaceFilter.storageHashes
    );
    logger.warn(
      'Using SQL workspace prefilter on large DB — may miss archived/moved conversations. ' +
        'Disable useSqlPrefilter for full discovery.'
    );
  }

  try {
    const result = db.exec(sql);
    if (!result.length || !result[0].rows.length) {
      logger.log('No composerData entries found in cursorDiskKV');
      return headers;
    }

    logger.log(`Found ${result[0].rows.length} composerData entries`);

    for (const [key, rawValue] of result[0].rows as [string, string | Uint8Array | null][]) {
      try {
        const str =
          rawValue instanceof Uint8Array
            ? Buffer.from(rawValue).toString('utf8')
            : rawValue === null
              ? null
              : String(rawValue);

        if (!str) {
          continue;
        }

        const parsed = JSON.parse(str) as Record<string, unknown>;
        const header = parseComposerData(key, parsed, logger);
        if (header) {
          headers.push(header);
        }
      } catch (err) {
        logger.warn(`Failed to parse composerData for key "${key}": ${String(err)}`);
      }
    }
  } catch (err) {
    logger.error('Failed to read composerData from cursorDiskKV', err);
  }

  logger.log(`Parsed ${headers.length} composer headers`);
  return headers;
}

/**
 * Reads composer headers likely belonging to a workspace.
 * On large DBs uses SQL text filter (folder path + hashes) instead of loading every composerData row.
 */
export function readComposerHeadersForWorkspace(
  db: DbBackend,
  workspacePath: string,
  storageHashes: string[],
  logger: Logger
): { headers: ComposerHeader[]; totalInDb: number; usedSqlPrefilter: boolean } {
  const totalInDb = countComposerDataKeys(db, logger);

  let sql = `SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'`;
  const useSqlFilter = db.kind === 'cli' || totalInDb > 800;

  if (useSqlFilter) {
    sql = buildComposerFilterSql(workspacePath, storageHashes);
    logger.log(
      `Loading composerData with workspace SQL filter (${totalInDb} total in DB, backend=${db.kind})`
    );
  } else {
    logger.log(`Loading all ${totalInDb} composerData rows (small DB)`);
  }

  const headers: ComposerHeader[] = [];
  try {
    const result = db.exec(sql);
    if (!result.length || !result[0].rows.length) {
      logger.log('No composerData rows for workspace filter');
      return { headers, totalInDb, usedSqlPrefilter: useSqlFilter };
    }

    logger.log(`composerData rows returned by query: ${result[0].rows.length}`);

    for (const [key, rawValue] of result[0].rows as [string, string | Uint8Array | null][]) {
      try {
        const str =
          rawValue instanceof Uint8Array
            ? Buffer.from(rawValue).toString('utf8')
            : rawValue === null
              ? null
              : String(rawValue);

        if (!str || str.length > 20_000_000) {
          continue;
        }

        const parsed = JSON.parse(str) as Record<string, unknown>;
        const header = parseComposerData(key, parsed, logger);
        if (header) {
          headers.push(header);
        }
      } catch (err) {
        const msg = String(err);
        if (!msg.includes('Maximum call stack')) {
          logger.warn(`Failed to parse composerData "${key}": ${msg}`);
        }
      }
    }
  } catch (err) {
    logger.error('readComposerHeadersForWorkspace failed', err);
  }

  logger.log(`Parsed ${headers.length} composer headers from workspace query`);
  return { headers, totalInDb, usedSqlPrefilter: useSqlFilter };
}

/**
 * Loads composerData in batches (safe for huge DBs). Stops after maxBatches.
 */
export function readComposerHeadersBatch(
  db: DbBackend,
  logger: Logger,
  offset: number,
  limit: number
): ComposerHeader[] {
  const headers: ComposerHeader[] = [];
  const sql = `SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%' LIMIT ${limit} OFFSET ${offset}`;
  try {
    const result = db.exec(sql);
    if (!result.length) {
      return headers;
    }
    for (const [key, rawValue] of result[0].rows as [string, string | Uint8Array | null][]) {
      try {
        const str =
          rawValue instanceof Uint8Array
            ? Buffer.from(rawValue).toString('utf8')
            : rawValue === null
              ? null
              : String(rawValue);
        if (!str || str.length > 15_000_000) {
          continue;
        }
        const parsed = JSON.parse(str) as Record<string, unknown>;
        const header = parseComposerData(key, parsed, logger);
        if (header) {
          headers.push(header);
        }
      } catch {
        // skip bad row
      }
    }
  } catch (err) {
    logger.warn(`Batch offset=${offset} failed: ${String(err)}`);
  }
  return headers;
}

/**
 * After SQL prefilter, optionally scan all composerData in batches and merge matches.
 */
export function discoverComposersExhaustive(
  db: DbBackend,
  workspacePath: string,
  storageHashes: string[],
  logger: Logger,
  includePossibleByFolderName: boolean,
  initial: ComposerHeader[]
): ComposerHeader[] {
  const seen = new Set(initial.map(c => c.composerId));
  const merged = [...initial];
  const batchSize = 150;
  const maxBatches = 80;

  logger.log(
    `Batch scan: starting with ${initial.length} from SQL filter, scanning up to ${maxBatches * batchSize} rows…`
  );

  for (let b = 0; b < maxBatches; b++) {
    const batch = readComposerHeadersBatch(db, logger, b * batchSize, batchSize);
    if (batch.length === 0) {
      break;
    }
    const matched = filterComposersByWorkspace(
      batch,
      workspacePath,
      logger,
      storageHashes,
      includePossibleByFolderName
    );
    for (const c of matched) {
      if (!seen.has(c.composerId)) {
        seen.add(c.composerId);
        merged.push(c);
      }
    }
    if (b % 10 === 0) {
      logger.log(`  batch ${b + 1}: scanned ${(b + 1) * batchSize}, merged total ${merged.length}`);
    }
  }

  logger.log(`Batch scan complete: ${merged.length} composers for workspace`);
  return merged;
}

function parseComposerData(
  key: string,
  data: Record<string, unknown>,
  logger: Logger
): ComposerHeader | null {
  const composerId = stringField(data, 'composerId');
  if (!composerId) {
    logger.warn(`composerData entry missing composerId: ${key}`);
    return null;
  }

  // Workspace path extraction
  const wsId = data['workspaceIdentifier'] as Record<string, unknown> | undefined;
  let workspaceFsPath: string | null = null;
  let workspaceExternalUri: string | null = null;
  let workspaceStorageId: string | null = null;

  if (wsId) {
    workspaceStorageId = stringField(wsId, 'id');
    const uri = wsId['uri'] as Record<string, unknown> | undefined;
    if (uri) {
      workspaceFsPath = stringField(uri, 'fsPath');
      workspaceExternalUri = stringField(uri, 'external');
    }
  }

  // Parse conversation headers
  const rawHeaders = data['fullConversationHeadersOnly'];
  const parsedHeaders: BubbleHeader[] = [];
  if (Array.isArray(rawHeaders)) {
    for (const h of rawHeaders) {
      if (!h || typeof h !== 'object') {
        continue;
      }
      const hh = h as Record<string, unknown>;
      const g = (hh['grouping'] ?? {}) as Record<string, unknown>;
      parsedHeaders.push({
        bubbleId: String(hh['bubbleId'] ?? ''),
        type: typeof hh['type'] === 'number' ? hh['type'] : 0,
        isRenderable: g['isRenderable'] !== false,
        hasText: g['hasText'] === true,
        isSimulatedMsg: g['isSimulatedMsg'] === true,
        capabilityType: typeof g['capabilityType'] === 'number' ? g['capabilityType'] : null,
        toolFormerTool: typeof g['toolFormerTool'] === 'number' ? g['toolFormerTool'] : null,
        toolCallId: stringField(g, 'toolCallId'),
        hasThinking: g['hasThinking'] === true,
      });
    }
  }

  return {
    composerId,
    name: stringField(data, 'name'),
    createdAt: numberField(data, 'createdAt'),
    lastUpdatedAt: numberField(data, 'lastUpdatedAt'),
    isNAL: typeof data['isNAL'] === 'boolean' ? data['isNAL'] : undefined,
    workspaceFsPath,
    workspaceExternalUri,
    workspaceStorageId,
    unifiedMode: stringField(data, 'unifiedMode'),
    subtitle: stringField(data, 'subtitle'),
    messageCount: parsedHeaders.length,
    headers: parsedHeaders,
  };
}

// ---------------------------------------------------------------------------
// Reading individual bubbles
// ---------------------------------------------------------------------------

/**
 * Loads all bubble content for a given composer.
 * Returns a Map from bubbleId → BubbleContent.
 *
 * Uses a single SQL LIKE query to load all bubbles at once (faster than
 * individual lookups for large composers).
 */
const BUBBLE_LOAD_CHUNK = 40;

export function loadBubblesForComposer(
  db: DbBackend,
  composerId: string,
  logger: Logger,
  /** When set, only load these bubble rows (much faster than scanning all bubbleId:composerId:*) */
  bubbleIds?: string[]
): Map<string, BubbleContent> {
  const map = new Map<string, BubbleContent>();

  try {
    const uniqueIds = [...new Set((bubbleIds ?? []).filter(id => id.length > 0))];

    if (uniqueIds.length > 0) {
      const t0 = Date.now();
      for (let offset = 0; offset < uniqueIds.length; offset += BUBBLE_LOAD_CHUNK) {
        const chunk = uniqueIds.slice(offset, offset + BUBBLE_LOAD_CHUNK);
        const keys = chunk
          .map(b => `'${escapeSqlKey(`bubbleId:${composerId}:${b}`)}'`)
          .join(',');
        const result = db.exec(
          `SELECT key, value FROM cursorDiskKV WHERE key IN (${keys})`
        );
        if (result.length) {
          parseBubbleRows(result[0].rows, composerId, map, logger);
        }
      }
      logger.log(
        `Loaded ${map.size}/${uniqueIds.length} bubble(s) for ${composerId} in ${Date.now() - t0}ms (header-scoped)`
      );
      return map;
    }

    const result = db.exec(
      `SELECT key, value FROM cursorDiskKV WHERE key LIKE ?`,
      [`bubbleId:${composerId}:%`]
    );
    if (!result.length || !result[0].rows.length) {
      logger.log(`No bubble records found for composer ${composerId}`);
      return map;
    }

    logger.log(`Loading ${result[0].rows.length} bubbles for composer ${composerId} (full LIKE scan)`);
    parseBubbleRows(result[0].rows, composerId, map, logger);
  } catch (err) {
    logger.error(`Failed to load bubbles for composer ${composerId}`, err);
  }

  return map;
}

function escapeSqlKey(key: string): string {
  return key.replace(/'/g, "''");
}

function parseBubbleRows(
  rows: unknown[][],
  composerId: string,
  map: Map<string, BubbleContent>,
  logger: Logger
): void {
  for (const [key, rawValue] of rows as [string, string | Uint8Array | null][]) {
      try {
        const str =
          rawValue instanceof Uint8Array
            ? Buffer.from(rawValue).toString('utf8')
            : rawValue === null
              ? null
              : String(rawValue);

        if (!str) {
          continue;
        }

        const parsed = JSON.parse(str) as Record<string, unknown>;
        const bubble = parseBubbleContent(composerId, parsed);
        if (bubble) {
          map.set(bubble.bubbleId, bubble);
        }
      } catch (err) {
        logger.warn(`Failed to parse bubble "${key}": ${String(err)}`);
      }
    }
}

function parseBubbleContent(
  composerId: string,
  data: Record<string, unknown>
): BubbleContent | null {
  const bubbleId = stringField(data, 'bubbleId');
  if (!bubbleId) {
    return null;
  }

  const typeNum = typeof data['type'] === 'number' ? data['type'] : 0;

  // Text extraction: prefer plain text, fall back to richText
  let text = stringField(data, 'text') ?? '';
  const richText = stringField(data, 'richText');

  if (!text.trim() && richText) {
    text = extractTextFromLexicalJson(richText);
  }

  return {
    bubbleId,
    composerId,
    type: typeNum,
    text,
    richText,
    createdAt: numberField(data, 'createdAt'),
    capabilityType: typeof data['capabilityType'] === 'number' ? data['capabilityType'] : null,
    thinking: stringField(data, 'thinking'),
    isSimulated: false, // set from header
  };
}

/**
 * Extracts plain text from a Lexical JSON rich text string.
 * Recursively collects all "text" node values.
 */
export function extractTextFromLexicalJson(richTextJson: string): string {
  try {
    const root = JSON.parse(richTextJson) as Record<string, unknown>;
    const parts: string[] = [];
    collectLexicalText(root, parts);
    return parts.join('');
  } catch {
    return '';
  }
}

function collectLexicalText(node: unknown, parts: string[], visited = new WeakSet<object>(), depth = 0): void {
  if (!node || typeof node !== 'object' || depth > 32) {
    return;
  }
  const n = node as Record<string, unknown>;
  if (visited.has(n)) {
    return;
  }
  visited.add(n);

  if (n['type'] === 'text' && typeof n['text'] === 'string') {
    parts.push(n['text']);
    return;
  }

  if (n['type'] === 'linebreak') {
    parts.push('\n');
    return;
  }

  const children = n['children'];
  if (Array.isArray(children)) {
    for (const child of children) {
      collectLexicalText(child, parts, visited, depth + 1);
    }
    if (n['type'] === 'paragraph' || n['type'] === 'heading') {
      parts.push('\n');
    }
  }

  const rootNode = n['root'];
  if (rootNode) {
    collectLexicalText(rootNode, parts, visited, depth + 1);
  }
}

// ---------------------------------------------------------------------------
// Workspace matching
// ---------------------------------------------------------------------------

/**
 * Filters composer headers to those belonging to the given workspace path.
 */
export function filterComposersByWorkspace(
  composers: ComposerHeader[],
  workspacePath: string,
  logger: Logger,
  workspaceStorageHashes: string[] = [],
  includePossibleByFolderName = true
): ComposerHeader[] {
  const options: WorkspaceMatchOptions = {
    workspacePath,
    storageHashes: workspaceStorageHashes,
    includePossibleByFolderName,
  };
  return filterComposersByWorkspaceMatch(composers, options, logger);
}

/** Count all composerData:* rows in cursorDiskKV. */
export function countComposerDataKeys(db: DbBackend, logger: Logger): number {
  try {
    const r = db.exec(
      `SELECT COUNT(*) FROM cursorDiskKV WHERE key LIKE 'composerData:%'`
    );
    if (!r.length || !r[0].rows.length) {
      return 0;
    }
    const n = Number(r[0].rows[0][0]);
    logger.log(`Total composerData:* keys in DB: ${n}`);
    return n;
  } catch (err) {
    logger.warn(`countComposerDataKeys failed: ${String(err)}`);
    return 0;
  }
}

/** Load a single composer header by ID. */
export function loadComposerHeaderById(
  db: DbBackend,
  composerId: string,
  logger: Logger
): ComposerHeader | null {
  try {
    const result = db.exec(
      `SELECT key, value FROM cursorDiskKV WHERE key = ?`,
      [`composerData:${composerId}`]
    );
    if (!result.length || !result[0].rows.length) {
      return null;
    }
    const [key, rawValue] = result[0].rows[0] as [string, string | Uint8Array | null];
    const str =
      rawValue instanceof Uint8Array
        ? Buffer.from(rawValue).toString('utf8')
        : rawValue === null
          ? null
          : String(rawValue);
    if (!str) {
      return null;
    }
    const parsed = JSON.parse(str) as Record<string, unknown>;
    return parseComposerData(key, parsed, logger);
  } catch (err) {
    logger.warn(`loadComposerHeaderById(${composerId}): ${String(err)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Opening the globalStorage DB
// ---------------------------------------------------------------------------

/**
 * Opens the globalStorage/state.vscdb as a sql.js database.
 * Returns null if it cannot be opened or doesn't have cursorDiskKV.
 */
export async function openGlobalStorageDb(
  globalStoragePath: string,
  logger: Logger
): Promise<DbBackend | null> {
  const dbPath = path.join(globalStoragePath, 'state.vscdb');

  if (!fs.existsSync(dbPath)) {
    logger.warn(`globalStorage DB not found: ${dbPath}`);
    return null;
  }

  const bytes = getDatabaseSizeBytes(dbPath);
  logger.log(`Opening globalStorage DB (${formatSizeMb(bytes)} MB): ${dbPath}`);

  const db = await openDatabaseBackend(dbPath, logger);
  if (!db) {
    return null;
  }

  if (!hasCursorDiskKV(db, logger)) {
    logger.warn(
      'globalStorage DB does not have cursorDiskKV table. ' +
        'This may be an older Cursor version. Falling back to ItemTable scan.'
    );
    return db; // still return it so callers can try ItemTable
  }

  return db;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stringField(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  if (typeof v === 'string' && v.trim()) {
    return v.trim();
  }
  return null;
}

function numberField(obj: Record<string, unknown>, key: string): number | null {
  const v = obj[key];
  if (typeof v === 'number' && v > 0) {
    return v;
  }
  return null;
}
