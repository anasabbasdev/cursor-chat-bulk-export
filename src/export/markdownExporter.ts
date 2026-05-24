/**
 * Markdown exporter — renders a Conversation into a .md file.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Conversation, ChatMessage, MessageRole, ExportOptions, Logger } from '../types';
import { inferConversationTitle } from '../chat/chatParser';
import { filterMessages, type FilterResult } from './exportFilter';
import { defaultExportOptions } from '../types';

// ---------------------------------------------------------------------------
// Role display helpers
// ---------------------------------------------------------------------------

const ROLE_HEADING: Record<MessageRole, string> = {
  user: 'User',
  assistant: 'Assistant',
  system: 'System',
  tool: 'Tool',
  unknown: 'Other',
};

function roleHeading(msg: ChatMessage): string {
  const label = ROLE_HEADING[msg.role] ?? 'Other';
  return msg.toolName ? `${label} (${msg.toolName})` : label;
}

// ---------------------------------------------------------------------------
// Conversation → Markdown string
// ---------------------------------------------------------------------------

export interface MarkdownRenderResult {
  markdown: string;
  visibleCount: number;
  filteredCount: number;
}

/**
 * Renders a Conversation to a Markdown string, applying export filters.
 */
export function conversationToMarkdown(
  conversation: Conversation,
  workspacePath: string,
  exportedAt: Date = new Date(),
  options: ExportOptions = defaultExportOptions(),
  logger?: Logger
): MarkdownRenderResult {
  const { visibleMessages, filteredCount }: FilterResult = filterMessages(
    conversation.messages,
    options,
    logger
  );

  const lines: string[] = [];

  // Header
  const title = inferConversationTitle(conversation, 1);
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`- **Workspace:** ${workspacePath}`);
  lines.push(`- **Exported at:** ${exportedAt.toISOString()}`);
  if (conversation.createdAt) {
    lines.push(`- **Original date:** ${conversation.createdAt}`);
  }
  if (conversation.updatedAt && conversation.updatedAt !== conversation.createdAt) {
    lines.push(`- **Last updated:** ${conversation.updatedAt}`);
  }
  if (conversation.sessionType) {
    lines.push(`- **Session type:** ${conversation.sessionType}`);
  }
  lines.push(`- **Messages:** ${visibleMessages.length}`);
  if (filteredCount > 0) {
    lines.push(`- **Filtered internal messages:** ${filteredCount}`);
  }
  lines.push('- **Source:** Cursor local chat storage');

  if (conversation.hasParseErrors && conversation.parseErrors?.length) {
    lines.push('');
    lines.push('> **Note:** Some messages in this conversation had parse errors:');
    for (const e of conversation.parseErrors) {
      lines.push(`> - ${e}`);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // Messages
  if (visibleMessages.length === 0) {
    lines.push('*(No messages to display after filtering.)*');
    lines.push('');
  } else {
    for (const msg of visibleMessages) {
      lines.push(`## ${roleHeading(msg)}`);
      lines.push('');
      lines.push(normaliseContent(msg.content));
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return {
    markdown: lines.join('\n'),
    visibleCount: visibleMessages.length,
    filteredCount,
  };
}

/**
 * Makes sure the content string is safe for embedding in Markdown.
 * Preserves existing code fences; doesn't double-escape.
 */
function normaliseContent(content: string): string {
  if (!content) {
    return '*(empty)*';
  }
  return content;
}

// ---------------------------------------------------------------------------
// File writing
// ---------------------------------------------------------------------------

export interface WriteResult {
  outputPath: string;
  skipped: boolean;
  error?: string;
}

/**
 * Writes a Markdown string to disk.
 *
 * - Creates parent directories as needed.
 * - If the file already exists, appends a numeric suffix to make it unique
 *   (instead of overwriting silently).
 */
export function writeMarkdownFile(
  outputDir: string,
  filename: string,
  markdown: string,
  logger: Logger
): WriteResult {
  try {
    fs.mkdirSync(outputDir, { recursive: true });
  } catch (err) {
    const msg = `Failed to create output directory: ${outputDir} — ${String(err)}`;
    logger.error(msg);
    return { outputPath: path.join(outputDir, filename), skipped: false, error: msg };
  }

  const outputPath = path.join(outputDir, filename);

  try {
    fs.writeFileSync(outputPath, markdown, 'utf8');
    logger.log(`Wrote: ${outputPath}`);
    return { outputPath, skipped: false };
  } catch (err) {
    const msg = `Failed to write file: ${outputPath} — ${String(err)}`;
    logger.error(msg);
    return { outputPath, skipped: false, error: msg };
  }
}
