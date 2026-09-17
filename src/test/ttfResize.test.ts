import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { readTables, readFamilyName, readUnitsPerEm, resizeFont, resizedFamilyName } from '../ttfResize';

const fontPath = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Fonts', 'Khmer OS System Regular.ttf');
const has = fs.existsSync(fontPath);

test('resizedFamilyName uses a rounded percent', () => {
    assert.equal(resizedFamilyName('Khmer OS System', 13 / 14), 'Khmer OS System CCS 93');
});

test('rejects non-sfnt data', () => {
    assert.throws(() => readTables(Buffer.from('ttcf0000000000000000')), /Unsupported font format/);
});

test('resizeFont changes unitsPerEm and family, keeps other tables', { skip: !has }, () => {
    const src = fs.readFileSync(fontPath);
    const out = resizeFont(src, 13 / 14, 'Khmer OS System CCS 93');
    assert.equal(readUnitsPerEm(src), 2048);
    assert.equal(readUnitsPerEm(out), Math.round(2048 / (13 / 14)));
    assert.equal(readFamilyName(out), 'Khmer OS System CCS 93');
    const a = readTables(src);
    const b = readTables(out);
    assert.deepEqual([...b.keys()].sort(), [...a.keys()].sort());
    assert.ok(a.get('GSUB')!.equals(b.get('GSUB')!));
    // whole-font checksum must be 0xB1B0AFBA
    assert.equal(checksum(out), 0xb1b0afba);
});

function checksum(buf: Buffer): number {
    let sum = 0;
    const padded = Buffer.concat([buf, Buffer.alloc((4 - (buf.length % 4)) % 4)]);
    for (let i = 0; i < padded.length; i += 4) {
        sum = (sum + padded.readUInt32BE(i)) >>> 0;
    }
    return sum;
}
