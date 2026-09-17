# Claude Code Style — Khmer/English fonts and chat text styles

Date: 2026-09-17
Status: approved in chat, awaiting spec review

## Goal

Let the user, from one settings page in Antigravity IDE (VS Code 1.104 fork):

1. Pick an **English font** and an **English size** from fonts installed on the system.
2. Pick a **Khmer font** and a **Khmer size**, independent of the English ones.
3. Style chat Markdown elements in the Claude Code view: **H1–H6, bold, italic,
   inline code, links**. Each element can set **font, size, color, weight, italic**.

Fonts apply to the **Claude Code chat** (text + code/tool boxes) and the
**integrated terminal**. The file editor is not touched.

## Constraints found during investigation

- Claude Code (`anthropic.claude-code` 2.1.274) has no font or style settings.
  Its webview reads `chat.fontFamily` / `chat.fontSize` (text) and
  `chat.editor.fontFamily` / `chat.editor.fontSize` (code, IN/OUT boxes).
  It live-reloads on family changes and on `chat.editor.fontSize`, but not on `chat.fontSize`.
- VS Code font settings accept one size for the whole family list, so Khmer
  cannot get its own size through settings alone.
- The webview loads `webview/index.css` from the Claude Code extension folder.
  Headings/bold have no custom rules today. CSP is `default-src 'none'` with
  inline styles allowed; `local()` fonts are not fetched, so they are expected
  to work (verify first — see Risks).
- Claude Code updates install into a new versioned folder, so any change to its
  CSS is lost on update.
- The terminal renders from a font-family list only; no CSS hooks.

## Approach

### Khmer size

- **Chat:** generated CSS defines an alias face per role:
  ```css
  @font-face {
    font-family: "CCS Khmer";
    src: local("<Khmer font full name>");
    unicode-range: U+1780-17FF, U+19E0-19FF;
    size-adjust: <khmerSize / englishSize * 100>%;
  }
  ```
  The chat font settings become `'<English font>', 'CCS Khmer', monospace`.
  Because `unicode-range` limits the alias to Khmer code points, English text
  always uses the English font. Any Khmer size works without files.
  Since `chat.fontFamily` is also shown by Antigravity's own chat, the alias is
  only meaningful inside Claude Code; elsewhere it falls through to the next
  family, so the real Khmer font is also listed after the alias.
- **Terminal:** the extension generates a resized copy of the chosen Khmer font
  (`<Font> CCS <pct>`) with a JavaScript font library (no Python), installs it
  per-user (copy to `%LOCALAPPDATA%\Microsoft\Windows\Fonts` + HKCU registry
  entry), and sets `terminal.integrated.fontFamily` to
  `'<English font>', '<Font> CCS <pct>', monospace`. Needs a full app restart the
  first time a new size is created; the page says so.
- The hand-made `Khmer OS System Small` from earlier stays installed; the new
  flow no longer depends on it.

### Element styles

Generated CSS, scoped to the Claude Code message container, e.g.
```css
/* >>> claude-code-style >>> */
... @font-face rules ...
.root_-a7MRw h1 { font-family: ...; font-size: 22px; color: #ffb86c; font-weight: 700; font-style: normal; }
.root_-a7MRw strong { ... }
.root_-a7MRw em { ... }
.root_-a7MRw code { ... }
.root_-a7MRw a { ... }
/* <<< claude-code-style <<< */
```
Only properties the user filled are written. The message container class
(`root_-a7MRw`) is a build hash; the injector discovers it at apply time by
finding the rule that sets `unicode-bidi:plaintext` on `p,li,h1…`, and falls back
to unscoped element selectors inside `#root` if not found.

## Components

| Unit | Purpose | Depends on |
|---|---|---|
| `src/styleConfig.ts` | Types + defaults for the saved config; read/write `claudeCodeStyle.*` settings | vscode |
| `src/cssBuilder.ts` | Pure: config → CSS string (font-faces, element rules, markers) | nothing |
| `src/systemFonts.ts` | List installed font families on Windows (registry via PowerShell), cached | child_process |
| `src/fontResizer.ts` | Make + install a resized Khmer font for the terminal | font library, fs, child_process |
| `src/claudeCssInjector.ts` | Find Claude Code extension folder(s), back up `index.css`, replace marked block, remove block | fs, vscode |
| `src/settingsApplier.ts` | Orchestrates: write chat/terminal settings, inject CSS, resize font | the above |
| `src/SettingsPanel.ts` | Webview UI: font dropdowns, size inputs, style table, preview, Apply / Reset | settingsApplier, systemFonts |
| `src/extension.ts` | Commands; on startup re-inject if the block is missing (e.g. after update) | the above |

### Saved config (`contributes.configuration`)

- `claudeCodeStyle.englishFont` (string), `claudeCodeStyle.englishSize` (number)
- `claudeCodeStyle.khmerFont` (string), `claudeCodeStyle.khmerSize` (number)
- `claudeCodeStyle.elements` (object): keys `h1`–`h6`, `bold`, `italic`, `code`,
  `link`; each `{ font?, size?, color?, weight?, italic? }`

### Commands

- `Claude Style: Open Settings` (existing)
- `Claude Style: Remove My Styles` — removes the CSS block, restores
  chat/terminal font settings to what they were before first apply (kept in
  the extension's `globalState` on first Apply).

## Data flow

1. Page opens → extension sends saved config + system font list to the webview.
2. User edits → preview updates live in the webview (same CSS builder output).
3. Apply → config saved → settings written → CSS injected → terminal font
   resized if needed → message tells the user whether to reload the window or
   restart the app.
4. Startup (`onStartupFinished`) → if saved config has element styles or a
   Khmer size and the marked block is missing in the current Claude Code
   folder → re-inject and show "Styles restored, reload window".

## Error handling

- Claude Code not installed / `index.css` not found → show a clear message;
  fonts still apply.
- CSS file not writable → message with the reason; nothing half-written
  (write to temp file, then rename).
- Font file missing or cannot be resized → skip terminal Khmer sizing, say so.
- Color inputs validated as hex; sizes clamped 6–100.

## Testing

- Unit tests (node test runner) for `cssBuilder` (empty config → only markers;
  partial fields; size-adjust math; escaping of font names) and for the
  injector's block replace/remove on sample CSS text.
- Webview script parse check (as done today).
- Manual check in Antigravity: Khmer vs English size, a styled H1/bold, update
  simulation by removing the block and restarting.

## Risks

- **`local()` + `size-adjust` under the webview CSP** — verify first with a
  one-off injected rule before building the rest. Fallback: generated resized
  font for chat too (listed by family name, no `@font-face`).
- Claude Code class names change between versions → selector discovery with
  unscoped fallback.
- Editing another extension's files is unsupported by Claude Code; the
  Remove command and backups keep it reversible.

## Out of scope

- macOS / Linux font listing and install.
- Styling the file editor.
- Themes/presets beyond the existing preset buttons.

## Addendum 2026-09-18 — full element coverage

At the user's request the style table covers every item Claude Code renders in
replies: `text, h1–h6, bold, italic, strike, link, code, codeBlock, list,
bullet, quote, tableHeader, tableCell, divider`. Each item may also set
`background`, `border` (color) and `underline`. "Code snippet" now targets only
inline code (`:not(pre) > code`); "Code block" styles `pre code` (text) and
`pre` (background, border). Border meaning per item: code/codeBlock = 1px box,
quote = 3px left bar, table = border color, divider = top line. Inputs that do
not apply to an item are disabled on the page.
