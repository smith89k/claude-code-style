import * as vscode from 'vscode';
import { StyleConfig, sanitizeConfig } from './styleConfig';
import { buildCss, chatFamilyList, khmerScale } from './cssBuilder';
import { InjectResult, claudeCssPaths, injectIntoFile, removeFromFile } from './claudeCssInjector';
import { listSystemFonts } from './systemFonts';
import { ensureResizedFont } from './fontInstaller';

export interface ApplySummary {
    cssResult: InjectResult;
    terminalFamily: string;
    needsReload: boolean;
    needsRestart: boolean;
    warnings: string[];
}

const TARGET = vscode.ConfigurationTarget.Global;
const PREVIOUS_KEY = 'ccs.previousSettings';
const MANAGED = [
    'chat.fontFamily', 'chat.fontSize',
    'chat.editor.fontFamily', 'chat.editor.fontSize',
    'terminal.integrated.fontFamily', 'terminal.integrated.fontSize',
];

export function readConfig(): StyleConfig {
    const c = vscode.workspace.getConfiguration('claudeCodeStyle');
    return sanitizeConfig({
        englishFont: c.get('englishFont'),
        englishSize: c.get('englishSize'),
        khmerFont: c.get('khmerFont'),
        khmerSize: c.get('khmerSize'),
        elements: c.get('elements'),
    });
}

async function rememberPrevious(ctx: vscode.ExtensionContext): Promise<void> {
    if (ctx.globalState.get(PREVIOUS_KEY)) {
        return;
    }
    const config = vscode.workspace.getConfiguration();
    const previous: Record<string, unknown> = {};
    for (const key of MANAGED) {
        previous[key] = config.inspect(key)?.globalValue ?? null;
    }
    await ctx.globalState.update(PREVIOUS_KEY, previous);
}

async function terminalFamily(cfg: StyleConfig, warnings: string[]): Promise<{ family: string; created: boolean }> {
    const plain = `'${cfg.englishFont}', '${cfg.khmerFont}', monospace`;
    if (cfg.khmerSize === cfg.englishSize) {
        return { family: plain, created: false };
    }
    const source = (await listSystemFonts()).find((f) => f.name === cfg.khmerFont);
    if (!source) {
        warnings.push(`Could not find the file for "${cfg.khmerFont}", so Khmer in the terminal keeps the English size.`);
        return { family: plain, created: false };
    }
    try {
        const result = await ensureResizedFont(source, khmerScale(cfg));
        return { family: `'${cfg.englishFont}', '${result.family}', monospace`, created: result.created };
    } catch (err) {
        warnings.push(`Could not resize "${cfg.khmerFont}" for the terminal: ${(err as Error).message}`);
        return { family: plain, created: false };
    }
}

export async function applyStyles(ctx: vscode.ExtensionContext, raw: StyleConfig): Promise<ApplySummary> {
    const cfg = sanitizeConfig(raw);
    const warnings: string[] = [];
    await rememberPrevious(ctx);

    const own = vscode.workspace.getConfiguration('claudeCodeStyle');
    await own.update('englishFont', cfg.englishFont, TARGET);
    await own.update('englishSize', cfg.englishSize, TARGET);
    await own.update('khmerFont', cfg.khmerFont, TARGET);
    await own.update('khmerSize', cfg.khmerSize, TARGET);
    await own.update('elements', cfg.elements, TARGET);

    const config = vscode.workspace.getConfiguration();
    const chatFamily = chatFamilyList(cfg);
    // Claude Code does not live-reload on chat.fontSize, so a change needs a reload
    const sizeChanged = config.get('chat.fontSize') !== cfg.englishSize;
    await config.update('chat.fontFamily', chatFamily, TARGET);
    await config.update('chat.fontSize', cfg.englishSize, TARGET);
    await config.update('chat.editor.fontFamily', chatFamily, TARGET);
    await config.update('chat.editor.fontSize', cfg.englishSize, TARGET);

    const terminal = await terminalFamily(cfg, warnings);
    await config.update('terminal.integrated.fontFamily', terminal.family, TARGET);
    await config.update('terminal.integrated.fontSize', cfg.englishSize, TARGET);

    let cssResult: InjectResult = 'notFound';
    for (const cssPath of claudeCssPaths()) {
        try {
            cssResult = await injectIntoFile(cssPath, (scope) => buildCss(cfg, scope));
        } catch (err) {
            warnings.push(`Could not update Claude Code styles: ${(err as Error).message}`);
        }
    }
    if (cssResult === 'notFound' && !warnings.length) {
        warnings.push('Claude Code is not installed here, so only fonts were applied.');
    }

    return {
        cssResult,
        terminalFamily: terminal.family,
        needsReload: cssResult === 'written' || sizeChanged,
        needsRestart: terminal.created,
        warnings,
    };
}

export async function removeStyles(ctx: vscode.ExtensionContext): Promise<void> {
    for (const cssPath of claudeCssPaths()) {
        await removeFromFile(cssPath);
    }
    const previous = ctx.globalState.get<Record<string, unknown>>(PREVIOUS_KEY);
    if (previous) {
        const config = vscode.workspace.getConfiguration();
        for (const key of MANAGED) {
            await config.update(key, previous[key] ?? undefined, TARGET);
        }
        await ctx.globalState.update(PREVIOUS_KEY, undefined);
    }
    await vscode.workspace.getConfiguration('claudeCodeStyle').update('elements', undefined, TARGET);
}

// After a Claude Code update its stylesheet is fresh, so put our block back
export async function restoreOnStartup(ctx: vscode.ExtensionContext): Promise<void> {
    if (!ctx.globalState.get(PREVIOUS_KEY)) {
        return; // user never applied, or removed styles
    }
    const cfg = readConfig();
    let written = false;
    for (const cssPath of claudeCssPaths()) {
        written = (await injectIntoFile(cssPath, (scope) => buildCss(cfg, scope))) === 'written' || written;
    }
    if (written) {
        const choice = await vscode.window.showInformationMessage(
            'Claude Code was updated, so your Claude Style settings were added back. Reload the window to see them.',
            'Reload Window'
        );
        if (choice === 'Reload Window') {
            await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }
}
