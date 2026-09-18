"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const styleConfig_1 = require("../styleConfig");
const media = path.join(__dirname, '..', '..', 'media');
(0, node_test_1.test)('panel.js parses', () => {
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    assert.doesNotThrow(() => new Function(js));
});
(0, node_test_1.test)('panel.js lists the same style rows as the extension', () => {
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    const match = /const KEYS = (\[[^\]]*\]);/.exec(js);
    assert.ok(match, 'KEYS array not found');
    assert.deepEqual(JSON.parse(match[1].replace(/'/g, '"')), styleConfig_1.ELEMENT_KEYS);
});
(0, node_test_1.test)('panel.html has the placeholders the host fills', () => {
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    for (const token of ['{{cspSource}}', '{{nonce}}', '{{cssUri}}', '{{jsUri}}']) {
        assert.ok(html.includes(token), token);
    }
});
function previewText() {
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    return html.slice(html.indexOf('id="preview"')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
function panelLabels() {
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    const out = {};
    // \r?: git on Windows checks files out with CRLF
    for (const m of js.matchAll(/^\s+(\w+): \['([^']*)', '([^']*)'\],\r?$/gm)) {
        out[m[1]] = [m[2], m[3]];
    }
    return out;
}
(0, node_test_1.test)('every style row has a label', () => {
    assert.deepEqual(Object.keys(panelLabels()), styleConfig_1.ELEMENT_KEYS);
});
(0, node_test_1.test)('bracket text is copied from the preview', () => {
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
(0, node_test_1.test)('bullet brackets come from a bullet list and a numbered list', () => {
    assert.equal(panelLabels().bullet[1], '•, 1., 2.');
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    assert.match(html, /<ul>\s*<li>[\s\S]*?<li>/);
    assert.match(html, /<ol>\s*<li>[\s\S]*?<li>/);
});
(0, node_test_1.test)('preview tool box carries the Claude Code class prefixes', () => {
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    for (const prefix of ['toolNameText_', 'toolNameTextSecondaryPlaintext_', 'toolBody_', 'toolBodyRow_', 'toolBodyRowLabel_', 'toolBodyRowContent_']) {
        assert.ok(html.includes(`${prefix}preview`), prefix);
    }
});
(0, node_test_1.test)('panel.js groups rows and walks only style rows', () => {
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    assert.ok(js.includes(`text: "Claude's reply"`), 'reply group');
    assert.ok(js.includes(`toolName: 'Tool box'`), 'tool group');
    assert.ok(!js.includes(`querySelectorAll('tr')`), 'group rows have no data-key');
});
(0, node_test_1.test)('preview OUT row has the inner result box Claude Code draws', () => {
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    assert.match(html, /toolBodyRowContent_preview"><div class="tool-result toolResult_preview">cssBuilder\.ts/);
});
//# sourceMappingURL=panelScript.test.js.map