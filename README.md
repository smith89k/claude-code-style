# Claude Code Style

Choose your own **English and Khmer fonts and sizes**, and style every kind of text in the **Claude Code** chat panel: headings, bold, links, code, quotes, tables and more.

Khmer text often looks too small next to English at the same size. This extension gives Khmer its **own size**, so both languages read comfortably side by side in the chat and in the terminal.

> Unofficial community extension. Not made by or affiliated with Anthropic.

![Claude Code chat preview with custom English and Khmer fonts and coloured headings](https://github.com/smith89k/claude-code-style/raw/HEAD/images/preview.png)

## Features

- **Separate English and Khmer fonts.** Pick any font installed on your computer for each language.
- **Separate English and Khmer sizes.** Khmer can be larger or smaller than English. English text is never affected.
- **Style every item in a reply.** Set the font, size, colour, background, border, weight, italic and underline for:
  normal text, headings 1–6, bold, italic, crossed-out, links, inline code, code blocks, list items, bullets and numbers, quotes, table headers, table cells and divider lines.
- **Live preview.** A mock Claude Code chat updates as you type, so you can see the result before you apply it.
- **Terminal support.** Your fonts also apply to the integrated terminal, including the separate Khmer size.
- **Survives Claude Code updates.** When Claude Code updates, your styles are added back automatically at startup.
- **One-click undo.** *Remove My Styles* restores the chat and terminal font settings you had before.

## Settings page

![The Claude Style Settings page with font pickers and the text style table](https://github.com/smith89k/claude-code-style/raw/HEAD/images/settings.png)

Leave any box empty to keep Claude Code's normal look for that item. Boxes that don't apply to an item are greyed out.

## Getting started

1. Install [Claude Code](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code) and this extension.
2. Open the Command Palette (`Ctrl+Shift+P`) and run **Claude Style: Open Settings**.
3. Pick your English and Khmer fonts and sizes, then style any items you want.
4. Click **Apply**, then **Reload Window** when asked.

If you changed the Khmer size, a resized copy of your Khmer font is installed for the terminal. **Close and reopen the editor** the first time to see it there.

## Commands

| Command | What it does |
|---|---|
| `Claude Style: Open Settings` | Opens the settings page with live preview. |
| `Claude Style: Remove My Styles` | Removes all styles and restores your previous chat and terminal font settings. |

## Extension settings

You normally change these from the settings page, but they can also be edited in `settings.json`.

| Setting | Default | Description |
|---|---|---|
| `claudeCodeStyle.englishFont` | `JetBrains Mono` | Font for English text. |
| `claudeCodeStyle.englishSize` | `14` | Size in px for English text (6–100). |
| `claudeCodeStyle.khmerFont` | `Khmer OS System` | Font for Khmer text. |
| `claudeCodeStyle.khmerSize` | `14` | Size in px for Khmer text (6–100). |
| `claudeCodeStyle.elements` | `{}` | Styles per chat item. Each item takes `font`, `size`, `color`, `background`, `border`, `weight`, `italic`, `underline`. |

Example:

```json
"claudeCodeStyle.elements": {
  "h1":   { "size": 24, "color": "#ffb86c", "weight": "bold" },
  "bold": { "color": "#ff79c6" },
  "code": { "background": "#44475a", "border": "#6272a4" }
}
```

## What this extension changes

Please read this before installing.

- **Your editor settings.** Applying writes these user settings: `chat.fontFamily`, `chat.fontSize`, `chat.editor.fontFamily`, `chat.editor.fontSize`, `terminal.integrated.fontFamily` and `terminal.integrated.fontSize`. Your original values are saved first and restored by *Remove My Styles*.
- **Claude Code's stylesheet.** Claude Code has no style settings, so this extension adds a clearly marked block to Claude Code's `webview/index.css`. A backup is saved next to it (`index.css.ccs-backup`). Anthropic does not support changes to its files. If the chat ever looks wrong, run *Remove My Styles*.
- **A user font (terminal only).** When the Khmer size differs from the English size, a resized copy of your Khmer font is installed for your Windows user account only, because the terminal cannot size one language separately.

## Requirements

- VS Code 1.80 or later, or an editor built on VS Code (tested in Antigravity).
- The [Claude Code](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code) extension, for chat styles. Without it, only the fonts are applied.
- **Windows.** Listing installed fonts and installing the resized terminal font currently work on Windows only.

## Known limitations

- A **window reload** is needed after applying, because Claude Code does not pick up every change live.
- Claude Code updates can rename its internal styles. The extension adapts automatically, but a large update may leave some items unstyled until this extension is updated.
- macOS and Linux are not supported yet.

## Feedback

Found a bug or want a feature? [Open an issue](https://github.com/smith89k/claude-code-style/issues).

## License

[MIT](LICENSE)
