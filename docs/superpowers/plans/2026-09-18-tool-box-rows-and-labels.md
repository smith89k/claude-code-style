# Tool Box Rows and Preview Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five Tool box rows to the style table, label every row with text copied from the preview, group the rows, highlight the matching preview part on hover/focus, and release 0.5.0.

**Architecture:** Five new `ElementKey`s get CSS targets in `cssBuilder.ts` that match Claude Code's hashed class names by prefix (`[class*="toolBodyRowLabel_"]`), written unscoped into Claude Code's CSS and under `#preview` in the preview. The preview's mock tool box carries the same class prefixes, so one selector set styles both. The host sends per-row preview selectors (`previewSelectors()`) so `panel.js` can outline what a row styles.

**Tech Stack:** TypeScript 5, VS Code API ^1.80, `node:test`, headless Chrome. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-18-tool-box-rows-and-labels-design.md`

## Global Constraints

- New keys, exact names and order, appended after `divider`: `toolName, toolDescription, toolBox, toolLabel, toolContent`.
- Existing keys and saved settings are unchanged; only displayed names change.
- Bracket text in labels is copied exactly from the preview panel; several places are separated by `, `. No brackets for headings, `divider`, `toolBox`.
- Tool selectors, exact: `[class*="toolNameText_"]`, `[class*="toolNameTextSecondary_"]`, `[class*="toolNameTextSecondaryPlaintext_"]`, `[class*="toolBody_"]`, `[class*="toolBodyRow_"]`, `[class*="toolBodyRowLabel_"]`, `[class*="toolBodyRowContent_"]`.
- Tool rules are unscoped in Claude Code's CSS and scoped with `#preview` in the preview. Reply rules keep the scope `#preview .md` in the preview.
- `toolLabel` with a colour also writes `opacity: 1;`.
- Group names, exact: `Claude's reply`, `Tool box`.
- Highlight class: `ccs-highlight` = `outline: 2px dashed var(--vscode-focusBorder)`, `outline-offset: 2px`.
- Version after this plan: `0.5.0`.
- Windows, Git Bash, working directory `E:/_httdocs/claude-code-style`. `out/` is tracked: commit compiled files with their sources.
- Commit messages end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## File Structure

| File | Change |
|---|---|
| `src/styleConfig.ts` | 5 new keys |
| `src/cssBuilder.ts` | Tool targets, `toolScope`, label opacity, `PREVIEW_SCOPE`, `PREVIEW_TOOL_SCOPE`, `previewSelectors()` |
| `src/presets.ts` | 5 new mapping entries |
| `src/SettingsPanel.ts` | Preview CSS with tool scope; `highlights` in `init` |
| `media/panel.js` | Keys, `[name, brackets]` labels, disabled lists, group rows, `tr[data-key]`, highlight |
| `media/panel.html` | Claude Code class prefixes on the mock tool box |
| `media/panel.css` | Item/bracket style, group rows, tool row borders, `.ccs-highlight` |
| `tools/screenshot.js` | Preview CSS with tool scope |
| `src/test/cssBuilder.test.ts`, `src/test/presets.test.ts`, `src/test/panelScript.test.ts` | New tests |
| `package.json`, `README.md`, `CHANGELOG.md` | Version, docs |

---

### Task 1: Tool rows in config, CSS, presets and labels

**Files:**
- Modify: `src/styleConfig.ts`, `src/cssBuilder.ts`, `src/presets.ts`, `media/panel.js`, `media/panel.css`, `package.json`
- Test: `src/test/cssBuilder.test.ts`, `src/test/presets.test.ts`, `src/test/panelScript.test.ts`

**Interfaces:**
- Produces:
  - `ElementKey` includes `'toolName' | 'toolDescription' | 'toolBox' | 'toolLabel' | 'toolContent'`
  - `buildCss(cfg: StyleConfig, scope: string, toolScope?: string): string` (`toolScope` defaults to `''`)
  - `const PREVIEW_SCOPE = '#preview .md'`, `const PREVIEW_TOOL_SCOPE = '#preview'`
  - `previewSelectors(): Record<ElementKey, string>`
  - `panel.js` `LABELS: Record<key, [name: string, brackets: string]>`

- [ ] **Step 1: Write the failing CSS tests**

In `src/test/cssBuilder.test.ts`, change the imports to:

