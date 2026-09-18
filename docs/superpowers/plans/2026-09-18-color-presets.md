# Colour Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Preset menu to the settings page that fills the colour boxes of the *Text styles* table from 12 open-source themes, then release 0.4.0.

**Architecture:** A new pure module `src/presets.ts` holds 12 palettes (12 roles each) and one shared role → row mapping. The extension host sends the ready-made colour fields to the webview in the `init` message; `media/panel.js` writes them into the Color / Background / Border boxes and triggers the existing live preview. Nothing new is saved: Apply keeps its current path.

**Tech Stack:** TypeScript 5, VS Code API ^1.80, Node built-in test runner (`node:test`), headless Chrome for README screenshots. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-18-color-presets-design.md`

## Global Constraints

- Presets set only `color`, `background`, `border`. Never `font`, `size`, `weight`, `italic`, `underline`.
- Picking a preset saves nothing; only **Apply** saves.
- Preset colours reach only the Claude Code chat panel (existing CSS block path). No editor theme, panel background, terminal or font setting changes.
- No paid themes (Dracula Pro, Monokai Pro, Material Theme).
- Exactly 12 presets, ids exact: `dracula`, `catppuccin-frappe`, `catppuccin-macchiato`, `catppuccin-mocha`, `nord`, `gruvbox-dark`, `one-dark`, `tokyo-night`, `tokyo-night-storm`, `catppuccin-latte`, `gruvbox-light`, `tokyo-night-day`.
- Exactly 12 roles, names exact: `text, muted, surface, deep, line, purple, blue, cyan, green, yellow, orange, pink`. All values `#rrggbb` lowercase.
- Palette hex values below were checked on 2026-09-18 against: catppuccin/palette `palette.json`; Dracula README spec table; nordtheme `src/nord.css`; morhetz/gruvbox `colors/gruvbox.vim`; atom `one-dark-syntax` `colors.less` + `syntax-variables.less` (compiled with less 4); folke/tokyonight.nvim `extras/lua/tokyonight_{night,storm,day}.lua`. Do not change them from memory.
- Placeholder text of the select, exact: `Choose a preset…`. Light hint text, exact: `For light editor themes`.
- Platform: Windows, Git Bash, working directory `E:/_httdocs/claude-code-style`. Editor for manual check: Antigravity IDE.
- Version after this plan: `0.4.0`.
- Commit messages end with the line `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## File Structure

| File | Responsibility |
|---|---|
| `src/presets.ts` (create) | Palettes, role mapping, `presetElements`, `presetMessages` — pure |
| `src/test/presets.test.ts` (create) | Data, mapping and page-compatibility tests |
| `src/SettingsPanel.ts` (modify) | Add `presets` to both `init` messages |
| `media/panel.html` (modify) | Preset select + hint above the style table |
| `media/panel.css` (modify) | Preset row layout |
| `media/panel.js` (modify) | Fill preset list, apply preset, clear selection on manual edit |
| `tools/screenshot.js` (create) | Render the page in headless Chrome, write `images/*.png` |
| `package.json`, `README.md`, `CHANGELOG.md` (modify) | Version, `screenshots` script, docs |

---

### Task 1: Preset data and mapping

**Files:**
- Create: `src/presets.ts`
- Test: `src/test/presets.test.ts`

**Interfaces:**
- Consumes: `ElementKey`, `ElementStyle`, `ELEMENT_KEYS`, `sanitizeConfig` from `src/styleConfig.ts`.
- Produces:
  - `type Role = 'text' | 'muted' | 'surface' | 'deep' | 'line' | 'purple' | 'blue' | 'cyan' | 'green' | 'yellow' | 'orange' | 'pink'`
  - `const ROLES: Role[]`
  - `type Palette = Record<Role, string>`
  - `interface Preset { id: string; label: string; group: 'dark' | 'light'; palette: Palette }`
  - `const PRESETS: Preset[]`
  - `type ColorFields = Pick<ElementStyle, 'color' | 'background' | 'border'>`
  - `function presetElements(palette: Palette): Partial<Record<ElementKey, ColorFields>>`
  - `interface PresetMessage { id: string; label: string; group: 'dark' | 'light'; elements: Partial<Record<ElementKey, ColorFields>> }`
  - `function presetMessages(): PresetMessage[]`

- [ ] **Step 1: Write the failing tests**

Create `src/test/presets.test.ts`:

```ts
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ELEMENT_KEYS, sanitizeConfig } from '../styleConfig';
import { PRESETS, ROLES, presetElements, presetMessages } from '../presets';

const HEX6 = /^#[0-9a-f]{6}$/;

test('there are 12 presets with unique ids and known groups', () => {
    assert.equal(PRESETS.length, 12);
    assert.equal(new Set(PRESETS.map((p) => p.id)).size, 12);
    for (const p of PRESETS) {
        assert.ok(p.group === 'dark' || p.group === 'light', p.id);
    }
    assert.deepEqual(
        PRESETS.filter((p) => p.group === 'light').map((p) => p.id),
        ['catppuccin-latte', 'gruvbox-light', 'tokyo-night-day']
    );
});

test('every preset defines all 12 roles as lowercase #rrggbb', () => {
    assert.equal(ROLES.length, 12);
    for (const p of PRESETS) {
        assert.deepEqual(Object.keys(p.palette).sort(), [...ROLES].sort(), p.id);
        for (const role of ROLES) {
            assert.match(p.palette[role], HEX6, `${p.id}.${role}`);
        }
    }
});

test('presetElements covers every row and survives sanitizeConfig unchanged', () => {
    for (const p of PRESETS) {
        const elements = presetElements(p.palette);
        assert.deepEqual(Object.keys(elements), ELEMENT_KEYS, p.id);
        assert.deepEqual(sanitizeConfig({ elements }).elements, elements, p.id);
    }
});

test('presetElements only sets colour fields', () => {
    for (const p of PRESETS) {
        for (const style of Object.values(presetElements(p.palette))) {
            for (const prop of Object.keys(style ?? {})) {
                assert.ok(['color', 'background', 'border'].includes(prop), `${p.id}: ${prop}`);
            }
        }
    }
});

test('mapping spot checks on Catppuccin Mocha', () => {
    const mocha = PRESETS.find((p) => p.id === 'catppuccin-mocha')!;
    const e = presetElements(mocha.palette);
    assert.deepEqual(e.h1, { color: '#fab387' });
    assert.deepEqual(e.code, { color: '#a6e3a1', background: '#313244', border: '#585b70' });
    assert.deepEqual(e.codeBlock, { color: '#cdd6f4', background: '#181825', border: '#585b70' });
    assert.deepEqual(e.quote, { color: '#7f849c', border: '#cba6f7' });
    assert.deepEqual(e.divider, { border: '#585b70' });
});

test('presetMessages carries id, label, group and elements', () => {
    const messages = presetMessages();
    assert.equal(messages.length, 12);
    assert.deepEqual(messages[0], {
        id: 'dracula',
        label: 'Dracula',
        group: 'dark',
        elements: presetElements(PRESETS[0].palette),
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `tsc` error `Cannot find module '../presets'`.

- [ ] **Step 3: Write the implementation**

Create `src/presets.ts`:

```ts
import { ElementKey, ElementStyle } from './styleConfig';

export type Role =
    | 'text' | 'muted' | 'surface' | 'deep' | 'line'
    | 'purple' | 'blue' | 'cyan' | 'green' | 'yellow' | 'orange' | 'pink';

export const ROLES: Role[] = [
    'text', 'muted', 'surface', 'deep', 'line',
    'purple', 'blue', 'cyan', 'green', 'yellow', 'orange', 'pink',
];

export type Palette = Record<Role, string>;

export interface Preset {
    id: string;
    label: string;
    group: 'dark' | 'light';
    palette: Palette;
}

export type ColorFields = Pick<ElementStyle, 'color' | 'background' | 'border'>;

export interface PresetMessage {
    id: string;
    label: string;
    group: 'dark' | 'light';
    elements: Partial<Record<ElementKey, ColorFields>>;
}

type RoleFields = { color?: Role; background?: Role; border?: Role };

// Same for every theme, so adding a theme only needs its palette
const MAPPING: Record<ElementKey, RoleFields> = {
    text: { color: 'text' },
    h1: { color: 'orange' },
    h2: { color: 'purple' },
    h3: { color: 'blue' },
    h4: { color: 'cyan' },
    h5: { color: 'green' },
    h6: { color: 'muted' },
    bold: { color: 'pink' },
    italic: { color: 'yellow' },
    strike: { color: 'muted' },
    link: { color: 'blue' },
    code: { color: 'green', background: 'surface', border: 'line' },
    codeBlock: { color: 'text', background: 'deep', border: 'line' },
    list: { color: 'text' },
    bullet: { color: 'purple' },
    quote: { color: 'muted', border: 'purple' },
    tableHeader: { color: 'blue', background: 'surface', border: 'line' },
    tableCell: { color: 'text', border: 'line' },
    divider: { border: 'line' },
};

// Values copied from each theme's official palette (sources in the plan / spec)
export const PRESETS: Preset[] = [
    {
        id: 'dracula', label: 'Dracula', group: 'dark',
        // No blue in Dracula: links are cyan in its spec, so blue = cyan. deep = Background
        palette: {
            text: '#f8f8f2', muted: '#6272a4', surface: '#44475a', deep: '#282a36', line: '#6272a4',
            purple: '#bd93f9', blue: '#8be9fd', cyan: '#8be9fd', green: '#50fa7b',
            yellow: '#f1fa8c', orange: '#ffb86c', pink: '#ff79c6',
        },
    },
    {
        id: 'catppuccin-frappe', label: 'Catppuccin Frappé', group: 'dark',
        // text, overlay1, surface0, mantle, surface2, mauve, blue, sky, green, yellow, peach, pink
        palette: {
            text: '#c6d0f5', muted: '#838ba7', surface: '#414559', deep: '#292c3c', line: '#626880',
            purple: '#ca9ee6', blue: '#8caaee', cyan: '#99d1db', green: '#a6d189',
            yellow: '#e5c890', orange: '#ef9f76', pink: '#f4b8e4',
        },
    },
    {
        id: 'catppuccin-macchiato', label: 'Catppuccin Macchiato', group: 'dark',
        palette: {
            text: '#cad3f5', muted: '#8087a2', surface: '#363a4f', deep: '#1e2030', line: '#5b6078',
            purple: '#c6a0f6', blue: '#8aadf4', cyan: '#91d7e3', green: '#a6da95',
            yellow: '#eed49f', orange: '#f5a97f', pink: '#f5bde6',
        },
    },
    {
        id: 'catppuccin-mocha', label: 'Catppuccin Mocha', group: 'dark',
        palette: {
            text: '#cdd6f4', muted: '#7f849c', surface: '#313244', deep: '#181825', line: '#585b70',
            purple: '#cba6f7', blue: '#89b4fa', cyan: '#89dceb', green: '#a6e3a1',
            yellow: '#f9e2af', orange: '#fab387', pink: '#f5c2e7',
        },
    },
    {
        id: 'nord', label: 'Nord', group: 'dark',
        // nord4, nord3, nord1, nord0, nord3, nord15, nord9, nord8, nord14, nord13, nord12; no pink: nord15
        palette: {
            text: '#d8dee9', muted: '#4c566a', surface: '#3b4252', deep: '#2e3440', line: '#4c566a',
            purple: '#b48ead', blue: '#81a1c1', cyan: '#88c0d0', green: '#a3be8c',
            yellow: '#ebcb8b', orange: '#d08770', pink: '#b48ead',
        },
    },
    {
        id: 'gruvbox-dark', label: 'Gruvbox Dark', group: 'dark',
        // light1, gray, dark1, dark0_hard, dark3, bright_purple/blue/aqua/green/yellow/orange; no pink: bright_red
        palette: {
            text: '#ebdbb2', muted: '#928374', surface: '#3c3836', deep: '#1d2021', line: '#665c54',
            purple: '#d3869b', blue: '#83a598', cyan: '#8ec07c', green: '#b8bb26',
            yellow: '#fabd2f', orange: '#fe8019', pink: '#fb4934',
        },
    },
    {
        id: 'one-dark', label: 'One Dark', group: 'dark',
        // syntax-fg, mono-3, selection (bg +10%), syntax-bg, syntax-gutter, hue-3/2/1/4, hue-6-2, hue-6; no pink: hue-5 red
        palette: {
            text: '#abb2bf', muted: '#5c6370', surface: '#3e4451', deep: '#282c34', line: '#636d83',
            purple: '#c678dd', blue: '#61afef', cyan: '#56b6c2', green: '#98c379',
            yellow: '#e5c07b', orange: '#d19a66', pink: '#e06c75',
        },
    },
    {
        id: 'tokyo-night', label: 'Tokyo Night', group: 'dark',
        // fg, comment, bg_highlight, bg_dark, fg_gutter, magenta, blue, cyan, green, yellow, orange; no pink: red
        palette: {
            text: '#c0caf5', muted: '#565f89', surface: '#292e42', deep: '#16161e', line: '#3b4261',
            purple: '#bb9af7', blue: '#7aa2f7', cyan: '#7dcfff', green: '#9ece6a',
            yellow: '#e0af68', orange: '#ff9e64', pink: '#f7768e',
        },
    },
    {
        id: 'tokyo-night-storm', label: 'Tokyo Night Storm', group: 'dark',
        palette: {
            text: '#c0caf5', muted: '#565f89', surface: '#292e42', deep: '#1f2335', line: '#3b4261',
            purple: '#bb9af7', blue: '#7aa2f7', cyan: '#7dcfff', green: '#9ece6a',
            yellow: '#e0af68', orange: '#ff9e64', pink: '#f7768e',
        },
    },
    {
        id: 'catppuccin-latte', label: 'Catppuccin Latte', group: 'light',
        palette: {
            text: '#4c4f69', muted: '#8c8fa1', surface: '#ccd0da', deep: '#e6e9ef', line: '#acb0be',
            purple: '#8839ef', blue: '#1e66f5', cyan: '#04a5e5', green: '#40a02b',
            yellow: '#df8e1d', orange: '#fe640b', pink: '#ea76cb',
        },
    },
    {
        id: 'gruvbox-light', label: 'Gruvbox Light', group: 'light',
        // dark1, gray, light1, light0_soft, light3, faded_purple/blue/aqua/green/yellow/orange; no pink: faded_red
        palette: {
            text: '#3c3836', muted: '#928374', surface: '#ebdbb2', deep: '#f2e5bc', line: '#bdae93',
            purple: '#8f3f71', blue: '#076678', cyan: '#427b58', green: '#79740e',
            yellow: '#b57614', orange: '#af3a03', pink: '#9d0006',
        },
    },
    {
        id: 'tokyo-night-day', label: 'Tokyo Night Day', group: 'light',
        palette: {
            text: '#3760bf', muted: '#848cb5', surface: '#c4c8da', deep: '#d0d5e3', line: '#a8aecb',
            purple: '#9854f1', blue: '#2e7de9', cyan: '#007197', green: '#587539',
            yellow: '#8c6c3e', orange: '#b15c00', pink: '#f52a65',
        },
    },
];

export function presetElements(palette: Palette): Partial<Record<ElementKey, ColorFields>> {
    const out: Partial<Record<ElementKey, ColorFields>> = {};
    for (const [key, fields] of Object.entries(MAPPING) as [ElementKey, RoleFields][]) {
        const style: ColorFields = {};
        for (const prop of ['color', 'background', 'border'] as const) {
            const role = fields[prop];
            if (role) {
                style[prop] = palette[role];
            }
        }
        out[key] = style;
    }
    return out;
}

export function presetMessages(): PresetMessage[] {
    return PRESETS.map(({ id, label, group, palette }) => ({ id, label, group, elements: presetElements(palette) }));
}
```

Note: `MAPPING` keys are written in `ELEMENT_KEYS` order, so `Object.keys(presetElements(...))` equals `ELEMENT_KEYS` (the test relies on this).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all previous 30 tests plus the 6 new ones (`ℹ pass 36`, `ℹ fail 0`).

- [ ] **Step 5: Commit**

```bash
git add src/presets.ts src/test/presets.test.ts out/presets.js out/test/presets.test.js
git commit -m "Add colour preset palettes and role mapping

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

(`out/` is tracked in this repo, so compiled files are committed with their sources.)

---

### Task 2: Preset menu on the settings page

**Files:**
- Modify: `src/SettingsPanel.ts` (the `ready` and `reset` cases of `_onMessage`, imports)
- Modify: `media/panel.html` (Text styles section)
- Modify: `media/panel.css` (append)
- Modify: `media/panel.js`
- Test: `src/test/presets.test.ts` (append)

**Interfaces:**
- Consumes: `presetMessages(): PresetMessage[]`, `PRESETS`, `presetElements` from Task 1.
- Produces: `init` message shape `{ type: 'init', config, fonts, presets: PresetMessage[] }`; DOM ids `preset` (select) and `presetHint` (span).

- [ ] **Step 1: Write the failing tests**

Append to `src/test/presets.test.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';

const media = path.join(__dirname, '..', '..', 'media');

function listFromPanel(name: string): string[] {
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    const match = new RegExp(`const ${name} = (\\[[^\\]]*\\]);`).exec(js);
    assert.ok(match, `${name} not found in panel.js`);
    return JSON.parse(match[1].replace(/'/g, '"'));
}

test('presets never fill a box the page disables', () => {
    const noText = listFromPanel('NO_TEXT');
    const noBackground = listFromPanel('NO_BACKGROUND');
    const hasBorder = listFromPanel('HAS_BORDER');
    for (const p of PRESETS) {
        for (const [key, style] of Object.entries(presetElements(p.palette))) {
            if (noText.includes(key)) {
                assert.equal(style?.color, undefined, `${p.id}.${key}.color`);
            }
            if (noBackground.includes(key)) {
                assert.equal(style?.background, undefined, `${p.id}.${key}.background`);
            }
            if (!hasBorder.includes(key)) {
                assert.equal(style?.border, undefined, `${p.id}.${key}.border`);
            }
        }
    }
});

test('panel has the preset select, hint and placeholder text', () => {
    const html = fs.readFileSync(path.join(media, 'panel.html'), 'utf8');
    assert.ok(html.includes('id="preset"'), 'select');
    assert.ok(html.includes('id="presetHint"'), 'hint');
    const js = fs.readFileSync(path.join(media, 'panel.js'), 'utf8');
    assert.ok(js.includes("'Choose a preset…'"), 'placeholder');
    assert.ok(js.includes("'For light editor themes'"), 'light hint');
});
```

Move the two new `import` lines to the top of the file with the other imports.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `panel has the preset select, hint and placeholder text` fails on `select`. (`presets never fill a box the page disables` already passes; it guards the mapping.)

- [ ] **Step 3: Add the select to `media/panel.html`**

Replace:

```html
        <p class="hint">Leave a box empty to keep Claude Code's normal look. Grey boxes don't apply to that item.</p>
        <div class="table-scroll">
```

with:

```html
        <p class="hint">Leave a box empty to keep Claude Code's normal look. Grey boxes don't apply to that item.</p>
        <div class="preset-row">
            <label class="preset-label">Preset
                <select id="preset"></select>
            </label>
            <span id="presetHint" class="hint"></span>
        </div>
        <div class="table-scroll">
```

- [ ] **Step 4: Add the layout rule to `media/panel.css`**

Insert after the line `.color-cell input[type="text"] { width: 80px; }`:

```css
.preset-row { display: flex; align-items: center; gap: 12px; margin: 4px 0 10px; }
.preset-label { flex-direction: row; align-items: center; gap: 8px; font-size: 13px; }
.preset-row .hint { margin: 0; }
```

- [ ] **Step 5: Update `media/panel.js`**

5a. Add a shared colour writer. Replace this block inside `fillForm`:

```js
            for (const prop of ['color', 'background', 'border']) {
                field(row, 'f-' + prop).value = style[prop] || '';
                field(row, 'f-' + prop + '-picker').value = HEX6.test(style[prop] || '') ? style[prop] : '#ffffff';
            }
```

with:

```js
            for (const prop of COLOR_PROPS) {
                setColor(row, prop, style[prop]);
            }
```

5b. Insert directly above `function fillForm(config) {`:

```js
    const COLOR_PROPS = ['color', 'background', 'border'];

    function setColor(row, prop, value) {
        field(row, 'f-' + prop).value = value || '';
        field(row, 'f-' + prop + '-picker').value = HEX6.test(value || '') ? value : '#ffffff';
    }

    /** @type {{ id: string, label: string, group: string, elements: Record<string, Record<string, string>> }[]} */
    let presets = [];

    function fillPresets(list) {
        presets = list;
        const groups = { dark: el('optgroup', { label: 'Dark' }), light: el('optgroup', { label: 'Light' }) };
        for (const preset of list) {
            groups[preset.group].append(el('option', { value: preset.id, textContent: preset.label }));
        }
        $('preset').replaceChildren(el('option', { value: '', textContent: 'Choose a preset…' }), groups.dark, groups.light);
    }

    function applyPreset(id) {
        const preset = presets.find((p) => p.id === id);
        $('presetHint').textContent = preset && preset.group === 'light' ? 'For light editor themes' : '';
        if (!preset) {
            return;
        }
        for (const row of tbody.querySelectorAll('tr')) {
            const style = preset.elements[row.dataset.key] || {};
            for (const prop of COLOR_PROPS) {
                setColor(row, prop, style[prop]);
            }
        }
    }

    // Any manual edit means the boxes no longer match a preset
    function clearPreset(event) {
        if (event.target !== $('preset')) {
            $('preset').value = '';
            $('presetHint').textContent = '';
        }
    }
