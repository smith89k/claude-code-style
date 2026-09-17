import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { ELEMENT_KEYS } from '../styleConfig';

const media = path.join(__dirname, '..', '..', 'media');

test('panel.js parses', () => {
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    assert.doesNotThrow(() => new Function(js));
});

test('panel.js lists the same style rows as the extension', () => {
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    const match = /const KEYS = (\[[^\]]*\]);/.exec(js);
    assert.ok(match, 'KEYS array not found');
    assert.deepEqual(JSON.parse(match[1].replace(/'/g, '"')), ELEMENT_KEYS);
});

test('panel.html has the placeholders the host fills', () => {
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    for (const token of ['{{cspSource}}', '{{nonce}}', '{{cssUri}}', '{{jsUri}}']) {
        assert.ok(html.includes(token), token);
    }
});
