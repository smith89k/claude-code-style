"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRESETS = exports.ROLES = void 0;
exports.presetElements = presetElements;
exports.presetMessages = presetMessages;
exports.ROLES = [
    'text', 'muted', 'surface', 'deep', 'line',
    'purple', 'blue', 'cyan', 'green', 'yellow', 'orange', 'pink',
];
// Same for every theme, so adding a theme only needs its palette
const MAPPING = {
    text: { color: 'text' },
    h1: { color: 'orange' },
    h2: { color: 'purple' },
    h3: { color: 'blue' },
    h4: { color: 'cyan' },
    h5: { color: 'green' },
    h6: { color: 'muted' },
    bold: { color: 'pink' },
    italic: { color: 'yellow' },
    strike: { color: 'muted' },
    link: { color: 'blue' },
    code: { color: 'green', background: 'surface', border: 'line' },
    codeBlock: { color: 'text', background: 'deep', border: 'line' },
    list: { color: 'text' },
    bullet: { color: 'purple' },
    quote: { color: 'muted', border: 'purple' },
    tableHeader: { color: 'blue', background: 'surface', border: 'line' },
    tableCell: { color: 'text', border: 'line' },
    divider: { border: 'line' },
    toolName: { color: 'text' },
    toolDescription: { color: 'blue' },
    toolBox: { background: 'deep', border: 'line' },
    toolLabel: { color: 'muted' },
    toolContent: { color: 'text', background: 'deep' },
};
// Values copied from each theme's official palette (sources in the plan / spec)
exports.PRESETS = [
    {
        id: 'dracula', label: 'Dracula', group: 'dark',
        // No blue in Dracula: links are cyan in its spec, so blue = cyan. deep = Background
        palette: {
            text: '#f8f8f2', muted: '#6272a4', surface: '#44475a', deep: '#282a36', line: '#6272a4',
            purple: '#bd93f9', blue: '#8be9fd', cyan: '#8be9fd', green: '#50fa7b',
            yellow: '#f1fa8c', orange: '#ffb86c', pink: '#ff79c6',
        },
    },
    {
        id: 'catppuccin-frappe', label: 'Catppuccin Frappé', group: 'dark',
        // text, overlay1, surface0, mantle, surface2, mauve, blue, sky, green, yellow, peach, pink
        palette: {
            text: '#c6d0f5', muted: '#838ba7', surface: '#414559', deep: '#292c3c', line: '#626880',
            purple: '#ca9ee6', blue: '#8caaee', cyan: '#99d1db', green: '#a6d189',
            yellow: '#e5c890', orange: '#ef9f76', pink: '#f4b8e4',
        },
    },
    {
        id: 'catppuccin-macchiato', label: 'Catppuccin Macchiato', group: 'dark',
        palette: {
            text: '#cad3f5', muted: '#8087a2', surface: '#363a4f', deep: '#1e2030', line: '#5b6078',
            purple: '#c6a0f6', blue: '#8aadf4', cyan: '#91d7e3', green: '#a6da95',
            yellow: '#eed49f', orange: '#f5a97f', pink: '#f5bde6',
        },
    },
    {
        id: 'catppuccin-mocha', label: 'Catppuccin Mocha', group: 'dark',
        palette: {
            text: '#cdd6f4', muted: '#7f849c', surface: '#313244', deep: '#181825', line: '#585b70',
            purple: '#cba6f7', blue: '#89b4fa', cyan: '#89dceb', green: '#a6e3a1',
            yellow: '#f9e2af', orange: '#fab387', pink: '#f5c2e7',
        },
    },
    {
        id: 'nord', label: 'Nord', group: 'dark',
        // nord4, nord3, nord1, nord0, nord3, nord15, nord9, nord8, nord14, nord13, nord12; no pink: nord15
        palette: {
            text: '#d8dee9', muted: '#4c566a', surface: '#3b4252', deep: '#2e3440', line: '#4c566a',
            purple: '#b48ead', blue: '#81a1c1', cyan: '#88c0d0', green: '#a3be8c',
            yellow: '#ebcb8b', orange: '#d08770', pink: '#b48ead',
        },
    },
    {
        id: 'gruvbox-dark', label: 'Gruvbox Dark', group: 'dark',
        // light1, gray, dark1, dark0_hard, dark3, bright_purple/blue/aqua/green/yellow/orange; no pink: bright_red
        palette: {
            text: '#ebdbb2', muted: '#928374', surface: '#3c3836', deep: '#1d2021', line: '#665c54',
            purple: '#d3869b', blue: '#83a598', cyan: '#8ec07c', green: '#b8bb26',
            yellow: '#fabd2f', orange: '#fe8019', pink: '#fb4934',
        },
    },
    {
        id: 'one-dark', label: 'One Dark', group: 'dark',
        // syntax-fg, mono-3, selection (bg +10%), syntax-bg, syntax-gutter, hue-3/2/1/4, hue-6-2, hue-6; no pink: hue-5 red
        palette: {
            text: '#abb2bf', muted: '#5c6370', surface: '#3e4451', deep: '#282c34', line: '#636d83',
            purple: '#c678dd', blue: '#61afef', cyan: '#56b6c2', green: '#98c379',
            yellow: '#e5c07b', orange: '#d19a66', pink: '#e06c75',
        },
    },
    {
        id: 'tokyo-night', label: 'Tokyo Night', group: 'dark',
        // fg, comment, bg_highlight, bg_dark, fg_gutter, magenta, blue, cyan, green, yellow, orange; no pink: red
        palette: {
            text: '#c0caf5', muted: '#565f89', surface: '#292e42', deep: '#16161e', line: '#3b4261',
            purple: '#bb9af7', blue: '#7aa2f7', cyan: '#7dcfff', green: '#9ece6a',
            yellow: '#e0af68', orange: '#ff9e64', pink: '#f7768e',
        },
    },
    {
        id: 'tokyo-night-storm', label: 'Tokyo Night Storm', group: 'dark',
        palette: {
            text: '#c0caf5', muted: '#565f89', surface: '#292e42', deep: '#1f2335', line: '#3b4261',
            purple: '#bb9af7', blue: '#7aa2f7', cyan: '#7dcfff', green: '#9ece6a',
            yellow: '#e0af68', orange: '#ff9e64', pink: '#f7768e',
        },
    },
    {
        id: 'catppuccin-latte', label: 'Catppuccin Latte', group: 'light',
        palette: {
            text: '#4c4f69', muted: '#8c8fa1', surface: '#ccd0da', deep: '#e6e9ef', line: '#acb0be',
            purple: '#8839ef', blue: '#1e66f5', cyan: '#04a5e5', green: '#40a02b',
            yellow: '#df8e1d', orange: '#fe640b', pink: '#ea76cb',
        },
    },
    {
        id: 'gruvbox-light', label: 'Gruvbox Light', group: 'light',
        // dark1, gray, light1, light0_soft, light3, faded_purple/blue/aqua/green/yellow/orange; no pink: faded_red
        palette: {
            text: '#3c3836', muted: '#928374', surface: '#ebdbb2', deep: '#f2e5bc', line: '#bdae93',
            purple: '#8f3f71', blue: '#076678', cyan: '#427b58', green: '#79740e',
            yellow: '#b57614', orange: '#af3a03', pink: '#9d0006',
        },
    },
    {
        id: 'tokyo-night-day', label: 'Tokyo Night Day', group: 'light',
        palette: {
            text: '#3760bf', muted: '#848cb5', surface: '#c4c8da', deep: '#d0d5e3', line: '#a8aecb',
            purple: '#9854f1', blue: '#2e7de9', cyan: '#007197', green: '#587539',
            yellow: '#8c6c3e', orange: '#b15c00', pink: '#f52a65',
        },
    },
];
function presetElements(palette) {
    const out = {};
    for (const [key, fields] of Object.entries(MAPPING)) {
        const style = {};
        for (const prop of ['color', 'background', 'border']) {
            const role = fields[prop];
            if (role) {
                style[prop] = palette[role];
            }
        }
        out[key] = style;
    }
    return out;
}
function presetMessages() {
    return exports.PRESETS.map(({ id, label, group, palette }) => ({ id, label, group, elements: presetElements(palette) }));
}
//# sourceMappingURL=presets.js.map