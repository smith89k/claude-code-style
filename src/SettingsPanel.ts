import * as vscode from 'vscode';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { applyStyles, readConfig, removeStyles } from './settingsApplier';
import { fontFamilies, listSystemFonts } from './systemFonts';
import { buildCss, chatFamilyList } from './cssBuilder';
import { sanitizeConfig } from './styleConfig';
import { presetMessages } from './presets';

export class SettingsPanel {
    public static currentPanel: SettingsPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, private readonly _ctx: vscode.ExtensionContext) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtml();
        this._panel.webview.onDidReceiveMessage((message) => this._onMessage(message), null, this._disposables);
    }

    public static render(ctx: vscode.ExtensionContext) {
        if (SettingsPanel.currentPanel) {
            SettingsPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
            return;
        }
        const panel = vscode.window.createWebviewPanel(
            'claudeCodeSettings',
            'Claude Style Settings',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(ctx.extensionUri, 'media')],
            }
        );
        SettingsPanel.currentPanel = new SettingsPanel(panel, ctx);
    }

    public dispose() {
        SettingsPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            this._disposables.pop()?.dispose();
        }
    }

    private _post(message: unknown) {
        return this._panel.webview.postMessage(message);
    }

    private async _onMessage(message: { type: string; config?: unknown }) {
        switch (message.type) {
            case 'ready': {
                const fonts = fontFamilies(await listSystemFonts());
                await this._post({ type: 'init', config: readConfig(), fonts, presets: presetMessages() });
                return;
            }
            case 'preview': {
                const cfg = sanitizeConfig(message.config);
                await this._post({
                    type: 'previewCss',
                    css: buildCss(cfg, '#preview .md'),
                    family: chatFamilyList(cfg),
                    size: cfg.englishSize,
                });
                return;
            }
            case 'apply': {
                const summary = await applyStyles(this._ctx, sanitizeConfig(message.config));
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
                await removeStyles(this._ctx);
                await this._post({ type: 'init', config: readConfig(), fonts: fontFamilies(await listSystemFonts()), presets: presetMessages() });
                await this._post({ type: 'status', text: 'Back to normal. Reload the window to see it.', kind: 'ok' });
                return;
            }
        }
    }

    private _getHtml(): string {
        const webview = this._panel.webview;
        const media = vscode.Uri.joinPath(this._ctx.extensionUri, 'media');
        const html = fs.readFileSync(vscode.Uri.joinPath(media, 'panel.html').fsPath, 'utf8');
        const values: Record<string, string> = {
            cspSource: webview.cspSource,
            nonce: crypto.randomBytes(16).toString('base64'),
            cssUri: webview.asWebviewUri(vscode.Uri.joinPath(media, 'panel.css')).toString(),
            jsUri: webview.asWebviewUri(vscode.Uri.joinPath(media, 'panel.js')).toString(),
        };
        return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? '');
    }
}
