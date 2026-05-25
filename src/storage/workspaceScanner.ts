import * as fs from 'fs';
import * as path from 'path';
import type { WorkspaceStorageEntry, Logger } from '../types';

/**
 * Scans all hashed sub-folders under workspaceStorage and resolves
 * each entry's workspace path from workspace.json (if present).
 */
export function scanWorkspaceStorage(
  workspaceStoragePath: string,
  logger: Logger
): WorkspaceStorageEntry[] {
  const entries: WorkspaceStorageEntry[] = [];

  let hashes: string[];
  try {
    hashes = fs.readdirSync(workspaceStoragePath);
  } catch (err) {
    logger.error(`Failed to read workspaceStorage directory: ${workspaceStoragePath}`, err);
    return entries;
  }

  logger.log(`Found ${hashes.length} entries under workspaceStorage`);

  for (const hash of hashes) {
    const storagePath = path.join(workspaceStoragePath, hash);

    let stat: fs.Stats;
    try {
      stat = fs.statSync(storagePath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) {
      continue;
    }

    const entry = resolveEntry(storagePath, hash, logger);
    entries.push(entry);
  }

  return entries;
}

/**
 * Resolves a single hashed workspaceStorage folder into a WorkspaceStorageEntry.
 */
function resolveEntry(
  storagePath: string,
  hash: string,
  logger: Logger
): WorkspaceStorageEntry {
  let workspacePath: string | null = null;
  let workspaceLabel: string | null = null;

  // workspace.json is written by VS Code / Cursor and contains the folder URI
  const workspaceJsonPath = path.join(storagePath, 'workspace.json');
  if (fs.existsSync(workspaceJsonPath)) {
    try {
      const raw = fs.readFileSync(workspaceJsonPath, 'utf8');
      const json = JSON.parse(raw) as Record<string, unknown>;

      // The file usually looks like: { "folder": "file:///C:/Projects/MyApp" }
      const folder = json['folder'] ?? json['workspace'] ?? json['folderUri'];
      if (typeof folder === 'string') {
        workspacePath = fileUriToFsPath(folder);
        workspaceLabel = workspacePath ? path.basename(workspacePath) : null;
      }
    } catch (err) {
      logger.warn(`Could not parse workspace.json at ${workspaceJsonPath}: ${String(err)}`);
    }
  }

  const dbPath = path.join(storagePath, 'state.vscdb');
  const dbExists = fs.existsSync(dbPath);

  if (workspacePath) {
    logger.log(`  [${hash}] → ${workspacePath} (db: ${dbExists ? 'yes' : 'no'})`);
  }

  return {
    storagePath,
    hash,
    workspacePath,
    workspaceLabel,
    dbPath: dbExists ? dbPath : null,
  };
}

/**
 * Converts a file:// URI string to a local filesystem path.
 * Handles Windows drive letters and encoded characters.
 */
export function fileUriToFsPath(uri: string): string {
  try {
    // Use the URL class to handle encoding
    const url = new URL(uri);
    if (url.protocol !== 'file:') {
      return uri; // not a file URI; return as-is
    }

    let fsPath = decodeURIComponent(url.pathname);

    // On Windows, the path starts with /C:/... – strip leading slash
    if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(fsPath)) {
      fsPath = fsPath.slice(1);
    }

    // Normalize separators on Windows
    if (process.platform === 'win32') {
      fsPath = fsPath.replace(/\//g, '\\');
    }

    return fsPath;
  } catch {
    // Fallback: naive strip of "file://"
    return uri.replace(/^file:\/\//, '').replace(/\//g, process.platform === 'win32' ? '\\' : '/');
  }
}

/**
 * Attempts to find workspace storage entries that match a given workspace path.
 * Normalises paths before comparing (case-insensitive on Windows, trailing slash stripped).
 */
export function findMatchingEntries(
  entries: WorkspaceStorageEntry[],
  targetWorkspacePath: string,
  logger: Logger,
  options?: { includeByFolderName?: boolean }
): WorkspaceStorageEntry[] {
  const includeByFolderName = options?.includeByFolderName !== false;

  const normalise = (p: string): string => {
    let n = p.trim().replace(/[\\/]+$/, '');
    if (process.platform === 'win32') {
      n = n.toLowerCase().replace(/\//g, '\\');
    }
    return n;
  };

  const target = normalise(targetWorkspacePath);
  const folderName = path.basename(target).toLowerCase();

  const matches = entries.filter(e => {
    if (!e.workspacePath) {
      return false;
    }
    const p = normalise(e.workspacePath);
    if (p === target) {
      return true;
    }
    if (p.endsWith('\\' + folderName) || p.endsWith('/' + folderName)) {
      return true;
    }
    if (includeByFolderName && path.basename(p).toLowerCase() === folderName) {
      return true;
    }
    return false;
  });

  logger.log(
    `Workspace match: ${matches.length} storage entries for "${targetWorkspacePath}"` +
      (includeByFolderName ? ` (incl. folder name "${folderName}")` : ' (exact path only)')
  );
  return matches;
}

function normaliseWorkspacePath(p: string): string {
  let n = p.trim().replace(/[\\/]+$/, '');
  if (process.platform === 'win32') {
    n = n.toLowerCase().replace(/\//g, '\\');
  }
  return n;
}

function dbSizeBytes(entry: WorkspaceStorageEntry): number {
  if (!entry.dbPath) {
    return 0;
  }
  try {
    return fs.statSync(entry.dbPath).size;
  } catch {
    return 0;
  }
}

/**
 * Picks the single workspace storage folder to use for chat session discovery.
 * Prefers an exact path match; otherwise the largest DB among folder-name matches.
 */
export function selectPrimaryWorkspaceStorageEntry(
  entries: WorkspaceStorageEntry[],
  targetWorkspacePath: string,
  logger: Logger
): WorkspaceStorageEntry | null {
  const target = normaliseWorkspacePath(targetWorkspacePath);
  const withDb = entries.filter(e => e.dbPath);
  if (withDb.length === 0) {
    return null;
  }

  const exact = withDb.filter(
    e => e.workspacePath && normaliseWorkspacePath(e.workspacePath) === target
  );
  const pool = exact.length > 0 ? exact : withDb;
  const sorted = [...pool].sort((a, b) => dbSizeBytes(b) - dbSizeBytes(a));
  const primary = sorted[0];

  logger.log(
    `Primary workspace storage: [${primary.hash}] ${primary.workspacePath ?? '(unknown)'} ` +
      `(${(dbSizeBytes(primary) / 1024 / 1024).toFixed(1)} MB)` +
      (exact.length > 0 ? ' (exact path)' : ' (folder-name fallback)')
  );
  return primary;
}