```ts
import { sanitizeConfig, DEFAULT_CONFIG, ELEMENT_KEYS } from '../styleConfig';
import { buildCss, chatFamilyList, khmerScale, previewSelectors } from '../cssBuilder';
```

Append:

```ts
test('tool rows use prefix selectors, bare in Claude Code and scoped in the preview', () => {
    const cfg = sanitizeConfig({ ...base, elements: { toolName: { color: '#ff0000' }, toolBox: { background: '#111111', border: '#222222' } } });
    const real = buildCss(cfg, '.root_x');
    assert.match(real, /\n\[class\*="toolNameText_"\] {\n  color: #ff0000;\n}/);
    assert.match(real, /\n\[class\*="toolBody_"\] {\n  background: #111111;\n}/);
    assert.match(real, /\n\[class\*="toolBody_"\], \[class\*="toolBodyRow_"\] {\n  border-color: #222222;\n}/);
    assert.doesNotMatch(real, /\.root_x \[class/);
    const preview = buildCss(cfg, '#preview .md', '#preview');
    assert.match(preview, /#preview \[class\*="toolNameText_"\] {\n  color: #ff0000;\n}/);
});

test('IN / OUT label colour shows at full opacity', () => {
    const css = cssFor({ toolLabel: { color: '#abcdef' }, toolName: { color: '#123456' } });
    assert.match(css, /\[class\*="toolBodyRowLabel_"\] {\n  color: #abcdef;\n  opacity: 1;\n}/);
    assert.match(css, /\[class\*="toolNameText_"\] {\n  color: #123456;\n}/);
    assert.doesNotMatch(cssFor({ toolLabel: { size: 11 } }), /opacity/);
});

test('tool description covers both Claude Code variants', () => {
    const css = cssFor({ toolDescription: { italic: true } });
    assert.match(css, /\[class\*="toolNameTextSecondary_"\], \[class\*="toolNameTextSecondaryPlaintext_"\] {\n  font-style: italic;\n}/);
});

test('tool content styles its pre and code too', () => {
    const css = cssFor({ toolContent: { size: 12 } });
    assert.match(css, /\[class\*="toolBodyRowContent_"\], \[class\*="toolBodyRowContent_"\] pre, \[class\*="toolBodyRowContent_"\] code {\n  font-size: 12px;\n}/);
});

test('previewSelectors scopes each row and drops pseudo-elements', () => {
    const s = previewSelectors();
    assert.deepEqual(Object.keys(s), ELEMENT_KEYS);
    assert.equal(s.text, '#preview .md p');
    assert.equal(s.bullet, '#preview .md li');
    assert.equal(s.code, '#preview .md :not(pre) > code');
    assert.equal(s.codeBlock, '#preview .md pre code, #preview .md pre');
    assert.equal(s.divider, '#preview .md hr');
    assert.equal(s.toolBox, '#preview [class*="toolBody_"]');
    assert.equal(s.toolLabel, '#preview [class*="toolBodyRowLabel_"]');
});
```

- [ ] **Step 2: Write the failing preset and label tests**

In `src/test/presets.test.ts`, inside `test('mapping spot checks on Catppuccin Mocha', ...)`, add before its closing `});`:

```ts
    assert.deepEqual(e.toolName, { color: '#cdd6f4' });
    assert.deepEqual(e.toolDescription, { color: '#89b4fa' });
    assert.deepEqual(e.toolBox, { background: '#181825', border: '#585b70' });
    assert.deepEqual(e.toolLabel, { color: '#7f849c' });
    assert.deepEqual(e.toolContent, { color: '#cdd6f4' });
```

Append to `src/test/panelScript.test.ts`:

```ts
function previewText(): string {
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    return html.slice(html.indexOf('id="preview"')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

function panelLabels(): Record<string, [string, string]> {
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    const out: Record<string, [string, string]> = {};
    // \r?: git on Windows checks files out with CRLF
    for (const m of js.matchAll(/^\s+(\w+): \['([^']*)', '([^']*)'\],\r?$/gm)) {
        out[m[1]] = [m[2], m[3]];
    }
    return out;
}

test('every style row has a label', () => {
    assert.deepEqual(Object.keys(panelLabels()), ELEMENT_KEYS);
});

test('bracket text is copied from the preview', () => {
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

test('bullet brackets come from a bullet list and a numbered list', () => {
    assert.equal(panelLabels().bullet[1], '•, 1., 2.');
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    assert.match(html, /<ul>\s*<li>[\s\S]*?<li>/);
    assert.match(html, /<ol>\s*<li>[\s\S]*?<li>/);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `tsc` errors, including `Module '"../cssBuilder"' has no exported member 'previewSelectors'` and `'toolName' does not exist` on the presets test.

- [ ] **Step 4: Add the keys in `src/styleConfig.ts`**

Replace:

```ts
    | 'list' | 'bullet' | 'quote' | 'tableHeader' | 'tableCell' | 'divider';
