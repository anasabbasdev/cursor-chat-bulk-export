/**
 * Abstraction over sql.js and sqlite3 CLI so cursorDiskKV queries work
 * for databases larger than sql.js's ~2 GiB limit.
 */

import * as fs from 'fs';
import type { Logger } from '../types';

export interface DbQueryResult {
  columns: string[];
  rows: unknown[][];
}

export interface DbBackend {
  readonly kind: 'sqljs' | 'cli';
  exec(sql: string, params?: string[]): DbQueryResult[];
  close(): void;
}

/** sql.js cannot load files at or above this size (ArrayBuffer limit). */
export const SQLJS_MAX_BYTES = Math.floor(1.85 * 1024 * 1024 * 1024);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlJsDatabase = any;

export class SqlJsBackend implements DbBackend {
  readonly kind = 'sqljs' as const;

  constructor(private readonly db: SqlJsDatabase) {}

  exec(sql: string, params?: string[]): DbQueryResult[] {
    const raw = this.db.exec(sql, params ?? []) as Array<{
      columns: string[];
      values: unknown[][];
    }>;
    return raw.map(r => ({
      columns: r.columns,
      rows: r.values,
    }));
  }

  close(): void {
    try {
      this.db.close();
    } catch {
      // ignore
    }
  }
}

export function wrapSqlJs(db: SqlJsDatabase): DbBackend {
  return new SqlJsBackend(db);
}

export function getDatabaseSizeBytes(dbPath: string): number {
  try {
    return fs.statSync(dbPath).size;
  } catch {
    return 0;
  }
}

export function formatSizeMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

export function isTooLargeForSqlJs(bytes: number): boolean {
  return bytes >= SQLJS_MAX_BYTES;
}

export function logOpenStrategy(
  dbPath: string,
  bytes: number,
  kind: DbBackend['kind'],
  logger: Logger
): void {
  logger.log(
    `Opened DB via ${kind} (${formatSizeMb(bytes)} MB): ${dbPath}` +
      (kind === 'cli' ? ' — sqlite3 CLI (large file)' : '')
  );
}
