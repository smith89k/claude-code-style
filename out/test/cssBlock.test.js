"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const cssBlock_1 = require("../cssBlock");
const claudeCss = 'html{--a:1}.root_-a7MRw :is(p,li,h1,h2,h3,h4,h5,h6,blockquote,td,th){unicode-bidi:plaintext}';
(0, node_test_1.test)('findScope finds the message container class', () => {
    assert.equal((0, cssBlock_1.findScope)(claudeCss), '.root_-a7MRw');
});
(0, node_test_1.test)('findScope falls back to #root', () => {
    assert.equal((0, cssBlock_1.findScope)('body{}'), '#root');
});
(0, node_test_1.test)('replaceBlock appends a wrapped block once', () => {
    const once = (0, cssBlock_1.replaceBlock)(claudeCss, 'h1{color:red}');
    const twice = (0, cssBlock_1.replaceBlock)(once, 'h1{color:blue}');
    assert.ok(twice.startsWith(claudeCss));
    assert.equal(twice.split(cssBlock_1.BLOCK_START).length, 2);
    assert.match(twice, /h1\{color:blue\}/);
    assert.doesNotMatch(twice, /red/);
    assert.equal((0, cssBlock_1.readBlock)(twice), (0, cssBlock_1.wrapBlock)('h1{color:blue}'));
});
(0, node_test_1.test)('removeBlock restores the original text', () => {
    assert.equal((0, cssBlock_1.removeBlock)((0, cssBlock_1.replaceBlock)(claudeCss, 'x{}')), claudeCss);
    assert.equal((0, cssBlock_1.removeBlock)(claudeCss), claudeCss);
    assert.equal((0, cssBlock_1.readBlock)(claudeCss), undefined);
});
(0, node_test_1.test)('wrapBlock uses exact markers', () => {
    assert.equal((0, cssBlock_1.wrapBlock)('a'), `\n${cssBlock_1.BLOCK_START}\na\n${cssBlock_1.BLOCK_END}\n`);
});
//# sourceMappingURL=cssBlock.test.js.map