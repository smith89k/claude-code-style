"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const styleConfig_1 = require("../styleConfig");
const cssBuilder_1 = require("../cssBuilder");
const base = {
    englishFont: 'JetBrains Mono',
    englishSize: 14,
    khmerFont: 'Khmer OS System',
    khmerSize: 13,
    elements: {},
};
(0, node_test_1.test)('sanitizeConfig fills defaults and clamps', () => {
    const cfg = (0, styleConfig_1.sanitizeConfig)({ englishSize: 500, khmerSize: 2, elements: { h1: { color: 'red', size: 22 } } });
    assert.equal(cfg.englishSize, 100);
    assert.equal(cfg.khmerSize, 6);
    assert.equal(cfg.englishFont, styleConfig_1.DEFAULT_CONFIG.englishFont);
    assert.deepEqual(cfg.elements.h1, { size: 22 });
});
(0, node_test_1.test)('sanitizeConfig drops unknown keys and bad weights, keeps italic', () => {
    const cfg = (0, styleConfig_1.sanitizeConfig)({ elements: { h9: { size: 10 }, bold: { weight: 'heavy', italic: true, color: '#FfCc00' } } });
    assert.equal(cfg.elements.h9, undefined);
    assert.deepEqual(cfg.elements.bold, { italic: true, color: '#FfCc00' });
});
(0, node_test_1.test)('font names are cleaned of CSS-breaking characters', () => {
    const cfg = (0, styleConfig_1.sanitizeConfig)({ ...base, englishFont: 'Evil"; } body{x', elements: {} });
    assert.equal(cfg.englishFont, 'Evil  bodyx');
});
(0, node_test_1.test)('khmerScale is khmer size over english size', () => {
    assert.equal((0, cssBuilder_1.khmerScale)((0, styleConfig_1.sanitizeConfig)(base)), 13 / 14);
});
(0, node_test_1.test)('chatFamilyList puts alias before real khmer font', () => {
    assert.equal((0, cssBuilder_1.chatFamilyList)((0, styleConfig_1.sanitizeConfig)(base)), `'JetBrains Mono', 'CCS Khmer', 'Khmer OS System', monospace`);
    assert.equal((0, cssBuilder_1.chatFamilyList)((0, styleConfig_1.sanitizeConfig)(base), 'Kantumruy Pro'), `'Kantumruy Pro', 'CCS Khmer', 'Khmer OS System', monospace`);
});
(0, node_test_1.test)('buildCss writes font-face with size-adjust and unicode-range', () => {
    const css = (0, cssBuilder_1.buildCss)((0, styleConfig_1.sanitizeConfig)(base), '.root_x');
    assert.match(css, /@font-face\s*{[^}]*font-family: "CCS Khmer";/);
    assert.match(css, /src: local\("Khmer OS System"\);/);
    assert.match(css, /unicode-range: U\+1780-17FF, U\+19E0-19FF;/);
    assert.match(css, /size-adjust: 92\.9%;/);
    assert.doesNotMatch(css, /\.root_x h1/);
});
(0, node_test_1.test)('buildCss writes only filled element properties', () => {
    const css = (0, cssBuilder_1.buildCss)((0, styleConfig_1.sanitizeConfig)({
        ...base,
        elements: {
            h1: { size: 22, color: '#ffb86c', weight: 'bold', italic: false },
            bold: { color: '#f1fa8c' },
            link: { font: 'Kantumruy Pro' },
        },
    }), '.root_x');
    assert.match(css, /\.root_x h1 {\n  font-size: 22px;\n  color: #ffb86c;\n  font-weight: bold;\n  font-style: normal;\n}/);
    assert.match(css, /\.root_x strong, \.root_x b {\n  color: #f1fa8c;\n}/);
    assert.match(css, /\.root_x a {\n  font-family: 'Kantumruy Pro', 'CCS Khmer', 'Khmer OS System', monospace;\n}/);
    assert.doesNotMatch(css, /h2/);
});
(0, node_test_1.test)('sanitizeConfig keeps background, border and underline', () => {
    const cfg = (0, styleConfig_1.sanitizeConfig)({
        elements: {
            quote: { background: '#111111', border: '#ff79c6', underline: true },
            text: { background: 'blue', border: 'nope' },
            divider: { border: '#444' },
        },
    });
    assert.deepEqual(cfg.elements.quote, { background: '#111111', border: '#ff79c6', underline: true });
    assert.equal(cfg.elements.text, undefined);
    assert.deepEqual(cfg.elements.divider, { border: '#444' });
});
function cssFor(elements) {
    return (0, cssBuilder_1.buildCss)((0, styleConfig_1.sanitizeConfig)({ ...base, elements }), '.root_x');
}
(0, node_test_1.test)('code snippet only targets inline code', () => {
    const css = cssFor({ code: { color: '#50fa7b', background: '#222222' } });
    assert.match(css, /\.root_x :not\(pre\) > code {\n  color: #50fa7b;\n  background: #222222;\n}/);
});
(0, node_test_1.test)('code block puts text styles on pre code and box styles on pre', () => {
    const css = cssFor({ codeBlock: { size: 12, background: '#000000', border: '#333333' } });
    assert.match(css, /\.root_x pre code {\n  font-size: 12px;\n}/);
    assert.match(css, /\.root_x pre {\n  background: #000000;\n}/);
    assert.match(css, /\.root_x pre {\n  border: 1px solid #333333;\n}/);
});
(0, node_test_1.test)('quote border is a left bar, divider is a top line, table uses border-color', () => {
    const css = cssFor({
        quote: { border: '#ff79c6' },
        divider: { border: '#444444', color: '#ffffff' },
        tableCell: { border: '#555555' },
    });
    assert.match(css, /\.root_x blockquote {\n  border-left: 3px solid #ff79c6;\n  padding-left: 10px;\n  margin-left: 0;\n}/);
    assert.match(css, /\.root_x hr {\n  border: none;\n  border-top: 1px solid #444444;\n}/);
    assert.doesNotMatch(css, /hr {\n  color/);
    assert.match(css, /\.root_x table, \.root_x td {\n  border-color: #555555;\n}/);
});
(0, node_test_1.test)('bullets take text styles but no background', () => {
    const css = cssFor({ bullet: { color: '#bd93f9', background: '#000000' }, link: { underline: false } });
    assert.match(css, /\.root_x li::marker {\n  color: #bd93f9;\n}/);
    assert.doesNotMatch(css, /marker {[^}]*background/);
    assert.match(css, /\.root_x a {\n  text-decoration: none;\n}/);
});
(0, node_test_1.test)('new text rows map to their tags', () => {
    const css = cssFor({
        text: { color: '#f8f8f2' },
        strike: { color: '#6272a4' },
        list: { color: '#f8f8f2' },
        tableHeader: { weight: 'bold' },
    });
    assert.match(css, /\.root_x p {/);
    assert.match(css, /\.root_x del, \.root_x s {/);
    assert.match(css, /\.root_x li {/);
    assert.match(css, /\.root_x th {/);
});
(0, node_test_1.test)('tool rows use prefix selectors, bare in Claude Code and scoped in the preview', () => {
    const cfg = (0, styleConfig_1.sanitizeConfig)({ ...base, elements: { toolName: { color: '#ff0000' }, toolBox: { background: '#111111', border: '#222222' } } });
    const real = (0, cssBuilder_1.buildCss)(cfg, '.root_x');
    assert.match(real, /\n\[class\*="toolNameText_"\] {\n  color: #ff0000;\n}/);
    assert.match(real, /\n\[class\*="toolBody_"\] {\n  background: #111111;\n}/);
    assert.match(real, /\n\[class\*="toolBody_"\], \[class\*="toolBodyRow_"\] {\n  border-color: #222222;\n}/);
    assert.doesNotMatch(real, /\.root_x \[class/);
    const preview = (0, cssBuilder_1.buildCss)(cfg, '#preview .md', '#preview');
    assert.match(preview, /#preview \[class\*="toolNameText_"\] {\n  color: #ff0000;\n}/);
});
(0, node_test_1.test)('IN / OUT label colour shows at full opacity', () => {
    const css = cssFor({ toolLabel: { color: '#abcdef' }, toolName: { color: '#123456' } });
    assert.match(css, /\[class\*="toolBodyRowLabel_"\] {\n  color: #abcdef;\n  opacity: 1;\n}/);
    assert.match(css, /\[class\*="toolNameText_"\] {\n  color: #123456;\n}/);
    assert.doesNotMatch(cssFor({ toolLabel: { size: 11 } }), /opacity/);
});
(0, node_test_1.test)('tool description covers both Claude Code variants', () => {
    const css = cssFor({ toolDescription: { italic: true } });
    assert.match(css, /\[class\*="toolNameTextSecondary_"\], \[class\*="toolNameTextSecondaryPlaintext_"\] {\n  font-style: italic;\n}/);
});
(0, node_test_1.test)('tool content styles its pre and code too', () => {
    const css = cssFor({ toolContent: { size: 12 } });
    assert.match(css, /\[class\*="toolBodyRowContent_"\], \[class\*="toolBodyRowContent_"\] pre, \[class\*="toolBodyRowContent_"\] code {\n  font-size: 12px;\n}/);
});
(0, node_test_1.test)('previewSelectors scopes each row and drops pseudo-elements', () => {
    const s = (0, cssBuilder_1.previewSelectors)();
    assert.deepEqual(Object.keys(s), styleConfig_1.ELEMENT_KEYS);
    assert.equal(s.text, '#preview .md p');
    assert.equal(s.bullet, '#preview .md li');
    assert.equal(s.code, '#preview .md :not(pre) > code');
    assert.equal(s.codeBlock, '#preview .md pre code, #preview .md pre');
    assert.equal(s.divider, '#preview .md hr');
    assert.equal(s.toolBox, '#preview [class*="toolBody_"]');
    assert.equal(s.toolLabel, '#preview [class*="toolBodyRowLabel_"]');
});
(0, node_test_1.test)('tool content background also covers the OUT result box inside it', () => {
    const css = cssFor({ toolContent: { background: '#111111' } });
    assert.match(css, /\[class\*="toolBodyRowContent_"\], \[class\*="toolBodyRowContent_"\] \[class\*="toolResult_"\] {\n  background: #111111;\n}/);
});
//# sourceMappingURL=cssBuilder.test.js.map