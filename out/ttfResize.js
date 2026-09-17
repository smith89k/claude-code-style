"use strict";
// Minimal sfnt rewriter: scale a font by growing its em box (glyphs, advances
// and line metrics all shrink together) and give it a new family name.
// Layout tables (GSUB/GPOS) are copied untouched so Khmer shaping keeps working.
Object.defineProperty(exports, "__esModule", { value: true });
exports.readTables = readTables;
exports.readUnitsPerEm = readUnitsPerEm;
exports.readFamilyName = readFamilyName;
exports.resizeFont = resizeFont;
exports.resizedFamilyName = resizedFamilyName;
function checksum(buf) {
    let sum = 0;
    const padded = buf.length % 4 ? Buffer.concat([buf, Buffer.alloc(4 - (buf.length % 4))]) : buf;
    for (let i = 0; i < padded.length; i += 4) {
        sum = (sum + padded.readUInt32BE(i)) >>> 0;
    }
    return sum;
}
function readTables(buf) {
    const version = buf.length >= 12 ? buf.readUInt32BE(0) : 0;
    if (version !== 0x00010000 && version !== 0x4f54544f /* OTTO */) {
        throw new Error('Unsupported font format');
    }
    const count = buf.readUInt16BE(4);
    const tables = new Map();
    for (let i = 0; i < count; i++) {
        const rec = 12 + i * 16;
        const tag = buf.toString('latin1', rec, rec + 4);
        const offset = buf.readUInt32BE(rec + 8);
        const length = buf.readUInt32BE(rec + 12);
        tables.set(tag, Buffer.from(buf.subarray(offset, offset + length)));
    }
    return tables;
}
function readUnitsPerEm(buf) {
    return readTables(buf).get('head').readUInt16BE(18);
}
function readFamilyName(buf) {
    const name = readTables(buf).get('name');
    if (!name) {
        return undefined;
    }
    const count = name.readUInt16BE(2);
    const strings = name.readUInt16BE(4);
    for (let i = 0; i < count; i++) {
        const rec = 6 + i * 12;
        const platform = name.readUInt16BE(rec);
        const nameId = name.readUInt16BE(rec + 6);
        if (platform === 3 && nameId === 1) {
            const len = name.readUInt16BE(rec + 8);
            const off = name.readUInt16BE(rec + 10);
            return Buffer.from(name.subarray(strings + off, strings + off + len)).swap16().toString('utf16le');
        }
    }
    return undefined;
}
function utf16be(text) {
    return Buffer.from(text, 'utf16le').swap16();
}
function buildNameTable(family) {
    const postscript = family.replace(/[^A-Za-z0-9-]/g, '') + '-Regular';
    const entries = [
        [1, family],
        [2, 'Regular'],
        [3, `${family} Regular`],
        [4, family],
        [6, postscript],
    ];
    const records = [];
    const data = [];
    let offset = 0;
    const add = (platform, encoding, language, id, bytes) => {
        const rec = Buffer.alloc(12);
        rec.writeUInt16BE(platform, 0);
        rec.writeUInt16BE(encoding, 2);
        rec.writeUInt16BE(language, 4);
        rec.writeUInt16BE(id, 6);
        rec.writeUInt16BE(bytes.length, 8);
        rec.writeUInt16BE(offset, 10);
        records.push(rec);
        data.push(bytes);
        offset += bytes.length;
    };
    // Records must be sorted by platform, encoding, language, name id
    for (const [id, text] of entries) {
        add(1, 0, 0, id, Buffer.from(text, 'latin1'));
    }
    for (const [id, text] of entries) {
        add(3, 1, 0x409, id, utf16be(text));
    }
    const header = Buffer.alloc(6);
    header.writeUInt16BE(0, 0);
    header.writeUInt16BE(records.length, 2);
    header.writeUInt16BE(6 + records.length * 12, 4);
    return Buffer.concat([header, ...records, ...data]);
}
function resizeFont(buf, scale, family) {
    const tables = readTables(buf);
    const head = tables.get('head');
    const upm = Math.round(head.readUInt16BE(18) / scale);
    if (upm < 16 || upm > 16384) {
        throw new Error(`Scale ${scale} is out of range for this font`);
    }
    head.writeUInt16BE(upm, 18);
    head.writeUInt32BE(0, 8); // checkSumAdjustment, set below
    tables.set('name', buildNameTable(family));
    const tags = [...tables.keys()].sort();
    const count = tags.length;
    let entrySelector = 0;
    while (1 << (entrySelector + 1) <= count) {
        entrySelector++;
    }
    const searchRange = (1 << entrySelector) * 16;
    const header = Buffer.alloc(12 + count * 16);
    header.writeUInt32BE(buf.readUInt32BE(0), 0);
    header.writeUInt16BE(count, 4);
    header.writeUInt16BE(searchRange, 6);
    header.writeUInt16BE(entrySelector, 8);
    header.writeUInt16BE(count * 16 - searchRange, 10);
    const bodies = [];
    let offset = header.length;
    tags.forEach((tag, i) => {
        const table = tables.get(tag);
        const rec = 12 + i * 16;
        header.write(tag, rec, 4, 'latin1');
        header.writeUInt32BE(checksum(table), rec + 4);
        header.writeUInt32BE(offset, rec + 8);
        header.writeUInt32BE(table.length, rec + 12);
        const pad = (4 - (table.length % 4)) % 4;
        bodies.push(table, Buffer.alloc(pad));
        offset += table.length + pad;
    });
    const out = Buffer.concat([header, ...bodies]);
    const headOffset = header.readUInt32BE(12 + tags.indexOf('head') * 16 + 8);
    out.writeUInt32BE((0xb1b0afba - checksum(out)) >>> 0, headOffset + 8);
    return out;
}
function resizedFamilyName(khmerFont, scale) {
    return `${khmerFont} CCS ${Math.round(scale * 100)}`;
}
//# sourceMappingURL=ttfResize.js.map