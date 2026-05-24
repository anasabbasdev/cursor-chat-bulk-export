/**
 * Export filter — decides which messages are included in a clean export.
 *
 * Design rules:
 *  - NO recursive object traversal.
 *  - All filtering operates on a safe plain-text string extracted from message.content.
 *  - Every public function is pure (no side-effects) and bounded (no recursion).
 *  - shouldExportMessage wraps everything in try/catch; a failing filter keeps the message.
 */

import type { ChatMessage, ExportOptions, Logger } from '../types';

// ---------------------------------------------------------------------------
// Safe content extraction
// ---------------------------------------------------------------------------

/**
 * Extracts a plain-text string from message.content without any recursive traversal.
 * Handles string, array, or object content safely.
 */
export function getMessageTextForFiltering(message: ChatMessage): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: any = message.content;

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object') {
          if (typeof item.text === 'string') { return item.text; }
          if (typeof item.content === 'string') { return item.content; }
          if (typeof item.value === 'string') { return item.value; }
        }
        return '';
      })
      .join('\n');
  }

  if (value && typeof value === 'object') {
    if (typeof value.text === 'string') { return value.text; }
    if (typeof value.content === 'string') { return value.content; }
    if (typeof value.value === 'string') { return value.value; }
    return '';
  }

  return '';
}

/**
 * Collapses excess whitespace and trims. Does NOT strip markdown.
 */
export function normalizeTextForFiltering(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Content classifiers  (all operate on plain strings, no recursion)
// ---------------------------------------------------------------------------

/**
 * Returns true if the text is empty, whitespace-only, or consists only of
 * markdown separators (`---`, `===`, `***`).
 */
export function isEffectivelyEmpty(text: string): boolean {
  if (!text || !text.trim()) {
    return true;
  }
  const cleaned = text
    .replace(/^[-=*]{3,}$/gm, '')
    .replace(/\s/g, '');
  return cleaned.length === 0;
}

/**
 * Returns true if the text is a thinking placeholder with no real content.
 *
 * Matches (case-insensitive, after stripping markdown bold/italic/dots):
 *   "Thinking", "**Thinking**", "*Thinking*", "Thinking...", "Thinking…"
 *   Blockquote thinking blocks: "> **Thinking:**\n> ..." with nothing outside
 */
export function isThinkingOnly(text: string): boolean {
  if (!text || !text.trim()) {
    return true;
  }

  // Fast path: strip bold/italic markers, dots, trailing punctuation, then compare.
  const stripped = text
    .replace(/\*/g, '')
    .replace(/_/g, '')
    .replace(/\./g, '')
    .replace(/…/g, '')
    .replace(/:/g, '')
    .trim()
    .toLowerCase();

  if (stripped === 'thinking' || stripped === '') {
    return true;
  }

  // Blockquote thinking block with nothing outside it.
  // Lines starting with ">" that only contain a "Thinking" header + content,
  // and zero non-blockquote lines with actual text.
  const lines = text.split('\n');
  const nonBlockquoteLines = lines
    .filter(l => !l.trimStart().startsWith('>'))
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/^[-=*]{3,}$/.test(l));

  if (nonBlockquoteLines.length === 0) {
    // All non-empty lines are blockquote lines — check if the blockquote is just a Thinking header
    const blockquoteContent = lines
      .filter(l => l.trimStart().startsWith('>'))
      .map(l => l.replace(/^>+\s*/, '').trim())
      .filter(l => l.length > 0);

    if (blockquoteContent.length === 0) {
      return true;
    }

    // Blockquote contains only "Thinking" header line(s)
    const isOnlyThinkingHeader = blockquoteContent.every(l => {
      const cleaned = l.replace(/\*/g, '').replace(/_/g, '').replace(/:/g, '').trim().toLowerCase();
      return cleaned === 'thinking' || cleaned === '';
    });

    if (isOnlyThinkingHeader) {
      return true;
    }
  }

  return false;
}

