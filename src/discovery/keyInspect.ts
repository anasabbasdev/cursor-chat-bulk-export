/**
 * Inspect KV keys and JSON metadata without logging huge values.
 */

import type { JsonKeyMeta } from './types';

export const SUSPICIOUS_KEY_TERMS = [
  'composer',
  'chat',
  'conversation',
  'agent',
  'ai',
  'bubble',
  'message',
  'tabs',
  'workbench',
  'aichat',
  'cursor',
  'thread',
  'session',
  'archive',
  'history',
];

export function isSuspiciousKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SUSPICIOUS_KEY_TERMS.some(term => lower.includes(term));
}

export function valueSizeBytes(value: string | Buffer | null | unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (Buffer.isBuffer(value)) {
    return value.length;
  }
  if (typeof value === 'string') {
    return Buffer.byteLength(value, 'utf8');
  }
  if (value instanceof Uint8Array) {
    return value.length;
  }
  return String(value).length;
}

export function inspectJsonMeta(value: string | Buffer | null): JsonKeyMeta {
  if (value === null) {
    return { isValidJson: false, topLevelType: 'null', topLevelKeys: [], arrayLength: null };
  }
  const str = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
  if (!str.trim()) {
    return { isValidJson: false, topLevelType: 'empty', topLevelKeys: [], arrayLength: null };
  }
  try {
    const parsed: unknown = JSON.parse(str);
    if (parsed === null) {
      return { isValidJson: true, topLevelType: 'null', topLevelKeys: [], arrayLength: null };
    }
    if (Array.isArray(parsed)) {
      return {
        isValidJson: true,
        topLevelType: 'array',
        topLevelKeys: [],
        arrayLength: parsed.length,
      };
    }
    if (typeof parsed === 'object') {
      return {
        isValidJson: true,
        topLevelType: 'object',
        topLevelKeys: Object.keys(parsed as object).slice(0, 40),
        arrayLength: null,
      };
    }
    return {
      isValidJson: true,
      topLevelType: typeof parsed,
      topLevelKeys: [],
      arrayLength: null,
    };
  } catch {
    return { isValidJson: false, topLevelType: 'string', topLevelKeys: [], arrayLength: null };
  }
}

export function countKeysByPattern(keys: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const term of SUSPICIOUS_KEY_TERMS) {
    counts[term] = 0;
  }
  counts['composerData:'] = 0;
  counts['bubbleId:'] = 0;

  for (const key of keys) {
    const lower = key.toLowerCase();
    for (const term of SUSPICIOUS_KEY_TERMS) {
      if (lower.includes(term)) {
        counts[term]++;
      }
    }
    if (key.startsWith('composerData:')) {
      counts['composerData:']++;
    }
    if (key.startsWith('bubbleId:')) {
      counts['bubbleId:']++;
    }
  }
  return counts;
}