```

with:

```ts
    | 'list' | 'bullet' | 'quote' | 'tableHeader' | 'tableCell' | 'divider'
    | 'toolName' | 'toolDescription' | 'toolBox' | 'toolLabel' | 'toolContent';
```

Replace:

```ts
    'list', 'bullet', 'quote', 'tableHeader', 'tableCell', 'divider',
];
```

with:

```ts
    'list', 'bullet', 'quote', 'tableHeader', 'tableCell', 'divider',
    'toolName', 'toolDescription', 'toolBox', 'toolLabel', 'toolContent',
];
```

- [ ] **Step 5: Add tool targets to `src/cssBuilder.ts`**

5a. Replace the `Target` interface and the line `const same = ...` with:

```ts
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
```

5b. In `TARGETS`, replace:

```ts
    divider: { text: [], box: [], border: { selectors: ['hr'], kind: 'top' } },
};
```

with:

```ts
    divider: { text: [], box: [], border: { selectors: ['hr'], kind: 'top' } },
    toolName: { text: [cls('toolNameText')], box: [], tool: true },
    toolDescription: { text: [cls('toolNameTextSecondary'), cls('toolNameTextSecondaryPlaintext')], box: [], tool: true },
    toolBox: { text: [], box: [cls('toolBody')], border: { selectors: [cls('toolBody'), cls('toolBodyRow')], kind: 'color' }, tool: true },
    toolLabel: { text: [cls('toolBodyRowLabel')], box: [], tool: true, fullOpacity: true },
    toolContent: {
        text: [cls('toolBodyRowContent'), `${cls('toolBodyRowContent')} pre`, `${cls('toolBodyRowContent')} code`],
        box: [],
        tool: true,
    },
};
```

5c. In `rule`, replace:

```ts
    const selector = tags.map((tag) => `${scope} ${tag}`).join(', ');
```

with:

```ts
    const selector = tags.map((tag) => (scope ? `${scope} ${tag}` : tag)).join(', ');
```

5d. Replace the whole `elementRules` function with:

```ts
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
```

5e. Replace the `buildCss` signature and its loop call:

```ts
export function buildCss(cfg: StyleConfig, scope: string): string {
```

with:

```ts
export function buildCss(cfg: StyleConfig, scope: string, toolScope = ''): string {
```

and:

```ts
            parts.push(...elementRules(key, style, cfg, scope));
```

with:

```ts
            parts.push(...elementRules(key, style, cfg, scope, toolScope));
```

5f. Append to the end of the file:

```ts
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
```

- [ ] **Step 6: Add the preset mapping in `src/presets.ts`**

Replace:

```ts
    divider: { border: 'line' },
};
```

with:

```ts
    divider: { border: 'line' },
    toolName: { color: 'text' },
    toolDescription: { color: 'blue' },
    toolBox: { background: 'deep', border: 'line' },
    toolLabel: { color: 'muted' },
    toolContent: { color: 'text' },
};
```

- [ ] **Step 7: Keys, labels and box lists in `media/panel.js`**

Replace the lines from `const KEYS = [...]` through `const HAS_BORDER = [...]` (the `LABELS` object, its comment and the three lists) with:

```js
    const KEYS = ['text', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'bold', 'italic', 'strike', 'link', 'code', 'codeBlock', 'list', 'bullet', 'quote', 'tableHeader', 'tableCell', 'divider', 'toolName', 'toolDescription', 'toolBox', 'toolLabel', 'toolContent'];
    // [name, text copied exactly from the preview panel]; a test checks the brackets
    const LABELS = {
        text: ['Normal text', 'This is normal text'],
        h1: ['Heading 1', ''],
        h2: ['Heading 2', ''],
        h3: ['Heading 3', ''],
        h4: ['Heading 4', ''],
        h5: ['Heading 5', ''],
        h6: ['Heading 6', ''],
        bold: ['Bold', 'bold · ដិត'],
        italic: ['Italic', 'italic · ទ្រេត'],
        strike: ['Crossed-out', 'crossed-out · លុបចោល'],
        link: ['Link', 'link · តំណភ្ជាប់'],
        code: ['Inline code', 'inline code'],
        codeBlock: ['Code block', 'function hello(name)'],
        list: ['List item', 'List item · ធាតុបញ្ជី'],
        bullet: ['Bullet / number', '•, 1., 2.'],
        quote: ['Quote', 'A quote from the docs'],
        tableHeader: ['Table header', 'Setting · ការកំណត់, Value'],
        tableCell: ['Table cell', 'English font, JetBrains Mono'],
        divider: ['Divider line', ''],
        toolName: ['Tool name', 'Bash'],
        toolDescription: ['Tool description', 'List source files'],
        toolBox: ['Tool box', ''],
        toolLabel: ['IN / OUT label', 'IN, OUT'],
        toolContent: ['IN / OUT content', 'ls src/, cssBuilder.ts'],
    };
    // Which boxes make sense for each row; the rest are disabled
    const NO_TEXT = ['divider', 'toolBox'];
    const NO_BACKGROUND = ['bullet', 'divider', 'toolName', 'toolDescription', 'toolLabel', 'toolContent'];
    const HAS_BORDER = ['code', 'codeBlock', 'quote', 'tableHeader', 'tableCell', 'divider', 'toolBox'];
