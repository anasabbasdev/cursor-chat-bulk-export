/**
 * Generates the INDEX.md file summarising all exported conversations.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ExportResult, Logger } from '../types';

/**
 * Writes an INDEX.md file to the export directory.
 */
export function writeIndexFile(
  outputDir: string,
  workspacePath: string,
  results: ExportResult[],
  exportedAt: Date,
  logger: Logger
): void {
  const lines: string[] = [];

  const successful = results.filter(r => !r.error && !r.skipped);
  const skipped = results.filter(r => r.skipped);
  const failed = results.filter(r => r.error);

  const totalVisible = successful.reduce((sum, r) => sum + (r.visibleCount ?? r.conversation.messages.length), 0);
  const totalFiltered = successful.reduce((sum, r) => sum + (r.filteredCount ?? 0), 0);

  lines.push('# Cursor Chat Export — Index');
  lines.push('');
  lines.push(`- **Export date:** ${exportedAt.toISOString()}`);
  lines.push(`- **Workspace:** ${workspacePath}`);
  lines.push(`- **Total conversations selected:** ${results.length}`);
  lines.push(`- **Successfully exported:** ${successful.length}`);
  if (skipped.length > 0) {
    lines.push(`- **Skipped (already existed):** ${skipped.length}`);
  }
  if (failed.length > 0) {
    lines.push(`- **Failed:** ${failed.length}`);
  }
  if (totalFiltered > 0) {
    lines.push(`- **Total internal messages filtered:** ${totalFiltered}`);
    lines.push(`- **Total visible messages exported:** ${totalVisible}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Exported Files');
  lines.push('');

  for (const r of successful) {
    const filename = path.basename(r.outputPath);
    const title = r.conversation.title ?? '*(untitled)*';
    const date = r.conversation.createdAt ? ` — ${r.conversation.createdAt.slice(0, 10)}` : '';

    const visibleCount = r.visibleCount ?? r.conversation.messages.length;
    const filteredCount = r.filteredCount ?? 0;
    const msgs = r.conversation.messages;

    // Role counts on visible messages
    const visibleMsgs = r.visibleMessages ?? msgs;
    const roleCounts: Record<string, number> = {};
    for (const m of visibleMsgs) {
      roleCounts[m.role] = (roleCounts[m.role] ?? 0) + 1;
    }
    const roleStr = ['user', 'assistant', 'tool', 'system']
      .filter(role => roleCounts[role])
      .map(role => `${role.charAt(0).toUpperCase() + role.slice(1)}: ${roleCounts[role]}`)
      .join(', ');
    const unknownCount = roleCounts['unknown'] ?? 0;

    let line = `- [\`${filename}\`](./${filename}) — **${title}**${date}`;
    line += `\n  - Messages exported: ${visibleCount}`;
    if (filteredCount > 0) {
      line += `, Internal filtered: ${filteredCount}`;
    }
    if (roleStr) {
      line += `\n  - Roles: ${roleStr}`;
      if (unknownCount > 0) {
        line += ` ⚠️ Other: ${unknownCount}`;
      }
    }
    lines.push(line);

    if (unknownCount > visibleCount * 0.3 && visibleCount > 3) {
      logger.warn(
        `High "unknown" role count for "${title}": ${unknownCount}/${visibleCount}. ` +
          'Role detection may be incomplete for this conversation format.'
      );
    }
  }

  if (failed.length > 0) {
    lines.push('');
    lines.push('## Failed Exports');
    lines.push('');
    for (const r of failed) {
      lines.push(`- \`${path.basename(r.outputPath)}\` — ${r.error}`);
    }
  }

  if (skipped.length > 0) {
    lines.push('');
    lines.push('## Skipped (File Already Existed)');
    lines.push('');
    for (const r of skipped) {
      lines.push(`- \`${path.basename(r.outputPath)}\``);
    }
  }

  const indexPath = path.join(outputDir, 'INDEX.md');
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(indexPath, lines.join('\n'), 'utf8');
    logger.log(`Wrote index: ${indexPath}`);
  } catch (err) {
    logger.error(`Failed to write INDEX.md`, err);
  }
}
