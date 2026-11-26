# Themes

A theme is one CSS file of tokens. Anyone in the team can make one, and anyone can pick any theme in **Me > Theme**. The choice is saved to your account, so it follows you to every device.

| Theme | By | Look |
|---|---|---|
| `meulic` | Meulic | Calm, white, black actions, dark when the phone is dark |
| `original` | The first design | Dark with cyan, monospace times, capital labels |

## Make your own

1. Copy `meulic.css` to `yourname.css`.
2. Change the selector to `:root[data-theme-id='yourname']` and set the tokens.
3. Import it and add one line to `THEMES` in `index.ts`: id, name, `by`, a short note, and three swatches.
4. Open a pull request with a phone screenshot of Today and Team.

Your theme is yours: others may use it but do not edit it without asking you.

## Tokens

| Token | What it colours |
|---|---|
| `--bg` | page ground |
| `--surface`, `--surface-2` | cards, and quiet fills like segmented controls |
| `--line` | dividers and borders |
| `--ink`, `--mute` | main text, quieter text |
| `--time` | block times |
| `--primary-bg`, `--primary-ink` | the main button (one per screen) |
| `--done`, `--done-ink`, `--half` | ticked and half-done marks |
| `--danger`, `--focus` | delete, keyboard focus ring |
| `--radius`, `--radius-lg`, `--shadow` | corners and lift |
| `--font`, `--font-num` | text font, numbers and times |
| `--label-case`, `--title-case`, `--title-weight` | `none` or `uppercase`; title weight |

Layout and words are not part of a theme: they live in `styles/base.css` and the screens, and follow the rules in `AGENTS.md`.
