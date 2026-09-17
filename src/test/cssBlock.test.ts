import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { BLOCK_START, BLOCK_END, findScope, replaceBlock, removeBlock, readBlock, wrapBlock } from '../cssBlock';

const claudeCss = 'html{--a:1}.root_-a7MRw :is(p,li,h1,h2,h3,h4,h5,h6,blockquote,td,th){unicode-bidi:plaintext}';

test('findScope finds the message container class', () => {
    assert.equal(findScope(claudeCss), '.root_-a7MRw');
});

test('findScope falls back to #root', () => {
    assert.equal(findScope('body{}'), '#root');
});

test('replaceBlock appends a wrapped block once', () => {
    const once = replaceBlock(claudeCss, 'h1{color:red}');
    const twice = replaceBlock(once, 'h1{color:blue}');
    assert.ok(twice.startsWith(claudeCss));
    assert.equal(twice.split(BLOCK_START).length, 2);
    assert.match(twice, /h1\{color:blue\}/);
    assert.doesNotMatch(twice, /red/);
    assert.equal(readBlock(twice), wrapBlock('h1{color:blue}'));
});

test('removeBlock restores the original text', () => {
    assert.equal(removeBlock(replaceBlock(claudeCss, 'x{}')), claudeCss);
    assert.equal(removeBlock(claudeCss), claudeCss);
    assert.equal(readBlock(claudeCss), undefined);
});

test('wrapBlock uses exact markers', () => {
    assert.equal(wrapBlock('a'), `\n${BLOCK_START}\na\n${BLOCK_END}\n`);
});
