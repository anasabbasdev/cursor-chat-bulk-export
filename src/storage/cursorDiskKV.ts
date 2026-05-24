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
import { openDatabase, closeDatabase, listTables } from './sqliteReader';

// Re-export database type alias
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlDatabase = any;

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
export function hasCursorDiskKV(db: SqlDatabase, logger: Logger): boolean {
  const tables = listTables(db, logger);
  return tables.some(t => t.name === 'cursorDiskKV');
}

// ---------------------------------------------------------------------------
// Reading composer headers
// ---------------------------------------------------------------------------

/**
 * Reads all composer metadata from the cursorDiskKV table.
 * Does NOT load individual bubble content (kept separate for performance).
 */
export function readAllComposerHeaders(db: SqlDatabase, logger: Logger): ComposerHeader[] {
  const headers: ComposerHeader[] = [];

  try {
    const result = db.exec(
      `SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'`
    );
    if (!result.length || !result[0].values.length) {
      logger.log('No composerData entries found in cursorDiskKV');
      return headers;
    }

    logger.log(`Found ${result[0].values.length} composerData entries`);

    for (const [key, rawValue] of result[0].values as [string, string | Uint8Array | null][]) {
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
export function loadBubblesForComposer(
  db: SqlDatabase,
  composerId: string,
  logger: Logger
): Map<string, BubbleContent> {
  const map = new Map<string, BubbleContent>();

  try {
    const result = db.exec(
      `SELECT key, value FROM cursorDiskKV WHERE key LIKE ?`,
      [`bubbleId:${composerId}:%`]
    );
    if (!result.length || !result[0].values.length) {
      logger.log(`No bubble records found for composer ${composerId}`);
      return map;
    }

    logger.log(`Loading ${result[0].values.length} bubbles for composer ${composerId}`);

    for (const [key, rawValue] of result[0].values as [string, string | Uint8Array | null][]) {
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
  } catch (err) {
    logger.error(`Failed to load bubbles for composer ${composerId}`, err);
  }

  return map;
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

function collectLexicalText(node: unknown, parts: string[]): void {
  if (!node || typeof node !== 'object') {
    return;
  }
  const n = node as Record<string, unknown>;

  if (n['type'] === 'text' && typeof n['text'] === 'string') {
    parts.push(n['text']);
    return;
  }

  // newline nodes
  if (n['type'] === 'linebreak') {
    parts.push('\n');
    return;
  }

  // paragraph node ends with newline
  const children = n['children'];
  if (Array.isArray(children)) {
    for (const child of children) {
      collectLexicalText(child, parts);
    }
    if (n['type'] === 'paragraph' || n['type'] === 'heading') {
      parts.push('\n');
    }
  }

  // root node
  const rootNode = n['root'];
  if (rootNode) {
    collectLexicalText(rootNode, parts);
  }
}

// ---------------------------------------------------------------------------
// Workspace matching
// ---------------------------------------------------------------------------

/**
 * Filters composer headers to those belonging to the given workspace path.
 * Also accepts a list of workspaceStorage hashes (from scanning workspaceStorage)
 * to handle composers that only store a hash ID without a resolved URI.
 */
export function filterComposersByWorkspace(
  composers: ComposerHeader[],
  workspacePath: string,
  logger: Logger,
  workspaceStorageHashes: string[] = []
): ComposerHeader[] {
  const normTarget = normaliseWsPath(workspacePath);
  const hashSet = new Set(workspaceStorageHashes.map(h => h.toLowerCase()));

  const matches = composers.filter(c => {
    // Match by resolved fsPath
    if (c.workspaceFsPath && normaliseWsPath(c.workspaceFsPath) === normTarget) {
      return true;
    }
    // Match by external file URI decoded to path
    if (c.workspaceExternalUri) {
      const decoded = fileUriToFsPath(c.workspaceExternalUri);
      if (decoded && normaliseWsPath(decoded) === normTarget) {
        return true;
      }
    }
    // Match by workspaceStorage hash (used when URI is not resolved)
    if (c.workspaceStorageId && hashSet.has(c.workspaceStorageId.toLowerCase())) {
      return true;
    }
    return false;
  });

  logger.log(
    `Workspace filter: ${matches.length}/${composers.length} composers match "${workspacePath}"` +
      (workspaceStorageHashes.length > 0
        ? ` (hashes: ${workspaceStorageHashes.join(', ')})`
        : '')
  );
  return matches;
}

function normaliseWsPath(p: string): string {
  let n = p.replace(/[\\/]+$/, '').trim();
  if (process.platform === 'win32') {
    n = n.toLowerCase().replace(/\//g, '\\');
  }
  return n;
}

function fileUriToFsPath(uri: string): string | null {
  try {
    const url = new URL(uri);
    if (url.protocol !== 'file:') {
      return null;
    }
    let p = decodeURIComponent(url.pathname);
    if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(p)) {
      p = p.slice(1);
    }
    if (process.platform === 'win32') {
      p = p.replace(/\//g, '\\');
    }
    return p;
  } catch {
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
): Promise<SqlDatabase | null> {
  const dbPath = path.join(globalStoragePath, 'state.vscdb');

  if (!fs.existsSync(dbPath)) {
    logger.warn(`globalStorage DB not found: ${dbPath}`);
    return null;
  }

  const sizeMB = (fs.statSync(dbPath).size / 1024 / 1024).toFixed(1);
  logger.log(`Opening globalStorage DB (${sizeMB} MB): ${dbPath}`);

  const db = await openDatabase(dbPath, logger);
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