```

5c. In the `message` listener, replace:

```js
        if (msg.type === 'init') {
            fillList('allFonts', msg.fonts.all);
            fillList('khmerFonts', msg.fonts.khmer.length ? msg.fonts.khmer : msg.fonts.all);
            fillForm(msg.config);
            changed();
```

with:

```js
        if (msg.type === 'init') {
            fillList('allFonts', msg.fonts.all);
            fillList('khmerFonts', msg.fonts.khmer.length ? msg.fonts.khmer : msg.fonts.all);
            fillPresets(msg.presets || []);
            fillForm(msg.config);
            changed();
```

5d. Replace:

```js
    buildRows();
    document.body.addEventListener('input', changed);
    document.body.addEventListener('change', changed);
```

with:

```js
    buildRows();
    // Registered before the body listeners so the boxes are filled before the preview is requested
    $('preset').addEventListener('change', () => applyPreset($('preset').value));
    document.body.addEventListener('input', clearPreset);
    document.body.addEventListener('change', clearPreset);
    document.body.addEventListener('input', changed);
    document.body.addEventListener('change', changed);
```

(A `change` on the select fires its own listener first, then bubbles to `body`, where `clearPreset` ignores it and `changed` sends the preview.)

- [ ] **Step 6: Send presets from `src/SettingsPanel.ts`**

Add the import below `import { sanitizeConfig } from './styleConfig';`:

```ts
import { presetMessages } from './presets';
```

In `case 'ready'`, replace:

```ts
                await this._post({ type: 'init', config: readConfig(), fonts });
```

with:

```ts
                await this._post({ type: 'init', config: readConfig(), fonts, presets: presetMessages() });
```

In `case 'reset'`, replace:

```ts
                await this._post({ type: 'init', config: readConfig(), fonts: fontFamilies(await listSystemFonts()) });
```

with:

```ts
                await this._post({ type: 'init', config: readConfig(), fonts: fontFamilies(await listSystemFonts()), presets: presetMessages() });
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — `ℹ pass 38`, `ℹ fail 0` (includes `panel.js parses`).

- [ ] **Step 8: Manual check in Antigravity IDE**

```bash
npx --yes @vscode/vsce@latest package --out "$TEMP/ccs-dev.vsix"
"/c/Users/taing/AppData/Local/Programs/Antigravity IDE/bin/antigravity-ide.cmd" --install-extension "$TEMP/ccs-dev.vsix" --force
```

Reload the Antigravity window, run **Claude Style: Open Settings**, then confirm:
1. Preset menu shows `Choose a preset…`, a *Dark* group of 9 and a *Light* group of 3.
2. Pick *Catppuccin Mocha*: Color/Background/Border boxes fill, Font/Size/Weight/Italic/Underline are unchanged, preview turns peach/mauve.
3. Pick *Catppuccin Latte*: hint shows `For light editor themes`.
4. Type in any box: menu returns to `Choose a preset…`, hint clears.
5. Click **Apply**, reload: Claude Code chat shows the preset colours.

- [ ] **Step 9: Commit**

```bash
git add media/panel.html media/panel.css media/panel.js src/SettingsPanel.ts src/test/presets.test.ts out/SettingsPanel.js out/test/presets.test.js
git commit -m "Add preset menu to the settings page

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Screenshots, README, changelog, version 0.4.0

**Files:**
- Create: `tools/screenshot.js`
- Modify: `package.json` (`version`, `scripts`)
- Modify: `README.md`, `CHANGELOG.md`
- Output: `images/settings.png`, `images/preview.png`, `images/presets.png`

**Interfaces:**
- Consumes: compiled `out/cssBuilder.js` (`buildCss`, `chatFamilyList`), `out/styleConfig.js` (`sanitizeConfig`), `out/presets.js` (`PRESETS`, `presetElements`, `presetMessages`).
- Produces: `npm run screenshots`.

- [ ] **Step 1: Create `tools/screenshot.js`**

```js
// Renders the settings page outside the editor and saves the README screenshots.
// Usage: npm run screenshots   (Windows, needs Google Chrome)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const { buildCss, chatFamilyList } = require(path.join(root, 'out', 'cssBuilder.js'));
const { sanitizeConfig } = require(path.join(root, 'out', 'styleConfig.js'));
const { PRESETS, presetElements, presetMessages } = require(path.join(root, 'out', 'presets.js'));

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const work = path.join(os.tmpdir(), 'ccs-shots');
const images = path.join(root, 'images');

const THEMES = {
    dark: {
        'font-family': '"Segoe WPC", "Segoe UI", sans-serif', foreground: '#cccccc', 'editor-background': '#1f1f1f',
        descriptionForeground: '#9d9d9d', 'input-background': '#313131', 'input-foreground': '#cccccc',
        'input-border': '#3c3c3c', focusBorder: '#0078d4', 'button-background': '#0078d4', 'button-foreground': '#ffffff',
        'button-secondaryBackground': '#313131', 'button-secondaryForeground': '#cccccc', 'panel-border': '#2b2b2b',
        'sideBar-background': '#181818', 'widget-border': '#313131', 'textLink-foreground': '#4daafc',
        'textCodeBlock-background': '#2b2b2b',
    },
    light: {
        'font-family': '"Segoe WPC", "Segoe UI", sans-serif', foreground: '#3b3b3b', 'editor-background': '#ffffff',
        descriptionForeground: '#6f6f6f', 'input-background': '#ffffff', 'input-foreground': '#3b3b3b',
        'input-border': '#cecece', focusBorder: '#005fb8', 'button-background': '#005fb8', 'button-foreground': '#ffffff',
        'button-secondaryBackground': '#e5e5e5', 'button-secondaryForeground': '#3b3b3b', 'panel-border': '#e5e5e5',
        'sideBar-background': '#f8f8f8', 'widget-border': '#e5e5e5', 'textLink-foreground': '#005fb8',
        'textCodeBlock-background': '#f2f2f2',
    },
};

const PREVIEW_ONLY = 'body > h1, body > section:not(:last-of-type), .actions, section:last-of-type > h2, '
    + 'section:last-of-type > .hint { display: none !important; } body { padding: 16px; } #preview { max-width: none; }';

const FONTS = {
    all: ['JetBrains Mono', 'Cascadia Code', 'Consolas', 'Kantumruy Pro', 'Khmer OS Battambang', 'Khmer OS System'],
    khmer: ['Kantumruy Pro', 'Khmer OS Battambang', 'Khmer OS Siemreap', 'Khmer OS System', 'Khmer UI'],
};

function configFor(presetId) {
    const preset = PRESETS.find((p) => p.id === presetId);
    const elements = presetElements(preset.palette);
    elements.h1 = { ...elements.h1, size: 24, weight: 'bold' };
    elements.h2 = { ...elements.h2, size: 20 };
    elements.link = { ...elements.link, underline: true };
    return sanitizeConfig({ englishFont: 'JetBrains Mono', englishSize: 14, khmerFont: 'Khmer OS Battambang', khmerSize: 16, elements });
}

// Stands in for the extension host: answers the page's messages like SettingsPanel does
function shim(config) {
    const init = { type: 'init', config, fonts: FONTS, presets: presetMessages() };
    const preview = { type: 'previewCss', css: buildCss(config, '#preview .md'), family: chatFamilyList(config), size: config.englishSize };
    return `window.acquireVsCodeApi = () => ({
  postMessage(msg) {
    const reply = (data) => setTimeout(() => window.postMessage(data, '*'), 0);
    if (msg.type === 'ready') reply(${JSON.stringify(init)});
    if (msg.type === 'preview') reply(${JSON.stringify(preview)});
  },
  getState() {}, setState() {},
});`;
}

function writePage(name, config, theme, extraCss) {
    const vars = Object.entries(THEMES[theme]).map(([k, v]) => `--vscode-${k}: ${v};`).join(' ');
    const html = fs.readFileSync(path.join(root, 'media', 'panel.html'), 'utf8')
        .replace(/<meta http-equiv="Content-Security-Policy"[\s\S]*?>/, '')
        .replace('{{cssUri}}', 'panel.css')
        .replace('{{jsUri}}', 'panel.js')
        .replace(/\{\{\w+\}\}/g, '')
        .replace('</head>', `<style>:root { ${vars} } body { font-size: 13px; } ${extraCss}</style><script>${shim(config)}</script></head>`);
    const file = path.join(work, name + '.html');
    fs.writeFileSync(file, html);
    return file;
}

function shoot(file, image, width, height) {
    execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
        `--window-size=${width},${height}`, '--virtual-time-budget=4000',
        `--screenshot=${path.join(images, image)}`, 'file:///' + file.replace(/\\/g, '/'),
    ], { stdio: 'ignore' });
    console.log('wrote images/' + image);
}

fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(images, { recursive: true });
for (const f of ['panel.css', 'panel.js']) {
    fs.copyFileSync(path.join(root, 'media', f), path.join(work, f));
}

shoot(writePage('settings', configFor('dracula'), 'dark', ''), 'settings.png', 940, 1050);
shoot(writePage('preview', configFor('dracula'), 'dark', PREVIEW_ONLY), 'preview.png', 760, 1015);

writePage('mocha', configFor('catppuccin-mocha'), 'dark', PREVIEW_ONLY);
writePage('latte', configFor('catppuccin-latte'), 'light', PREVIEW_ONLY);
const pair = path.join(work, 'presets.html');
fs.writeFileSync(pair, `<!DOCTYPE html><html><body style="margin:0;background:#1f1f1f;font:14px 'Segoe UI',sans-serif;color:#ccc;display:flex">
${[['mocha', 'Catppuccin Mocha · dark editor theme'], ['latte', 'Catppuccin Latte · light editor theme']].map(([name, caption]) =>
    `<figure style="margin:0;width:720px"><figcaption style="padding:12px 16px 0">${caption}</figcaption>
<iframe src="${name}.html" style="border:0;width:720px;height:1010px"></iframe></figure>`).join('')}
</body></html>`);
shoot(pair, 'presets.png', 1440, 1045);
```

- [ ] **Step 2: Bump the version and add the script in `package.json`**

Change `"version": "0.3.1"` to `"version": "0.4.0"`, and add to `"scripts"` after `"test"`:

```json
    "screenshots": "npm run compile && node tools/screenshot.js"
