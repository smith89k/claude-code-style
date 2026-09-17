"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCK_END = exports.BLOCK_START = void 0;
exports.findScope = findScope;
exports.wrapBlock = wrapBlock;
exports.readBlock = readBlock;
exports.removeBlock = removeBlock;
exports.replaceBlock = replaceBlock;
exports.BLOCK_START = '/* >>> claude-code-style >>> */';
exports.BLOCK_END = '/* <<< claude-code-style <<< */';
// Claude Code's markdown container gets a hashed class; it is the one that sets
// unicode-bidi on paragraphs and headings.
function findScope(css) {
    const match = /(\.root_[A-Za-z0-9_-]+) :is\(p,li,h1/.exec(css);
    return match ? match[1] : '#root';
}
function wrapBlock(body) {
    return `\n${exports.BLOCK_START}\n${body}\n${exports.BLOCK_END}\n`;
}
function blockRange(css) {
    const start = css.indexOf(`\n${exports.BLOCK_START}`);
    if (start < 0) {
        return undefined;
    }
    const endMarker = css.indexOf(exports.BLOCK_END, start);
    if (endMarker < 0) {
        return undefined;
    }
    let end = endMarker + exports.BLOCK_END.length;
    if (css[end] === '\n') {
        end++;
    }
    return [start, end];
}
function readBlock(css) {
    const range = blockRange(css);
    return range ? css.slice(range[0], range[1]) : undefined;
}
function removeBlock(css) {
    const range = blockRange(css);
    return range ? css.slice(0, range[0]) + css.slice(range[1]) : css;
}
function replaceBlock(css, body) {
    return removeBlock(css) + wrapBlock(body);
}
//# sourceMappingURL=cssBlock.js.map