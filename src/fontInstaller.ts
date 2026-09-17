import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { SystemFont, clearFontCache, listSystemFonts } from './systemFonts';
import { resizeFont, resizedFamilyName } from './ttfResize';

const USER_FONTS = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Fonts');
const REG_KEY = 'HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts';

function run(cmd: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, { windowsHide: true }, (err) => (err ? reject(err) : resolve()));
    });
}

// Makes a scaled copy of a Khmer font for the terminal and installs it for the current user.
export async function ensureResizedFont(source: SystemFont, scale: number): Promise<{ family: string; created: boolean }> {
    const family = resizedFamilyName(source.name, scale);
    const installed = await listSystemFonts();
    if (installed.some((f) => f.name === family)) {
        return { family, created: false };
    }
    const data = resizeFont(await fs.promises.readFile(source.file), scale, family);
    await fs.promises.mkdir(USER_FONTS, { recursive: true });
    const target = path.join(USER_FONTS, `${family.replace(/[^A-Za-z0-9 -]/g, '')}.ttf`);
    await fs.promises.writeFile(target, data);
    await run('reg', ['add', REG_KEY, '/v', `${family} (TrueType)`, '/t', 'REG_SZ', '/d', target, '/f']);
    // Tell running programs a font was added; new ones pick it up from the registry
    await run('powershell', [
        '-NoProfile', '-Command',
        `Add-Type -Namespace W -Name F -MemberDefinition '[DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern int AddFontResource(string f);'; [void][W.F]::AddFontResource('${target.replace(/'/g, "''")}')`,
    ]).catch(() => undefined);
    clearFontCache();
    return { family, created: true };
}