```

(Remember the comma after the `"test"` line.)

- [ ] **Step 3: Generate the screenshots**

Run: `npm run screenshots`
Expected output:

```
wrote images/settings.png
wrote images/preview.png
wrote images/presets.png
```

Open each image with the Read tool and check: `settings.png` shows the Preset row above the table and ends before the Preview heading; `preview.png` shows the Dracula-coloured chat with no empty band at the bottom; `presets.png` shows Mocha on dark and Latte on light side by side, both fully rendered. If a page is cut too early or has a large empty band, adjust only that `shoot(...)` height and re-run.

- [ ] **Step 4: Update `README.md`**

4a. In **Features**, insert after the "Style every item in a reply" bullet (after its indented list line):

```markdown
- **Theme presets.** One click fills every colour from Dracula, Catppuccin (Latte, Frappé, Macchiato, Mocha), Nord, Gruvbox, One Dark or Tokyo Night.
```

4b. Insert a new section directly before `## Getting started`:

```markdown
## Presets

Pick a theme from the **Preset** menu above the style table. It fills in every colour box at once. You can still change any box afterwards, and nothing is saved until you click **Apply**.

| Dark | Light |
|---|---|
| Dracula · Catppuccin Frappé · Catppuccin Macchiato · Catppuccin Mocha · Nord · Gruvbox Dark · One Dark · Tokyo Night · Tokyo Night Storm | Catppuccin Latte · Gruvbox Light · Tokyo Night Day |

![Catppuccin Mocha on a dark editor theme next to Catppuccin Latte on a light editor theme](https://github.com/smith89k/claude-code-style/raw/HEAD/images/presets.png)

- Presets only change colours. Your fonts, sizes, weight, italic and underline stay as they are.
- The chat background follows your editor's colour theme, so pick a **light** preset if your editor theme is light, and a **dark** one if it is dark.
- Colours come from each theme's official open-source palette. Theme names belong to their authors, and this extension is not affiliated with them.
```

