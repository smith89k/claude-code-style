export const BLOCK_START = '/* >>> claude-code-style >>> */';
export const BLOCK_END = '/* <<< claude-code-style <<< */';

// Claude Code's markdown container gets a hashed class; it is the one that sets
// unicode-bidi on paragraphs and headings.
export function findScope(css: string): string {
    const match = /(\.root_[A-Za-z0-9_-]+) :is\(p,li,h1/.exec(css);
    return match ? match[1] : '#root';
}

export function wrapBlock(body: string): string {
    return `\n${BLOCK_START}\n${body}\n${BLOCK_END}\n`;
}

function blockRange(css: string): [number, number] | undefined {
    const start = css.indexOf(`\n${BLOCK_START}`);
    if (start < 0) {
        return undefined;
    }
    const endMarker = css.indexOf(BLOCK_END, start);
    if (endMarker < 0) {
        return undefined;
    }
    let end = endMarker + BLOCK_END.length;
    if (css[end] === '\n') {
        end++;
    }
    return [start, end];
}

export function readBlock(css: string): string | undefined {
    const range = blockRange(css);
    return range ? css.slice(range[0], range[1]) : undefined;
}

export function removeBlock(css: string): string {
    const range = blockRange(css);
    return range ? css.slice(0, range[0]) + css.slice(range[1]) : css;
}

export function replaceBlock(css: string, body: string): string {
    return removeBlock(css) + wrapBlock(body);
}
