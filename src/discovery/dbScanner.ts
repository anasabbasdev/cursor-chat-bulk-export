/**
 * Scan SQLite databases — tables, row counts, suspicious key metadata.
 */

import type { DbBackend } from '../storage/dbBackend';
import { getDatabaseSizeBytes } from '../storage/dbBackend';
import { openDatabaseBackend, listTablesBackend } from '../storage/sqliteReader';
import type { Logger } from '../types';
import type { DbScanInfo, SuspiciousKeyRow, TableScanInfo } from './types';
import { inspectJsonMeta, isSuspiciousKey, countKeysByPattern } from './keyInspect';

function buildSuspiciousKeyWhere(aliasKey = 'key'): string {
  const terms = [
    'composer', 'chat', 'conversation', 'agent', 'bubble', 'message',
    'tabs', 'workbench', 'aichat', 'cursor', 'thread', 'session', 'archive', 'history', 'ai',
  ];
  const parts = terms.map(
    t => `lower(${aliasKey}) LIKE '%${t}%'`
  );
  return parts.join(' OR ');
}

function tableRowCount(db: DbBackend, tableName: string): number | null {
  try {
    const r = db.exec(`SELECT COUNT(*) as c FROM ${JSON.stringify(tableName)}`);
    if (!r.length || !r[0].rows.length) {
      return null;
    }
    return Number(r[0].rows[0][0]) ?? null;
  } catch {
    return null;
  }
}

function isKeyValueTable(columns: string[]): { keyCol: string; valueCol: string } | null {
  const lower = columns.map(c => c.toLowerCase());
  const keyCol = columns.find(c => ['key', 'id'].includes(c.toLowerCase()));
  const valueCol = columns.find(c =>
    ['value', 'data', 'content'].includes(c.toLowerCase())
  );
  if (keyCol && valueCol) {
    return { keyCol, valueCol };
  }
  return null;
}

function scanTableKeys(
  db: DbBackend,
  dbPath: string,
  tableName: string,
  keyCol: string,
  valueCol: string,
  logger: Logger,
  loadValues: boolean
): SuspiciousKeyRow[] {
  const rows: SuspiciousKeyRow[] = [];
  const where = buildSuspiciousKeyWhere(keyCol);

  try {
    if (loadValues) {
      const sql = `SELECT ${JSON.stringify(keyCol)}, ${JSON.stringify(valueCol)} FROM ${JSON.stringify(tableName)} WHERE ${where}`;
      const result = db.exec(sql);
      if (!result.length) {
        return rows;
      }
      for (const row of result[0].rows) {
        const key = String(row[0] ?? '');
        const val = row[1];
        rows.push({
          dbPath,
          tableName,
          key,
          valueSizeBytes:
            typeof val === 'string'
              ? Buffer.byteLength(val, 'utf8')
              : val instanceof Uint8Array
                ? val.length
                : val === null
                  ? 0
                  : String(val).length,
          meta: inspectJsonMeta(
            val instanceof Uint8Array ? Buffer.from(val) : (val as string | Buffer | null)
          ),
        });
      }
    } else {
      const sql = `SELECT ${JSON.stringify(keyCol)}, length(${JSON.stringify(valueCol)}) as sz FROM ${JSON.stringify(tableName)} WHERE ${where}`;
      const result = db.exec(sql);
      if (!result.length) {
        return rows;
      }
      for (const row of result[0].rows) {
        const key = String(row[0] ?? '');
        rows.push({
          dbPath,
          tableName,
          key,
          valueSizeBytes: Number(row[1] ?? 0),
          meta: {
            isValidJson: false,
            topLevelType: 'not-loaded',
            topLevelKeys: [],
            arrayLength: null,
          },
        });
      }
    }
  } catch (err) {
    logger.warn(`Key scan failed for ${tableName} in ${dbPath}: ${String(err)}`);
  }

  return rows;
}

export async function scanDatabaseFile(
  dbPath: string,
  logger: Logger,
  options?: { loadKeyValues?: boolean }
): Promise<DbScanInfo> {
  const sizeBytes = getDatabaseSizeBytes(dbPath);
  const loadValues = options?.loadKeyValues ?? sizeBytes < 80 * 1024 * 1024;

  const info: DbScanInfo = {
    dbPath,
    sizeBytes,
    opened: false,
    backend: 'none',
    tables: [],
    suspiciousKeys: [],
    keyPatternCounts: {},
  };

  const db = await openDatabaseBackend(dbPath, logger);
  if (!db) {
    info.openError = 'Could not open database';
    return info;
  }

  info.opened = true;
  info.backend = db.kind;

  try {
    const tables = listTablesBackend(db, logger);
    for (const t of tables) {
      info.tables.push({
        name: t.name,
        columns: t.columns,
        rowCount: tableRowCount(db, t.name),
      });

      const kv = isKeyValueTable(t.columns);
      if (kv) {
        const keys = scanTableKeys(
          db,
          dbPath,
          t.name,
          kv.keyCol,
          kv.valueCol,
          logger,
          loadValues
        );
        info.suspiciousKeys.push(...keys);
      }
    }

    info.keyPatternCounts = countKeysByPattern(info.suspiciousKeys.map(k => k.key));
  } finally {
    db.close();
  }

  return info;
}

export function countTableRowsLike(
  db: DbBackend,
  tableName: string,
  keyPattern: string
): number {
  try {
    const r = db.exec(
      `SELECT COUNT(*) FROM ${JSON.stringify(tableName)} WHERE key LIKE '${keyPattern.replace(/'/g, "''")}'`
    );
    if (!r.length || !r[0].rows.length) {
      return 0;
    }
    return Number(r[0].rows[0][0]) ?? 0;
  } catch {
    return 0;
  }
}
