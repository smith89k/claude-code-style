import * as vscode from 'vscode';
import * as path from 'path';

export { InjectResult, injectIntoFile, removeFromFile } from './claudeCssFile';

export const CLAUDE_EXTENSION_ID = 'anthropic.claude-code';

export function claudeCssPaths(): string[] {
    const ext = vscode.extensions.getExtension(CLAUDE_EXTENSION_ID);
    return ext ? [path.join(ext.extensionPath, 'webview', 'index.css')] : [];
}
