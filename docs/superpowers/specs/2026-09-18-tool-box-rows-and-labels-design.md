# Tool box rows and preview-matching labels

Date: 2026-09-18
Status: approved in chat, awaiting spec review

## Goal

1. Let the user style Claude Code's **tool box** (the "Bash · List source
   files" header and its IN / OUT rows), not only the reply text.
2. Make every row of the *Text styles* table easy to find in the preview:
   clear names, two groups, the exact preview text in brackets, and a
   highlight on the preview when a row is hovered or focused.

## Row labels

Rule: text in brackets is copied **exactly** from the preview panel
(`media/panel.html`), and may be the start of a longer line. When a row
covers several places, they are separated by `, `. Rows with no text of their
own (Divider line, Tool box) have no brackets. Headings have no brackets
(the preview already says "Heading 1").

The bracket part is shown dimmer than the name.

**Claude's reply**

| Key | Name | Brackets |
|---|---|---|
| `text` | Normal text | This is normal text |
| `h1`…`h6` | Heading 1 … Heading 6 | – |
| `bold` | Bold | bold · ដិត |
| `italic` | Italic | italic · ទ្រេត |
| `strike` | Crossed-out | crossed-out · លុបចោល |
| `link` | Link | link · តំណភ្ជាប់ |
| `code` | Inline code | inline code |
| `codeBlock` | Code block | function hello(name) |
| `list` | List item | List item · ធាតុបញ្ជី |
| `bullet` | Bullet / number | •, 1., 2. |
| `quote` | Quote | A quote from the docs |
| `tableHeader` | Table header | Setting · ការកំណត់, Value |
| `tableCell` | Table cell | English font, JetBrains Mono |
| `divider` | Divider line | – |

**Tool box**

| Key (new) | Name | Brackets |
|---|---|---|
| `toolName` | Tool name | Bash |
| `toolDescription` | Tool description | List source files |
| `toolBox` | Tool box | – |
| `toolLabel` | IN / OUT label | IN, OUT |
| `toolContent` | IN / OUT content | ls src/, cssBuilder.ts |

Only the displayed names change. Existing setting keys stay the same, so
saved `claudeCodeStyle.elements` values keep working.

## Groups

The table body gets two group header rows, "Claude's reply" and "Tool box",
spanning all columns. Group rows have no `data-key`; every place in
`panel.js` that walks style rows uses `tr[data-key]`.

## Which boxes apply

| Key | Text boxes | Background | Border |
|---|---|---|---|
| `toolName` | yes | no | no |
| `toolDescription` | yes | no | no |
| `toolBox` | no | yes | yes |
| `toolLabel` | yes | no | no |
| `toolContent` | yes | no | no |

`panel.js`: `NO_TEXT` += `toolBox`; `NO_BACKGROUND` += `toolName`,
`toolDescription`, `toolLabel`, `toolContent`; `HAS_BORDER` += `toolBox`.

## CSS targets

Claude Code (2.1.276) tool box classes carry a build hash
(`toolBodyRowLabel_ZUQaOA`). Tool rules match the fixed prefix with an
attribute selector, so they survive Claude Code updates:

| Key | Text selectors | Box | Border (kind) |
|---|---|---|---|
| `toolName` | `[class*="toolNameText_"]` | – | – |
| `toolDescription` | `[class*="toolNameTextSecondary_"]`, `[class*="toolNameTextSecondaryPlaintext_"]` | – | – |
| `toolBox` | – | `[class*="toolBody_"]` | `[class*="toolBody_"]`, `[class*="toolBodyRow_"]` (`color`) |
| `toolLabel` | `[class*="toolBodyRowLabel_"]` | – | – |
| `toolContent` | `[class*="toolBodyRowContent_"]` and its `pre`, `code` | – | – |

The trailing `_` keeps prefixes apart (`toolNameText_` does not match
`toolNameTextSecondary_…`; `toolBody_` does not match `toolBodyRow_…`).

- **Scope.** Reply rules keep the discovered message scope. Tool rules use
  a separate tool scope: none (bare selectors) in Claude Code's CSS, and
  `#preview` in the preview. `buildCss(cfg, scope, toolScope = '')`.
