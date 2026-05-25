/**
 * Build and write conversation discovery diagnostic reports.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Logger } from '../types';
import type { DiscoveryReportData } from './types';

export function buildMismatchExplanation(stats: {
  uiCountHint: number | null;
  totalComposerData: number;
  allComposersParsed: number;
  matchedComposers: number;
  candidates: number;
  beforeDedupe: number;
  afterDedupe: number;
  dedupeRemoved: number;
}): Pick<DiscoveryReportData, 'mismatchCase' | 'mismatchExplanation'> {
  const ui = stats.uiCountHint;

  let mismatchCase: DiscoveryReportData['mismatchCase'] = 'UNKNOWN';
  let explanation = '';

  if (ui !== null && stats.afterDedupe === ui) {
    mismatchCase = 'OK';
    explanation = `Export count (${stats.afterDedupe}) matches UI hint (${ui}).`;
  } else if (stats.matchedComposers <= 5 && stats.totalComposerData > stats.matchedComposers * 3) {
    mismatchCase = 'D';
    explanation =
      `Case D: globalStorage has ${stats.totalComposerData} composerData rows but only ` +
      `${stats.matchedComposers} matched this workspace. ` +
      'Workspace path/hash matching or SQL prefilter may be too strict — enable folder-name matching and load ALL composerData without SQL filter.';
  } else if (stats.candidates >= 40 && stats.beforeDedupe <= 10) {
    mismatchCase = 'B';
    explanation =
      `Case B: ${stats.candidates} raw candidates found but only ${stats.beforeDedupe} parsed into conversations. Parser is incomplete for some key formats.`;
  } else if (stats.beforeDedupe >= 40 && stats.afterDedupe <= 10) {
    mismatchCase = 'C';
    explanation =
      `Case C: ${stats.beforeDedupe} parsed before dedupe but only ${stats.afterDedupe} after dedupe (${stats.dedupeRemoved} removed). Review dedupe logs.`;
  } else if (stats.candidates <= 10 && stats.matchedComposers <= 10) {
    mismatchCase = 'A';
    explanation =
      `Case A: Only ${stats.candidates} candidates / ${stats.matchedComposers} matched composers. ` +
      'Storage scan or key discovery is incomplete — check archived keys in ItemTable and all composerData rows.';
  } else if (ui !== null && stats.afterDedupe > ui * 2) {
    mismatchCase = 'UNKNOWN';
    explanation =
      `Found ${stats.afterDedupe} conversations after dedupe but UI shows ~${ui}. ` +
      'Over-discovery was trimmed — if still high, check folder-name workspace matches (wamp vs laragon).';
  } else if (ui !== null && stats.afterDedupe >= ui * 0.5 && stats.afterDedupe <= ui * 1.5) {
    mismatchCase = 'OK';
    explanation = `Export count (${stats.afterDedupe}) is close to UI hint (~${ui}).`;
  } else {
    mismatchCase = 'UNKNOWN';
    explanation =
      `Candidates: ${stats.candidates}, matched composers: ${stats.matchedComposers}, ` +
      `parsed: ${stats.beforeDedupe}, after dedupe: ${stats.afterDedupe}, ` +
      `total composerData in global: ${stats.totalComposerData}.` +
      (ui !== null ? ` Cursor UI shows ~${ui}.` : '');
  }

  return { mismatchCase, mismatchExplanation: explanation };
}

export function formatDiscoveryReportMarkdown(report: DiscoveryReportData): string {
  const lines: string[] = [];
  lines.push('# Conversation Discovery Report');
  lines.push('');
  lines.push(`- **Generated:** ${report.generatedAt}`);
  lines.push(`- **Workspace:** ${report.workspacePath}`);
  lines.push(`- **Normalized path:** ${report.normalizedWorkspacePath}`);
  lines.push(`- **Workspace storage hashes:** ${report.workspaceStorageHashes.join(', ') || '(none)'}`);
  lines.push(`- **Include folder-name matches:** ${report.includePossibleByFolderName}`);
  lines.push(`- **globalStorage scanned:** ${report.globalStorageScanned}`);
  if (report.globalStoragePath) {
    lines.push(`- **globalStorage path:** ${report.globalStoragePath}`);
  }
  lines.push('');
  lines.push('## Mismatch analysis');
  lines.push('');
  lines.push(`- **Case:** ${report.mismatchCase}`);
  lines.push(`- **Explanation:** ${report.mismatchExplanation}`);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| composerData:* rows in global DB | ${report.totalComposerDataInGlobal} |`);
  lines.push(`| Composers matching workspace filter | ${report.composerDataAfterWorkspaceFilter} |`);
  lines.push(`| Suspicious keys logged | ${report.suspiciousKeyTotal} |`);
  lines.push(`| Raw candidates | ${report.candidatesFound} |`);
  lines.push(`| Parsed conversations (before dedupe) | ${report.conversationsBeforeDedupe} |`);
  lines.push(`| Final conversations (after dedupe) | ${report.conversationsAfterDedupe} |`);
  lines.push(`| Duplicates removed | ${report.dedupeRemoved.length} |`);
  lines.push('');
  lines.push('## Databases scanned');
  lines.push('');
  for (const db of report.dbScans) {
    lines.push(`### \`${db.dbPath}\``);
    lines.push('');
    lines.push(`- **Size:** ${(db.sizeBytes / 1024 / 1024).toFixed(1)} MB`);
    lines.push(`- **Opened:** ${db.opened} (${db.backend})`);
    if (db.openError) {
      lines.push(`- **Error:** ${db.openError}`);
    }
    lines.push('- **Tables:**');
    for (const t of db.tables) {
      lines.push(`  - \`${t.name}\` — columns: ${t.columns.join(', ')} — rows: ${t.rowCount ?? '?'}`);
    }
    lines.push('- **Key pattern counts:**');
    for (const [k, v] of Object.entries(db.keyPatternCounts)) {
      if (v > 0) {
        lines.push(`  - ${k}: ${v}`);
      }
    }
    lines.push('');
  }
  if (report.dedupeRemoved.length > 0) {
    lines.push('## Deduplication removed');
    lines.push('');
    for (const d of report.dedupeRemoved.slice(0, 50)) {
      lines.push(`- removed \`${d.removedId}\` kept \`${d.keptId}\` (${d.reason})`);
    }
    if (report.dedupeRemoved.length > 50) {
      lines.push(`- … and ${report.dedupeRemoved.length - 50} more`);
    }
    lines.push('');
  }
  if (report.unparsedRelevant.length > 0) {
    lines.push('## Relevant JSON not parsed');
    lines.push('');
    for (const u of report.unparsedRelevant.slice(0, 80)) {
      lines.push(`- **${u.dbPath}** / \`${u.table}\` / \`${u.key}\` — keys: ${u.topLevelKeys.join(', ')} — ${u.reason}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function writeDiscoveryReportFile(
  workspacePath: string,
  report: DiscoveryReportData,
  logger: Logger
): string {
  const outDir = path.join(workspacePath, '.cursor-chat-export', 'diagnostics');
  const outPath = path.join(outDir, 'conversation-discovery-report.md');
  fs.mkdirSync(outDir, { recursive: true });
  const md = formatDiscoveryReportMarkdown(report);
  fs.writeFileSync(outPath, md, 'utf8');
  logger.log(`Wrote discovery report: ${outPath}`);
  return outPath;
}

export function logDiscoveryReportToChannel(
  report: DiscoveryReportData,
  logger: Logger
): void {
  logger.log('=== Conversation Discovery Report ===');
  logger.log(`Workspace: ${report.workspacePath}`);
  logger.log(`Normalized: ${report.normalizedWorkspacePath}`);
  logger.log(`Hashes: ${report.workspaceStorageHashes.join(', ')}`);
  logger.log(`globalStorage scanned: ${report.globalStorageScanned}`);
  logger.log(`Total composerData in global: ${report.totalComposerDataInGlobal}`);
  logger.log(`Matched workspace composers: ${report.composerDataAfterWorkspaceFilter}`);
  logger.log(`Suspicious keys: ${report.suspiciousKeyTotal}`);
  logger.log(`Candidates: ${report.candidatesFound}`);
  logger.log(`Parsed (before dedupe): ${report.conversationsBeforeDedupe}`);
  logger.log(`Final (after dedupe): ${report.conversationsAfterDedupe}`);
  logger.log(`Dedupe removed: ${report.dedupeRemoved.length}`);
  logger.log(`Case ${report.mismatchCase}: ${report.mismatchExplanation}`);
  for (const db of report.dbScans) {
    logger.log(`DB: ${db.dbPath} (${(db.sizeBytes / 1024 / 1024).toFixed(1)} MB) backend=${db.backend}`);
    for (const t of db.tables) {
      logger.log(`  table ${t.name}: ${t.rowCount ?? '?'} rows`);
    }
    for (const [k, v] of Object.entries(db.keyPatternCounts)) {
      if (v > 0) {
        logger.log(`  pattern "${k}": ${v}`);
      }
    }
    for (const sk of db.suspiciousKeys.slice(0, 30)) {
      logger.log(
        `  key "${sk.key}" (${sk.tableName}) size=${sk.valueSizeBytes} json=${sk.meta.isValidJson} type=${sk.meta.topLevelType}` +
          (sk.meta.topLevelKeys.length ? ` keys=${sk.meta.topLevelKeys.slice(0, 8).join(',')}` : '') +
          (sk.meta.arrayLength !== null ? ` arrLen=${sk.meta.arrayLength}` : '')
      );
    }
    if (db.suspiciousKeys.length > 30) {
      logger.log(`  … ${db.suspiciousKeys.length - 30} more suspicious keys (see markdown report)`);
    }
  }
}
