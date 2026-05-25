/**
 * Discover conversations from workspace/global ItemTable (where Cursor UI list often lives).
 * Complements cursorDiskKV composerData — many workspaces keep 40+ chats only in ItemTable.
 */

import type { DbBackend } from '../storage/dbBackend';
import { readItemTableBackend, safeParseValue } from '../storage/sqliteReader';
import type { Conversation, Logger } from '../types';
const SESSION_INDEX_KEY = /^chat\.chatsessionstore\.index$/i;
const COMPOSER_DATA_KEY = /^composer\.composerdata$/i;

/** Keys that hold the workspace chat list (authoritative for UI count). */
const SESSION_INDEX_PATTERNS = [
  SESSION_INDEX_KEY,
  COMPOSER_DATA_KEY,
];

/**
 * Discovers conversation IDs from workspace DB using Cursor's panel-to-composer mapping.
 *
 * Cursor stores each chat tab as:
 *   ItemTable key:   workbench.panel.composerChatViewPane.<tabId>
 *   ItemTable value: { "workbench.panel.aichat.view.<composerId>": { ... } }
 *
 * The <composerId> inside the value is the actual composerData ID in globalStorage.
 * Also reads workbench.panel.aichat.<composerId>.numberOfVisibleViews keys directly.
 */
export function extractComposerIdsFromPaneKeys(
  db: DbBackend,
  logger: Logger
): Set<string> {
  const rows = readItemTableBackend(db, logger, 'ItemTable');
  const ids = new Set<string>();

  for (const row of rows) {
    const k = row.key;

    // Pattern 1: workbench.panel.composerChatViewPane.<tabId>  (not .hidden / .numberOfVisibleViews)
    if (
      /^workbench\.panel\.composerChatViewPane\.[0-9a-f-]{36}$/i.test(k)
    ) {
      const parsed = safeParseValue(row.value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const subKey of Object.keys(parsed as Record<string, unknown>)) {
          const m = subKey.match(
            /workbench\.panel\.aichat\.view\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
          );
          if (m) {
            ids.add(m[1]);
          }
        }
      }
      continue;
    }

    // Pattern 2: workbench.panel.aichat.<composerId>.numberOfVisibleViews
    const m2 = k.match(
      /^workbench\.panel\.aichat\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.numberOfVisibleViews$/i
    );
    if (m2) {
      ids.add(m2[1]);
    }
  }

  logger.log(`extractComposerIdsFromPaneKeys: ${ids.size} composer ID(s) from workspace panel keys`);
  return ids;
}

/**
 * Reads chat.ChatSessionStore.index (and composer.composerData index) from a workspace DB.
 */
export function readWorkspaceChatSessionIndex(
  db: DbBackend,
  storagePath: string,
  logger: Logger
): { conversations: Conversation[]; sessionIds: Set<string> } {
  const rows = readItemTableBackend(db, logger, 'ItemTable');
  const sessionIds = new Set<string>();
  const conversations: Conversation[] = [];

  for (const row of rows) {
    if (!SESSION_INDEX_PATTERNS.some(p => p.test(row.key))) {
      continue;
    }
    const parsed = safeParseValue(row.value);
    if (!parsed) {
      continue;
    }
    const fromStore = parseChatSessionStoreIndex(row.key, parsed, storagePath, logger);
    for (const c of fromStore) {
      sessionIds.add(c.id);
      conversations.push(c);
    }
  }

  logger.log(
    `Workspace session index: ${sessionIds.size} id(s) from ${conversations.length} row(s) in ${storagePath}`
  );
  return { conversations, sessionIds };
}

/**
 * Global ItemTable — only small index rows, not every chat/composer key.
 */
export function discoverGlobalItemTableSessions(
  db: DbBackend,
  storagePath: string,
  logger: Logger
): Conversation[] {
  const rows = readItemTableBackend(db, logger, 'ItemTable');
  const conversations: Conversation[] = [];

  for (const row of rows) {
    if (!SESSION_INDEX_PATTERNS.some(p => p.test(row.key))) {
      continue;
    }
    const parsed = safeParseValue(row.value);
    if (!parsed) {
      continue;
    }
    conversations.push(...parseChatSessionStoreIndex(row.key, parsed, storagePath, logger));
  }

  if (conversations.length > 0) {
    logger.log(`globalStorage ItemTable session index: ${conversations.length} session(s)`);
  }
  return dedupeById(conversations);
}

