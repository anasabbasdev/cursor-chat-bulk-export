import * as vscode from 'vscode';
import type { Logger } from './types';

/**
 * Creates a Logger backed by the provided OutputChannel.
 */
export function createLogger(channel: vscode.OutputChannel): Logger {
  const prefix = () => `[${new Date().toISOString()}]`;

  return {
    log(message: string): void {
      channel.appendLine(`${prefix()} INFO  ${message}`);
    },
    warn(message: string): void {
      channel.appendLine(`${prefix()} WARN  ${message}`);
    },
    error(message: string, err?: unknown): void {
      const detail = err instanceof Error ? ` — ${err.message}` : err ? ` — ${String(err)}` : '';
      channel.appendLine(`${prefix()} ERROR ${message}${detail}`);
    },
    show(): void {
      channel.show(true);
    },
  };
}
