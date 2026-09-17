import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { parseRegFonts, isKhmerName, fontFamilies } from '../systemFonts';

const regOut = [
    '',
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts',
    '    Arial (TrueType)    REG_SZ    arial.ttf',
    '    Khmer UI Bold (TrueType)    REG_SZ    khmeruib.ttf',
    '    Khmer OS System (TrueType)    REG_SZ    C:\\Users\\t\\AppData\\Local\\Microsoft\\Windows\\Fonts\\Khmer OS System Regular.ttf',
    '    Cambria & Cambria Math (TrueType)    REG_SZ    cambria.ttc',
    '    Noto Sans (OpenType)    REG_SZ    NotoSans.otf',
    '',
].join('\r\n');

test('parseRegFonts strips type suffix and resolves relative files', () => {
    const fonts = parseRegFonts(regOut, 'C:\\Windows\\Fonts');
    assert.deepEqual(fonts[0], { name: 'Arial', file: 'C:\\Windows\\Fonts\\arial.ttf' });
    assert.equal(fonts[2].file, 'C:\\Users\\t\\AppData\\Local\\Microsoft\\Windows\\Fonts\\Khmer OS System Regular.ttf');
    assert.equal(fonts[3].name, 'Cambria & Cambria Math');
    assert.equal(fonts[4].name, 'Noto Sans');
});

test('isKhmerName recognises common Khmer fonts', () => {
    for (const n of ['Khmer OS System', 'Hanuman', 'Kantumruy Pro', 'Noto Sans Khmer', 'Battambang']) {
        assert.ok(isKhmerName(n), n);
    }
    assert.equal(isKhmerName('Arial'), false);
});

test('fontFamilies sorts, de-duplicates and lists khmer first group', () => {
    const fams = fontFamilies([
        { name: 'Khmer UI', file: 'a' },
        { name: 'Arial', file: 'b' },
        { name: 'Khmer UI', file: 'c' },
    ]);
    assert.deepEqual(fams.all, ['Arial', 'Khmer UI']);
    assert.deepEqual(fams.khmer, ['Khmer UI']);
});