- **Winning.** Attribute selectors have the same specificity as Claude
  Code's class selectors, and our block is at the end of `index.css`, so it
  wins. `toolContent` also sets `pre`/`code` because Claude Code sizes them
  with `.85em` there.
- **IN / OUT opacity.** Claude Code draws labels at `opacity: .5`. When
  `toolLabel` has a colour, the rule also writes `opacity: 1`.

## Preview

The preview's mock tool box keeps its layout classes and **also** gets the
Claude Code class prefixes, e.g. `class="tool-label toolBodyRowLabel_preview"`,
so the preview is styled by exactly the selectors written into Claude Code:

| Mock element | Added class |
|---|---|
| `.tool-name b` (Bash) | `toolNameText_preview` |
| `.tool-sub` (List source files) | `toolNameTextSecondaryPlaintext_preview` |
| `.tool-body` | `toolBody_preview` |
| `.tool-row` | `toolBodyRow_preview` |
| `.tool-label` | `toolBodyRowLabel_preview` |
| `.tool-content` | `toolBodyRowContent_preview` |

## Highlight

Hovering a row, or focusing any input in it, adds `ccs-highlight`
(`outline: 2px dashed var(--vscode-focusBorder); outline-offset: 2px`) to the
preview elements that row styles; leaving removes it.

The selectors come from the host, not a second list in `panel.js`:
`previewSelectors(): Record<ElementKey, string>` in `cssBuilder.ts` returns,
per key, the row's text + box selectors (border selectors when there are
none), scoped for the preview, with pseudo-elements removed
(`li::marker` → `li`). Sent in the `init` message as `highlights`.

## Presets

`src/presets.ts` mapping gains:

| Key | Color | Background | Border |
|---|---|---|---|
| `toolName` | text | – | – |
| `toolDescription` | blue | – | – |
| `toolBox` | – | deep | line |
| `toolLabel` | muted | – | – |
| `toolContent` | text | – | – |

## Components

| Unit | Change |
|---|---|
| `src/styleConfig.ts` | `ElementKey` + `ELEMENT_KEYS` gain the 5 tool keys (after `divider`) |
| `src/cssBuilder.ts` | Tool targets, `toolScope` parameter, label opacity, `previewSelectors()` |
| `src/presets.ts` | 5 new mapping entries |
| `src/SettingsPanel.ts` | Preview CSS built with tool scope `#preview`; `init` carries `highlights` |
| `media/panel.html` | Claude Code classes on the mock tool box |
| `media/panel.js` | `LABELS` as `[name, brackets]`, group rows, `tr[data-key]`, new disabled-box lists, highlight |
| `media/panel.css` | Group row, dim bracket text, `.ccs-highlight` |
| `package.json` | `claudeCodeStyle.elements` description lists the new keys |

## Testing

- `cssBuilder`: tool rules use the attribute selectors, bare in real CSS and
  under `#preview` in the preview; `toolLabel` colour adds `opacity: 1`;
  `toolContent` covers `pre` and `code`; `previewSelectors` strips `::marker`.
- `presets`: existing tests extended to 24 keys; disabled-box test covers the
  new lists.
- Labels: every bracket part (split on `, `) appears in the preview text of
  `panel.html`; the bullet parts `•`, `1.`, `2.` are checked instead by the
  preview having a `<ul>` and an `<ol>` with at least two items.
- Preview: `panel.html` contains each Claude Code class prefix used by the
  tool targets.
- Webview script parse check and `KEYS` = `ELEMENT_KEYS` still pass.
- Headless-Chrome UI check: hover highlights, group rows present, a preset
  fills tool rows.
- Manual check in Antigravity (the class names above were read from Claude
  Code's stylesheet, not seen on a live tool box): apply a preset, reload,
  run any Bash command in Claude Code, and confirm the tool name, IN / OUT
  labels, content and box take the preset colours.

## Release

Version 0.5.0. README: rename rows in the settings text, mention tool box
styling and the highlight; new screenshots; CHANGELOG entry; publish to
VS Code Marketplace and Open VSX after the usual pre-publish checks.

## Out of scope

- Styling the user message bubble and the "Ask Claude" input box.
- Tool boxes of other layouts (permission prompts, diffs).
