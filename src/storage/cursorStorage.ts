import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import type { Logger } from '../types';

/**
 * Returns the root Cursor user-data directory for the current platform.
 * Priority:
 *   1. CURSOR_APPDATA env override (useful for testing)
 *   2. Platform-specific default
 */
export function getCursorUserDataPath(logger: Logger): string | null {
  try {
    const setting = vscode.workspace.getConfiguration('cursorChatExport').get<string>('cursorUserDataPath', '').trim();
    if (setting) {
      const resolved = path.resolve(setting);
      if (fs.existsSync(resolved)) {
        logger.log(`Using cursorChatExport.cursorUserDataPath: ${resolved}`);
        return resolved;
      }
      logger.warn(`cursorUserDataPath not found: ${resolved}`);
    }
  } catch {
    // ignore
  }

  const override = process.env['CURSOR_APPDATA'];
  if (override) {
    logger.log(`Using CURSOR_APPDATA override: ${override}`);
    return override;
  }

  const platform = process.platform;

  if (platform === 'win32') {
    const appData = process.env['APPDATA'];
    if (!appData) {
      logger.error('APPDATA environment variable is not set on Windows.');
      return null;
    }
    return path.join(appData, 'Cursor', 'User');
  }

  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User');
  }

  // Linux / other POSIX
  const xdgConfig = process.env['XDG_CONFIG_HOME'];
  if (xdgConfig) {
    return path.join(xdgConfig, 'Cursor', 'User');
  }
  return path.join(os.homedir(), '.config', 'Cursor', 'User');
}

/**
 * Returns the workspaceStorage directory path and verifies it exists.
 */
export function getWorkspaceStoragePath(logger: Logger): string | null {
  const userDataPath = getCursorUserDataPath(logger);
  if (!userDataPath) {
    return null;
  }

  const wsStorage = path.join(userDataPath, 'workspaceStorage');
  logger.log(`Cursor workspaceStorage path: ${wsStorage}`);

  if (!fs.existsSync(wsStorage)) {
    logger.error(`workspaceStorage directory not found at: ${wsStorage}`);
    return null;
  }

  return wsStorage;
}

/**
 * Returns the globalStorage directory path (where cursorDiskKV lives).
 */
export function getGlobalStoragePath(logger: Logger): string | null {
  const userDataPath = getCursorUserDataPath(logger);
  if (!userDataPath) {
    return null;
  }
  const globalStorage = path.join(userDataPath, 'globalStorage');
  logger.log(`Cursor globalStorage path: ${globalStorage}`);
  if (!fs.existsSync(globalStorage)) {
    logger.warn(`globalStorage directory not found: ${globalStorage}`);
    return null;
  }
  return globalStorage;
}

/**
 * Attempts to detect whether the application is actually Cursor (not vanilla VS Code).
 * Heuristic: look for cursor-specific folders.
 */
export function isCursorEnvironment(logger: Logger): boolean {
  const userDataPath = getCursorUserDataPath(logger);
  if (!userDataPath) {
    return false;
  }
  const exists = fs.existsSync(userDataPath);
  if (!exists) {
    logger.warn(`Cursor user data path does not exist: ${userDataPath}`);
  }
  return exists;
}