/**
 * Legacy full ItemTable scan — avoid for workspace DBs (produces hundreds of false positives).
 */
export function discoverConversationsFromItemTable(
  db: DbBackend,
  storagePath: string,
  logger: Logger
): Conversation[] {
  return readWorkspaceChatSessionIndex(db, storagePath, logger).conversations;
}

/**
 * Parses chat.ChatSessionStore.index and composer.composerData list blobs.
 */
function parseChatSessionStoreIndex(
  key: string,
  data: unknown,
  storagePath: string,
  logger: Logger
): Conversation[] {
  const results: Conversation[] = [];
  if (!data || typeof data !== 'object') {
    return results;
  }

  const root = data as Record<string, unknown>;
  const entryLists: unknown[] = [];

  if (Array.isArray(root['entries'])) {
    entryLists.push(root['entries']);
  } else if (root['entries'] && typeof root['entries'] === 'object') {
    entryLists.push(
      Object.entries(root['entries'] as Record<string, unknown>).map(([id, meta]) => {
        if (meta && typeof meta === 'object') {
          return { ...(meta as Record<string, unknown>), sessionId: id, id };
        }
        return { sessionId: id, id };
      })
    );
  }
  if (Array.isArray(root['sessions'])) {
    entryLists.push(root['sessions']);
  }
  if (Array.isArray(root['items'])) {
    entryLists.push(root['items']);
  }
  if (Array.isArray(root['allComposers'])) {
    entryLists.push(root['allComposers']);
  }
  if (Array.isArray(root['tabs'])) {
    entryLists.push(root['tabs']);
  }
  if (Array.isArray(data)) {
    entryLists.push(data);
  }

  // Newer Cursor: workspace ItemTable composer.composerData often only lists IDs
  // (no workbench.panel.composerChatViewPane.* keys on fresh installs).
  for (const id of collectComposerIdsFromWorkspaceIndex(root)) {
    results.push({
      id,
      title: null,
      createdAt: null,
      updatedAt: null,
      messages: [],
      storagePath,
      sessionType: /composer/i.test(key) ? 'composerIndex' : 'chatSessionStore',
    });
  }

  for (const list of entryLists) {
    const arr = list as unknown[];
    for (const item of arr) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const e = item as Record<string, unknown>;
      const id = stringOf(e['sessionId'] ?? e['id'] ?? e['composerId'] ?? e['chatId'] ?? e['tabId']);
      if (!id || !isUuidLike(id)) {
        continue;
      }
      const title = stringOf(e['title'] ?? e['name'] ?? e['chatTitle'] ?? e['label']);
      const createdAt = isoFrom(e['createdAt'] ?? e['creationDate'] ?? e['timestamp']);
      const updatedAt = isoFrom(e['updatedAt'] ?? e['lastMessageDate'] ?? e['lastUpdatedAt']);

      results.push({
        id,
        title,
        createdAt,
        updatedAt,
        messages: [],
        storagePath,
        sessionType: /composer/i.test(key) ? 'composerIndex' : 'chatSessionStore',
      });
    }
  }

  if (results.length > 0) {
    logger.log(`[ItemTable] "${key}" → ${results.length} session(s)`);
  }

  return results;
}

function isUuidLike(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** IDs referenced by composer.composerData on recent Cursor builds. */
function collectComposerIdsFromWorkspaceIndex(root: Record<string, unknown>): string[] {
  const ids: string[] = [];
  const fields = [
    'selectedComposerIds',
    'lastFocusedComposerIds',
    'pinnedComposerIds',
    'openComposerIds',
  ];
  for (const field of fields) {
    const arr = root[field];
    if (!Array.isArray(arr)) {
      continue;
    }
    for (const item of arr) {
      if (typeof item === 'string' && isUuidLike(item)) {
        ids.push(item);
      }
    }
  }
  return ids;
}

function stringOf(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) {
    return v.trim();
  }
  if (typeof v === 'number') {
    return String(v);
  }
  return null;
}

function isoFrom(v: unknown): string | null {
  if (typeof v === 'number' && v > 0) {
    const ms = v < 1e12 ? v * 1000 : v;
    return new Date(ms).toISOString();
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  return null;
}

function dedupeById(conversations: Conversation[]): Conversation[] {
  const seen = new Set<string>();
  return conversations.filter(c => {
    if (seen.has(c.id)) {
      return false;
    }
    seen.add(c.id);
    return true;
  });
}
