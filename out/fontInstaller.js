"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureResizedFont = ensureResizedFont;
const child_process_1 = require("child_process");
const fs = require("fs");
const path = require("path");
const systemFonts_1 = require("./systemFonts");
const ttfResize_1 = require("./ttfResize");
const USER_FONTS = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Fonts');
const REG_KEY = 'HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts';
function run(cmd, args) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)(cmd, args, { windowsHide: true }, (err) => (err ? reject(err) : resolve()));
    });
}
// Makes a scaled copy of a Khmer font for the terminal and installs it for the current user.
async function ensureResizedFont(source, scale) {
    const family = (0, ttfResize_1.resizedFamilyName)(source.name, scale);
    const installed = await (0, systemFonts_1.listSystemFonts)();
    if (installed.some((f) => f.name === family)) {
        return { family, created: false };
    }
    const data = (0, ttfResize_1.resizeFont)(await fs.promises.readFile(source.file), scale, family);
    await fs.promises.mkdir(USER_FONTS, { recursive: true });
    const target = path.join(USER_FONTS, `${family.replace(/[^A-Za-z0-9 -]/g, '')}.ttf`);
    await fs.promises.writeFile(target, data);
    await run('reg', ['add', REG_KEY, '/v', `${family} (TrueType)`, '/t', 'REG_SZ', '/d', target, '/f']);
    // Tell running programs a font was added; new ones pick it up from the registry
    await run('powershell', [
        '-NoProfile', '-Command',
        `Add-Type -Namespace W -Name F -MemberDefinition '[DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern int AddFontResource(string f);'; [void][W.F]::AddFontResource('${target.replace(/'/g, "''")}')`,
    ]).catch(() => undefined);
    (0, systemFonts_1.clearFontCache)();
    return { family, created: true };
}
//# sourceMappingURL=fontInstaller.js.map