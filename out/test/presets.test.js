"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const styleConfig_1 = require("../styleConfig");
const presets_1 = require("../presets");
const HEX6 = /^#[0-9a-f]{6}$/;
const media = path.join(__dirname, '..', '..', 'media');
(0, node_test_1.test)('there are 12 presets with unique ids and known groups', () => {
    assert.equal(presets_1.PRESETS.length, 12);
    assert.equal(new Set(presets_1.PRESETS.map((p) => p.id)).size, 12);
    for (const p of presets_1.PRESETS) {
        assert.ok(p.group === 'dark' || p.group === 'light', p.id);
    }
    assert.deepEqual(presets_1.PRESETS.filter((p) => p.group === 'light').map((p) => p.id), ['catppuccin-latte', 'gruvbox-light', 'tokyo-night-day']);
});
(0, node_test_1.test)('every preset defines all 12 roles as lowercase #rrggbb', () => {
    assert.equal(presets_1.ROLES.length, 12);
    for (const p of presets_1.PRESETS) {
        assert.deepEqual(Object.keys(p.palette).sort(), [...presets_1.ROLES].sort(), p.id);
        for (const role of presets_1.ROLES) {
            assert.match(p.palette[role], HEX6, `${p.id}.${role}`);
        }
    }
});
(0, node_test_1.test)('presetElements covers every row and survives sanitizeConfig unchanged', () => {
    for (const p of presets_1.PRESETS) {
        const elements = (0, presets_1.presetElements)(p.palette);
        assert.deepEqual(Object.keys(elements), styleConfig_1.ELEMENT_KEYS, p.id);
        assert.deepEqual((0, styleConfig_1.sanitizeConfig)({ elements }).elements, elements, p.id);
    }
});
(0, node_test_1.test)('presetElements only sets colour fields', () => {
    for (const p of presets_1.PRESETS) {
        for (const style of Object.values((0, presets_1.presetElements)(p.palette))) {
            for (const prop of Object.keys(style ?? {})) {
                assert.ok(['color', 'background', 'border'].includes(prop), `${p.id}: ${prop}`);
            }
        }
    }
});
(0, node_test_1.test)('mapping spot checks on Catppuccin Mocha', () => {
    const mocha = presets_1.PRESETS.find((p) => p.id === 'catppuccin-mocha');
    const e = (0, presets_1.presetElements)(mocha.palette);
    assert.deepEqual(e.h1, { color: '#fab387' });
    assert.deepEqual(e.code, { color: '#a6e3a1', background: '#313244', border: '#585b70' });
    assert.deepEqual(e.codeBlock, { color: '#cdd6f4', background: '#181825', border: '#585b70' });
    assert.deepEqual(e.quote, { color: '#7f849c', border: '#cba6f7' });
    assert.deepEqual(e.divider, { border: '#585b70' });
});
(0, node_test_1.test)('presetMessages carries id, label, group and elements', () => {
    const messages = (0, presets_1.presetMessages)();
    assert.equal(messages.length, 12);
    assert.deepEqual(messages[0], {
        id: 'dracula',
        label: 'Dracula',
        group: 'dark',
        elements: (0, presets_1.presetElements)(presets_1.PRESETS[0].palette),
    });
});
function listFromPanel(name) {
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    const match = new RegExp(`const ${name} = (\\[[^\\]]*\\]);`).exec(js);
    assert.ok(match, `${name} not found in panel.js`);
    return JSON.parse(match[1].replace(/'/g, '"'));
}
(0, node_test_1.test)('presets never fill a box the page disables', () => {
    const noText = listFromPanel('NO_TEXT');
    const noBackground = listFromPanel('NO_BACKGROUND');
    const hasBorder = listFromPanel('HAS_BORDER');
    for (const p of presets_1.PRESETS) {
        for (const [key, style] of Object.entries((0, presets_1.presetElements)(p.palette))) {
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
(0, node_test_1.test)('panel has the preset select, hint and placeholder text', () => {
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    assert.ok(html.includes('id="preset"'), 'select');
    assert.ok(html.includes('id="presetHint"'), 'hint');
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    assert.ok(js.includes("'Choose a preset…'"), 'placeholder');
    assert.ok(js.includes("'For light editor themes'"), 'light hint');
});
//# sourceMappingURL=presets.test.js.map