import { ElementKey, ElementStyle, StyleConfig, ELEMENT_KEYS } from './styleConfig';

export const KHMER_ALIAS = 'CCS Khmer';
export const KHMER_RANGE = 'U+1780-17FF, U+19E0-19FF';

type BorderKind = 'box' | 'color' | 'left' | 'top';

interface Target {
    text: string[];           // font, size, color, weight, italic, underline
    box: string[];            // background
    border?: { selectors: string[]; kind: BorderKind };
}

const same = (...tags: string[]): Target => ({ text: tags, box: tags });

// Selectors match what Claude Code renders inside its markdown container
const TARGETS: Record<ElementKey, Target> = {
    text: same('p'),
    h1: same('h1'), h2: same('h2'), h3: same('h3'), h4: same('h4'), h5: same('h5'), h6: same('h6'),
    bold: same('strong', 'b'),
    italic: same('em', 'i'),
    strike: same('del', 's'),
    link: same('a'),
    code: { ...same(':not(pre) > code'), border: { selectors: [':not(pre) > code'], kind: 'box' } },
    codeBlock: { text: ['pre code'], box: ['pre'], border: { selectors: ['pre'], kind: 'box' } },
    list: same('li'),
    bullet: { text: ['li::marker'], box: [] },
    quote: { ...same('blockquote'), border: { selectors: ['blockquote'], kind: 'left' } },
    tableHeader: { ...same('th'), border: { selectors: ['th'], kind: 'color' } },
    tableCell: { ...same('td'), border: { selectors: ['table', 'td'], kind: 'color' } },
    divider: { text: [], box: [], border: { selectors: ['hr'], kind: 'top' } },
};

export function khmerScale(cfg: StyleConfig): number {
    return cfg.khmerSize / cfg.englishSize;
}

export function chatFamilyList(cfg: StyleConfig, primary: string = cfg.englishFont): string {
    return `'${primary}', '${KHMER_ALIAS}', '${cfg.khmerFont}', monospace`;
}

function textLines(style: ElementStyle, cfg: StyleConfig): string[] {
    const lines: string[] = [];
    if (style.font) {
        lines.push(`font-family: ${chatFamilyList(cfg, style.font)};`);
    }
    if (style.size !== undefined) {
        lines.push(`font-size: ${style.size}px;`);
    }
    if (style.color) {
        lines.push(`color: ${style.color};`);
    }
    if (style.weight) {
        lines.push(`font-weight: ${style.weight};`);
    }
    if (style.italic !== undefined) {
        lines.push(`font-style: ${style.italic ? 'italic' : 'normal'};`);
    }
    if (style.underline !== undefined) {
        lines.push(`text-decoration: ${style.underline ? 'underline' : 'none'};`);
    }
    return lines;
}

function borderLines(color: string, kind: BorderKind): string[] {
    switch (kind) {
        case 'box':
            return [`border: 1px solid ${color};`];
        case 'color':
            return [`border-color: ${color};`];
        case 'left':
            return [`border-left: 3px solid ${color};`, 'padding-left: 10px;', 'margin-left: 0;'];
        case 'top':
            return ['border: none;', `border-top: 1px solid ${color};`];
    }
}

function rule(scope: string, tags: string[], lines: string[]): string | undefined {
    if (!tags.length || !lines.length) {
        return undefined;
    }
    const selector = tags.map((tag) => `${scope} ${tag}`).join(', ');
    return `${selector} {\n${lines.map((l) => `  ${l}`).join('\n')}\n}`;
}

function elementRules(key: ElementKey, style: ElementStyle, cfg: StyleConfig, scope: string): string[] {
    const target = TARGETS[key];
    const text = target.text.length ? textLines(style, cfg) : [];
    const box = style.background && target.box.length ? [`background: ${style.background};`] : [];
    const sameTags = target.text.join() === target.box.join();
    const rules = sameTags
        ? [rule(scope, target.text, [...text, ...box])]
        : [rule(scope, target.text, text), rule(scope, target.box, box)];
    if (style.border && target.border) {
        rules.push(rule(scope, target.border.selectors, borderLines(style.border, target.border.kind)));
    }
    return rules.filter((r): r is string => r !== undefined);
}

// The Khmer alias only covers Khmer code points, so English text keeps the
// English font while Khmer is drawn at its own relative size.
export function buildCss(cfg: StyleConfig, scope: string): string {
    const pct = Math.round(khmerScale(cfg) * 1000) / 10;
    const parts = [
        `@font-face {\n  font-family: "${KHMER_ALIAS}";\n  src: local("${cfg.khmerFont}");\n  unicode-range: ${KHMER_RANGE};\n  size-adjust: ${pct}%;\n}`,
    ];
    for (const key of ELEMENT_KEYS) {
        const style = cfg.elements[key];
        if (style) {
            parts.push(...elementRules(key, style, cfg, scope));
        }
    }
    return parts.join('\n');
}
