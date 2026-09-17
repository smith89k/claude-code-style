"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readConfig = readConfig;
exports.applyStyles = applyStyles;
exports.removeStyles = removeStyles;
exports.restoreOnStartup = restoreOnStartup;
const vscode = require("vscode");
const styleConfig_1 = require("./styleConfig");
const cssBuilder_1 = require("./cssBuilder");
const claudeCssInjector_1 = require("./claudeCssInjector");
const systemFonts_1 = require("./systemFonts");
const fontInstaller_1 = require("./fontInstaller");
const TARGET = vscode.ConfigurationTarget.Global;
const PREVIOUS_KEY = 'ccs.previousSettings';
const MANAGED = [
    'chat.fontFamily', 'chat.fontSize',
    'chat.editor.fontFamily', 'chat.editor.fontSize',
    'terminal.integrated.fontFamily', 'terminal.integrated.fontSize',
];
function readConfig() {
    const c = vscode.workspace.getConfiguration('claudeCodeStyle');
    return (0, styleConfig_1.sanitizeConfig)({
        englishFont: c.get('englishFont'),
        englishSize: c.get('englishSize'),
        khmerFont: c.get('khmerFont'),
        khmerSize: c.get('khmerSize'),
        elements: c.get('elements'),
    });
}
async function rememberPrevious(ctx) {
    if (ctx.globalState.get(PREVIOUS_KEY)) {
        return;
    }
    const config = vscode.workspace.getConfiguration();
    const previous = {};
    for (const key of MANAGED) {
        previous[key] = config.inspect(key)?.globalValue ?? null;
    }
    await ctx.globalState.update(PREVIOUS_KEY, previous);
}
async function terminalFamily(cfg, warnings) {
    const plain = `'${cfg.englishFont}', '${cfg.khmerFont}', monospace`;
    if (cfg.khmerSize === cfg.englishSize) {
        return { family: plain, created: false };
    }
    const source = (await (0, systemFonts_1.listSystemFonts)()).find((f) => f.name === cfg.khmerFont);
    if (!source) {
        warnings.push(`Could not find the file for "${cfg.khmerFont}", so Khmer in the terminal keeps the English size.`);
        return { family: plain, created: false };
    }
    try {
        const result = await (0, fontInstaller_1.ensureResizedFont)(source, (0, cssBuilder_1.khmerScale)(cfg));
        return { family: `'${cfg.englishFont}', '${result.family}', monospace`, created: result.created };
    }
    catch (err) {
        warnings.push(`Could not resize "${cfg.khmerFont}" for the terminal: ${err.message}`);
        return { family: plain, created: false };
    }
}
async function applyStyles(ctx, raw) {
    const cfg = (0, styleConfig_1.sanitizeConfig)(raw);
    const warnings = [];
    await rememberPrevious(ctx);
    const own = vscode.workspace.getConfiguration('claudeCodeStyle');
    await own.update('englishFont', cfg.englishFont, TARGET);
    await own.update('englishSize', cfg.englishSize, TARGET);
    await own.update('khmerFont', cfg.khmerFont, TARGET);
    await own.update('khmerSize', cfg.khmerSize, TARGET);
    await own.update('elements', cfg.elements, TARGET);
    const config = vscode.workspace.getConfiguration();
    const chatFamily = (0, cssBuilder_1.chatFamilyList)(cfg);
    // Claude Code does not live-reload on chat.fontSize, so a change needs a reload
    const sizeChanged = config.get('chat.fontSize') !== cfg.englishSize;
    await config.update('chat.fontFamily', chatFamily, TARGET);
    await config.update('chat.fontSize', cfg.englishSize, TARGET);
    await config.update('chat.editor.fontFamily', chatFamily, TARGET);
    await config.update('chat.editor.fontSize', cfg.englishSize, TARGET);
    const terminal = await terminalFamily(cfg, warnings);
    await config.update('terminal.integrated.fontFamily', terminal.family, TARGET);
    await config.update('terminal.integrated.fontSize', cfg.englishSize, TARGET);
    let cssResult = 'notFound';
    for (const cssPath of (0, claudeCssInjector_1.claudeCssPaths)()) {
        try {
            cssResult = await (0, claudeCssInjector_1.injectIntoFile)(cssPath, (scope) => (0, cssBuilder_1.buildCss)(cfg, scope));
        }
        catch (err) {
            warnings.push(`Could not update Claude Code styles: ${err.message}`);
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
async function removeStyles(ctx) {
    for (const cssPath of (0, claudeCssInjector_1.claudeCssPaths)()) {
        await (0, claudeCssInjector_1.removeFromFile)(cssPath);
    }
    const previous = ctx.globalState.get(PREVIOUS_KEY);
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
async function restoreOnStartup(ctx) {
    if (!ctx.globalState.get(PREVIOUS_KEY)) {
        return; // user never applied, or removed styles
    }
    const cfg = readConfig();
    let written = false;
    for (const cssPath of (0, claudeCssInjector_1.claudeCssPaths)()) {
        written = (await (0, claudeCssInjector_1.injectIntoFile)(cssPath, (scope) => (0, cssBuilder_1.buildCss)(cfg, scope))) === 'written' || written;
    }
    if (written) {
        const choice = await vscode.window.showInformationMessage('Claude Code was updated, so your Claude Style settings were added back. Reload the window to see them.', 'Reload Window');
        if (choice === 'Reload Window') {
            await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }
}
//# sourceMappingURL=settingsApplier.js.map