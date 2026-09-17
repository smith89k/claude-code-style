"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const systemFonts_1 = require("../systemFonts");
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
(0, node_test_1.test)('parseRegFonts strips type suffix and resolves relative files', () => {
    const fonts = (0, systemFonts_1.parseRegFonts)(regOut, 'C:\\Windows\\Fonts');
    assert.deepEqual(fonts[0], { name: 'Arial', file: 'C:\\Windows\\Fonts\\arial.ttf' });
    assert.equal(fonts[2].file, 'C:\\Users\\t\\AppData\\Local\\Microsoft\\Windows\\Fonts\\Khmer OS System Regular.ttf');
    assert.equal(fonts[3].name, 'Cambria & Cambria Math');
    assert.equal(fonts[4].name, 'Noto Sans');
});
(0, node_test_1.test)('isKhmerName recognises common Khmer fonts', () => {
    for (const n of ['Khmer OS System', 'Hanuman', 'Kantumruy Pro', 'Noto Sans Khmer', 'Battambang']) {
        assert.ok((0, systemFonts_1.isKhmerName)(n), n);
    }
    assert.equal((0, systemFonts_1.isKhmerName)('Arial'), false);
});
(0, node_test_1.test)('fontFamilies sorts, de-duplicates and lists khmer first group', () => {
    const fams = (0, systemFonts_1.fontFamilies)([
        { name: 'Khmer UI', file: 'a' },
        { name: 'Arial', file: 'b' },
        { name: 'Khmer UI', file: 'c' },
    ]);
    assert.deepEqual(fams.all, ['Arial', 'Khmer UI']);
    assert.deepEqual(fams.khmer, ['Khmer UI']);
});
//# sourceMappingURL=systemFonts.test.js.map