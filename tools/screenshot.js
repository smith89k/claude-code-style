// Renders the settings page outside the editor and saves the README screenshots.
// Usage: npm run screenshots   (Windows, needs Google Chrome)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const { buildCss, chatFamilyList } = require(path.join(root, 'out', 'cssBuilder.js'));
const { sanitizeConfig } = require(path.join(root, 'out', 'styleConfig.js'));
const { PRESETS, presetElements, presetMessages } = require(path.join(root, 'out', 'presets.js'));

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const work = path.join(os.tmpdir(), 'ccs-shots');
const images = path.join(root, 'images');

const THEMES = {
    dark: {
        'font-family': '"Segoe WPC", "Segoe UI", sans-serif', foreground: '#cccccc', 'editor-background': '#1f1f1f',
        descriptionForeground: '#9d9d9d', 'input-background': '#313131', 'input-foreground': '#cccccc',
        'input-border': '#3c3c3c', focusBorder: '#0078d4', 'button-background': '#0078d4', 'button-foreground': '#ffffff',
        'button-secondaryBackground': '#313131', 'button-secondaryForeground': '#cccccc', 'panel-border': '#2b2b2b',
        'sideBar-background': '#181818', 'widget-border': '#313131', 'textLink-foreground': '#4daafc',
        'textCodeBlock-background': '#2b2b2b',
    },
    light: {
        'font-family': '"Segoe WPC", "Segoe UI", sans-serif', foreground: '#3b3b3b', 'editor-background': '#ffffff',
        descriptionForeground: '#6f6f6f', 'input-background': '#ffffff', 'input-foreground': '#3b3b3b',
        'input-border': '#cecece', focusBorder: '#005fb8', 'button-background': '#005fb8', 'button-foreground': '#ffffff',
        'button-secondaryBackground': '#e5e5e5', 'button-secondaryForeground': '#3b3b3b', 'panel-border': '#e5e5e5',
        'sideBar-background': '#f8f8f8', 'widget-border': '#e5e5e5', 'textLink-foreground': '#005fb8',
        'textCodeBlock-background': '#f2f2f2',
    },
};

const PREVIEW_ONLY = 'body > h1, body > section:not(:last-of-type), .actions, section:last-of-type > h2, '
    + 'section:last-of-type > .hint { display: none !important; } body { padding: 16px; } #preview { max-width: none; }';

const FONTS = {
    all: ['JetBrains Mono', 'Cascadia Code', 'Consolas', 'Kantumruy Pro', 'Khmer OS Battambang', 'Khmer OS System'],
    khmer: ['Kantumruy Pro', 'Khmer OS Battambang', 'Khmer OS Siemreap', 'Khmer OS System', 'Khmer UI'],
};

function configFor(presetId) {
    const preset = PRESETS.find((p) => p.id === presetId);
    const elements = presetElements(preset.palette);
    elements.h1 = { ...elements.h1, size: 24, weight: 'bold' };
    elements.h2 = { ...elements.h2, size: 20 };
    elements.link = { ...elements.link, underline: true };
    return sanitizeConfig({ englishFont: 'JetBrains Mono', englishSize: 14, khmerFont: 'Khmer OS Battambang', khmerSize: 16, elements });
}

// Stands in for the extension host: answers the page's messages like SettingsPanel does
function shim(config) {
    const init = { type: 'init', config, fonts: FONTS, presets: presetMessages() };
    const preview = { type: 'previewCss', css: buildCss(config, '#preview .md'), family: chatFamilyList(config), size: config.englishSize };
    return `window.acquireVsCodeApi = () => ({
  postMessage(msg) {
    const reply = (data) => setTimeout(() => window.postMessage(data, '*'), 0);
    if (msg.type === 'ready') reply(${JSON.stringify(init)});
    if (msg.type === 'preview') reply(${JSON.stringify(preview)});
  },
  getState() {}, setState() {},
});`;
}

function writePage(name, config, theme, extraCss) {
    const vars = Object.entries(THEMES[theme]).map(([k, v]) => `--vscode-${k}: ${v};`).join(' ');
    const html = fs.readFileSync(path.join(root, 'media', 'panel.html'), 'utf8')
        .replace(/<meta http-equiv="Content-Security-Policy"[\s\S]*?>/, '')
        .replace('{{cssUri}}', 'panel.css')
        .replace('{{jsUri}}', 'panel.js')
        .replace(/\{\{\w+\}\}/g, '')
        .replace('</head>', `<style>:root { ${vars} } body { font-size: 13px; } ${extraCss}</style><script>${shim(config)}</script></head>`);
    const file = path.join(work, name + '.html');
    fs.writeFileSync(file, html);
    return file;
}

function shoot(file, image, width, height) {
    execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
        `--window-size=${width},${height}`, '--virtual-time-budget=4000',
        `--screenshot=${path.join(images, image)}`, 'file:///' + file.replace(/\\/g, '/'),
    ], { stdio: 'ignore' });
    console.log('wrote images/' + image);
}

fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(images, { recursive: true });
for (const f of ['panel.css', 'panel.js']) {
    fs.copyFileSync(path.join(root, 'media', f), path.join(work, f));
}

shoot(writePage('settings', configFor('dracula'), 'dark', ''), 'settings.png', 940, 1050);
shoot(writePage('preview', configFor('dracula'), 'dark', PREVIEW_ONLY), 'preview.png', 760, 1015);

writePage('mocha', configFor('catppuccin-mocha'), 'dark', PREVIEW_ONLY);
writePage('latte', configFor('catppuccin-latte'), 'light', PREVIEW_ONLY);
const pair = path.join(work, 'presets.html');
fs.writeFileSync(pair, `<!DOCTYPE html><html><body style="margin:0;background:#1f1f1f;font:14px 'Segoe UI',sans-serif;color:#ccc;display:flex">
${[['mocha', 'Catppuccin Mocha · dark editor theme'], ['latte', 'Catppuccin Latte · light editor theme']].map(([name, caption]) =>
    `<figure style="margin:0;width:720px"><figcaption style="padding:12px 16px 0">${caption}</figcaption>
<iframe src="${name}.html" style="border:0;width:720px;height:1045px"></iframe></figure>`).join('')}
</body></html>`);
shoot(pair, 'presets.png', 1440, 1080);
