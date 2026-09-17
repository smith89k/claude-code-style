"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isKhmerName = isKhmerName;
exports.parseRegFonts = parseRegFonts;
exports.fontFamilies = fontFamilies;
exports.listSystemFonts = listSystemFonts;
exports.clearFontCache = clearFontCache;
const child_process_1 = require("child_process");
const path = require("path");
const KEYS = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts',
    'HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts',
];
const KHMER = /khmer|hanuman|battambang|kantumruy|siemreap|moul|muol|koulen|bokor|dangrek|nokora|suwannaphum|bayon|angkor|kdam|preahvihear|taprom|odormean|chenla|fasthand|freehand/i;
function isKhmerName(name) {
    return KHMER.test(name);
}
function parseRegFonts(output, fontsDir) {
    const fonts = [];
    for (const line of output.split(/\r?\n/)) {
        const match = /^\s{4}(.+?)\s{4}REG_(?:EXPAND_)?SZ\s{4}(.+)$/.exec(line);
        if (!match) {
            continue;
        }
        const name = match[1].replace(/\s*\((TrueType|OpenType|All res)\)\s*$/i, '').trim();
        const value = match[2].trim();
        const file = path.win32.isAbsolute(value) ? value : path.win32.join(fontsDir, value);
        fonts.push({ name, file });
    }
    return fonts;
}
function fontFamilies(fonts) {
    const all = [...new Set(fonts.map((f) => f.name))].sort((a, b) => a.localeCompare(b));
    return { all, khmer: all.filter(isKhmerName) };
}
function regQuery(key) {
    return new Promise((resolve) => {
        (0, child_process_1.execFile)('reg', ['query', key], { maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout) => {
            resolve(err ? '' : stdout);
        });
    });
}
let cache;
function listSystemFonts() {
    if (!cache) {
        const fontsDir = path.win32.join(process.env.WINDIR || 'C:\\Windows', 'Fonts');
        cache = Promise.all(KEYS.map(regQuery)).then((outputs) => {
            const fonts = outputs.flatMap((o) => parseRegFonts(o, fontsDir));
            const seen = new Map();
            // Later (per-user) entries win over machine-wide ones with the same name
            for (const f of fonts) {
                seen.set(f.name, f);
            }
            return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
        });
    }
    return cache;
}
function clearFontCache() {
    cache = undefined;
}
//# sourceMappingURL=systemFonts.js.map