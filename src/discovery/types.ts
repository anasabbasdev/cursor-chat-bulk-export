/**
 * Types for conversation discovery diagnostics.
 */

import type { ComposerHeader } from '../storage/cursorDiskKV';
import type { Conversation } from '../types';

export interface JsonKeyMeta {
  isValidJson: boolean;
  topLevelType: string;
  topLevelKeys: string[];
  arrayLength: number | null;
}

export interface SuspiciousKeyRow {
  dbPath: string;
  tableName: string;
  key: string;
  valueSizeBytes: number;
  meta: JsonKeyMeta;
}

export interface TableScanInfo {
  name: string;
  columns: string[];
  rowCount: number | null;
}

export interface DbScanInfo {
  dbPath: string;
  sizeBytes: number;
  opened: boolean;
  openError?: string;
  backend: 'sqljs' | 'cli' | 'none';
  tables: TableScanInfo[];
  suspiciousKeys: SuspiciousKeyRow[];
  keyPatternCounts: Record<string, number>;
}

export interface RawCandidate {
  id: string;
  dbPath: string;
  tableName: string;
  key: string;
  valueSizeBytes: number;
  title: string | null;
  messageCountEstimate: number | null;
  bubbleCountEstimate: number | null;
  parsed: boolean;
  parseReason?: string;
  source: string;
  composerId?: string;
}

export interface DedupeLogEntry {
  removedId: string;
  keptId: string;
  reason: 'composerId' | 'conversationId' | 'tabId' | 'sessionId' | 'fingerprint';
}

export interface DiscoveryReportData {
  generatedAt: string;
  workspacePath: string;
  normalizedWorkspacePath: string;
  workspaceStorageHashes: string[];
  includePossibleByFolderName: boolean;
  globalStorageScanned: boolean;
  globalStoragePath: string | null;
  dbScans: DbScanInfo[];
  totalComposerDataInGlobal: number;
  composerDataAfterWorkspaceFilter: number;
  suspiciousKeyTotal: number;
  candidatesFound: number;
  parsedConversationCount: number;
  conversationsBeforeDedupe: number;
  conversationsAfterDedupe: number;
  dedupeRemoved: DedupeLogEntry[];
  unparsedRelevant: Array<{
    dbPath: string;
    table: string;
    key: string;
    topLevelKeys: string[];
    reason: string;
  }>;
  mismatchCase: 'A' | 'B' | 'C' | 'D' | 'OK' | 'UNKNOWN';
  mismatchExplanation: string;
}

export interface DiscoveryResult {
  report: DiscoveryReportData;
  candidates: RawCandidate[];
  composers: ComposerHeader[];
  conversations: Conversation[];
  allComposersInGlobal: ComposerHeader[];
  matchedComposers: ComposerHeader[];
}
