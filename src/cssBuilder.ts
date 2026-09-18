import { ElementKey, ElementStyle, StyleConfig, ELEMENT_KEYS } from './styleConfig';

export const KHMER_ALIAS = 'CCS Khmer';
export const KHMER_RANGE = 'U+1780-17FF, U+19E0-19FF';

type BorderKind = 'box' | 'color' | 'left' | 'top';

interface Target {
    text: string[];           // font, size, color, weight, italic, underline
    box: string[];            // background
    border?: { selectors: string[]; kind: BorderKind };
    tool?: boolean;           // tool box: outside the message container
    fullOpacity?: boolean;    // Claude Code dims it; a chosen colour should show as picked
}

const same = (...tags: string[]): Target => ({ text: tags, box: tags });

// Claude Code's class names end in a build hash; match the fixed prefix
const cls = (prefix: string) => `[class*="${prefix}_"]`;

export const PREVIEW_SCOPE = '#preview .md';
export const PREVIEW_TOOL_SCOPE = '#preview';

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
    toolName: { text: [cls('toolNameText')], box: [], tool: true },
    toolDescription: { text: [cls('toolNameTextSecondary'), cls('toolNameTextSecondaryPlaintext')], box: [], tool: true },
    toolBox: { text: [], box: [cls('toolBody')], border: { selectors: [cls('toolBody'), cls('toolBodyRow')], kind: 'color' }, tool: true },
    toolLabel: { text: [cls('toolBodyRowLabel')], box: [], tool: true, fullOpacity: true },
    toolContent: {
        text: [cls('toolBodyRowContent'), `${cls('toolBodyRowContent')} pre`, `${cls('toolBodyRowContent')} code`],
        // OUT is drawn in an inner result box with its own code background
        box: [cls('toolBodyRowContent'), `${cls('toolBodyRowContent')} ${cls('toolResult')}`],
        tool: true,
    },
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
    const selector = tags.map((tag) => (scope ? `${scope} ${tag}` : tag)).join(', ');
    return `${selector} {\n${lines.map((l) => `  ${l}`).join('\n')}\n}`;
}

function elementRules(key: ElementKey, style: ElementStyle, cfg: StyleConfig, scope: string, toolScope: string): string[] {
    const target = TARGETS[key];
    const where = target.tool ? toolScope : scope;
    const text = target.text.length ? textLines(style, cfg) : [];
    if (target.fullOpacity && style.color) {
        text.push('opacity: 1;');
    }
    const box = style.background && target.box.length ? [`background: ${style.background};`] : [];
    const sameTags = target.text.join() === target.box.join();
    const rules = sameTags
        ? [rule(where, target.text, [...text, ...box])]
        : [rule(where, target.text, text), rule(where, target.box, box)];
    if (style.border && target.border) {
        rules.push(rule(where, target.border.selectors, borderLines(style.border, target.border.kind)));
    }
    return rules.filter((r): r is string => r !== undefined);
}

// The Khmer alias only covers Khmer code points, so English text keeps the
// English font while Khmer is drawn at its own relative size.
export function buildCss(cfg: StyleConfig, scope: string, toolScope = ''): string {
    const pct = Math.round(khmerScale(cfg) * 1000) / 10;
    const parts = [
        `@font-face {\n  font-family: "${KHMER_ALIAS}";\n  src: local("${cfg.khmerFont}");\n  unicode-range: ${KHMER_RANGE};\n  size-adjust: ${pct}%;\n}`,
    ];
    for (const key of ELEMENT_KEYS) {
        const style = cfg.elements[key];
        if (style) {
            parts.push(...elementRules(key, style, cfg, scope, toolScope));
        }
    }
    return parts.join('\n');
}

// What each row styles in the preview, so the settings page can outline it
export function previewSelectors(): Record<ElementKey, string> {
    const out = {} as Record<ElementKey, string>;
    for (const key of ELEMENT_KEYS) {
        const target = TARGETS[key];
        const tags = [...new Set([...target.text, ...target.box])];
        const picked = tags.length ? tags : target.border?.selectors ?? [];
        const scope = target.tool ? PREVIEW_TOOL_SCOPE : PREVIEW_SCOPE;
        out[key] = picked.map((tag) => `${scope} ${tag.replace(/::[\w-]+$/, '')}`).join(', ');
    }
    return out;
}