/**
 * Returns true if the text contains nothing but internal tool-call IDs and labels.
 *
 * Strategy: strip all known ID patterns and labels; if nothing substantive remains → true.
 * No recursion, no splitting back into tokens.
 */
export function isToolCallOnly(text: string): boolean {
  if (!text || !text.trim()) {
    return true;
  }

  const cleaned = text
    // Remove markdown bold/italic
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    // Remove backtick spans
    .replace(/`[^`]*`/g, '')
    // Remove naked backticks
    .replace(/`/g, '')
    // Remove known label words
    .replace(/\bTool\s+Call\b/gi, '')
    .replace(/\bTool\s+Result\b/gi, '')
    .replace(/\bFunction\s+Call\b/gi, '')
    // Remove tool_ IDs
    .replace(/\btool_[A-Za-z0-9_-]+/g, '')
    // Remove call_ IDs (OpenAI)
    .replace(/\bcall_[A-Za-z0-9_-]+/g, '')
    // Remove fc_ IDs (Anthropic)
    .replace(/\bfc_[0-9a-fA-F]+/g, '')
    // Remove toolu_ IDs (Anthropic)
    .replace(/\btoolu_[A-Za-z0-9_-]+/g, '')
    // Remove chatcmpl- IDs
    .replace(/\bchatcmpl-[A-Za-z0-9_-]+/g, '')
    // Remove standard UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    // Remove markdown separators
    .replace(/^[-=*]{3,}$/gm, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length === 0;
}

// ---------------------------------------------------------------------------
// Main filter
// ---------------------------------------------------------------------------

/**
 * Returns true if the message should be included in the export.
 *
 * All logic is wrapped in try/catch — any unexpected error keeps the message
 * (fail-open: better to include noise than to crash or lose content).
 */
export function shouldExportMessage(
  message: ChatMessage,
  options: ExportOptions,
  logger?: Logger
): boolean {
  try {
    const text = getMessageTextForFiltering(message);
    const normalized = normalizeTextForFiltering(text);

    // Empty / separator-only messages
    if (!options.includeEmptyMessages && isEffectivelyEmpty(normalized)) {
      return false;
    }

    // All tool messages are dropped in clean mode — do NOT inspect their content.
    // Tool content can contain arbitrary objects that are expensive/unsafe to traverse.
    if (!options.includeToolCalls && message.role === 'tool') {
      return false;
    }

    // Thinking-only assistant messages
    if (!options.includeThinkingBlocks && message.role === 'assistant') {
      if (isThinkingOnly(normalized)) {
        return false;
      }
    }

    return true;
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id: string = (message as any).id ?? 'unknown';
    logger?.warn(`Filter error for message id=${id} role=${message.role} — keeping. ${String(err)}`);
    return true;
  }
}

// ---------------------------------------------------------------------------
// Batch filter
// ---------------------------------------------------------------------------

export interface FilterResult {
  visibleMessages: ChatMessage[];
  filteredCount: number;
}

/**
 * Filters a message array and returns visible messages + filtered count.
 * Logs progress at debug level when a logger is supplied.
 */
export function filterMessages(
  messages: ChatMessage[],
  options: ExportOptions,
  logger?: Logger
): FilterResult {
  logger?.log(`Filtering ${messages.length} messages (includeToolCalls=${options.includeToolCalls}, includeThinkingBlocks=${options.includeThinkingBlocks}, includeEmptyMessages=${options.includeEmptyMessages})`);

  const visibleMessages: ChatMessage[] = [];
  let filteredCount = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    try {
      if (shouldExportMessage(msg, options, logger)) {
        visibleMessages.push(msg);
      } else {
        filteredCount++;
      }
    } catch (err) {
      logger?.warn(`Unexpected error at message index=${i}, role=${msg.role} — keeping. ${String(err)}`);
      visibleMessages.push(msg);
    }
  }

  logger?.log(`Filter result: visible=${visibleMessages.length}, filtered=${filteredCount}`);

  return { visibleMessages, filteredCount };
}
