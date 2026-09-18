# Colour presets for the text style table

Date: 2026-09-18
Status: approved in chat, awaiting spec review

## Goal

Let the user fill the colour boxes of the *Text styles* table with one click
from a well-known open-source theme, then tweak or Apply as usual.

## Scope

- Presets change only the **Color**, **Background** and **Border / line**
  boxes. Font, size, weight, italic and underline boxes are left as they are.
- Picking a preset does not save anything. The user still clicks **Apply**.
- Colours reach only the Claude Code chat panel (the marked block in its
  `webview/index.css`), like every element style today. No editor theme,
  panel background, terminal or font setting is touched by a preset.
- Only openly licensed palettes. **Dracula Pro is excluded** (paid,
  proprietary); the free Dracula palette is used instead.

## Presets (12)

| Group | Preset | Palette source (MIT) |
|---|---|---|
| Dark | Dracula | draculatheme.com/contribute |
| Dark | Catppuccin Frappé | github.com/catppuccin/palette |
| Dark | Catppuccin Macchiato | github.com/catppuccin/palette |
| Dark | Catppuccin Mocha | github.com/catppuccin/palette |
| Dark | Nord | nordtheme.com/docs/colors-and-palettes |
| Dark | Gruvbox Dark | github.com/morhetz/gruvbox |
| Dark | One Dark | github.com/atom/atom (packages/one-dark-syntax) |
| Dark | Tokyo Night | github.com/folke/tokyonight.nvim |
| Dark | Tokyo Night Storm | github.com/folke/tokyonight.nvim |
| Light | Catppuccin Latte | github.com/catppuccin/palette |
| Light | Gruvbox Light | github.com/morhetz/gruvbox |
| Light | Tokyo Night Day | github.com/folke/tokyonight.nvim |

Every hex value is copied from the listed source during implementation and
checked there, not written from memory.

## Palette roles

Each preset defines exactly 12 roles, taken from its official palette:

| Role | Meaning | Example (Catppuccin Mocha) |
|---|---|---|
| `text` | main foreground | text `#cdd6f4` |
| `muted` | comment / dim text | overlay1 `#7f849c` |
| `surface` | raised background (inline code, table header) | surface0 `#313244` |
| `deep` | darker background (code block) | mantle `#181825` |
| `line` | borders and rules | surface2 `#585b70` |
| `purple` | accent | mauve `#cba6f7` |
| `blue` | accent | blue `#89b4fa` |
| `cyan` | accent | sky `#89dceb` |
| `green` | accent | green `#a6e3a1` |
| `yellow` | accent | yellow `#f9e2af` |
| `orange` | accent | peach `#fab387` |
| `pink` | accent | pink `#f5c2e7` |

A theme with no colour of that hue uses its nearest official accent
(e.g. Nord `pink` → nord15 purple). Each such choice is noted in a comment.

## Shared mapping (roles → table rows)

| Row | Color | Background | Border |
|---|---|---|---|
| Normal text | text | – | – |
| Heading 1 | orange | – | – |
| Heading 2 | purple | – | – |
| Heading 3 | blue | – | – |
| Heading 4 | cyan | – | – |
| Heading 5 | green | – | – |
| Heading 6 | muted | – | – |
| Bold | pink | – | – |
| Italic text | yellow | – | – |
| Crossed-out | muted | – | – |
| Link | blue | – | – |
| Code snippet | green | surface | line |
| Code block | text | deep | line |
| List item | text | – | – |
| Bullet / number | purple | – | – |
| Quote | muted | – | purple |
| Table header | blue | surface | line |
| Table cell | text | – | line |
| Divider line | – | – | line |

"–" means the preset clears that box, so a preset always gives the same
result no matter what was in the boxes before.

## Components

| Unit | Purpose | Depends on |
|---|---|---|
| `src/presets.ts` (new) | Palette data (`PRESETS`: id, label, group `dark`/`light`, roles) and `presetElements(roles)` → colour fields per `ElementKey` | `styleConfig` types |
| `src/SettingsPanel.ts` | Sends `presets` (id, label, group, elements) in the `init` message | presets |
| `media/panel.html` | `<select id="preset">` above the table, with `<optgroup>` Dark / Light | – |
| `media/panel.js` | On change: write `color`/`background`/`border` of each row (and the colour pickers), then trigger preview. Any manual input resets the select to "Choose a preset…" | – |
| `media/panel.css` | Small layout rule for the preset row | – |

Light presets show the hint "for light editor themes" next to the select
when selected, because the chat background follows the editor theme.

## Data flow

1. Page opens → `init` carries config, fonts and presets.
2. User picks a preset → colour boxes filled → existing `preview` message →
   preview CSS updates.
3. User clicks Apply → unchanged existing path.

## Error handling

Presets are static data validated by tests; no runtime failure paths. The
mapping never sets a field the page disables for that row (e.g. Bullet
background, Divider color); a test checks this against the page's
`NO_TEXT` / `NO_BACKGROUND` / `HAS_BORDER` lists.

## Testing

Unit tests (`src/test/presets.test.ts`, node test runner):
- 12 presets, unique ids, groups only `dark`/`light`.
- Every preset defines all 12 roles as `#rrggbb`.
- `presetElements` output passes `sanitizeConfig` unchanged for every preset.
- Mapping spot checks (e.g. Mocha h1 = peach, code background = surface0).

Webview script parse check still passes. Manual check in the editor:
pick Mocha, then Latte, confirm preview and Apply.

## Release

Version 0.4.0. README gets a "Presets" section with one screenshot showing
two presets side by side; CHANGELOG entry; publish to VS Code Marketplace
and Open VSX after the same pre-publish checks as 0.3.1.

## Out of scope

- Saving user-made presets.
- Changing the chat panel background or the editor colour theme.
- Paid themes (Dracula Pro, Monokai Pro, Material Theme).
