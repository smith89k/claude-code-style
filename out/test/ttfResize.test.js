"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ttfResize_1 = require("../ttfResize");
const fontPath = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Fonts', 'Khmer OS System Regular.ttf');
const has = fs.existsSync(fontPath);
(0, node_test_1.test)('resizedFamilyName uses a rounded percent', () => {
    assert.equal((0, ttfResize_1.resizedFamilyName)('Khmer OS System', 13 / 14), 'Khmer OS System CCS 93');
});
(0, node_test_1.test)('rejects non-sfnt data', () => {
    assert.throws(() => (0, ttfResize_1.readTables)(Buffer.from('ttcf0000000000000000')), /Unsupported font format/);
});
(0, node_test_1.test)('resizeFont changes unitsPerEm and family, keeps other tables', { skip: !has }, () => {
    const src = fs.readFileSync(fontPath);
    const out = (0, ttfResize_1.resizeFont)(src, 13 / 14, 'Khmer OS System CCS 93');
    assert.equal((0, ttfResize_1.readUnitsPerEm)(src), 2048);
    assert.equal((0, ttfResize_1.readUnitsPerEm)(out), Math.round(2048 / (13 / 14)));
    assert.equal((0, ttfResize_1.readFamilyName)(out), 'Khmer OS System CCS 93');
    const a = (0, ttfResize_1.readTables)(src);
    const b = (0, ttfResize_1.readTables)(out);
    assert.deepEqual([...b.keys()].sort(), [...a.keys()].sort());
    assert.ok(a.get('GSUB').equals(b.get('GSUB')));
    // whole-font checksum must be 0xB1B0AFBA
    assert.equal(checksum(out), 0xb1b0afba);
});
function checksum(buf) {
    let sum = 0;
    const padded = Buffer.concat([buf, Buffer.alloc((4 - (buf.length % 4)) % 4)]);
    for (let i = 0; i < padded.length; i += 4) {
        sum = (sum + padded.readUInt32BE(i)) >>> 0;
    }
    return sum;
}
//# sourceMappingURL=ttfResize.test.js.map