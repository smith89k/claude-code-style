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
//# sourceMappingURL=panelScript.test.js.map