/**
 * Workspace matching for composers and conversations — supports moved/renamed paths.
 */

import * as path from 'path';
import type { ComposerHeader } from '../storage/cursorDiskKV';
import type { Conversation, Logger } from '../types';

export interface WorkspaceMatchOptions {
  workspacePath: string;
  storageHashes: string[];
  /** Match by folder name when exact path differs (default true). */
  includePossibleByFolderName: boolean;
}

export function normaliseWsPath(p: string): string {
  let n = p.replace(/[\\/]+$/, '').trim();
  if (process.platform === 'win32') {
    n = n.toLowerCase().replace(/\//g, '\\');
  }
  return n;
}

export function workspaceFolderName(workspacePath: string): string {
  return path.basename(normaliseWsPath(workspacePath)).toLowerCase();
}

function fileUriToFsPath(uri: string): string | null {
  try {
    const url = new URL(uri);
    if (url.protocol !== 'file:') {
      return null;
    }
    let p = decodeURIComponent(url.pathname);
    if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(p)) {
      p = p.slice(1);
    }
    if (process.platform === 'win32') {
      p = p.replace(/\//g, '\\');
    }
    return p;
  } catch {
    return null;
  }
}

function pathEndsWithFolder(storedPath: string, targetPath: string): boolean {
  const s = normaliseWsPath(storedPath);
  const t = normaliseWsPath(targetPath);
  return s === t || s.endsWith('\\' + t) || s.endsWith('/' + t) || t.endsWith('\\' + s) || t.endsWith('/' + s);
}

function uriContainsFolderName(uri: string, folderName: string): boolean {
  if (!folderName || folderName.length < 2) {
    return false;
  }
  return decodeURIComponent(uri).toLowerCase().includes(folderName);
}

/**
 * Returns true if this composer belongs to the target workspace.
 */
export function composerMatchesWorkspace(
  composer: ComposerHeader,
  options: WorkspaceMatchOptions
): boolean {
  const normTarget = normaliseWsPath(options.workspacePath);
  const hashSet = new Set(options.storageHashes.map(h => h.toLowerCase()));
  const folderName = workspaceFolderName(options.workspacePath);

  if (composer.workspaceFsPath) {
    const stored = normaliseWsPath(composer.workspaceFsPath);
    if (stored === normTarget) {
      return true;
    }
    if (pathEndsWithFolder(stored, normTarget)) {
      return true;
    }
    if (options.includePossibleByFolderName) {
      if (path.basename(stored).toLowerCase() === folderName) {
        return true;
      }
    }
  }

  if (composer.workspaceExternalUri) {
    const decoded = fileUriToFsPath(composer.workspaceExternalUri);
    if (decoded) {
      const stored = normaliseWsPath(decoded);
      if (stored === normTarget || pathEndsWithFolder(stored, normTarget)) {
        return true;
      }
      if (options.includePossibleByFolderName && path.basename(stored).toLowerCase() === folderName) {
        return true;
      }
    }
    if (options.includePossibleByFolderName && uriContainsFolderName(composer.workspaceExternalUri, folderName)) {
      return true;
    }
  }

  if (composer.workspaceStorageId && hashSet.has(composer.workspaceStorageId.toLowerCase())) {
    return true;
  }

  return false;
}

export function filterComposersByWorkspace(
  composers: ComposerHeader[],
  options: WorkspaceMatchOptions,
  logger: Logger
): ComposerHeader[] {
  const matches = composers.filter(c => composerMatchesWorkspace(c, options));
  logger.log(
    `Workspace filter: ${matches.length}/${composers.length} composers match "${options.workspacePath}"` +
      (options.includePossibleByFolderName ? ' (incl. folder-name matches)' : ' (strict path only)') +
      (options.storageHashes.length > 0 ? ` hashes: ${options.storageHashes.join(', ')}` : '')
  );
  return matches;
}

export function conversationMatchesWorkspace(
  conversation: Conversation,
  options: WorkspaceMatchOptions
): boolean {
  const folderName = workspaceFolderName(options.workspacePath);
  const normTarget = normaliseWsPath(options.workspacePath);
  const sp = conversation.storagePath.toLowerCase();
  if (sp.includes(normTarget.toLowerCase()) || sp.includes(folderName)) {
    return true;
  }
  return true; // legacy convs from workspace DB scan are already scoped
}
