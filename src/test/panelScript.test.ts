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

function previewText(): string {
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    return html.slice(html.indexOf('id="preview"')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

function panelLabels(): Record<string, [string, string]> {
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    const out: Record<string, [string, string]> = {};
    // \r?: git on Windows checks files out with CRLF
    for (const m of js.matchAll(/^\s+(\w+): \['([^']*)', '([^']*)'\],\r?$/gm)) {
        out[m[1]] = [m[2], m[3]];
    }
    return out;
}

test('every style row has a label', () => {
    assert.deepEqual(Object.keys(panelLabels()), ELEMENT_KEYS);
});

test('bracket text is copied from the preview', () => {
    const text = previewText();
    for (const [key, [, brackets]] of Object.entries(panelLabels())) {
        if (!brackets || key === 'bullet') {
            continue;
        }
        for (const part of brackets.split(', ')) {
            assert.ok(text.includes(part), `${key}: "${part}" is not in the preview`);
        }
    }
});

test('bullet brackets come from a bullet list and a numbered list', () => {
    assert.equal(panelLabels().bullet[1], '•, 1., 2.');
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    assert.match(html, /<ul>\s*<li>[\s\S]*?<li>/);
    assert.match(html, /<ol>\s*<li>[\s\S]*?<li>/);
});
