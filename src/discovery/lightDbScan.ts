/**
 * Lightweight DB metadata scan — safe for multi-GB state.vscdb files.
 * Never loads all suspicious keys into memory at once.
 */

import type { DbBackend } from '../storage/dbBackend';
import { getDatabaseSizeBytes, formatSizeMb } from '../storage/dbBackend';
import { openDatabaseBackend, listTablesBackend } from '../storage/sqliteReader';
import { buildChatKeySqlWhere } from '../storage/sqliteReader';
import type { Logger } from '../types';
import type { DbScanInfo, SuspiciousKeyRow, TableScanInfo } from './types';
import { countKeysByPattern } from './keyInspect';

const LARGE_DB_BYTES = 100 * 1024 * 1024;
const KEY_SAMPLE_LIMIT = 40;

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

function countWhere(db: DbBackend, table: string, where: string): number {
  try {
    const r = db.exec(`SELECT COUNT(*) FROM ${JSON.stringify(table)} WHERE ${where}`);
    if (!r.length || !r[0].rows.length) {
      return 0;
    }
    return Number(r[0].rows[0][0]) ?? 0;
  } catch {
    return 0;
  }
}

function sampleKeys(
  db: DbBackend,
  dbPath: string,
  tableName: string,
  keyCol: string,
  valueCol: string,
  limit: number
): SuspiciousKeyRow[] {
  const rows: SuspiciousKeyRow[] = [];
  const where = buildChatKeySqlWhere(keyCol);
  try {
    const sql =
      `SELECT ${JSON.stringify(keyCol)}, length(${JSON.stringify(valueCol)}) as sz ` +
      `FROM ${JSON.stringify(tableName)} WHERE (${where}) LIMIT ${limit}`;
    const result = db.exec(sql);
    if (!result.length) {
      return rows;
    }
    for (const row of result[0].rows) {
      rows.push({
        dbPath,
        tableName,
        key: String(row[0] ?? ''),
        valueSizeBytes: Number(row[1] ?? 0),
        meta: {
          isValidJson: false,
          topLevelType: 'not-loaded',
          topLevelKeys: [],
          arrayLength: null,
        },
      });
    }
  } catch {
    // ignore
  }
  return rows;
}

/**
 * Scans a database without enumerating every chat key (safe for 2+ GB files).
 */
export async function scanDatabaseLight(
  dbPath: string,
  logger: Logger
): Promise<DbScanInfo> {
  const sizeBytes = getDatabaseSizeBytes(dbPath);
  const isLarge = sizeBytes >= LARGE_DB_BYTES;

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
    logger.log(
      `Light scan ${formatSizeMb(sizeBytes)} MB DB (${isLarge ? 'large — counts + sample only' : 'full sample'})`
    );

    const tables = listTablesBackend(db, logger);
    for (const t of tables) {
      const rowCount = tableRowCount(db, t.name);
      info.tables.push({ name: t.name, columns: t.columns, rowCount });

      const cols = t.columns.map(c => c.toLowerCase());
      const hasKey = cols.includes('key') || cols.includes('id');
      const hasVal = cols.includes('value') || cols.includes('data') || cols.includes('content');
      if (!hasKey || !hasVal) {
        continue;
      }

      const keyCol = t.columns.find(c => ['key', 'id'].includes(c.toLowerCase()))!;
      const valueCol = t.columns.find(c =>
        ['value', 'data', 'content'].includes(c.toLowerCase())
      )!;

      if (t.name === 'cursorDiskKV') {
        const composerN = countWhere(db, t.name, `key LIKE 'composerData:%'`);
        const bubbleN = countWhere(db, t.name, `key LIKE 'bubbleId:%'`);
        info.keyPatternCounts['composerData:'] = composerN;
        info.keyPatternCounts['bubbleId:'] = bubbleN;
        logger.log(`  cursorDiskKV: composerData=${composerN}, bubbleId=${bubbleN}`);
      }

      if (isLarge) {
        info.suspiciousKeys.push(
          ...sampleKeys(db, dbPath, t.name, keyCol, valueCol, KEY_SAMPLE_LIMIT)
        );
      } else {
        const where = buildChatKeySqlWhere(keyCol);
        try {
          const sql =
            `SELECT ${JSON.stringify(keyCol)}, length(${JSON.stringify(valueCol)}) as sz ` +
            `FROM ${JSON.stringify(t.name)} WHERE (${where}) LIMIT 500`;
          const result = db.exec(sql);
          if (result.length) {
            for (const row of result[0].rows) {
              info.suspiciousKeys.push({
                dbPath,
                tableName: t.name,
                key: String(row[0] ?? ''),
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
        } catch {
          // ignore
        }
      }
    }

    info.keyPatternCounts = {
      ...info.keyPatternCounts,
      ...countKeysByPattern(info.suspiciousKeys.map(k => k.key)),
    };
  } finally {
    db.close();
  }

  return info;
}
