# Khmer/English Fonts and Chat Styles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user pick separate English/Khmer fonts and sizes, and style H1–H6, bold, italic, inline code and links in the Claude Code chat, from one settings page.

**Architecture:** Pure modules build CSS, edit a marked block of CSS text, parse the Windows font registry and rewrite TTF files; thin I/O modules apply them (VS Code settings, Claude Code's `webview/index.css`, per-user font install). A webview page (HTML + JS in `media/`) talks to the extension by messages. On startup the extension re-injects the CSS block if a Claude Code update removed it.

**Tech Stack:** TypeScript 5, VS Code API ^1.80, Node built-in test runner (`node:test`), no new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-17-khmer-english-styles-design.md`

## Global Constraints

- Target editor: Antigravity IDE (VS Code 1.104 fork), Windows only. Install with `"C:\Users\taing\AppData\Local\Programs\Antigravity IDE\bin\antigravity-ide.cmd" --install-extension <vsix> --force`.
- Claude Code extension id: `anthropic.claude-code`. Its CSS file: `<extensionPath>/webview/index.css`.
- Chat text font settings: `chat.fontFamily`, `chat.fontSize`. Code/IN-OUT font settings: `chat.editor.fontFamily`, `chat.editor.fontSize`. Terminal: `terminal.integrated.fontFamily`, `terminal.integrated.fontSize`. The file editor (`editor.*`) is never changed.
- CSS block markers, exact: `/* >>> claude-code-style >>> */` and `/* <<< claude-code-style <<< */`.
- Khmer alias family name, exact: `CCS Khmer`. Khmer unicode range: `U+1780-17FF, U+19E0-19FF`.
- Resized terminal font family name: `<Khmer font> CCS <pct>` where pct = round(khmerSize / englishSize * 100).
- Element keys, exact order: `h1, h2, h3, h4, h5, h6, bold, italic, code, link`.
- Sizes clamped to 6–100. Colors must match `^#[0-9a-fA-F]{3,8}$`. Weights allowed: `normal`, `bold`, `100`…`900`.
- No Python and no new npm runtime dependencies.
- The project folder is **not a git repository**: every "Checkpoint" step means run the tests and confirm green; do not run `git`.
- All shell commands run from `c:\_httdocs\claude-code-style` in Git Bash.

## File Structure

| File | Responsibility |
|---|---|
| `src/styleConfig.ts` (create) | Types, defaults, `sanitizeConfig`, `ELEMENT_KEYS` — pure |
| `src/cssBuilder.ts` (create) | Config → CSS text, font family lists — pure |
| `src/cssBlock.ts` (create) | Find scope class, replace/remove marked block in CSS text — pure |
| `src/systemFonts.ts` (create) | Parse `reg query` output (pure) + list installed fonts |
| `src/ttfResize.ts` (create) | Rewrite a TTF buffer: new unitsPerEm + new family name — pure |
| `src/fontInstaller.ts` (create) | Make + install resized font for the current user |
| `src/claudeCssInjector.ts` (create) | Locate Claude Code CSS, back up, write/remove block atomically |
| `src/settingsApplier.ts` (create) | Orchestrate apply / remove / restore-on-startup |
| `src/SettingsPanel.ts` (rewrite) | Webview host: loads `media/panel.html`, routes messages |
| `media/panel.html`, `media/panel.css`, `media/panel.js` (create) | Settings page UI |
| `src/extension.ts` (modify) | Commands + startup restore |
| `src/test/*.test.ts` (create) | Unit tests |
| `package.json`, `.vscodeignore` (modify/create) | Config contributions, scripts, packaging |

---

### Task 1: Test setup, config types and CSS builder

**Files:**
- Modify: `package.json`
- Create: `src/styleConfig.ts`, `src/cssBuilder.ts`
- Test: `src/test/cssBuilder.test.ts`

**Interfaces:**
- Produces:
  - `type ElementKey = 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'|'bold'|'italic'|'code'|'link'`
  - `interface ElementStyle { font?: string; size?: number; color?: string; weight?: string; italic?: boolean }`
  - `interface StyleConfig { englishFont: string; englishSize: number; khmerFont: string; khmerSize: number; elements: Partial<Record<ElementKey, ElementStyle>> }`
  - `const ELEMENT_KEYS: ElementKey[]`, `const DEFAULT_CONFIG: StyleConfig`
  - `sanitizeConfig(raw: unknown): StyleConfig`
  - `cleanFontName(name: string): string`
  - `KHMER_ALIAS = 'CCS Khmer'`
  - `khmerScale(cfg: StyleConfig): number` (e.g. 0.929)
  - `chatFamilyList(cfg: StyleConfig, primary?: string): string` → `'JetBrains Mono', 'CCS Khmer', 'Khmer OS System', monospace`
  - `buildCss(cfg: StyleConfig, scope: string): string`

- [ ] **Step 1: Add test script**

In `package.json` replace the `"scripts"` block with:

```json
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "test": "tsc -p ./ && node --test out/test/"
  },
```

- [ ] **Step 2: Write the failing test**

Create `src/test/cssBuilder.test.ts`:

```ts
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { sanitizeConfig, DEFAULT_CONFIG } from '../styleConfig';
import { buildCss, chatFamilyList, khmerScale } from '../cssBuilder';

const base = {
    englishFont: 'JetBrains Mono',
    englishSize: 14,
    khmerFont: 'Khmer OS System',
    khmerSize: 13,
    elements: {},
};

test('sanitizeConfig fills defaults and clamps', () => {
    const cfg = sanitizeConfig({ englishSize: 500, khmerSize: 2, elements: { h1: { color: 'red', size: 22 } } });
    assert.equal(cfg.englishSize, 100);
    assert.equal(cfg.khmerSize, 6);
    assert.equal(cfg.englishFont, DEFAULT_CONFIG.englishFont);
    assert.deepEqual(cfg.elements.h1, { size: 22 });
});

test('sanitizeConfig drops unknown keys and bad weights, keeps italic', () => {
    const cfg = sanitizeConfig({ elements: { h9: { size: 10 }, bold: { weight: 'heavy', italic: true, color: '#FfCc00' } } });
    assert.equal((cfg.elements as Record<string, unknown>).h9, undefined);
    assert.deepEqual(cfg.elements.bold, { italic: true, color: '#FfCc00' });
});

test('font names are cleaned of CSS-breaking characters', () => {
    const cfg = sanitizeConfig({ ...base, englishFont: 'Evil"; } body{x', elements: {} });
    assert.equal(cfg.englishFont, 'Evil  bodyx');
});

test('khmerScale is khmer size over english size', () => {
    assert.equal(khmerScale(sanitizeConfig(base)), 13 / 14);
});

test('chatFamilyList puts alias before real khmer font', () => {
    assert.equal(
        chatFamilyList(sanitizeConfig(base)),
        `'JetBrains Mono', 'CCS Khmer', 'Khmer OS System', monospace`
    );
    assert.equal(
        chatFamilyList(sanitizeConfig(base), 'Kantumruy Pro'),
        `'Kantumruy Pro', 'CCS Khmer', 'Khmer OS System', monospace`
    );
});

test('buildCss writes font-face with size-adjust and unicode-range', () => {
    const css = buildCss(sanitizeConfig(base), '.root_x');
    assert.match(css, /@font-face\s*{[^}]*font-family: "CCS Khmer";/);
    assert.match(css, /src: local\("Khmer OS System"\);/);
    assert.match(css, /unicode-range: U\+1780-17FF, U\+19E0-19FF;/);
    assert.match(css, /size-adjust: 92\.9%;/);
    assert.doesNotMatch(css, /\.root_x h1/);
});

test('buildCss writes only filled element properties', () => {
    const css = buildCss(sanitizeConfig({
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `tsc` error `Cannot find module '../styleConfig'`.

- [ ] **Step 4: Write `src/styleConfig.ts`**

```ts
export type ElementKey = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'bold' | 'italic' | 'code' | 'link';

export interface ElementStyle {
    font?: string;
    size?: number;
    color?: string;
    weight?: string;
    italic?: boolean;
}

export interface StyleConfig {
    englishFont: string;
    englishSize: number;
    khmerFont: string;
    khmerSize: number;
    elements: Partial<Record<ElementKey, ElementStyle>>;
}

export const ELEMENT_KEYS: ElementKey[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'bold', 'italic', 'code', 'link'];

export const DEFAULT_CONFIG: StyleConfig = {
    englishFont: 'JetBrains Mono',
    englishSize: 14,
    khmerFont: 'Khmer OS System',
    khmerSize: 14,
    elements: {},
};

const WEIGHTS = new Set(['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']);
const COLOR = /^#[0-9a-fA-F]{3,8}$/;

// Font names end up inside CSS strings and settings; keep only safe characters
export function cleanFontName(name: string): string {
    return name.replace(/[^A-Za-z0-9 _.\-]/g, '').trim();
}

function clampSize(value: unknown): number | undefined {
    const n = typeof value === 'number' ? value : parseInt(String(value), 10);
    if (!Number.isFinite(n)) {
        return undefined;
    }
    return Math.min(100, Math.max(6, Math.round(n)));
}

function sanitizeElement(raw: unknown): ElementStyle | undefined {
    if (!raw || typeof raw !== 'object') {
        return undefined;
    }
    const r = raw as Record<string, unknown>;
    const out: ElementStyle = {};
    if (typeof r.font === 'string' && cleanFontName(r.font)) {
        out.font = cleanFontName(r.font);
    }
    if (r.size !== undefined && r.size !== '') {
        const size = clampSize(r.size);
        if (size !== undefined) {
            out.size = size;
        }
    }
    if (typeof r.color === 'string' && COLOR.test(r.color)) {
        out.color = r.color;
    }
    if (typeof r.weight === 'string' && WEIGHTS.has(r.weight)) {
        out.weight = r.weight;
    }
    if (typeof r.italic === 'boolean') {
        out.italic = r.italic;
    }
    return Object.keys(out).length ? out : undefined;
}

export function sanitizeConfig(raw: unknown): StyleConfig {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const elementsRaw = (r.elements && typeof r.elements === 'object' ? r.elements : {}) as Record<string, unknown>;
    const elements: StyleConfig['elements'] = {};
    for (const key of ELEMENT_KEYS) {
        const style = sanitizeElement(elementsRaw[key]);
        if (style) {
            elements[key] = style;
        }
    }
    const font = (value: unknown, fallback: string) =>
        (typeof value === 'string' && cleanFontName(value)) || fallback;
    return {
        englishFont: font(r.englishFont, DEFAULT_CONFIG.englishFont),
        englishSize: clampSize(r.englishSize) ?? DEFAULT_CONFIG.englishSize,
        khmerFont: font(r.khmerFont, DEFAULT_CONFIG.khmerFont),
        khmerSize: clampSize(r.khmerSize) ?? DEFAULT_CONFIG.khmerSize,
        elements,
    };
}
```

Note: the test `'Evil"; } body{x'` → removing `"`, `;`, `}`, `{` gives `Evil  bodyx` (two spaces kept).

- [ ] **Step 5: Write `src/cssBuilder.ts`**

```ts
import { ElementKey, ElementStyle, StyleConfig, ELEMENT_KEYS } from './styleConfig';

export const KHMER_ALIAS = 'CCS Khmer';
export const KHMER_RANGE = 'U+1780-17FF, U+19E0-19FF';

const SELECTORS: Record<ElementKey, string[]> = {
    h1: ['h1'], h2: ['h2'], h3: ['h3'], h4: ['h4'], h5: ['h5'], h6: ['h6'],
    bold: ['strong', 'b'],
    italic: ['em', 'i'],
    code: ['code'],
    link: ['a'],
};

export function khmerScale(cfg: StyleConfig): number {
    return cfg.khmerSize / cfg.englishSize;
}

export function chatFamilyList(cfg: StyleConfig, primary: string = cfg.englishFont): string {
    return `'${primary}', '${KHMER_ALIAS}', '${cfg.khmerFont}', monospace`;
}

function elementRule(key: ElementKey, style: ElementStyle, cfg: StyleConfig, scope: string): string {
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
    const selector = SELECTORS[key].map((tag) => `${scope} ${tag}`).join(', ');
    return `${selector} {\n${lines.map((l) => `  ${l}`).join('\n')}\n}`;
}

export function buildCss(cfg: StyleConfig, scope: string): string {
    const pct = Math.round(khmerScale(cfg) * 1000) / 10;
    const parts = [
        `@font-face {\n  font-family: "${KHMER_ALIAS}";\n  src: local("${cfg.khmerFont}");\n  unicode-range: ${KHMER_RANGE};\n  size-adjust: ${pct}%;\n}`,
    ];
    for (const key of ELEMENT_KEYS) {
        const style = cfg.elements[key];
        if (style) {
            parts.push(elementRule(key, style, cfg, scope));
        }
    }
    return parts.join('\n');
}
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: all 7 tests PASS.

- [ ] **Step 7: Checkpoint** — tests green; no git.

---

### Task 2: CSS block editing (pure)

**Files:**
- Create: `src/cssBlock.ts`
- Test: `src/test/cssBlock.test.ts`

**Interfaces:**
- Produces:
  - `BLOCK_START = '/* >>> claude-code-style >>> */'`, `BLOCK_END = '/* <<< claude-code-style <<< */'`
  - `findScope(css: string): string` — returns e.g. `.root_-a7MRw`, or `#root` if not found
  - `wrapBlock(body: string): string`
  - `replaceBlock(css: string, body: string): string` — removes any old block, appends new one
  - `removeBlock(css: string): string`
  - `readBlock(css: string): string | undefined` — the full wrapped block if present

- [ ] **Step 1: Write the failing test**

Create `src/test/cssBlock.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../cssBlock'`.

- [ ] **Step 3: Write `src/cssBlock.ts`**

```ts
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
    const endMarker = css.indexOf(BLOCK_END, start);
    if (start < 0 || endMarker < 0) {
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
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Checkpoint** — tests green.

---

### Task 3: System font listing

**Files:**
- Create: `src/systemFonts.ts`
- Test: `src/test/systemFonts.test.ts`

**Interfaces:**
- Produces:
  - `interface SystemFont { name: string; file: string }`
  - `parseRegFonts(output: string, fontsDir: string): SystemFont[]`
  - `isKhmerName(name: string): boolean`
  - `listSystemFonts(): Promise<SystemFont[]>` — sorted by name, unique by name, cached for the session
  - `fontFamilies(fonts: SystemFont[]): { all: string[]; khmer: string[] }`

- [ ] **Step 1: Write the failing test**

Create `src/test/systemFonts.test.ts`:

```ts
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { parseRegFonts, isKhmerName, fontFamilies } from '../systemFonts';

const regOut = [
    '',
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts',
    '    Arial (TrueType)    REG_SZ    arial.ttf',
    '    Khmer UI Bold (TrueType)    REG_SZ    khmeruib.ttf',
    '    Khmer OS System (TrueType)    REG_SZ    C:\\Users\\t\\AppData\\Local\\Microsoft\\Windows\\Fonts\\Khmer OS System Regular.ttf',
    '    Cambria & Cambria Math (TrueType)    REG_SZ    cambria.ttc',
    '    Noto Sans (OpenType)    REG_SZ    NotoSans.otf',
    '',
].join('\r\n');

test('parseRegFonts strips type suffix and resolves relative files', () => {
    const fonts = parseRegFonts(regOut, 'C:\\Windows\\Fonts');
    assert.deepEqual(fonts[0], { name: 'Arial', file: 'C:\\Windows\\Fonts\\arial.ttf' });
    assert.equal(fonts[2].file, 'C:\\Users\\t\\AppData\\Local\\Microsoft\\Windows\\Fonts\\Khmer OS System Regular.ttf');
    assert.equal(fonts[3].name, 'Cambria & Cambria Math');
    assert.equal(fonts[4].name, 'Noto Sans');
});

test('isKhmerName recognises common Khmer fonts', () => {
    for (const n of ['Khmer OS System', 'Hanuman', 'Kantumruy Pro', 'Noto Sans Khmer', 'Battambang']) {
        assert.ok(isKhmerName(n), n);
    }
    assert.equal(isKhmerName('Arial'), false);
});

test('fontFamilies sorts, de-duplicates and lists khmer first group', () => {
    const fams = fontFamilies([
        { name: 'Khmer UI', file: 'a' },
        { name: 'Arial', file: 'b' },
        { name: 'Khmer UI', file: 'c' },
    ]);
    assert.deepEqual(fams.all, ['Arial', 'Khmer UI']);
    assert.deepEqual(fams.khmer, ['Khmer UI']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../systemFonts'`.

- [ ] **Step 3: Write `src/systemFonts.ts`**

```ts
import { execFile } from 'child_process';
import * as path from 'path';

export interface SystemFont {
    name: string;
    file: string;
}

const KEYS = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts',
    'HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts',
];

const KHMER = /khmer|hanuman|battambang|kantumruy|siemreap|moul|muol|koulen|bokor|dangrek|nokora|suwannaphum|bayon|angkor|kdam|preahvihear|taprom|odormean|chenla|fasthand|freehand/i;

export function isKhmerName(name: string): boolean {
    return KHMER.test(name);
}

export function parseRegFonts(output: string, fontsDir: string): SystemFont[] {
    const fonts: SystemFont[] = [];
    for (const line of output.split(/\r?\n/)) {
        const match = /^\s{4}(.+?)\s{4}REG_(?:EXPAND_)?SZ\s{4}(.+)$/.exec(line);
        if (!match) {
            continue;
        }
        const name = match[1].replace(/\s*\((TrueType|OpenType|All res)\)\s*$/i, '').trim();
        const value = match[2].trim();
        const file = path.win32.isAbsolute(value) ? value : path.win32.join(fontsDir, value);
        fonts.push({ name, file });
    }
    return fonts;
}

export function fontFamilies(fonts: SystemFont[]): { all: string[]; khmer: string[] } {
    const all = [...new Set(fonts.map((f) => f.name))].sort((a, b) => a.localeCompare(b));
    return { all, khmer: all.filter(isKhmerName) };
}

function regQuery(key: string): Promise<string> {
    return new Promise((resolve) => {
        execFile('reg', ['query', key], { maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout) => {
            resolve(err ? '' : stdout);
        });
    });
}

let cache: Promise<SystemFont[]> | undefined;

export function listSystemFonts(): Promise<SystemFont[]> {
    if (!cache) {
        const fontsDir = path.win32.join(process.env.WINDIR || 'C:\\Windows', 'Fonts');
        cache = Promise.all(KEYS.map(regQuery)).then((outputs) => {
            const fonts = outputs.flatMap((o) => parseRegFonts(o, fontsDir));
            const seen = new Map<string, SystemFont>();
            // Later (per-user) entries win over machine-wide ones with the same name
            for (const f of fonts) {
                seen.set(f.name, f);
            }
            return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
        });
    }
    return cache;
}

export function clearFontCache(): void {
    cache = undefined;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Smoke-check against the real registry**

Run: `node -e "require('./out/systemFonts').listSystemFonts().then(f=>{console.log(f.length);console.log(f.filter(x=>x.name.startsWith('Khmer OS System')))})"`
Expected: a count > 100 and entries for `Khmer OS System` with a real `.ttf` path.

- [ ] **Step 6: Checkpoint** — tests green.

---

### Task 4: TTF resize + rename (pure) and font installer

**Files:**
- Create: `src/ttfResize.ts`, `src/fontInstaller.ts`
- Test: `src/test/ttfResize.test.ts`

**Interfaces:**
- Consumes: `SystemFont` from Task 3; `cleanFontName` from Task 1.
- Produces:
  - `readTables(buf: Buffer): Map<string, Buffer>` — throws `Error('Unsupported font format')` for non-TTF/OTF (e.g. `.ttc`)
  - `readFamilyName(buf: Buffer): string | undefined` — name ID 1, Windows platform
  - `readUnitsPerEm(buf: Buffer): number`
  - `resizeFont(buf: Buffer, scale: number, family: string): Buffer`
  - `resizedFamilyName(khmerFont: string, scale: number): string` → `Khmer OS System CCS 93`
  - `ensureResizedFont(source: SystemFont, scale: number): Promise<{ family: string; created: boolean }>`

- [ ] **Step 1: Write the failing test**

Create `src/test/ttfResize.test.ts`. It uses the real font already installed on this machine; the test skips if it is missing.

```ts
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { readTables, readFamilyName, readUnitsPerEm, resizeFont, resizedFamilyName } from '../ttfResize';

const fontPath = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Fonts', 'Khmer OS System Regular.ttf');
const has = fs.existsSync(fontPath);

test('resizedFamilyName uses a rounded percent', () => {
    assert.equal(resizedFamilyName('Khmer OS System', 13 / 14), 'Khmer OS System CCS 93');
});

test('rejects non-sfnt data', () => {
    assert.throws(() => readTables(Buffer.from('ttcf0000000000000000')), /Unsupported font format/);
});

test('resizeFont changes unitsPerEm and family, keeps other tables', { skip: !has }, () => {
    const src = fs.readFileSync(fontPath);
    const out = resizeFont(src, 13 / 14, 'Khmer OS System CCS 93');
    assert.equal(readUnitsPerEm(src), 2048);
    assert.equal(readUnitsPerEm(out), Math.round(2048 / (13 / 14)));
    assert.equal(readFamilyName(out), 'Khmer OS System CCS 93');
    const a = readTables(src);
    const b = readTables(out);
    assert.deepEqual([...b.keys()].sort(), [...a.keys()].sort());
    assert.ok(a.get('GSUB')!.equals(b.get('GSUB')!));
    // whole-font checksum must be 0xB1B0AFBA
    assert.equal(checksum(out), 0xb1b0afba);
});

function checksum(buf: Buffer): number {
    let sum = 0;
    const padded = Buffer.concat([buf, Buffer.alloc((4 - (buf.length % 4)) % 4)]);
    for (let i = 0; i < padded.length; i += 4) {
        sum = (sum + padded.readUInt32BE(i)) >>> 0;
    }
    return sum;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../ttfResize'`.

- [ ] **Step 3: Write `src/ttfResize.ts`**

```ts
// Minimal sfnt rewriter: scale a font by growing its em box (glyphs, advances
// and line metrics all shrink together) and give it a new family name.
// Layout tables (GSUB/GPOS) are copied untouched so Khmer shaping keeps working.

function checksum(buf: Buffer): number {
    let sum = 0;
    const padded = buf.length % 4 ? Buffer.concat([buf, Buffer.alloc(4 - (buf.length % 4))]) : buf;
    for (let i = 0; i < padded.length; i += 4) {
        sum = (sum + padded.readUInt32BE(i)) >>> 0;
    }
    return sum;
}

export function readTables(buf: Buffer): Map<string, Buffer> {
    const version = buf.length >= 12 ? buf.readUInt32BE(0) : 0;
    if (version !== 0x00010000 && version !== 0x4f54544f /* OTTO */) {
        throw new Error('Unsupported font format');
    }
    const count = buf.readUInt16BE(4);
    const tables = new Map<string, Buffer>();
    for (let i = 0; i < count; i++) {
        const rec = 12 + i * 16;
        const tag = buf.toString('latin1', rec, rec + 4);
        const offset = buf.readUInt32BE(rec + 8);
        const length = buf.readUInt32BE(rec + 12);
        tables.set(tag, Buffer.from(buf.subarray(offset, offset + length)));
    }
    return tables;
}

export function readUnitsPerEm(buf: Buffer): number {
    return readTables(buf).get('head')!.readUInt16BE(18);
}

export function readFamilyName(buf: Buffer): string | undefined {
    const name = readTables(buf).get('name');
    if (!name) {
        return undefined;
    }
    const count = name.readUInt16BE(2);
    const strings = name.readUInt16BE(4);
    for (let i = 0; i < count; i++) {
        const rec = 6 + i * 12;
        const platform = name.readUInt16BE(rec);
        const nameId = name.readUInt16BE(rec + 6);
        if (platform === 3 && nameId === 1) {
            const len = name.readUInt16BE(rec + 8);
            const off = name.readUInt16BE(rec + 10);
            return name.subarray(strings + off, strings + off + len).swap16().toString('utf16le');
        }
    }
    return undefined;
}

function utf16be(text: string): Buffer {
    return Buffer.from(text, 'utf16le').swap16();
}

function buildNameTable(family: string): Buffer {
    const postscript = family.replace(/[^A-Za-z0-9-]/g, '') + '-Regular';
    const entries: Array<[number, string]> = [
        [1, family],
        [2, 'Regular'],
        [3, `${family} Regular`],
        [4, family],
        [6, postscript],
    ];
    const records: Buffer[] = [];
    const data: Buffer[] = [];
    let offset = 0;
    const add = (platform: number, encoding: number, language: number, id: number, bytes: Buffer) => {
        const rec = Buffer.alloc(12);
        rec.writeUInt16BE(platform, 0);
        rec.writeUInt16BE(encoding, 2);
        rec.writeUInt16BE(language, 4);
        rec.writeUInt16BE(id, 6);
        rec.writeUInt16BE(bytes.length, 8);
        rec.writeUInt16BE(offset, 10);
        records.push(rec);
        data.push(bytes);
        offset += bytes.length;
    };
    // Records must be sorted by platform, encoding, language, name id
    for (const [id, text] of entries) {
        add(1, 0, 0, id, Buffer.from(text, 'latin1'));
    }
    for (const [id, text] of entries) {
        add(3, 1, 0x409, id, utf16be(text));
    }
    const header = Buffer.alloc(6);
    header.writeUInt16BE(0, 0);
    header.writeUInt16BE(records.length, 2);
    header.writeUInt16BE(6 + records.length * 12, 4);
    return Buffer.concat([header, ...records, ...data]);
}

export function resizeFont(buf: Buffer, scale: number, family: string): Buffer {
    const tables = readTables(buf);
    const head = tables.get('head')!;
    const upm = Math.round(head.readUInt16BE(18) / scale);
    if (upm < 16 || upm > 16384) {
        throw new Error(`Scale ${scale} is out of range for this font`);
    }
    head.writeUInt16BE(upm, 18);
    head.writeUInt32BE(0, 8); // checkSumAdjustment, set below
    tables.set('name', buildNameTable(family));

    const tags = [...tables.keys()].sort();
    const count = tags.length;
    let entrySelector = 0;
    while (1 << (entrySelector + 1) <= count) {
        entrySelector++;
    }
    const searchRange = (1 << entrySelector) * 16;
    const header = Buffer.alloc(12 + count * 16);
    header.writeUInt32BE(buf.readUInt32BE(0), 0);
    header.writeUInt16BE(count, 4);
    header.writeUInt16BE(searchRange, 6);
    header.writeUInt16BE(entrySelector, 8);
    header.writeUInt16BE(count * 16 - searchRange, 10);

    const bodies: Buffer[] = [];
    let offset = header.length;
    tags.forEach((tag, i) => {
        const table = tables.get(tag)!;
        const rec = 12 + i * 16;
        header.write(tag, rec, 4, 'latin1');
        header.writeUInt32BE(checksum(table), rec + 4);
        header.writeUInt32BE(offset, rec + 8);
        header.writeUInt32BE(table.length, rec + 12);
        const pad = (4 - (table.length % 4)) % 4;
        bodies.push(table, Buffer.alloc(pad));
        offset += table.length + pad;
    });

    const out = Buffer.concat([header, ...bodies]);
    const headOffset = header.readUInt32BE(12 + tags.indexOf('head') * 16 + 8);
    out.writeUInt32BE((0xb1b0afba - checksum(out)) >>> 0, headOffset + 8);
    return out;
}

export function resizedFamilyName(khmerFont: string, scale: number): string {
    return `${khmerFont} CCS ${Math.round(scale * 100)}`;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests PASS (the real-font test runs, not skipped).

- [ ] **Step 5: Write `src/fontInstaller.ts`**

```ts
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { SystemFont, clearFontCache, listSystemFonts } from './systemFonts';
import { resizeFont, resizedFamilyName } from './ttfResize';

const USER_FONTS = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Fonts');
const REG_KEY = 'HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts';

function run(cmd: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, { windowsHide: true }, (err) => (err ? reject(err) : resolve()));
    });
}

// Makes a scaled copy of a Khmer font for the terminal and installs it for the current user.
export async function ensureResizedFont(source: SystemFont, scale: number): Promise<{ family: string; created: boolean }> {
    const family = resizedFamilyName(source.name, scale);
    const installed = await listSystemFonts();
    if (installed.some((f) => f.name === family)) {
        return { family, created: false };
    }
    const data = resizeFont(await fs.promises.readFile(source.file), scale, family);
    await fs.promises.mkdir(USER_FONTS, { recursive: true });
    const target = path.join(USER_FONTS, `${family.replace(/[^A-Za-z0-9 -]/g, '')}.ttf`);
    await fs.promises.writeFile(target, data);
    await run('reg', ['add', REG_KEY, '/v', `${family} (TrueType)`, '/t', 'REG_SZ', '/d', target, '/f']);
    // Tell running programs a font was added; new ones pick it up from the registry
    await run('powershell', [
        '-NoProfile', '-Command',
        `Add-Type -Namespace W -Name F -MemberDefinition '[DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern int AddFontResource(string f);'; [void][W.F]::AddFontResource('${target.replace(/'/g, "''")}')`,
    ]).catch(() => undefined);
    clearFontCache();
    return { family, created: true };
}
```

- [ ] **Step 6: Smoke-check the installer**

Run:
```bash
npm run compile && node -e "
const {listSystemFonts}=require('./out/systemFonts');const {ensureResizedFont}=require('./out/fontInstaller');
listSystemFonts().then(f=>ensureResizedFont(f.find(x=>x.name==='Khmer OS System'),13/14)).then(r=>console.log(r))"
```
Expected: `{ family: 'Khmer OS System CCS 93', created: true }`; running it again prints `created: false`.

Then confirm Windows sees it:
`powershell -NoProfile -Command "Add-Type -AssemblyName System.Drawing; (New-Object System.Drawing.Text.InstalledFontCollection).Families | ? Name -like 'Khmer OS System CCS*' | % Name"`
Expected: `Khmer OS System CCS 93`.

- [ ] **Step 7: Checkpoint** — tests green.

---

### Task 5: Claude Code CSS injector

**Files:**
- Create: `src/claudeCssInjector.ts`
- Test: `src/test/claudeCssInjector.test.ts`

**Interfaces:**
- Consumes: `findScope`, `replaceBlock`, `removeBlock`, `readBlock`, `wrapBlock` (Task 2).
- Produces:
  - `type InjectResult = 'written' | 'unchanged' | 'removed' | 'notFound'`
  - `injectIntoFile(cssPath: string, buildBody: (scope: string) => string): Promise<InjectResult>`
  - `removeFromFile(cssPath: string): Promise<InjectResult>`
  - `claudeCssPaths(): string[]` — `webview/index.css` of every installed `anthropic.claude-code` (uses `vscode.extensions.getExtension`)

- [ ] **Step 1: Write the failing test**

Create `src/test/claudeCssInjector.test.ts` (tests only the file functions; they must not import `vscode`):

```ts
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { injectIntoFile, removeFromFile } from '../claudeCssFile';

const original = '.root_abc :is(p,li,h1,h2){unicode-bidi:plaintext}';

function tmpCss(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-'));
    const file = path.join(dir, 'index.css');
    fs.writeFileSync(file, original);
    return file;
}

test('inject writes scoped block, makes one backup, then reports unchanged', async () => {
    const file = tmpCss();
    assert.equal(await injectIntoFile(file, (scope) => `${scope} h1{color:red}`), 'written');
    assert.match(fs.readFileSync(file, 'utf8'), /\.root_abc h1\{color:red\}/);
    assert.equal(fs.readFileSync(file + '.ccs-backup', 'utf8'), original);
    assert.equal(await injectIntoFile(file, (scope) => `${scope} h1{color:red}`), 'unchanged');
    await injectIntoFile(file, (scope) => `${scope} h1{color:blue}`);
    assert.equal(fs.readFileSync(file + '.ccs-backup', 'utf8'), original);
});

test('remove restores the original text', async () => {
    const file = tmpCss();
    await injectIntoFile(file, () => 'x{}');
    assert.equal(await removeFromFile(file), 'removed');
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.equal(await removeFromFile(file), 'unchanged');
});

test('missing file reports notFound', async () => {
    assert.equal(await injectIntoFile(path.join(os.tmpdir(), 'nope-ccs', 'index.css'), () => ''), 'notFound');
});
```

Because the test must not load `vscode`, the file logic lives in `src/claudeCssFile.ts`, and `src/claudeCssInjector.ts` only adds `claudeCssPaths()` and re-exports.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../claudeCssFile'`.

- [ ] **Step 3: Write `src/claudeCssFile.ts`**

```ts
import * as fs from 'fs';
import { findScope, readBlock, removeBlock, replaceBlock } from './cssBlock';

export type InjectResult = 'written' | 'unchanged' | 'removed' | 'notFound';

async function readOrUndefined(file: string): Promise<string | undefined> {
    try {
        return await fs.promises.readFile(file, 'utf8');
    } catch {
        return undefined;
    }
}

// Write to a temp file first so Claude Code never loads a half-written stylesheet
async function writeAtomic(file: string, text: string): Promise<void> {
    const tmp = `${file}.ccs-tmp`;
    await fs.promises.writeFile(tmp, text, 'utf8');
    await fs.promises.rename(tmp, file);
}

export async function injectIntoFile(cssPath: string, buildBody: (scope: string) => string): Promise<InjectResult> {
    const css = await readOrUndefined(cssPath);
    if (css === undefined) {
        return 'notFound';
    }
    const next = replaceBlock(css, buildBody(findScope(css)));
    if (next === css || readBlock(next) === readBlock(css)) {
        return 'unchanged';
    }
    const backup = `${cssPath}.ccs-backup`;
    if (!fs.existsSync(backup)) {
        await fs.promises.writeFile(backup, removeBlock(css), 'utf8');
    }
    await writeAtomic(cssPath, next);
    return 'written';
}

export async function removeFromFile(cssPath: string): Promise<InjectResult> {
    const css = await readOrUndefined(cssPath);
    if (css === undefined) {
        return 'notFound';
    }
    const next = removeBlock(css);
    if (next === css) {
        return 'unchanged';
    }
    await writeAtomic(cssPath, next);
    return 'removed';
}
```

- [ ] **Step 4: Write `src/claudeCssInjector.ts`**

```ts
import * as vscode from 'vscode';
import * as path from 'path';

export { InjectResult, injectIntoFile, removeFromFile } from './claudeCssFile';

export const CLAUDE_EXTENSION_ID = 'anthropic.claude-code';

export function claudeCssPaths(): string[] {
    const ext = vscode.extensions.getExtension(CLAUDE_EXTENSION_ID);
    return ext ? [path.join(ext.extensionPath, 'webview', 'index.css')] : [];
}
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 6: Checkpoint** — tests green.

---

### Task 6: Settings applier, config contribution, commands and startup restore

**Files:**
- Create: `src/settingsApplier.ts`
- Modify: `src/extension.ts`, `package.json`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces:
  - `readConfig(): StyleConfig`
  - `applyStyles(ctx: vscode.ExtensionContext, cfg: StyleConfig): Promise<ApplySummary>`
  - `removeStyles(ctx: vscode.ExtensionContext): Promise<void>`
  - `restoreOnStartup(ctx: vscode.ExtensionContext): Promise<void>`
  - `interface ApplySummary { cssResult: InjectResult; terminalFamily: string; needsReload: boolean; needsRestart: boolean; warnings: string[] }`
  - Commands: `claudeCodeStyle.openSettings`, `claudeCodeStyle.removeStyles`

- [ ] **Step 1: Update `package.json`**

Set `"version": "0.1.0"`, `"activationEvents": ["onStartupFinished"]`, and replace `"contributes"` with:

```json
  "contributes": {
    "commands": [
      { "command": "claudeCodeStyle.openSettings", "title": "Claude Style: Open Settings" },
      { "command": "claudeCodeStyle.removeStyles", "title": "Claude Style: Remove My Styles" }
    ],
    "configuration": {
      "title": "Claude Code Style",
      "properties": {
        "claudeCodeStyle.englishFont": { "type": "string", "default": "JetBrains Mono", "description": "Font for English text in Claude Code chat and the terminal." },
        "claudeCodeStyle.englishSize": { "type": "number", "default": 14, "minimum": 6, "maximum": 100, "description": "Size (px) for English text." },
        "claudeCodeStyle.khmerFont": { "type": "string", "default": "Khmer OS System", "description": "Font for Khmer text." },
        "claudeCodeStyle.khmerSize": { "type": "number", "default": 14, "minimum": 6, "maximum": 100, "description": "Size (px) for Khmer text." },
        "claudeCodeStyle.elements": { "type": "object", "default": {}, "description": "Styles for h1-h6, bold, italic, code and link in Claude Code chat. Each: { font, size, color, weight, italic }." }
      }
    }
  },
```

- [ ] **Step 2: Write `src/settingsApplier.ts`**

```ts
import * as vscode from 'vscode';
import { StyleConfig, sanitizeConfig } from './styleConfig';
import { buildCss, chatFamilyList, khmerScale } from './cssBuilder';
import { InjectResult, claudeCssPaths, injectIntoFile, removeFromFile } from './claudeCssInjector';
import { listSystemFonts } from './systemFonts';
import { ensureResizedFont } from './fontInstaller';

export interface ApplySummary {
    cssResult: InjectResult;
    terminalFamily: string;
    needsReload: boolean;
    needsRestart: boolean;
    warnings: string[];
}

const TARGET = vscode.ConfigurationTarget.Global;
const PREVIOUS_KEY = 'ccs.previousSettings';
const MANAGED = [
    'chat.fontFamily', 'chat.fontSize',
    'chat.editor.fontFamily', 'chat.editor.fontSize',
    'terminal.integrated.fontFamily', 'terminal.integrated.fontSize',
];

export function readConfig(): StyleConfig {
    const c = vscode.workspace.getConfiguration('claudeCodeStyle');
    return sanitizeConfig({
        englishFont: c.get('englishFont'),
        englishSize: c.get('englishSize'),
        khmerFont: c.get('khmerFont'),
        khmerSize: c.get('khmerSize'),
        elements: c.get('elements'),
    });
}

async function rememberPrevious(ctx: vscode.ExtensionContext): Promise<void> {
    if (ctx.globalState.get(PREVIOUS_KEY)) {
        return;
    }
    const config = vscode.workspace.getConfiguration();
    const previous: Record<string, unknown> = {};
    for (const key of MANAGED) {
        previous[key] = config.inspect(key)?.globalValue ?? null;
    }
    await ctx.globalState.update(PREVIOUS_KEY, previous);
}

async function terminalFamily(cfg: StyleConfig, warnings: string[]): Promise<{ family: string; created: boolean }> {
    const plain = `'${cfg.englishFont}', '${cfg.khmerFont}', monospace`;
    if (cfg.khmerSize === cfg.englishSize) {
        return { family: plain, created: false };
    }
    const source = (await listSystemFonts()).find((f) => f.name === cfg.khmerFont);
    if (!source) {
        warnings.push(`Could not find the file for "${cfg.khmerFont}", so Khmer in the terminal keeps the English size.`);
        return { family: plain, created: false };
    }
    try {
        const result = await ensureResizedFont(source, khmerScale(cfg));
        return { family: `'${cfg.englishFont}', '${result.family}', monospace`, created: result.created };
    } catch (err) {
        warnings.push(`Could not resize "${cfg.khmerFont}" for the terminal: ${(err as Error).message}`);
        return { family: plain, created: false };
    }
}

export async function applyStyles(ctx: vscode.ExtensionContext, raw: StyleConfig): Promise<ApplySummary> {
    const cfg = sanitizeConfig(raw);
    const warnings: string[] = [];
    await rememberPrevious(ctx);

    const own = vscode.workspace.getConfiguration('claudeCodeStyle');
    await own.update('englishFont', cfg.englishFont, TARGET);
    await own.update('englishSize', cfg.englishSize, TARGET);
    await own.update('khmerFont', cfg.khmerFont, TARGET);
    await own.update('khmerSize', cfg.khmerSize, TARGET);
    await own.update('elements', cfg.elements, TARGET);

    const config = vscode.workspace.getConfiguration();
    const chatFamily = chatFamilyList(cfg);
    const sizeChanged = config.get('chat.fontSize') !== cfg.englishSize;
    await config.update('chat.fontFamily', chatFamily, TARGET);
    await config.update('chat.fontSize', cfg.englishSize, TARGET);
    await config.update('chat.editor.fontFamily', chatFamily, TARGET);
    await config.update('chat.editor.fontSize', cfg.englishSize, TARGET);

    const terminal = await terminalFamily(cfg, warnings);
    await config.update('terminal.integrated.fontFamily', terminal.family, TARGET);
    await config.update('terminal.integrated.fontSize', cfg.englishSize, TARGET);

    let cssResult: InjectResult = 'notFound';
    for (const cssPath of claudeCssPaths()) {
        try {
            cssResult = await injectIntoFile(cssPath, (scope) => buildCss(cfg, scope));
        } catch (err) {
            warnings.push(`Could not update Claude Code styles: ${(err as Error).message}`);
        }
    }
    if (cssResult === 'notFound') {
        warnings.push('Claude Code is not installed here, so only fonts were applied.');
    }

    return {
        cssResult,
        terminalFamily: terminal.family,
        needsReload: cssResult === 'written' || sizeChanged,
        needsRestart: terminal.created,
        warnings,
    };
}

export async function removeStyles(ctx: vscode.ExtensionContext): Promise<void> {
    for (const cssPath of claudeCssPaths()) {
        await removeFromFile(cssPath);
    }
    const previous = ctx.globalState.get<Record<string, unknown>>(PREVIOUS_KEY);
    if (previous) {
        const config = vscode.workspace.getConfiguration();
        for (const key of MANAGED) {
            await config.update(key, previous[key] ?? undefined, TARGET);
        }
        await ctx.globalState.update(PREVIOUS_KEY, undefined);
    }
    await vscode.workspace.getConfiguration('claudeCodeStyle').update('elements', undefined, TARGET);
}

// After a Claude Code update its stylesheet is fresh, so put our block back
export async function restoreOnStartup(ctx: vscode.ExtensionContext): Promise<void> {
    if (!ctx.globalState.get(PREVIOUS_KEY)) {
        return; // user never applied, or removed styles
    }
    const cfg = readConfig();
    let written = false;
    for (const cssPath of claudeCssPaths()) {
        written = (await injectIntoFile(cssPath, (scope) => buildCss(cfg, scope))) === 'written' || written;
    }
    if (written) {
        const choice = await vscode.window.showInformationMessage(
            'Claude Code was updated, so your Claude Style settings were added back. Reload the window to see them.',
            'Reload Window'
        );
        if (choice === 'Reload Window') {
            await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }
}
```

- [ ] **Step 3: Rewrite `src/extension.ts`**

```ts
import * as vscode from 'vscode';
import { SettingsPanel } from './SettingsPanel';
import { removeStyles, restoreOnStartup } from './settingsApplier';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeCodeStyle.openSettings', () => {
            SettingsPanel.render(context);
        }),
        vscode.commands.registerCommand('claudeCodeStyle.removeStyles', async () => {
            await removeStyles(context);
            const choice = await vscode.window.showInformationMessage(
                'Claude Style removed. Reload the window to see Claude Code as normal.',
                'Reload Window'
            );
            if (choice === 'Reload Window') {
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        })
    );

    restoreOnStartup(context).catch((err) => {
        console.error('Claude Style: could not restore styles', err);
    });
}
```

`SettingsPanel.render` takes the context instead of a URI from Task 7 on. Until Task 7 is done, `npm test` fails with exactly one compile error, at the `SettingsPanel.render(context)` line. That is expected.

- [ ] **Step 4: Check that the only compile error is the expected one**

Run: `npx tsc -p ./ --noEmit`
Expected: exactly one error, in `src/extension.ts`, saying a `ExtensionContext` argument is not assignable to a `Uri` parameter. Any other error must be fixed before Task 7.

- [ ] **Step 5: Checkpoint** — continue straight to Task 7.

---

### Task 7: Settings page (webview)

**Files:**
- Rewrite: `src/SettingsPanel.ts`
- Create: `media/panel.html`, `media/panel.css`, `media/panel.js`
- Test: `src/test/panelScript.test.ts`

**Interfaces:**
- Consumes: `readConfig`, `applyStyles`, `removeStyles` (Task 6); `listSystemFonts`, `fontFamilies` (Task 3); `buildCss`, `chatFamilyList` (Task 1); `ELEMENT_KEYS` (Task 1).
- Produces: `SettingsPanel.render(ctx: vscode.ExtensionContext): void`
- Messages, webview → extension: `{ type: 'ready' }`, `{ type: 'preview', config }`, `{ type: 'apply', config }`, `{ type: 'reset' }`
- Messages, extension → webview: `{ type: 'init', config, fonts: { all: string[], khmer: string[] } }`, `{ type: 'previewCss', css, family, size }`, `{ type: 'status', text, kind: 'ok' | 'warn' }`

- [ ] **Step 1: Write the failing test**

Create `src/test/panelScript.test.ts`:

```ts
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';

