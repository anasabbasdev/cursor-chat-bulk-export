/**
 * Schema discovery for Cursor state.vscdb databases.
 *
 * Cursor stores conversation data as JSON blobs inside the standard VS Code
 * ItemTable. The keys follow patterns like:
 *
 *   composer.composerData                — composer/agent sessions index
 *   workbench.panel.aichat.view.aichat.chatdata  — inline chat history
 *   aiService.prompts                    — prompt history
 *   aiService.generations               — generation history
 *
 * The exact schema may differ between Cursor versions, so we use heuristic
 * key matching rather than hard-coding exact key names.
 *
 * Known key patterns (as of Cursor 0.4x – 0.5x):
 *   - composer.*
 *   - workbench.panel.aichat.*
 *   - aiService.*
 *   - cursor.*
 */

import type { RawKVRecord, Logger } from '../types';

/** Key prefixes / substrings that are likely to contain chat data */
const CHAT_KEY_PATTERNS: RegExp[] = [
  /composer/i,
  /aichat/i,
  /aiService/i,
  /chatdata/i,
  /cursor\.chat/i,
  /cursor\.composer/i,
  /cursor\.agent/i,
  /chatHistory/i,
  /conversationHistory/i,
  /bubbleId/i,
  /tabs/i,          // composer stores tabs array
];

/**
 * Filters a list of raw KV records down to those whose keys match
 * known Cursor chat data patterns.
 */
export function filterChatRecords(records: RawKVRecord[], logger: Logger): RawKVRecord[] {
  const chatRecords = records.filter(r =>
    CHAT_KEY_PATTERNS.some(p => p.test(r.key))
  );
  logger.log(
    `filterChatRecords: ${chatRecords.length}/${records.length} records match chat key patterns`
  );
  if (chatRecords.length > 0) {
    logger.log(`  Matched keys: ${chatRecords.map(r => r.key).join(', ')}`);
  }
  return chatRecords;
}

/**
 * Dumps all keys from records to the logger for diagnostic purposes.
 * Use this when no records are found to help diagnose schema differences.
 */
export function dumpAllKeys(records: RawKVRecord[], logger: Logger): void {
  logger.log(`All keys in DB (${records.length} total):`);
  for (const r of records) {
    const preview = valuePreview(r.value);
    logger.log(`  "${r.key}" → ${preview}`);
  }
}

function valuePreview(value: string | Buffer | null): string {
  if (value === null) {
    return '(null)';
  }
  const str = Buffer.isBuffer(value) ? value.toString('utf8') : value;
  return str.length > 120 ? str.slice(0, 120) + '…' : str;
}

/**
 * Categorises a chat key into a human-readable type label.
 */
export function classifyKey(key: string): string {
  if (/composer/i.test(key)) {
    return 'composer';
  }
  if (/aichat|chatdata/i.test(key)) {
    return 'chat';
  }
  if (/aiService/i.test(key)) {
    return 'aiService';
  }
  if (/agent/i.test(key)) {
    return 'agent';
  }
  return 'unknown';
}
