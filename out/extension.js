"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = require("vscode");
const SettingsPanel_1 = require("./SettingsPanel");
const settingsApplier_1 = require("./settingsApplier");
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('claudeCodeStyle.openSettings', () => {
        SettingsPanel_1.SettingsPanel.render(context);
    }), vscode.commands.registerCommand('claudeCodeStyle.removeStyles', async () => {
        await (0, settingsApplier_1.removeStyles)(context);
        const choice = await vscode.window.showInformationMessage('Claude Style removed. Reload the window to see Claude Code as normal.', 'Reload Window');
        if (choice === 'Reload Window') {
            await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }));
    (0, settingsApplier_1.restoreOnStartup)(context).catch((err) => {
        console.error('Claude Style: could not restore styles', err);
    });
}
//# sourceMappingURL=extension.js.map