const media = path.join(__dirname, '..', '..', 'media');

test('panel.js parses', () => {
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    assert.doesNotThrow(() => new Function(js));
});

test('panel.html has the placeholders the host fills', () => {
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    for (const token of ['{{cspSource}}', '{{nonce}}', '{{cssUri}}', '{{jsUri}}']) {
        assert.ok(html.includes(token), token);
    }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — compile error in `extension.ts` (render signature) and missing `media/panel.js`.

- [ ] **Step 3: Rewrite `src/SettingsPanel.ts`**

```ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { applyStyles, readConfig, removeStyles } from './settingsApplier';
import { fontFamilies, listSystemFonts } from './systemFonts';
import { buildCss, chatFamilyList } from './cssBuilder';
import { sanitizeConfig } from './styleConfig';

export class SettingsPanel {
    public static currentPanel: SettingsPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, private readonly _ctx: vscode.ExtensionContext) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtml();
        this._panel.webview.onDidReceiveMessage((message) => this._onMessage(message), null, this._disposables);
    }

    public static render(ctx: vscode.ExtensionContext) {
        if (SettingsPanel.currentPanel) {
            SettingsPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
            return;
        }
        const panel = vscode.window.createWebviewPanel(
            'claudeCodeSettings',
            'Claude Style Settings',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(ctx.extensionUri, 'media')],
            }
        );
        SettingsPanel.currentPanel = new SettingsPanel(panel, ctx);
    }

    public dispose() {
        SettingsPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            this._disposables.pop()?.dispose();
        }
    }

    private _post(message: unknown) {
        return this._panel.webview.postMessage(message);
    }

    private async _onMessage(message: { type: string; config?: unknown }) {
        switch (message.type) {
            case 'ready': {
                const fonts = fontFamilies(await listSystemFonts());
                await this._post({ type: 'init', config: readConfig(), fonts });
                return;
            }
            case 'preview': {
                const cfg = sanitizeConfig(message.config);
                await this._post({
                    type: 'previewCss',
                    css: buildCss(cfg, '#preview'),
                    family: chatFamilyList(cfg),
                    size: cfg.englishSize,
                });
                return;
            }
            case 'apply': {
                const summary = await applyStyles(this._ctx, sanitizeConfig(message.config));
                const notes = [...summary.warnings];
                if (summary.needsRestart) {
                    notes.push('A resized Khmer font was installed for the terminal: close and reopen Antigravity to see it there.');
                }
                if (summary.needsReload) {
                    notes.push('Reload the window to see the new styles in Claude Code.');
                }
                await this._post({
                    type: 'status',
                    text: ['Saved.', ...notes].join(' '),
                    kind: summary.warnings.length ? 'warn' : 'ok',
                });
                if (summary.needsReload) {
                    const choice = await vscode.window.showInformationMessage('Claude Style saved.', 'Reload Window');
                    if (choice === 'Reload Window') {
                        await vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                }
                return;
            }
            case 'reset': {
                await removeStyles(this._ctx);
                await this._post({ type: 'init', config: readConfig(), fonts: fontFamilies(await listSystemFonts()) });
                await this._post({ type: 'status', text: 'Back to normal. Reload the window to see it.', kind: 'ok' });
                return;
            }
        }
    }

    private _getHtml(): string {
        const webview = this._panel.webview;
        const media = vscode.Uri.joinPath(this._ctx.extensionUri, 'media');
        const html = fs.readFileSync(vscode.Uri.joinPath(media, 'panel.html').fsPath, 'utf8');
        const values: Record<string, string> = {
            cspSource: webview.cspSource,
            nonce: crypto.randomBytes(16).toString('base64'),
            cssUri: webview.asWebviewUri(vscode.Uri.joinPath(media, 'panel.css')).toString(),
            jsUri: webview.asWebviewUri(vscode.Uri.joinPath(media, 'panel.js')).toString(),
        };
        return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? '');
    }
}
```

- [ ] **Step 4: Create `media/panel.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; style-src {{cspSource}} 'unsafe-inline'; font-src {{cspSource}}; script-src 'nonce-{{nonce}}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="{{cssUri}}">
    <style id="previewStyle"></style>
    <title>Claude Style Settings</title>
</head>
<body>
    <h1>Claude Style Settings</h1>

    <section class="fonts">
        <div class="font-row">
            <h2>English</h2>
            <label>Font <input id="englishFont" list="allFonts" autocomplete="off"></label>
            <label>Size <input id="englishSize" type="number" min="6" max="100"></label>
        </div>
        <div class="font-row">
            <h2>Khmer</h2>
            <label>Font <input id="khmerFont" list="khmerFonts" autocomplete="off"></label>
            <label>Size <input id="khmerSize" type="number" min="6" max="100"></label>
        </div>
        <datalist id="allFonts"></datalist>
        <datalist id="khmerFonts"></datalist>
        <p class="hint">Fonts apply to Claude Code chat and the terminal.</p>
    </section>

    <section>
        <h2>Text styles</h2>
        <p class="hint">Leave a box empty to keep Claude Code's normal look.</p>
        <table id="styles">
            <thead>
                <tr><th>Item</th><th>Font</th><th>Size</th><th>Color</th><th>Weight</th><th>Italic</th></tr>
            </thead>
            <tbody></tbody>
        </table>
    </section>

    <div class="actions">
        <button id="apply" class="primary">Apply</button>
        <button id="reset" class="secondary">Reset to normal</button>
        <span id="status" role="status"></span>
    </div>

    <section>
        <h2>Preview</h2>
        <div id="preview">
            <h1>Heading 1 · ចំណងជើង ១</h1>
            <h2>Heading 2 · ចំណងជើង ២</h2>
            <h3>Heading 3 · ចំណងជើង ៣</h3>
            <h4>Heading 4 · ចំណងជើង ៤</h4>
            <h5>Heading 5 · ចំណងជើង ៥</h5>
            <h6>Heading 6 · ចំណងជើង ៦</h6>
            <p>The quick brown fox jumps over the lazy dog. សួស្តី នេះគឺជាអត្ថបទសាកល្បង។</p>
            <p><strong>Bold text · អក្សរដិត</strong> and <em>italic text · អក្សរទ្រេត</em>.</p>
            <p>Inline <code>code snippet</code> and a <a href="#">link · តំណភ្ជាប់</a>.</p>
        </div>
    </section>

    <script nonce="{{nonce}}" src="{{jsUri}}"></script>
</body>
</html>
```

- [ ] **Step 5: Create `media/panel.css`**

```css
body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 16px 20px 40px;
    max-width: 900px;
    margin: 0 auto;
}
h1 { font-size: 22px; margin: 0 0 16px; }
h2 { font-size: 15px; margin: 20px 0 8px; }
section { margin-bottom: 8px; }
.hint { color: var(--vscode-descriptionForeground); font-size: 12px; margin: 4px 0 8px; }
.font-row { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; }
.font-row h2 { width: 70px; margin: 0 0 6px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
input, select {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 3px;
    padding: 4px 6px;
    font: inherit;
}
input:focus, select:focus { outline: 1px solid var(--vscode-focusBorder); }
#englishFont, #khmerFont { width: 260px; }
input[type="number"] { width: 64px; }
table { border-collapse: collapse; width: 100%; }
th { text-align: left; font-size: 12px; color: var(--vscode-descriptionForeground); padding: 4px; }
td { padding: 3px 4px; }
td input[list] { width: 100%; box-sizing: border-box; }
.color-cell { display: flex; gap: 4px; align-items: center; }
.color-cell input[type="color"] { width: 28px; height: 24px; padding: 0; border: none; background: none; }
.color-cell input[type="text"] { width: 80px; }
.actions { display: flex; gap: 8px; align-items: center; margin: 16px 0; flex-wrap: wrap; }
button { border: none; border-radius: 3px; padding: 6px 14px; cursor: pointer; font: inherit; }
button.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
button.primary:hover { background: var(--vscode-button-hoverBackground); }
button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
#status.ok { color: var(--vscode-testing-iconPassed, #3fb950); }
#status.warn { color: var(--vscode-editorWarning-foreground, #d29922); }
#preview {
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 12px 16px;
    background: var(--vscode-sideBar-background);
}
```

- [ ] **Step 6: Create `media/panel.js`**

```js
// @ts-check
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();
    const KEYS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'bold', 'italic', 'code', 'link'];
    const LABELS = { h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', h4: 'Heading 4', h5: 'Heading 5', h6: 'Heading 6', bold: 'Bold', italic: 'Italic text', code: 'Code snippet', link: 'Link' };
    const WEIGHTS = ['', 'normal', '300', '400', '500', '600', 'bold', '800', '900'];

    const $ = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id));
    const tbody = /** @type {HTMLElement} */ (document.querySelector('#styles tbody'));

    function el(tag, attrs) {
        const node = document.createElement(tag);
        Object.assign(node, attrs || {});
        return node;
    }

    function buildRows() {
        for (const key of KEYS) {
            const row = el('tr');
            row.dataset.key = key;
            row.append(el('td', { textContent: LABELS[key] }));

            const font = el('input', { className: 'f-font', placeholder: 'default' });
            font.setAttribute('list', 'allFonts');
            row.append(wrap(font));

            row.append(wrap(el('input', { className: 'f-size', type: 'number', min: '6', max: '100', placeholder: '-' })));

            const cell = el('div', { className: 'color-cell' });
            const picker = el('input', { className: 'f-picker', type: 'color', value: '#ffffff' });
            const text = el('input', { className: 'f-color', type: 'text', placeholder: 'default' });
            picker.addEventListener('input', () => { text.value = picker.value; changed(); });
            text.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(text.value)) { picker.value = text.value; } });
            cell.append(picker, text);
            row.append(wrap(cell));

            const weight = el('select', { className: 'f-weight' });
            for (const w of WEIGHTS) {
                weight.append(el('option', { value: w, textContent: w || 'default' }));
            }
            row.append(wrap(weight));

            const italic = el('select', { className: 'f-italic' });
            for (const [value, label] of [['', 'default'], ['yes', 'yes'], ['no', 'no']]) {
                italic.append(el('option', { value, textContent: label }));
            }
            row.append(wrap(italic));

            tbody.append(row);
        }
    }

    function wrap(child) {
        const td = el('td');
        td.append(child);
        return td;
    }

    function field(row, cls) {
        return /** @type {HTMLInputElement} */ (row.querySelector('.' + cls));
    }

    function readForm() {
        const elements = {};
        for (const row of tbody.querySelectorAll('tr')) {
            const style = {};
            const font = field(row, 'f-font').value.trim();
            const size = field(row, 'f-size').value;
            const color = field(row, 'f-color').value.trim();
            const weight = field(row, 'f-weight').value;
            const italic = field(row, 'f-italic').value;
            if (font) { style.font = font; }
            if (size) { style.size = Number(size); }
            if (color) { style.color = color; }
            if (weight) { style.weight = weight; }
            if (italic) { style.italic = italic === 'yes'; }
            if (Object.keys(style).length) { elements[row.dataset.key] = style; }
        }
        return {
            englishFont: $('englishFont').value,
            englishSize: Number($('englishSize').value),
            khmerFont: $('khmerFont').value,
            khmerSize: Number($('khmerSize').value),
            elements,
        };
    }

    function fillForm(config) {
        $('englishFont').value = config.englishFont;
        $('englishSize').value = String(config.englishSize);
        $('khmerFont').value = config.khmerFont;
        $('khmerSize').value = String(config.khmerSize);
        for (const row of tbody.querySelectorAll('tr')) {
            const style = config.elements[row.dataset.key] || {};
            field(row, 'f-font').value = style.font || '';
            field(row, 'f-size').value = style.size ? String(style.size) : '';
            field(row, 'f-color').value = style.color || '';
            field(row, 'f-picker').value = /^#[0-9a-f]{6}$/i.test(style.color || '') ? style.color : '#ffffff';
            field(row, 'f-weight').value = style.weight || '';
            field(row, 'f-italic').value = style.italic === undefined ? '' : style.italic ? 'yes' : 'no';
        }
    }

    function fillList(id, names) {
        const list = /** @type {HTMLElement} */ (document.getElementById(id));
        list.replaceChildren(...names.map((name) => el('option', { value: name })));
    }

    let timer;
    function changed() {
        clearTimeout(timer);
        timer = setTimeout(() => vscode.postMessage({ type: 'preview', config: readForm() }), 150);
    }

    function setStatus(text, kind) {
        const status = $('status');
        status.textContent = text;
        status.className = kind || '';
    }

    window.addEventListener('message', (event) => {
        const msg = event.data;
        if (msg.type === 'init') {
            fillList('allFonts', msg.fonts.all);
            fillList('khmerFonts', msg.fonts.khmer.length ? msg.fonts.khmer : msg.fonts.all);
            fillForm(msg.config);
            changed();
        } else if (msg.type === 'previewCss') {
            /** @type {HTMLElement} */ (document.getElementById('previewStyle')).textContent = msg.css;
            const preview = /** @type {HTMLElement} */ (document.getElementById('preview'));
            preview.style.fontFamily = msg.family;
            preview.style.fontSize = msg.size + 'px';
        } else if (msg.type === 'status') {
            setStatus(msg.text, msg.kind);
        }
    });

    buildRows();
    document.body.addEventListener('input', changed);
    document.body.addEventListener('change', changed);
    $('apply').addEventListener('click', () => {
        setStatus('Saving…', '');
        vscode.postMessage({ type: 'apply', config: readForm() });
    });
    $('reset').addEventListener('click', () => {
        setStatus('Resetting…', '');
        vscode.postMessage({ type: 'reset' });
    });
    vscode.postMessage({ type: 'ready' });
})();
```

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: compile succeeds; all tests PASS.

- [ ] **Step 8: Checkpoint** — tests green.

---

### Task 8: Package, install and verify in Antigravity

**Files:**
- Create: `.vscodeignore`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Create `.vscodeignore`**

```
src/**
docs/**
tools/**
fonts/**
out/test/**
**/*.map
*.vsix
tsconfig.json
node_modules/**
```

- [ ] **Step 2: Package**

Run: `npm test && echo y | npx --yes @vscode/vsce package --allow-missing-repository --skip-license`
Expected: `DONE  Packaged: ...claude-code-style-0.1.0.vsix`, file list shows `out/*.js` (no `out/test`) and `media/panel.*`.

- [ ] **Step 3: Install into Antigravity**

Run: `"/c/Users/taing/AppData/Local/Programs/Antigravity IDE/bin/antigravity-ide.cmd" --install-extension claude-code-style-0.1.0.vsix --force`
Expected: `Extension 'claude-code-style-0.1.0.vsix' was successfully installed.`

- [ ] **Step 4: Ask the user to verify (manual, in their window)**

Ask the user to: reload the window → `Claude Style: Open Settings` → check both font lists fill → set Khmer size 13, English 14, H1 color orange size 22, bold color yellow → Apply → Reload Window. Confirm: in Claude chat Khmer is visibly smaller than English, H1 and bold are styled; after a full Antigravity restart, Khmer in the terminal is smaller too.

Then verify on disk:
```bash
grep -c "claude-code-style" ~/.antigravity-ide/extensions/anthropic.claude-code-*/webview/index.css
grep -n "chat\.\|terminal.integrated.font\|claudeCodeStyle" "$APPDATA/Antigravity IDE/User/settings.json"
```
Expected: count `2` (both markers); settings show `'CCS Khmer'` in chat families and `Khmer OS System CCS 93` in the terminal family.

- [ ] **Step 5: Verify update-restore**

Remove the block by hand to simulate an update:
```bash
node -e "const f=require('fs'),p=process.argv[1];const {removeBlock}=require('./out/cssBlock');f.writeFileSync(p,removeBlock(f.readFileSync(p,'utf8')))" ~/.antigravity-ide/extensions/anthropic.claude-code-2.1.274-win32-x64/webview/index.css
```
Ask the user to reload the window. Expected: the "Claude Code was updated…" message appears, and the grep from Step 4 shows `2` again.

- [ ] **Step 6: Verify remove**

Ask the user to run `Claude Style: Remove My Styles`. Expected: grep count `0`; chat/terminal font settings return to the values they had before the first Apply.

- [ ] **Step 7: If Khmer is NOT smaller in the chat (spec risk)**

That means the chat's security rules block the `local()` font trick. Do not patch around it: stop and report to the user, and propose the spec's fallback (use the resized font family, as the terminal does, in `chat.fontFamily` too).

- [ ] **Step 8: Checkpoint** — report results to the user.
