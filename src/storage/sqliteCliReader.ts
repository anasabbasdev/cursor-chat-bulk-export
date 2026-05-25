/**
 * Read-only SQLite access via the sqlite3 command-line tool.
 * Used when state.vscdb exceeds sql.js's ~2 GiB in-memory limit.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { Logger } from '../types';
import type { DbBackend, DbQueryResult } from './dbBackend';

const MAX_BUFFER = 512 * 1024 * 1024; // 512 MB stdout

// ---------------------------------------------------------------------------
// Locate sqlite3 executable
// ---------------------------------------------------------------------------

export function findSqlite3Executable(logger: Logger): string | null {
  const isWin = process.platform === 'win32';
  const ext = isWin ? '.exe' : '';
  const bundled = path.join(__dirname, `sqlite3${ext}`);

  const candidates = [
    bundled,
    'sqlite3',
    isWin ? 'sqlite3.exe' : 'sqlite3',
  ];

  for (const exe of candidates) {
    if (exe !== 'sqlite3' && exe !== 'sqlite3.exe' && !fs.existsSync(exe)) {
      continue;
    }
    try {
      const r = spawnSync(exe, ['-version'], {
        encoding: 'utf8',
        timeout: 8000,
        windowsHide: true,
      });
      if (r.status === 0 || (r.stdout && r.stdout.includes('SQLite'))) {
        logger.log(`Using sqlite3 CLI: ${exe}`);
        return exe;
      }
    } catch {
      // try next
    }
  }

  logger.warn(
    'sqlite3 command-line tool not found. ' +
      'For databases over 2 GB, install SQLite tools from https://www.sqlite.org/download.html ' +
      `(place sqlite3${ext} next to the extension in the out/ folder), or run: winget install SQLite.SQLite`
  );
  return null;
}

// ---------------------------------------------------------------------------
// CLI backend
// ---------------------------------------------------------------------------

export class CliBackend implements DbBackend {
  readonly kind = 'cli' as const;

  constructor(
    private readonly dbPath: string,
    private readonly sqlite3Path: string
  ) {}

  exec(sql: string, params?: string[]): DbQueryResult[] {
    const bound = bindParams(sql, params ?? []);
    return runSqlite3Json(this.sqlite3Path, this.dbPath, bound);
  }

  close(): void {
    // no persistent handle
  }
}

export function openCliBackend(
  dbPath: string,
  sqlite3Path: string
): DbBackend {
  return new CliBackend(dbPath, sqlite3Path);
}

// ---------------------------------------------------------------------------
// Query execution
// ---------------------------------------------------------------------------

function bindParams(sql: string, params: string[]): string {
  let i = 0;
  return sql.replace(/\?/g, () => {
    if (i >= params.length) {
      return "''";
    }
    const v = params[i++];
    return `'${String(v).replace(/'/g, "''")}'`;
  });
}

function runSqlite3Json(
  sqlite3Path: string,
  dbPath: string,
  sql: string
): DbQueryResult[] {
  const args = ['-readonly', '-json', dbPath, sql];
  const result = spawnSync(sqlite3Path, args, {
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
    windowsHide: true,
    timeout: 600_000, // 10 min for huge DBs
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || 'sqlite3 failed').trim();
    throw new Error(err);
  }

  const out = (result.stdout || '').trim();
  if (!out) {
    return [];
  }

  const parsed = JSON.parse(out) as Record<string, unknown>[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [];
  }

  const columns = Object.keys(parsed[0]);
  const rows = parsed.map(row => columns.map(col => row[col]));
  return [{ columns, rows }];
}

/**
 * Builds SQL to load composerData rows scoped to a workspace (reduces data on huge DBs).
 */
export function buildComposerFilterSql(
  workspacePath: string,
  storageHashes: string[]
): string {
  const conditions: string[] = [];

  const pathNorm = workspacePath.replace(/\\/g, '/').toLowerCase();
  const pathWin = workspacePath.replace(/\//g, '\\').toLowerCase();
  const base = path.basename(workspacePath).toLowerCase();

  for (const frag of [pathNorm, pathWin, base]) {
    if (frag.length >= 4) {
      conditions.push(
        `instr(lower(CAST(value AS TEXT)), '${escapeSqlLiteral(frag)}') > 0`
      );
    }
  }

  for (const hash of storageHashes) {
    if (hash) {
      conditions.push(
        `instr(CAST(value AS TEXT), '${escapeSqlLiteral(hash)}') > 0`
      );
    }
  }

  if (conditions.length === 0) {
    return `SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'`;
  }

  return (
    `SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%' AND (` +
    conditions.join(' OR ') +
    `)`
  );
}

function escapeSqlLiteral(s: string): string {
  return s.replace(/'/g, "''");
}