- [ ] **Step 5: Update `CHANGELOG.md`**

Insert directly below `# Changelog` (with a blank line on each side):

```markdown
## 0.4.0

- New **Preset** menu: fill every colour from Dracula, Catppuccin Latte / Frappé / Macchiato / Mocha, Nord, Gruvbox Dark / Light, One Dark or Tokyo Night / Storm / Day.
- Presets change only colours; fonts, sizes and other styles are kept.
- Light presets are marked "For light editor themes".
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS — `ℹ pass 38`, `ℹ fail 0`.

- [ ] **Step 7: Commit and push (README images are served from GitHub `main`)**

```bash
git add tools/screenshot.js package.json README.md CHANGELOG.md images/settings.png images/preview.png images/presets.png
git commit -m "Document presets, add screenshot tool, version 0.4.0

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push origin main
curl -s -o /dev/null -L -w "%{http_code}\n" https://github.com/smith89k/claude-code-style/raw/HEAD/images/presets.png
```

Expected: last line `200`.

---

### Task 4: Package, verify and publish 0.4.0

**Files:**
- Modify: `claude-code-style-0.3.1.vsix` → replaced by `claude-code-style-0.4.0.vsix` (tracked build artifact)

**Interfaces:**
- Consumes: everything above. Tokens `VSCE_PAT`, `OVSX_PAT` are Windows **user** environment variables; read them with `[Environment]::GetEnvironmentVariable(name, 'User')` in PowerShell and never print them.

- [ ] **Step 1: Package**

```bash
npx --yes @vscode/vsce@latest package --out claude-code-style-0.4.0.vsix
```

Expected: `DONE  Packaged: ...claude-code-style-0.4.0.vsix (22 files, ...)`, with `out/presets.js` in the file list and no `tools/`, `images/`, `src/` or `out/test/` entries.

- [ ] **Step 2: Verify README links in the package**

```bash
unzip -p claude-code-style-0.4.0.vsix extension/readme.md | grep -oE 'https?://[^) "]+' | sort -u | while read u; do printf "%s  %s\n" "$(curl -s -o /dev/null -L -w '%{http_code}' "$u")" "$u"; done
```

Expected: every line starts with `200`.

- [ ] **Step 3: Install into a throwaway profile and smoke-test activation**

```bash
T="$TEMP/ccs-verify"; rm -rf "$T"
code --extensions-dir "$T/ext" --user-data-dir "$T/data" --install-extension claude-code-style-0.4.0.vsix
code --extensions-dir "$T/ext" --user-data-dir "$T/data" --list-extensions --show-versions
```

Expected: `smith89k.claude-code-style@0.4.0`.

Then confirm the installed copy loads and exposes presets:

```bash
node -e "const d=require('fs').readdirSync(process.env.TEMP+'/ccs-verify/ext').find(n=>n.startsWith('smith89k.claude-code-style-0.4.0'));const p=require(process.env.TEMP+'/ccs-verify/ext/'+d+'/out/presets.js');console.log(p.presetMessages().length)"
```

Expected: `12`.

- [ ] **Step 4: Verify tokens (PowerShell)**

```powershell
$env:VSCE_PAT = [Environment]::GetEnvironmentVariable('VSCE_PAT','User'); $env:OVSX_PAT = [Environment]::GetEnvironmentVariable('OVSX_PAT','User')
npx --yes @vscode/vsce@latest verify-pat smith89k
npx --yes ovsx@latest verify-pat smith89k
```

Expected: `The Personal Access Token verification succeeded for the publisher 'smith89k'.` and `PAT valid to publish at smith89k`.

- [ ] **Step 5: Publish the same file to both stores (PowerShell, same session as Step 4)**

```powershell
npx --yes @vscode/vsce@latest publish --packagePath claude-code-style-0.4.0.vsix
npx --yes ovsx@latest publish claude-code-style-0.4.0.vsix
```

Expected: `DONE  Published smith89k.claude-code-style v0.4.0.` and `Published smith89k.claude-code-style v0.4.0`.

- [ ] **Step 6: Confirm both listings**

```bash
curl -s -X POST "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery" -H "Content-Type: application/json" -H "Accept: application/json;api-version=7.2-preview.1" -d '{"filters":[{"criteria":[{"filterType":7,"value":"smith89k.claude-code-style"}]}],"flags":1}' | grep -o '"version":"[^"]*"' | head -1
curl -s https://open-vsx.org/api/smith89k/claude-code-style | grep -o '"version":"[^"]*"' | head -1
```

Expected: both print `"version":"0.4.0"`. Open VSX may take a few minutes (security scan); poll every 30 s in the background until it does.

- [ ] **Step 7: Commit the package and tag the release**

```bash
git rm -q claude-code-style-0.3.1.vsix
git add claude-code-style-0.4.0.vsix
git commit -m "Release 0.4.0

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git tag v0.4.0
git push origin main --tags
```
