/**
 * SQLite reader for Cursor's state.vscdb files.
 *
 * Uses sql.js — a pure JavaScript/WASM port of SQLite.
 * No native compilation required; works on all platforms without
 * Visual Studio or node-gyp.
 *
 * sql.js loads the entire database file into memory as a Buffer and
 * executes queries in-process. This is safe and fast for the typical
 * size of Cursor's state.vscdb files (usually < 50 MB).
 *
 * The WASM file (sql-wasm.wasm) must be present next to the bundled
 * extension JS (out/sql-wasm.wasm). The build script copies it there.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { RawKVRecord, TableInfo, Logger } from '../types';
import type { DbBackend } from './dbBackend';
import {
  formatSizeMb,
  getDatabaseSizeBytes,
  isTooLargeForSqlJs,
  logOpenStrategy,
  SqlJsBackend,
  wrapSqlJs,
} from './dbBackend';
import { findSqlite3Executable, openCliBackend } from './sqliteCliReader';

// ---------------------------------------------------------------------------
// sql.js typings shim (the @types/sql.js package provides these)
// ---------------------------------------------------------------------------
import type initSqlJs from 'sql.js';
type SqlJsStatic = Awaited<ReturnType<typeof initSqlJs>>;
type SqlDatabase = InstanceType<SqlJsStatic['Database']>;

// ---------------------------------------------------------------------------
// Module-level cache for the initialized sql.js factory
// ---------------------------------------------------------------------------
let sqlJsPromise: Promise<SqlJsStatic> | null = null;

/**
 * Returns (and caches) the initialized sql.js factory.
 * The WASM file is expected to be co-located with the compiled extension JS.
 */
