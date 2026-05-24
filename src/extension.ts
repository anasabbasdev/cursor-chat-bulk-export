import * as vscode from 'vscode';
import { createLogger } from './logger';
import { registerCommands } from './ui/commands';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('Cursor Chat Bulk Export');
  const logger = createLogger(outputChannel);

  logger.log('Cursor Chat Bulk Export extension activated.');

  registerCommands(context, logger);
}

export function deactivate(): void {
  if (outputChannel) {
    outputChannel.dispose();
  }
}