```

In `buildRows`, replace:

```js
            row.append(el('td', { textContent: LABELS[key], className: 'item' }));
```

with:

```js
            const [name, brackets] = LABELS[key];
            const item = el('td', { textContent: name, className: 'item' });
            if (brackets) {
                item.append(' ', el('span', { className: 'example', textContent: '(' + brackets + ')' }));
            }
            row.append(item);
```

- [ ] **Step 8: Label style in `media/panel.css`**

Replace:

```css
td.item { white-space: nowrap; }
```

with:

```css
td.item { min-width: 150px; max-width: 230px; }
td.item .example { color: var(--vscode-descriptionForeground); font-size: 12px; }
```

- [ ] **Step 9: Update the setting description in `package.json`**

Replace the `claudeCodeStyle.elements` description string with:

```json
"Styles for Claude Code chat items: text, h1-h6, bold, italic, strike, link, code, codeBlock, list, bullet, quote, tableHeader, tableCell, divider, toolName, toolDescription, toolBox, toolLabel, toolContent. Each: { font, size, color, background, border, weight, italic, underline }."
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — `ℹ pass 46`, `ℹ fail 0` (38 before + 5 CSS + 3 label tests; the Mocha spot check grows in place).

- [ ] **Step 11: Commit**

```bash
git add -A src media out package.json
git commit -m "Add tool box rows, preview-matching labels and tool CSS targets

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Groups, highlight and preview tool box

**Files:**
- Modify: `media/panel.html`, `media/panel.js`, `media/panel.css`, `src/SettingsPanel.ts`, `tools/screenshot.js`
- Test: `src/test/panelScript.test.ts`

**Interfaces:**
- Consumes: `buildCss(cfg, scope, toolScope)`, `PREVIEW_SCOPE`, `PREVIEW_TOOL_SCOPE`, `previewSelectors()` from Task 1.
- Produces: `init` message gains `highlights: Record<ElementKey, string>`.

- [ ] **Step 1: Write the failing test**

Append to `src/test/panelScript.test.ts`:

```ts
test('preview tool box carries the Claude Code class prefixes', () => {
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    for (const prefix of ['toolNameText_', 'toolNameTextSecondaryPlaintext_', 'toolBody_', 'toolBodyRow_', 'toolBodyRowLabel_', 'toolBodyRowContent_']) {
        assert.ok(html.includes(`${prefix}preview`), prefix);
    }
});

