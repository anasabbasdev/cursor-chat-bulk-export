/**
 * Legacy parser for old ItemTable-based Cursor chat format (pre-cursorDiskKV).
 * Used as a fallback for very old Cursor installations that don't have the
 * cursorDiskKV table.
 *
 * This handles the older "tabs" / "allComposers" JSON blob format that was
 * stored directly in ItemTable rows.
 */

import type { Conversation, ChatMessage, MessageRole, RawKVRecord, Logger } from '../types';
import { safeParseValue } from '../storage/sqliteReader';
import { classifyKey } from './schemaDiscovery';

export function parseConversations(
  records: RawKVRecord[],
  storagePath: string,
  logger: Logger
): Conversation[] {
  const conversations: Conversation[] = [];

  for (const record of records) {
    const parsed = safeParseValue(record.value);
    if (!parsed) {
      continue;
    }
    const type = classifyKey(record.key);
    logger.log(`[Legacy] Parsing record key="${record.key}" type="${type}"`);
    try {
      const convs = parseRecord(record.key, parsed, storagePath, type, logger, 0);
      logger.log(`  → extracted ${convs.length} conversation(s)`);
      conversations.push(...convs);
    } catch (err) {
      logger.error(`  Failed to parse record "${record.key}"`, err);
    }
  }

  const seen = new Set<string>();
  return conversations.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

const MAX_PARSE_DEPTH = 8;

function parseRecord(
  key: string,
  data: unknown,
  storagePath: string,
  sessionType: string,
  logger: Logger,
  depth = 0
): Conversation[] {
  if (depth > MAX_PARSE_DEPTH || !data || typeof data !== 'object') {
    return [];
  }
  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj['tabs'])) {
    return parseTabs(obj['tabs'] as unknown[], storagePath, sessionType, logger);
  }
  if (Array.isArray(obj['allComposers'])) {
    return parseComposers(obj['allComposers'] as unknown[], storagePath, logger);
  }
  if (Array.isArray(obj['conversations'])) {
    return parseConvArray(obj['conversations'] as unknown[], storagePath, sessionType, logger);
  }
  if (Array.isArray(data)) {
    const bubbles = extractBubbles(data, logger);
    if (bubbles.length > 0) {
      return [buildConv(key, null, null, null, bubbles, storagePath, sessionType, [])];
    }
  }
  if (obj['id'] || obj['composerId'] || obj['tabId']) {
    const s = parseSingle(obj, storagePath, sessionType, logger);
    return s ? [s] : [];
  }
  for (const [subKey, subVal] of Object.entries(obj)) {
    if (Array.isArray(subVal) && subVal.length > 0) {
      const convs = parseRecord(key + '.' + subKey, subVal, storagePath, sessionType, logger, depth + 1);
      if (convs.length > 0) {
        return convs;
      }
    }
  }
  return [];
}

function parseTabs(tabs: unknown[], storagePath: string, sessionType: string, logger: Logger): Conversation[] {
  return tabs.flatMap(tab => {
    if (!tab || typeof tab !== 'object') return [];
    const t = tab as Record<string, unknown>;
    const id = String(t['tabId'] ?? t['id'] ?? t['composerId'] ?? Math.random().toString(36).slice(2));
    const title = strOrNull(t['chatTitle'] ?? t['title'] ?? t['name']);
    const createdAt = resolveTs(t['createdAt'] ?? t['lastSendTime'] ?? t['timestamp']);
    const updatedAt = resolveTs(t['updatedAt'] ?? t['lastSendTime']);
    const rawBubbles = t['bubbles'] ?? t['messages'] ?? t['conversation'] ?? [];
    const parseErrors: string[] = [];
    const messages = extractBubbles(rawBubbles, logger, parseErrors);
    return [buildConv(id, title, createdAt, updatedAt, messages, storagePath, sessionType, parseErrors)];
  });
}

function parseComposers(composers: unknown[], storagePath: string, logger: Logger): Conversation[] {
  return composers.flatMap(comp => {
    if (!comp || typeof comp !== 'object') return [];
    const c = comp as Record<string, unknown>;
    const id = String(c['composerId'] ?? c['id'] ?? Math.random().toString(36).slice(2));
    const title = strOrNull(c['name'] ?? c['title']);
    const createdAt = resolveTs(c['createdAt']);
    const updatedAt = resolveTs(c['updatedAt'] ?? c['lastUpdatedAt']);
    const rawMessages = c['conversation'] ?? c['messages'] ?? c['bubbles'] ?? c['chatHistory'] ?? [];
    const parseErrors: string[] = [];
    const messages = extractBubbles(rawMessages, logger, parseErrors);
    if (messages.length === 0) { logger.log(`  [Legacy] Skipping composer "${id}" — no messages`); return []; }
    return [buildConv(id, title, createdAt, updatedAt, messages, storagePath, 'composer', parseErrors)];
  });
}

function parseConvArray(arr: unknown[], storagePath: string, sessionType: string, logger: Logger): Conversation[] {
  return arr.flatMap(c => {
    if (!c || typeof c !== 'object') return [];
    const p = parseSingle(c as Record<string, unknown>, storagePath, sessionType, logger);
    return p ? [p] : [];
  });
}

