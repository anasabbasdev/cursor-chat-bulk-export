/**
 * Chat parser — converts Cursor's cursorDiskKV bubble records into
 * Conversation / ChatMessage objects.
 *
 * VERIFIED SCHEMA:
 *   bubble.type === 1  →  user
 *   bubble.type === 2  →  assistant
 *   bubble.type === 3  →  system (if present)
 *   bubble.text        →  plain text (primary)
 *   bubble.richText    →  Lexical JSON (fallback)
 *   bubble.thinking    →  assistant chain-of-thought
 *   bubble.capabilityType → non-null means tool call
 *   header.isRenderable === false → skip (internal/hidden bubble)
 */

import type { Conversation, ChatMessage, MessageRole, Logger } from '../types';
import type { ComposerHeader, BubbleContent, BubbleHeader } from '../storage/cursorDiskKV';

// ---------------------------------------------------------------------------
// Tool capability type numbers → human label
// Known values from observation (Cursor source not available)
// ---------------------------------------------------------------------------
const CAPABILITY_LABELS: Record<number, string> = {
  15: 'Tool Call',
  19: 'Terminal',
  30: 'Thinking',
  33: 'Plan',
  40: 'Read File',
  41: 'Edit File',
  42: 'Create File',
  50: 'Search',
  60: 'Browser',
};

// ---------------------------------------------------------------------------
// Main entry: composer → Conversation
// ---------------------------------------------------------------------------

/**
 * Converts a ComposerHeader (metadata + ordered header index) plus a loaded
 * bubble map into a Conversation.
 *
 * @param composer  Parsed composerData
 * @param bubbles   Map of bubbleId → BubbleContent (loaded from cursorDiskKV)
 * @param logger
 */
export interface ComposerParseOptions {
  /** Include archived/internal bubbles (default true for full history). */
  includeNonRenderable?: boolean;
}

export function composerToConversation(
  composer: ComposerHeader,
  bubbles: Map<string, BubbleContent>,
  logger: Logger,
  options: ComposerParseOptions = {}
): Conversation {
  const includeNonRenderable = options.includeNonRenderable !== false;
  const messages: ChatMessage[] = [];
  const parseErrors: string[] = [];

  const headersToWalk =
    composer.headers.length > 0
      ? composer.headers
      : [...bubbles.keys()].map(bubbleId => ({
          bubbleId,
          type: 0,
          isRenderable: true,
          hasText: true,
          isSimulatedMsg: false,
          capabilityType: null,
          toolFormerTool: null,
          toolCallId: null,
          hasThinking: false,
        }));

  for (const header of headersToWalk) {
    if (!includeNonRenderable && !header.isRenderable) {
      continue;
    }

    const bubble = bubbles.get(header.bubbleId);

    if (!bubble) {
      // Bubble record not found locally (common for NAL/encrypted composers)
      // Only emit a placeholder if this was a renderable text message
      if (header.hasText) {
        const role = headerToRole(header);
        logger.warn(
          `Bubble ${header.bubbleId} not in cursorDiskKV — ` +
            `may be encrypted (isNAL=${composer.isNAL})`
        );
        messages.push({
          role,
          content: `[Message content not available locally — may be server-encrypted]`,
          missingAttachments: [`bubbleId:${header.bubbleId}`],
        });
      }
      continue;
    }

    try {
      const msg = bubbleToMessage(bubble, header, logger);
      if (msg) {
        messages.push(msg);
      }
    } catch (err) {
      const e = `Bubble ${header.bubbleId} parse error: ${String(err)}`;
      parseErrors.push(e);
      logger.warn(e);
    }
  }

  return {
    id: composer.composerId,
    title: composer.name,
    createdAt: composer.createdAt ? new Date(composer.createdAt).toISOString() : null,
    updatedAt: composer.lastUpdatedAt ? new Date(composer.lastUpdatedAt).toISOString() : null,
    messages,
    storagePath: 'globalStorage/cursorDiskKV',
    sessionType: composer.unifiedMode ?? 'composer',
    hasParseErrors: parseErrors.length > 0,
    parseErrors: parseErrors.length > 0 ? parseErrors : undefined,
  };
}

// ---------------------------------------------------------------------------
// Single bubble → ChatMessage
// ---------------------------------------------------------------------------

function bubbleToMessage(
  bubble: BubbleContent,
  header: BubbleHeader,
  logger: Logger
): ChatMessage | null {
  const role = bubbleTypeToRole(bubble.type, header);
  let content = bubble.text?.trim() ?? '';

  // If thinking is present, prepend it as a collapsible block
  if (bubble.thinking?.trim()) {
    content =
      `> **Thinking:**\n> ${bubble.thinking.replace(/\n/g, '\n> ')}\n\n` + content;
  }

  // For tool calls, add a label if content is empty/minimal
  if (header.capabilityType !== null) {
    const label =
      CAPABILITY_LABELS[header.capabilityType] ??
      `Tool (type ${header.capabilityType})`;
    const toolLabel = header.toolCallId
      ? `**${label}** \`${header.toolCallId}\``
      : `**${label}**`;

    if (!content.trim()) {
      content = toolLabel;
    } else {
      content = `${toolLabel}\n\n${content}`;
    }
  }

  if (!content.trim()) {
    // Truly empty bubble — skip unless it's a user message (they may type spaces)
    if (bubble.type !== 1) {
      return null;
    }
  }

  return {
    role,
    content,
    timestampMs: bubble.createdAt ?? undefined,
    missingAttachments: undefined,
  };
}

// ---------------------------------------------------------------------------
// Role resolution
// ---------------------------------------------------------------------------

function bubbleTypeToRole(type: number, header: BubbleHeader): MessageRole {
  if (type === 1) {
    return header.isSimulatedMsg ? 'system' : 'user';
  }
  if (type === 2) {
    if (header.capabilityType !== null) {
      // capabilityType 30 = thinking block; render as assistant
      if (header.capabilityType === 30) {
        return 'assistant';
      }
      return 'tool';
    }
    return 'assistant';
  }
  if (type === 3) {
    return 'system';
  }
  return 'unknown';
}

function headerToRole(header: BubbleHeader): MessageRole {
  return bubbleTypeToRole(header.type, header);
}

// ---------------------------------------------------------------------------
// Title inference
// ---------------------------------------------------------------------------

/**
 * Infers a display title for a conversation.
 * Priority:
 *   1. composer.name (set by Cursor when it generates a title)
 *   2. First user message first line (≤60 chars)
 *   3. "Untitled Chat N"
 */
export function inferConversationTitle(
  conversation: Conversation,
  fallbackIndex: number
): string {
  if (conversation.title?.trim()) {
    return cleanTitle(conversation.title);
  }

  const firstUser = conversation.messages.find(m => m.role === 'user');
  if (firstUser?.content?.trim()) {
    const line = firstUser.content.split('\n')[0].trim();
    if (line.length > 3) {
      return cleanTitle(line);
    }
    // Try second line
    const secondLine = firstUser.content.split('\n').find(l => l.trim().length > 3);
    if (secondLine) {
      return cleanTitle(secondLine);
    }
  }

  const firstMsg = conversation.messages[0];
  if (firstMsg?.content?.trim()) {
    return cleanTitle(firstMsg.content.split('\n')[0]);
  }

  return `Untitled Chat ${String(fallbackIndex).padStart(2, '0')}`;
}

function cleanTitle(raw: string): string {
  // Remove markdown syntax (##, **, __, `, etc.) for cleaner display
  return raw
    .replace(/^#{1,6}\s+/, '')
    .replace(/[*_`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}
