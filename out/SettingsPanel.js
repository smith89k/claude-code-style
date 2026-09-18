"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsPanel = void 0;
const vscode = require("vscode");
const fs = require("fs");
const crypto = require("crypto");
const settingsApplier_1 = require("./settingsApplier");
const systemFonts_1 = require("./systemFonts");
const cssBuilder_1 = require("./cssBuilder");
const styleConfig_1 = require("./styleConfig");
const presets_1 = require("./presets");
class SettingsPanel {
    constructor(panel, _ctx) {
        this._ctx = _ctx;
        this._disposables = [];
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtml();
        this._panel.webview.onDidReceiveMessage((message) => this._onMessage(message), null, this._disposables);
    }
    static render(ctx) {
        if (SettingsPanel.currentPanel) {
            SettingsPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
            return;
        }
        const panel = vscode.window.createWebviewPanel('claudeCodeSettings', 'Claude Style Settings', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(ctx.extensionUri, 'media')],
        });
        SettingsPanel.currentPanel = new SettingsPanel(panel, ctx);
    }
    dispose() {
        SettingsPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            this._disposables.pop()?.dispose();
        }
    }
    _post(message) {
        return this._panel.webview.postMessage(message);
    }
    async _onMessage(message) {
        switch (message.type) {
            case 'ready': {
                const fonts = (0, systemFonts_1.fontFamilies)(await (0, systemFonts_1.listSystemFonts)());
                await this._post({ type: 'init', config: (0, settingsApplier_1.readConfig)(), fonts, presets: (0, presets_1.presetMessages)(), highlights: (0, cssBuilder_1.previewSelectors)() });
                return;
            }
            case 'preview': {
                const cfg = (0, styleConfig_1.sanitizeConfig)(message.config);
                await this._post({
                    type: 'previewCss',
                    css: (0, cssBuilder_1.buildCss)(cfg, cssBuilder_1.PREVIEW_SCOPE, cssBuilder_1.PREVIEW_TOOL_SCOPE),
                    family: (0, cssBuilder_1.chatFamilyList)(cfg),
                    size: cfg.englishSize,
                });
                return;
            }
            case 'apply': {
                const summary = await (0, settingsApplier_1.applyStyles)(this._ctx, (0, styleConfig_1.sanitizeConfig)(message.config));
                const notes = [...summary.warnings];
                if (summary.needsRestart) {
                    notes.push('A resized Khmer font was installed for the terminal: close and reopen Antigravity to see it there.');
                }
                if (summary.needsReload) {
                    notes.push('Reload the window to see the new styles in Claude Code.');
                }
                await this._post({
                    type: 'status',
                    text: ['Saved.', ...notes].join(' '),
                    kind: summary.warnings.length ? 'warn' : 'ok',
                });
                if (summary.needsReload) {
                    const choice = await vscode.window.showInformationMessage('Claude Style saved.', 'Reload Window');
                    if (choice === 'Reload Window') {
                        await vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                }
                return;
            }
            case 'reset': {
                await (0, settingsApplier_1.removeStyles)(this._ctx);
                await this._post({ type: 'init', config: (0, settingsApplier_1.readConfig)(), fonts: (0, systemFonts_1.fontFamilies)(await (0, systemFonts_1.listSystemFonts)()), presets: (0, presets_1.presetMessages)(), highlights: (0, cssBuilder_1.previewSelectors)() });
                await this._post({ type: 'status', text: 'Back to normal. Reload the window to see it.', kind: 'ok' });
                return;
            }
        }
    }
    _getHtml() {
        const webview = this._panel.webview;
        const media = vscode.Uri.joinPath(this._ctx.extensionUri, 'media');
        const html = fs.readFileSync(vscode.Uri.joinPath(media, 'panel.html').fsPath, 'utf8');
        const values = {
            cspSource: webview.cspSource,
            nonce: crypto.randomBytes(16).toString('base64'),
            cssUri: webview.asWebviewUri(vscode.Uri.joinPath(media, 'panel.css')).toString(),
            jsUri: webview.asWebviewUri(vscode.Uri.joinPath(media, 'panel.js')).toString(),
        };
        return html.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '');
    }
}
exports.SettingsPanel = SettingsPanel;
//# sourceMappingURL=SettingsPanel.js.map