function parseSingle(obj: Record<string, unknown>, storagePath: string, sessionType: string, logger: Logger): Conversation | null {
  const id = String(obj['id'] ?? obj['composerId'] ?? obj['tabId'] ?? Math.random().toString(36).slice(2));
  const title = strOrNull(obj['title'] ?? obj['name'] ?? obj['chatTitle']);
  const createdAt = resolveTs(obj['createdAt'] ?? obj['timestamp'] ?? obj['lastSendTime']);
  const updatedAt = resolveTs(obj['updatedAt'] ?? obj['lastUpdatedAt']);
  const rawMessages = obj['messages'] ?? obj['bubbles'] ?? obj['conversation'] ?? obj['history'] ?? [];
  const parseErrors: string[] = [];
  const messages = extractBubbles(rawMessages, logger, parseErrors);
  if (messages.length === 0) return null;
  return buildConv(id, title, createdAt, updatedAt, messages, storagePath, sessionType, parseErrors);
}

function extractBubbles(rawBubbles: unknown, logger: Logger, parseErrors: string[] = []): ChatMessage[] {
  if (!Array.isArray(rawBubbles)) return [];
  const messages: ChatMessage[] = [];
  for (let i = 0; i < rawBubbles.length; i++) {
    const bubble = rawBubbles[i];
    if (!bubble || typeof bubble !== 'object') continue;
    try {
      const msg = extractOneBubble(bubble as Record<string, unknown>, logger);
      if (msg) messages.push(msg);
    } catch (err) {
      const e = `Bubble[${i}] parse error: ${String(err)}`;
      parseErrors.push(e);
      logger.warn(e);
    }
  }
  return messages;
}

function extractOneBubble(bubble: Record<string, unknown>, logger: Logger): ChatMessage | null {
  const role = resolveRole(bubble);
  let content = extractText(bubble, logger);
  const toolName = strOrNull(bubble['functionName'] ?? bubble['toolName'] ?? bubble['tool']);
  if (!content) return null;
  const timestampMs = resolveTimestampMs(bubble['timestamp'] ?? bubble['createdAt'] ?? bubble['time']);
  return { role, content, toolName: toolName ?? undefined, timestampMs: timestampMs ?? undefined };
}

function extractText(bubble: Record<string, unknown>, logger: Logger): string {
  const direct = bubble['text'] ?? bubble['content'] ?? bubble['message'] ?? bubble['body'] ?? bubble['markdown'];
  if (typeof direct === 'string' && direct.trim()) return direct;
  if (Array.isArray(bubble['parts'])) return extractParts(bubble['parts'] as unknown[]);
  if (Array.isArray(bubble['content'])) return extractParts(bubble['content'] as unknown[]);
  if (direct && typeof direct === 'object') {
    const r = direct as Record<string, unknown>;
    if (typeof r['text'] === 'string') return r['text'];
    if (typeof r['content'] === 'string') return r['content'];
  }
  return '';
}

function extractParts(parts: unknown[]): string {
  return parts.flatMap(p => {
    if (typeof p === 'string') return [p];
    if (!p || typeof p !== 'object') return [];
    const o = p as Record<string, unknown>;
    if (o['type'] === 'text' && typeof o['text'] === 'string') return [o['text']];
    if (typeof o['text'] === 'string') return [o['text']];
    return [];
  }).join('\n\n');
}

function resolveRole(bubble: Record<string, unknown>): MessageRole {
  const rawRole = bubble['type'] ?? bubble['role'] ?? bubble['sender'] ?? bubble['author'];
  if (typeof rawRole !== 'string') return 'unknown';
  const r = rawRole.toLowerCase();
  if (r === 'user' || r === 'human' || r === '1') return 'user';
  if (r === 'ai' || r === 'assistant' || r === 'model' || r === 'bot' || r === '2') return 'assistant';
  if (r === 'system') return 'system';
  if (r === 'tool' || r === 'function') return 'tool';
  return 'unknown';
}

function buildConv(id: string, title: string | null, createdAt: string | null, updatedAt: string | null, messages: ChatMessage[], storagePath: string, sessionType: string, parseErrors: string[]): Conversation {
  return { id, title, createdAt, updatedAt, messages, storagePath, sessionType, hasParseErrors: parseErrors.length > 0, parseErrors: parseErrors.length > 0 ? parseErrors : undefined };
}

function strOrNull(val: unknown): string | null {
  if (typeof val === 'string' && val.trim()) return val.trim();
  return null;
}

function resolveTs(val: unknown): string | null {
  const ms = resolveTimestampMs(val);
  if (ms === null) return null;
  return new Date(ms).toISOString();
}

function resolveTimestampMs(val: unknown): number | null {
  if (typeof val === 'number' && val > 0) return val < 1e12 ? val * 1000 : val;
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.getTime();
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) return n < 1e12 ? n * 1000 : n;
  }
  return null;
}
