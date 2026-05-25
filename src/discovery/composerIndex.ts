/**
 * Extract composer/conversation IDs from ItemTable index JSON — bounded, no deep recursion.
 */

import { safeParseValue } from '../storage/sqliteReader';
import type { RawKVRecord } from '../types';

const MAX_DEPTH = 6;
const MAX_NODES = 5000;

const ID_FIELDS = ['composerId', 'conversationId', 'tabId', 'sessionId'] as const;

const ARRAY_ID_LIST_FIELDS = [
  'allComposers',
  'composers',
  'tabs',
  'conversations',
  'sessions',
  'threads',
  'archivedComposers',
  'recentComposers',
  'history',
  'items',
  'entries',
  'data',
  'list',
] as const;

export function extractComposerIdsFromRecords(records: RawKVRecord[]): string[] {
  const ids = new Set<string>();
  let nodesVisited = 0;

  for (const record of records) {
    const parsed = safeParseValue(record.value);
    if (!parsed) {
      continue;
    }
    collectIdsBounded(parsed, ids, new WeakSet<object>(), 0, () => {
      nodesVisited++;
      return nodesVisited > MAX_NODES;
    });
  }
  return [...ids];
}

type StopFn = () => boolean;

function collectIdsBounded(
  data: unknown,
  ids: Set<string>,
  visited: WeakSet<object>,
  depth: number,
  shouldStop: StopFn
): void {
  if (shouldStop() || depth > MAX_DEPTH || data === null || data === undefined) {
    return;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      collectIdsBounded(item, ids, visited, depth + 1, shouldStop);
      if (shouldStop()) {
        return;
      }
    }
    return;
  }

  if (typeof data !== 'object') {
    return;
  }

  const o = data as Record<string, unknown>;
  if (visited.has(o)) {
    return;
  }
  visited.add(o);

  for (const field of ID_FIELDS) {
    const v = o[field];
    if (typeof v === 'string' && v.length >= 8 && v.length <= 128) {
      ids.add(v);
    }
  }

  for (const arrField of ARRAY_ID_LIST_FIELDS) {
    const arr = o[arrField];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        collectIdsBounded(item, ids, visited, depth + 1, shouldStop);
        if (shouldStop()) {
          return;
        }
      }
    } else if (arrField === 'entries' && arr && typeof arr === 'object') {
      for (const entryId of Object.keys(arr as Record<string, unknown>)) {
        if (entryId.length >= 8 && entryId.length <= 128) {
          ids.add(entryId);
        }
        collectIdsBounded(
          (arr as Record<string, unknown>)[entryId],
          ids,
          visited,
          depth + 1,
          shouldStop
        );
        if (shouldStop()) {
          return;
        }
      }
    }
  }
}
