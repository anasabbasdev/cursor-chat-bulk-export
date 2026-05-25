/**
 * Deduplicate conversations — only by strong IDs or content fingerprint.
 */

import type { Conversation } from '../types';
import type { DedupeLogEntry } from './types';

function firstLine(role: string, messages: Conversation['messages']): string {
  const m = messages.find(msg => msg.role === role);
  return m?.content?.split('\n')[0]?.trim().slice(0, 120) ?? '';
}

function fingerprint(conv: Conversation): string {
  const title = (conv.title ?? '').trim().toLowerCase();
  const user = firstLine('user', conv.messages);
  const assistant = firstLine('assistant', conv.messages);
  return `fp:${title}|${user}|${assistant}|${conv.messages.length}`;
}

function isStrongId(id: string): boolean {
  if (!id || id.length < 8) {
    return false;
  }
  if (id.startsWith('fp:')) {
    return false;
  }
  // UUID-like or long stable ids
  return /^[0-9a-f-]{20,}$/i.test(id) || id.length >= 16;
}

export function dedupeConversations(conversations: Conversation[]): {
  conversations: Conversation[];
  removed: DedupeLogEntry[];
} {
  const byStrongId = new Map<string, Conversation>();
  const byFingerprint = new Map<string, Conversation>();
  const removed: DedupeLogEntry[] = [];
  const result: Conversation[] = [];

  for (const conv of conversations) {
    const id = conv.id?.trim() ?? '';

    if (isStrongId(id)) {
      const existing = byStrongId.get(id);
      if (existing) {
        const keep = pickRicher(existing, conv);
        const drop = keep === existing ? conv : existing;
        if (keep === conv) {
          byStrongId.set(id, conv);
          const idx = result.indexOf(existing);
          if (idx >= 0) {
            result[idx] = conv;
          }
        }
        if (drop.id !== keep.id) {
          removed.push({
            removedId: drop.id,
            keptId: keep.id,
            reason: id.includes('tab') ? 'tabId' : id.includes('session') ? 'sessionId' : 'composerId',
          });
        }
        continue;
      }
      byStrongId.set(id, conv);
      result.push(conv);
      continue;
    }

    const fp = fingerprint(conv);
    const existingFp = byFingerprint.get(fp);
    if (existingFp && conv.messages.length <= existingFp.messages.length) {
      removed.push({ removedId: conv.id, keptId: existingFp.id, reason: 'fingerprint' });
      continue;
    }
    if (existingFp) {
      removed.push({ removedId: existingFp.id, keptId: conv.id, reason: 'fingerprint' });
      const idx = result.indexOf(existingFp);
      if (idx >= 0) {
        result[idx] = conv;
      }
      byFingerprint.set(fp, conv);
      continue;
    }
    byFingerprint.set(fp, conv);
    result.push(conv);
  }

  return { conversations: result, removed };
}

function pickRicher(a: Conversation, b: Conversation): Conversation {
  if (b.messages.length > a.messages.length) {
    return b;
  }
  if (a.messages.length > b.messages.length) {
    return a;
  }
  return (b.title?.length ?? 0) > (a.title?.length ?? 0) ? b : a;
}
