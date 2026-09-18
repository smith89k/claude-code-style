import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { ELEMENT_KEYS, sanitizeConfig } from '../styleConfig';
import { PRESETS, ROLES, presetElements, presetMessages } from '../presets';

const HEX6 = /^#[0-9a-f]{6}$/;
const media = path.join(__dirname, '..', '..', 'media');

test('there are 12 presets with unique ids and known groups', () => {
    assert.equal(PRESETS.length, 12);
    assert.equal(new Set(PRESETS.map((p) => p.id)).size, 12);
    for (const p of PRESETS) {
        assert.ok(p.group === 'dark' || p.group === 'light', p.id);
    }
    assert.deepEqual(
        PRESETS.filter((p) => p.group === 'light').map((p) => p.id),
        ['catppuccin-latte', 'gruvbox-light', 'tokyo-night-day']
    );
});

test('every preset defines all 12 roles as lowercase #rrggbb', () => {
    assert.equal(ROLES.length, 12);
    for (const p of PRESETS) {
        assert.deepEqual(Object.keys(p.palette).sort(), [...ROLES].sort(), p.id);
        for (const role of ROLES) {
            assert.match(p.palette[role], HEX6, `${p.id}.${role}`);
        }
    }
});

test('presetElements covers every row and survives sanitizeConfig unchanged', () => {
    for (const p of PRESETS) {
        const elements = presetElements(p.palette);
        assert.deepEqual(Object.keys(elements), ELEMENT_KEYS, p.id);
        assert.deepEqual(sanitizeConfig({ elements }).elements, elements, p.id);
    }
});

test('presetElements only sets colour fields', () => {
    for (const p of PRESETS) {
        for (const style of Object.values(presetElements(p.palette))) {
            for (const prop of Object.keys(style ?? {})) {
                assert.ok(['color', 'background', 'border'].includes(prop), `${p.id}: ${prop}`);
            }
        }
    }
});

test('mapping spot checks on Catppuccin Mocha', () => {
    const mocha = PRESETS.find((p) => p.id === 'catppuccin-mocha')!;
    const e = presetElements(mocha.palette);
    assert.deepEqual(e.h1, { color: '#fab387' });
    assert.deepEqual(e.code, { color: '#a6e3a1', background: '#313244', border: '#585b70' });
    assert.deepEqual(e.codeBlock, { color: '#cdd6f4', background: '#181825', border: '#585b70' });
    assert.deepEqual(e.quote, { color: '#7f849c', border: '#cba6f7' });
    assert.deepEqual(e.divider, { border: '#585b70' });
});

test('presetMessages carries id, label, group and elements', () => {
    const messages = presetMessages();
    assert.equal(messages.length, 12);
    assert.deepEqual(messages[0], {
        id: 'dracula',
        label: 'Dracula',
        group: 'dark',
        elements: presetElements(PRESETS[0].palette),
    });
});

function listFromPanel(name: string): string[] {
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    const match = new RegExp(`const ${name} = (\\[[^\\]]*\\]);`).exec(js);
    assert.ok(match, `${name} not found in panel.js`);
    return JSON.parse(match[1].replace(/'/g, '"'));
}

test('presets never fill a box the page disables', () => {
    const noText = listFromPanel('NO_TEXT');
    const noBackground = listFromPanel('NO_BACKGROUND');
    const hasBorder = listFromPanel('HAS_BORDER');
    for (const p of PRESETS) {
        for (const [key, style] of Object.entries(presetElements(p.palette))) {
            if (noText.includes(key)) {
                assert.equal(style?.color, undefined, `${p.id}.${key}.color`);
            }
            if (noBackground.includes(key)) {
                assert.equal(style?.background, undefined, `${p.id}.${key}.background`);
            }
            if (!hasBorder.includes(key)) {
                assert.equal(style?.border, undefined, `${p.id}.${key}.border`);
            }
        }
    }
});

test('panel has the preset select, hint and placeholder text', () => {
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    assert.ok(html.includes('id="preset"'), 'select');
    assert.ok(html.includes('id="presetHint"'), 'hint');
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    assert.ok(js.includes("'Choose a preset…'"), 'placeholder');
    assert.ok(js.includes("'For light editor themes'"), 'light hint');
});