test('panel.js groups rows and walks only style rows', () => {
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    assert.ok(js.includes(`text: "Claude's reply"`), 'reply group');
    assert.ok(js.includes(`toolName: 'Tool box'`), 'tool group');
    assert.ok(!js.includes(`querySelectorAll('tr')`), 'group rows have no data-key');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — both new tests fail (`toolNameText_`, `reply group`).

- [ ] **Step 3: Add the class prefixes to the mock tool box in `media/panel.html`**

Replace:

```html
                <div class="tool-name"><b>Bash</b><span class="tool-sub">List source files</span></div>
                <div class="tool-body">
                    <div class="tool-row"><div class="tool-label">IN</div><div class="tool-content mono">ls src/</div></div>
                    <div class="tool-row"><div class="tool-label">OUT</div><div class="tool-content mono">cssBuilder.ts
```

with:

```html
                <div class="tool-name"><b class="toolNameText_preview">Bash</b><span class="tool-sub toolNameTextSecondaryPlaintext_preview">List source files</span></div>
                <div class="tool-body toolBody_preview">
                    <div class="tool-row toolBodyRow_preview"><div class="tool-label toolBodyRowLabel_preview">IN</div><div class="tool-content mono toolBodyRowContent_preview">ls src/</div></div>
                    <div class="tool-row toolBodyRow_preview"><div class="tool-label toolBodyRowLabel_preview">OUT</div><div class="tool-content mono toolBodyRowContent_preview">cssBuilder.ts
```

- [ ] **Step 4: Make the mock row borders overridable in `media/panel.css`**

`#preview .tool-row + .tool-row` is more specific than the generated `#preview [class*="toolBodyRow_"]`, so the preview would ignore the Tool box border colour. Mirror Claude Code's own rules instead. Replace:

```css
#preview .tool-row + .tool-row { border-top: .5px solid var(--pv-border); }
```

with:

```css
#preview .tool-row { border-top: .5px solid var(--pv-border); }
#preview .tool-row:first-child { border-top: none; }
```

Then append at the end of the file:

```css
/* Style table groups and the preview highlight */
#styles tr.group th { padding: 14px 4px 4px; font-size: 13px; color: var(--vscode-foreground); border-bottom: 1px solid var(--vscode-panel-border); }
.ccs-highlight { outline: 2px dashed var(--vscode-focusBorder) !important; outline-offset: 2px; }
```

- [ ] **Step 5: Groups, style-row walking and highlight in `media/panel.js`**

5a. Directly below the `HAS_BORDER` line add:

```js
    const GROUP_BEFORE = { text: "Claude's reply", toolName: 'Tool box' };
```

5b. In `buildRows`, replace:

```js
        for (const key of KEYS) {
            const noText = NO_TEXT.includes(key);
            const row = el('tr');
            row.dataset.key = key;
```

with:

```js
        for (const key of KEYS) {
            if (GROUP_BEFORE[key]) {
                const group = el('tr', { className: 'group' });
                group.append(el('th', { colSpan: 9, textContent: GROUP_BEFORE[key] }));
                tbody.append(group);
            }
            const noText = NO_TEXT.includes(key);
            const row = el('tr');
            row.dataset.key = key;
            row.addEventListener('mouseenter', () => showHighlight(key));
            row.addEventListener('mouseleave', () => showHighlight(focusedKey()));
            row.addEventListener('focusin', () => showHighlight(key));
            row.addEventListener('focusout', () => setTimeout(() => showHighlight(focusedKey()), 0));
```

5c. Replace every `tbody.querySelectorAll('tr')` with `tbody.querySelectorAll('tr[data-key]')` (three places: `readForm`, `fillForm`, `applyPreset`).

5d. Insert directly above `function fillForm(config) {`:

```js
    /** @type {Record<string, string>} */
    let highlights = {};

    function focusedKey() {
        const row = document.activeElement && document.activeElement.closest('tr[data-key]');
        return row ? /** @type {HTMLElement} */ (row).dataset.key || '' : '';
    }

    // Outline the preview parts that a row styles
    function showHighlight(key) {
        for (const node of document.querySelectorAll('.ccs-highlight')) {
            node.classList.remove('ccs-highlight');
        }
        if (key && highlights[key]) {
            for (const node of document.querySelectorAll(highlights[key])) {
                node.classList.add('ccs-highlight');
            }
        }
    }
```

5e. In the `message` listener, replace:

```js
            fillPresets(msg.presets || []);
```

with:

```js
            fillPresets(msg.presets || []);
            highlights = msg.highlights || {};
```

- [ ] **Step 6: Send highlights and the tool scope from `src/SettingsPanel.ts`**

Replace:

```ts
import { buildCss, chatFamilyList } from './cssBuilder';
```

with:

```ts
import { PREVIEW_SCOPE, PREVIEW_TOOL_SCOPE, buildCss, chatFamilyList, previewSelectors } from './cssBuilder';
```

Replace:

```ts
                await this._post({ type: 'init', config: readConfig(), fonts, presets: presetMessages() });
```

with:

```ts
                await this._post({ type: 'init', config: readConfig(), fonts, presets: presetMessages(), highlights: previewSelectors() });
```

Replace:

```ts
                await this._post({ type: 'init', config: readConfig(), fonts: fontFamilies(await listSystemFonts()), presets: presetMessages() });
```

with:

```ts
                await this._post({ type: 'init', config: readConfig(), fonts: fontFamilies(await listSystemFonts()), presets: presetMessages(), highlights: previewSelectors() });
```

Replace:

```ts
                    css: buildCss(cfg, '#preview .md'),
```

with:

```ts
                    css: buildCss(cfg, PREVIEW_SCOPE, PREVIEW_TOOL_SCOPE),
```

- [ ] **Step 7: Same preview scopes in `tools/screenshot.js`**

Replace:

```js
const { buildCss, chatFamilyList } = require(path.join(root, 'out', 'cssBuilder.js'));
```

with:

```js
const { PREVIEW_SCOPE, PREVIEW_TOOL_SCOPE, buildCss, chatFamilyList, previewSelectors } = require(path.join(root, 'out', 'cssBuilder.js'));
```

Replace:

```js
    const init = { type: 'init', config, fonts: FONTS, presets: presetMessages() };
    const preview = { type: 'previewCss', css: buildCss(config, '#preview .md'), family: chatFamilyList(config), size: config.englishSize };
```

with:

```js
    const init = { type: 'init', config, fonts: FONTS, presets: presetMessages(), highlights: previewSelectors() };
    const preview = { type: 'previewCss', css: buildCss(config, PREVIEW_SCOPE, PREVIEW_TOOL_SCOPE), family: chatFamilyList(config), size: config.englishSize };
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — `ℹ pass 48`, `ℹ fail 0`.

- [ ] **Step 9: Headless UI check**

Write `$TEMP/ccs-ui/build.js` (scratch, not committed):

```js
const fs = require('fs');
const root = 'E:/_httdocs/claude-code-style';
const { presetMessages } = require(root + '/out/presets.js');
const { previewSelectors, buildCss, PREVIEW_SCOPE, PREVIEW_TOOL_SCOPE } = require(root + '/out/cssBuilder.js');
const { sanitizeConfig } = require(root + '/out/styleConfig.js');
const config = sanitizeConfig({ elements: {} });
for (const f of ['panel.css', 'panel.js']) fs.copyFileSync(`${root}/media/${f}`, `${__dirname}/${f}`);
const init = { type: 'init', config, fonts: { all: [], khmer: [] }, presets: presetMessages(), highlights: previewSelectors() };
const shim = `window.acquireVsCodeApi = () => ({ postMessage(m) {
  if (m.type === 'ready') setTimeout(() => window.postMessage(${JSON.stringify(init)}, '*'), 0); } });`;
const check = `setTimeout(() => {
  const r = {}, row = (k) => document.querySelector('tr[data-key="' + k + '"]');
  const lit = () => [...document.querySelectorAll('.ccs-highlight')].map((n) => n.textContent.trim().slice(0, 20));
  r.groups = [...document.querySelectorAll('tr.group th')].map((n) => n.textContent);
  r.toolNameLabel = row('toolName').querySelector('.item').textContent;
  row('code').dispatchEvent(new Event('mouseenter')); r.hoverCode = lit();
  row('toolLabel').dispatchEvent(new Event('mouseenter')); r.hoverLabel = lit();
  row('toolLabel').dispatchEvent(new Event('mouseleave')); r.afterLeave = lit();
  const sel = document.getElementById('preset'); sel.value = 'catppuccin-mocha';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  r.mochaToolBoxBg = row('toolBox').querySelector('.f-background').value;
  r.mochaToolLabel = row('toolLabel').querySelector('.f-color').value;
  r.toolBoxColorDisabled = row('toolBox').querySelector('.f-color').disabled;
  document.body.innerHTML = '<pre id=result>' + JSON.stringify(r, null, 1) + '</pre>';
}, 400);`;
const html = fs.readFileSync(root + '/media/panel.html', 'utf8')
  .replace(/<meta http-equiv="Content-Security-Policy"[\s\S]*?>/, '')
  .replace('{{cssUri}}', 'panel.css').replace('{{jsUri}}', 'panel.js').replace(/\{\{\w+\}\}/g, '')
  .replace('</head>', `<script>${shim}</script></head>`).replace('</body>', `<script>${check}</script></body>`);
fs.writeFileSync(__dirname + '/page.html', html);
```

Run:

```bash
mkdir -p "$TEMP/ccs-ui" && cp <the file above> "$TEMP/ccs-ui/build.js"
node "$TEMP/ccs-ui/build.js" && "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --virtual-time-budget=3000 --dump-dom "file:///$TEMP/ccs-ui/page.html" | sed -n '/<pre/,/<\/pre>/p'
```

Expected JSON: `groups` = `["Claude's reply","Tool box"]`; `toolNameLabel` = `Tool name (Bash)`; `hoverCode` = `["inline code","code"]`; `hoverLabel` = `["IN","OUT"]`; `afterLeave` = `[]`; `mochaToolBoxBg` = `#181825`; `mochaToolLabel` = `#7f849c`; `toolBoxColorDisabled` = `true`.

- [ ] **Step 10: Commit**

```bash
git add -A src media out tools
git commit -m "Group style rows, highlight preview parts, style the preview tool box

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Docs, screenshots, version 0.5.0, check in Antigravity

**Files:**
- Modify: `package.json`, `README.md`, `CHANGELOG.md`, `images/*.png`

- [ ] **Step 1: Bump the version**

In `package.json` change `"version": "0.4.0"` to `"version": "0.5.0"`.

- [ ] **Step 2: Update `README.md`**

2a. Replace the Features bullet that starts `- **Style every item in a reply.**` and its indented line with:

```markdown
- **Style every item in a reply and the tool box.** Set the font, size, colour, background, border, weight, italic and underline for:
  normal text, headings 1–6, bold, italic, crossed-out, links, inline code, code blocks, list items, bullets and numbers, quotes, table headers, table cells and divider lines, plus the tool box: tool name (e.g. **Bash**), tool description, the box itself, the IN / OUT labels and their content.
```

2b. Replace the paragraph under the settings screenshot:

```markdown
Leave any box empty to keep Claude Code's normal look for that item. Boxes that don't apply to an item are greyed out.
```

with:

```markdown
Rows are grouped into **Claude's reply** and **Tool box**. The text in brackets, such as *Tool name (Bash)*, is exactly what that row styles in the preview, and hovering a row outlines it there. Leave any box empty to keep Claude Code's normal look for that item. Boxes that don't apply to an item are greyed out.
```

2c. In the `claudeCodeStyle.elements` settings table row, replace the description cell with:

```markdown
Styles per chat item: `text`, `h1`–`h6`, `bold`, `italic`, `strike`, `link`, `code`, `codeBlock`, `list`, `bullet`, `quote`, `tableHeader`, `tableCell`, `divider`, `toolName`, `toolDescription`, `toolBox`, `toolLabel`, `toolContent`. Each takes `font`, `size`, `color`, `background`, `border`, `weight`, `italic`, `underline`.
```

- [ ] **Step 3: Update `CHANGELOG.md`**

Insert below `# Changelog`:

```markdown
## 0.5.0

- Style the **tool box**: tool name (e.g. Bash), tool description, box background and border, IN / OUT labels and their content. Presets colour it too.
- Every row now shows the exact preview text it styles in brackets, e.g. *Tool name (Bash)*, and rows are grouped into *Claude's reply* and *Tool box*.
- Hovering or editing a row outlines that part of the preview.
- Renamed *Italic text* to *Italic* and *Code snippet* to *Inline code* to match the preview. Saved settings are unchanged.
```

- [ ] **Step 4: Regenerate screenshots and inspect them**

Run: `npm run screenshots`
Expected: `wrote images/settings.png`, `wrote images/preview.png`, `wrote images/presets.png`.

The table is now 5 rows + 2 group rows taller. Open `images/settings.png` with the Read tool: it must show both group headers, the bracket labels and end at or just after the Apply button. If the Apply button is cut off, raise the `settings.png` height in `tools/screenshot.js` (the `shoot(... 'settings.png', 940, 1050)` call) until it shows, then re-run. Check `preview.png` and `presets.png` show the tool box in preset colours.

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: `ℹ pass 48`, `ℹ fail 0`.

- [ ] **Step 6: Commit and push (README images are served from GitHub `main`)**

```bash
git add -A package.json README.md CHANGELOG.md images tools
git commit -m "Document tool box rows and labels, version 0.5.0

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push origin main
```

- [ ] **Step 7: Install into Antigravity and ask the user to confirm the real tool box**

```bash
npx --yes @vscode/vsce@latest package --out claude-code-style-0.5.0.vsix
"/c/Users/taing/AppData/Local/Programs/Antigravity IDE/bin/antigravity-ide.cmd" --install-extension claude-code-style-0.5.0.vsix --force
```

Ask the user to: reload Antigravity, open **Claude Style: Open Settings**, pick *Catppuccin Mocha*, click **Apply**, reload, then run any Bash command in Claude Code and confirm the tool name, description, IN / OUT labels, content and box border take the Mocha colours. **Do not publish until the user confirms.** If the tool box is not styled, stop and report: the class prefixes need re-checking against the live DOM.

---

### Task 4: Verify and publish 0.5.0

**Files:**
- Modify: `claude-code-style-0.4.0.vsix` → replaced by `claude-code-style-0.5.0.vsix`

- [ ] **Step 1: Check the package and README links**

```bash
unzip -l claude-code-style-0.5.0.vsix | grep -E "out/|media/" | wc -l
unzip -p claude-code-style-0.5.0.vsix extension/readme.md | grep -oE 'https?://[^) "]+' | sort -u | while read u; do printf "%s  %s\n" "$(curl -s -o /dev/null -L -w '%{http_code}' "$u")" "$u"; done
```

Expected: `15` (12 `out/` + 3 `media/`), and every link line starts with `200`.

- [ ] **Step 2: Throwaway-profile install**

```bash
T="$TEMP/ccs-verify050"; rm -rf "$T"
code --extensions-dir "$T/ext" --user-data-dir "$T/data" --install-extension claude-code-style-0.5.0.vsix
code --extensions-dir "$T/ext" --user-data-dir "$T/data" --list-extensions --show-versions
node -e "const d=require('fs').readdirSync(process.env.TEMP+'/ccs-verify050/ext').find(n=>n.startsWith('smith89k.claude-code-style-0.5.0'));console.log(Object.keys(require(process.env.TEMP+'/ccs-verify050/ext/'+d+'/out/cssBuilder.js').previewSelectors()).length)"
```

Expected: `smith89k.claude-code-style@0.5.0`, then `24`.

- [ ] **Step 3: Verify tokens and publish (PowerShell)**

```powershell
$env:VSCE_PAT = [Environment]::GetEnvironmentVariable('VSCE_PAT','User'); $env:OVSX_PAT = [Environment]::GetEnvironmentVariable('OVSX_PAT','User')
npx --yes @vscode/vsce@latest verify-pat smith89k
npx --yes ovsx@latest verify-pat smith89k
npx --yes @vscode/vsce@latest publish --packagePath claude-code-style-0.5.0.vsix
npx --yes ovsx@latest publish claude-code-style-0.5.0.vsix
```

Expected: both verifications succeed; `DONE  Published smith89k.claude-code-style v0.5.0.` and `Published smith89k.claude-code-style v0.5.0`.

- [ ] **Step 4: Commit the package, tag, push**

```bash
git rm -q claude-code-style-0.4.0.vsix
git add claude-code-style-0.5.0.vsix
git commit -m "Release 0.5.0

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git tag v0.5.0
git push origin main --tags
```

- [ ] **Step 5: Confirm both listings (background poll, 30 s interval, up to 20 min)**

```bash
curl -s -X POST "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery" -H "Content-Type: application/json" -H "Accept: application/json;api-version=7.2-preview.1" -d '{"filters":[{"criteria":[{"filterType":7,"value":"smith89k.claude-code-style"}]}],"flags":1}' | grep -o '"version":"[^"]*"' | head -1
curl -s https://open-vsx.org/api/smith89k/claude-code-style | grep -o '"version":"[^"]*"' | head -1
```

Expected: both `"version":"0.5.0"`.