async function getSqlJs(logger: Logger): Promise<SqlJsStatic | null> {
  if (!sqlJsPromise) {
    sqlJsPromise = (async (): Promise<SqlJsStatic> => {
      // __dirname at runtime points to the out/ directory (after bundling)
      const wasmPath = path.join(__dirname, 'sql-wasm.wasm');
      logger.log(`Loading sql-wasm.wasm from: ${wasmPath}`);

      if (!fs.existsSync(wasmPath)) {
        throw new Error(
          `sql-wasm.wasm not found at ${wasmPath}. ` +
            `Run 'npm run compile' to copy it into the out/ directory.`
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const initFn = require('sql.js') as typeof initSqlJs;
      const SQL = await initFn({
        locateFile: () => wasmPath,
      });
      logger.log('sql.js initialized successfully.');
      return SQL;
    })();
  }

  try {
    return await sqlJsPromise;
  } catch (err) {
    // Reset so the next call retries
    sqlJsPromise = null;
    logger.error('Failed to initialize sql.js', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Opens a SQLite database in read-only mode by loading it into memory.
 * Returns null if the driver is unavailable or the file cannot be opened.
 *
 * NOTE: sql.js loads the full file into memory. Opening is always "read-only"
 * in the sense that we never write back — the in-memory copy is discarded
 * when we call close().
 */
export async function openDatabase(
  dbPath: string,
  logger: Logger
): Promise<SqlDatabase | null> {
  const SQL = await getSqlJs(logger);
  if (!SQL) {
    return null;
  }

  if (!fs.existsSync(dbPath)) {
    logger.warn(`Database file not found: ${dbPath}`);
    return null;
  }

  const bytes = getDatabaseSizeBytes(dbPath);
  if (isTooLargeForSqlJs(bytes)) {
    logger.warn(
      `Database is ${formatSizeMb(bytes)} MB — exceeds sql.js limit (~1.85 GB). ` +
        'Use sqlite3 CLI fallback for this file.'
    );
    return null;
  }

  try {
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);
    logger.log(`Opened DB (in-memory, read-only): ${dbPath}`);
    return db;
  } catch (err) {
    logger.error(`Failed to open database: ${dbPath}`, err);
    return null;
  }
}

/**
 * Opens a database using sql.js for small files, or sqlite3 CLI for large ones.
 */
export async function openDatabaseBackend(
  dbPath: string,
  logger: Logger
): Promise<DbBackend | null> {
  if (!fs.existsSync(dbPath)) {
    logger.warn(`Database file not found: ${dbPath}`);
    return null;
  }

  const bytes = getDatabaseSizeBytes(dbPath);

  if (isTooLargeForSqlJs(bytes)) {
    const sqlite3Path = findSqlite3Executable(logger);
    if (!sqlite3Path) {
      logger.error(
        `Cannot open ${formatSizeMb(bytes)} MB database without sqlite3 CLI. ` +
          'Install SQLite from https://www.sqlite.org/download.html ' +
          'or: winget install SQLite.SQLite'
      );
      return null;
    }
    logOpenStrategy(dbPath, bytes, 'cli', logger);
    return openCliBackend(dbPath, sqlite3Path);
  }

  const sqlJsDb = await openDatabase(dbPath, logger);
  if (sqlJsDb) {
    logOpenStrategy(dbPath, bytes, 'sqljs', logger);
    return wrapSqlJs(sqlJsDb);
  }

  // sql.js failed — try CLI as last resort
  const sqlite3Path = findSqlite3Executable(logger);
  if (sqlite3Path) {
    logger.warn('sql.js open failed; trying sqlite3 CLI fallback.');
    logOpenStrategy(dbPath, bytes, 'cli', logger);
    return openCliBackend(dbPath, sqlite3Path);
  }

  return null;
}

/**
 * Closes (frees) an in-memory sql.js database.
 */
export function closeDatabase(db: SqlDatabase | null, logger: Logger): void {
  if (!db) {
    return;
  }
  try {
    db.close();
  } catch (err) {
    logger.warn(`Error closing database: ${String(err)}`);
  }
}

export function closeDatabaseBackend(db: DbBackend | null, _logger: Logger): void {
  if (db) {
    db.close();
  }
}

/**
 * Returns the list of user-defined tables in the database.
 */
export function listTablesBackend(db: DbBackend, logger: Logger): TableInfo[] {
  const tables: TableInfo[] = [];
  try {
    const result = db.exec(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
    if (!result.length || !result[0].rows.length) {
      logger.log('No tables found in DB.');
      return tables;
    }

    const names = result[0].rows.map(row => String(row[0]));
    for (const name of names) {
      try {
        const pragmaResult = db.exec(`PRAGMA table_info(${JSON.stringify(name)})`);
        const columns = pragmaResult.length
          ? pragmaResult[0].rows.map(row => String(row[1]))
          : [];
        tables.push({ name, columns });
      } catch {
        tables.push({ name, columns: [] });
      }
    }
  } catch (err) {
    logger.error('Failed to list tables', err);
  }
  logger.log(`Tables in DB: ${tables.map(t => t.name).join(', ') || '(none)'}`);
  return tables;
}

export function listTables(db: SqlDatabase, logger: Logger): TableInfo[] {
  const tables: TableInfo[] = [];
  try {
    const result = db.exec(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
    if (!result.length || !result[0].values.length) {
      logger.log('No tables found in DB.');
      return tables;
    }

    const names = result[0].values.map(row => String(row[0]));
    for (const name of names) {
      try {
        const pragmaResult = db.exec(`PRAGMA table_info(${JSON.stringify(name)})`);
        const columns = pragmaResult.length
          ? pragmaResult[0].values.map(row => String(row[1])) // col index 1 = name
          : [];
        tables.push({ name, columns });
      } catch {
        tables.push({ name, columns: [] });
      }
    }
  } catch (err) {
    logger.error('Failed to list tables', err);
  }
  logger.log(`Tables in DB: ${tables.map(t => t.name).join(', ') || '(none)'}`);
  return tables;
}

/**
 * Reads all rows from the standard VS Code ItemTable (key + value).
 * Returns an empty array if the table doesn't exist.
 */
/** SQL WHERE matching chat/composer-related keys (for large DBs — avoids full table scan in JS). */
export function buildChatKeySqlWhere(keyColumn = 'key'): string {
  const terms = [
    'composer', 'chat', 'conversation', 'agent', 'bubble', 'message',
    'tabs', 'workbench', 'aichat', 'cursor', 'thread', 'session', 'archive', 'history',
  ];
  return terms.map(t => `lower(${keyColumn}) LIKE '%${t}%'`).join(' OR ');
}

/**
 * Reads only chat-related rows from a key/value table (much smaller than full ItemTable).
 */
export function readChatRelatedKeyRowsBackend(
  db: DbBackend,
  logger: Logger,
  tableName = 'ItemTable',
  options?: { maxRows?: number; maxValueBytes?: number }
): RawKVRecord[] {
  const maxRows = options?.maxRows ?? 2000;
  const maxValueBytes = options?.maxValueBytes ?? 8 * 1024 * 1024;
  const where = buildChatKeySqlWhere('key');

  try {
    const sql =
      `SELECT key, value FROM ${JSON.stringify(tableName)} WHERE (${where}) ` +
      `AND (length(value) <= ${maxValueBytes} OR value IS NULL) ` +
      `LIMIT ${maxRows}`;
    const result = db.exec(sql);
    if (!result.length) {
      logger.log(`No chat-related rows in ${tableName} (filtered query).`);
      return [];
    }
    const rows: RawKVRecord[] = result[0].rows.map(row => ({
      key: String(row[0] ?? ''),
      value: row[1] instanceof Uint8Array
        ? Buffer.from(row[1])
        : row[1] === null
          ? null
          : String(row[1]),
    }));
    logger.log(`Read ${rows.length} chat-related rows from ${tableName} (filtered, limit ${maxRows})`);
    return rows;
  } catch (err) {
    logger.warn(`Chat-key query failed on ${tableName}, falling back to filtered slice: ${String(err)}`);
    return [];
  }
}

export function readItemTableBackend(
  db: DbBackend,
  logger: Logger,
  tableName = 'ItemTable'
): RawKVRecord[] {
  try {
    const result = db.exec(`SELECT key, value FROM ${JSON.stringify(tableName)}`);
    if (!result.length) {
      logger.log(`Table "${tableName}" is empty or does not exist.`);
      return [];
    }
    const rows: RawKVRecord[] = result[0].rows.map(row => ({
      key: String(row[0] ?? ''),
      value: row[1] instanceof Uint8Array
        ? Buffer.from(row[1])
        : row[1] === null
          ? null
          : String(row[1]),
    }));
    logger.log(`Read ${rows.length} rows from ${tableName}`);
    return rows;
  } catch (err) {
    logger.warn(`Could not read table "${tableName}": ${String(err)}`);
    return [];
  }
}

export function readItemTable(
  db: SqlDatabase,
  logger: Logger,
  tableName = 'ItemTable'
): RawKVRecord[] {
  try {
    const result = db.exec(`SELECT key, value FROM ${JSON.stringify(tableName)}`);
    if (!result.length) {
      logger.log(`Table "${tableName}" is empty or does not exist.`);
      return [];
    }
    const rows: RawKVRecord[] = result[0].values.map(row => ({
      key: String(row[0] ?? ''),
      value: row[1] instanceof Uint8Array
        ? Buffer.from(row[1])
        : row[1] === null
          ? null
          : String(row[1]),
    }));
    logger.log(`Read ${rows.length} rows from ${tableName}`);
    return rows;
  } catch (err) {
    logger.warn(`Could not read table "${tableName}": ${String(err)}`);
    return [];
  }
}

/**
 * Reads all rows from ANY table that has both a key-like and value-like column.
 */
export function readAllKeyValueTables(
  db: SqlDatabase,
  tables: TableInfo[],
  logger: Logger
): Map<string, RawKVRecord[]> {
  const result = new Map<string, RawKVRecord[]>();

  for (const table of tables) {
    const cols = table.columns.map(c => c.toLowerCase());
    const hasKey = cols.includes('key') || cols.includes('id');
    const hasValue = cols.includes('value') || cols.includes('data') || cols.includes('content');

    if (!hasKey || !hasValue) {
      continue;
    }

    const keyCol = table.columns.find(c => ['key', 'id'].includes(c.toLowerCase()))!;
    const valueCol = table.columns.find(c =>
      ['value', 'data', 'content'].includes(c.toLowerCase())
    )!;

    try {
      const queryResult = db.exec(
        `SELECT ${JSON.stringify(keyCol)} as key, ${JSON.stringify(valueCol)} as value FROM ${JSON.stringify(table.name)}`
      );
      if (!queryResult.length) {
        result.set(table.name, []);
        continue;
      }
      const rows: RawKVRecord[] = queryResult[0].values.map(row => ({
        key: String(row[0] ?? ''),
        value: row[1] instanceof Uint8Array
          ? Buffer.from(row[1])
          : row[1] === null
            ? null
            : String(row[1]),
      }));
      result.set(table.name, rows);
      logger.log(`  Table "${table.name}": ${rows.length} rows`);
    } catch (err) {
      logger.warn(`  Could not read table "${table.name}": ${String(err)}`);
    }
  }

  return result;
}

/**
 * Safely parses a value that may be a JSON string, a Buffer, or null.
 * Returns null on failure without throwing.
 */
export function safeParseValue(value: string | Buffer | null): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  const str = Buffer.isBuffer(value) ? value.toString('utf8') : value;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
