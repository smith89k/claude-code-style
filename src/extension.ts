import * as vscode from 'vscode';
import { SettingsPanel } from './SettingsPanel';
import { removeStyles, restoreOnStartup } from './settingsApplier';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeCodeStyle.openSettings', () => {
            SettingsPanel.render(context);
        }),
        vscode.commands.registerCommand('claudeCodeStyle.removeStyles', async () => {
            await removeStyles(context);
            const choice = await vscode.window.showInformationMessage(
                'Claude Style removed. Reload the window to see Claude Code as normal.',
                'Reload Window'
            );
            if (choice === 'Reload Window') {
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        })
    );

    restoreOnStartup(context).catch((err) => {
        console.error('Claude Style: could not restore styles', err);
    });
}
