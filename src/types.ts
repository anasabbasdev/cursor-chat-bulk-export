/**
 * Core TypeScript types for the Cursor Chat Bulk Export extension.
 */

// ---------------------------------------------------------------------------
// Storage / workspace discovery
// ---------------------------------------------------------------------------

/** One entry under workspaceStorage – a hashed folder with a state.vscdb */
export interface WorkspaceStorageEntry {
  /** Absolute path to the hashed folder, e.g. …/workspaceStorage/abc123 */
  storagePath: string;
  /** Hash name (folder basename) */
  hash: string;
  /** Resolved workspace folder URI/path from workspace.json or the DB */
  workspacePath: string | null;
  /** Human-readable label (folder name of the workspace) */
  workspaceLabel: string | null;
  /** Absolute path to state.vscdb if it exists */
  dbPath: string | null;
}

// ---------------------------------------------------------------------------
// Raw DB records
// ---------------------------------------------------------------------------

/** A raw key-value row from ItemTable or similar VSCode state tables */
export interface RawKVRecord {
  key: string;
  value: string | Buffer | null;
}

/** Information about a SQLite table discovered in the DB */
export interface TableInfo {
  name: string;
  columns: string[];
}

// ---------------------------------------------------------------------------
// Parsed chat / conversation structures
// ---------------------------------------------------------------------------

/** Roles that can appear in a conversation */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool' | 'unknown';

/** A single message inside a conversation */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  /** Raw tool/function name if role === 'tool' */
  toolName?: string;
  /** Timestamp in ms since epoch, if available */
  timestampMs?: number;
  /** Any attachment/blob references that could not be resolved */
  missingAttachments?: string[];
}

/** A full conversation (tab/session) */
export interface Conversation {
  /** Unique ID from Cursor storage */
  id: string;
  /** Human-readable title if available */
  title: string | null;
  /** ISO timestamp string when conversation was created/last updated */
  createdAt: string | null;
  updatedAt: string | null;
  /** Ordered messages */
  messages: ChatMessage[];
  /** Which storage entry this came from */
  storagePath: string;
  /** Composer / agent / chat type tag if available */
  sessionType?: string;
  /** Whether this conversation had any parse errors */
  hasParseErrors?: boolean;
  /** Raw parse error messages for logging */
  parseErrors?: string[];
}

// ---------------------------------------------------------------------------
// Export structures
// ---------------------------------------------------------------------------

/** Result of exporting a single conversation */
export interface ExportResult {
  conversation: Conversation;
  /** Absolute path to the written .md file */
  outputPath: string;
  /** Whether the file was skipped due to already existing (and user declined overwrite) */
  skipped: boolean;
  error?: string;
  /** How many messages were written after filtering */
  visibleCount?: number;
  /** How many messages were filtered out (tool calls, thinking, empties) */
  filteredCount?: number;
  /** The visible messages after filtering (for role-count stats in INDEX.md) */
  visibleMessages?: ChatMessage[];
}

// ---------------------------------------------------------------------------
// Export options
// ---------------------------------------------------------------------------

/**
 * Controls which messages are included in the exported Markdown.
 * Default: clean export (no tool calls, no thinking blocks, no empty messages).
 */
export interface ExportOptions {
  /**
   * Include tool-call messages.
   * When false (default), messages whose content is only internal tool call IDs
   * (e.g. `**Tool Call** \`tool_xxxxx\``) are omitted.
   */
  includeToolCalls: boolean;
  /**
   * Include assistant "Thinking" / reasoning placeholder blocks.
   * When false (default), messages that contain only a thinking placeholder
   * (`**Thinking**`, `*Thinking*`, `Thinking...`, etc.) are omitted.
   */
  includeThinkingBlocks: boolean;
  /**
   * Include messages that are empty or contain only whitespace / separators.
   */
  includeEmptyMessages: boolean;
}

/** Returns the recommended clean-export defaults. */
export function defaultExportOptions(): ExportOptions {
  return {
    includeToolCalls: false,
    includeThinkingBlocks: false,
    includeEmptyMessages: false,
  };
}

/** Returns full raw export options (nothing filtered). */
export function fullExportOptions(): ExportOptions {
  return {
    includeToolCalls: true,
    includeThinkingBlocks: true,
    includeEmptyMessages: true,
  };
}

/** Summary written to INDEX.md */
export interface ExportIndex {
  exportedAt: string;
  workspacePath: string;
  totalConversations: number;
  results: ExportResult[];
}

// ---------------------------------------------------------------------------
// Selection UI
// ---------------------------------------------------------------------------

/** QuickPick item representing a conversation for selection */
export interface ConversationQuickPickItem {
  label: string;
  description: string;
  detail: string;
  conversation: Conversation;
  picked?: boolean;
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

/** Minimal logger interface backed by vscode.OutputChannel */
export interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string, err?: unknown): void;
  show(): void;
}
