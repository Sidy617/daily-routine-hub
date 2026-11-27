# Themes

A theme is one CSS file of tokens. Anyone in the team can make one, and anyone can pick any theme in **Me > Theme**. The choice is saved to your account, so it follows you to every device.

| Theme | By | Look |
|---|---|---|
| `meulic` | Meulic | Glass over a sky that follows the time of day; your colour as the tint; light or dark with the device |
| `original` | The first design | Dark with cyan, monospace times, capital labels; always dark |

## Make your own

1. Copy `meulic.css` to `yourname.css`.
2. Change the selector to `:root[data-theme-id='yourname']` and set the tokens. Add `.dark` rules if it should change at night.
3. Import it in `styles/app.css` and add an entry to `THEMES` in `index.ts`: id, name, `by`, a short note, whether it follows the device's dark mode, and the colours its preview card shows.
4. Open a pull request with a phone screenshot of Today and Team.

Your theme is yours: others may use it but do not edit it without asking you.

## Tokens

| Token | What it colours |
|---|---|
| `--wallpaper` | the sky behind everything (gradients are allowed here); vary it with `[data-daypart='dawn'/'day'/'dusk'/'night']` |
| `--glow-1`, `--glow-2` | Meulic's two lights that drift over the sky on `.wallpaper::before` (animation `sky-drift` in app.css); a theme without them has a still sky |
| `--bg` | fallback ground and the browser bar |
| `--ink`, `--ink-2`, `--ink-3` | main text; every secondary text; placeholders, arrows and disabled controls only |
| `--line`, `--fill` | hairlines; quiet fills for fields and controls |
| `--tint`, `--tint-fill`, `--tint-ink` | the action colour as text, icons and rings; the same colour as a fill under text; the text on that fill. Meulic uses the person's colour (`--person`), darkened where it would be too light and brightened as text in dark mode, so check yours at 4.5:1 in light and dark |
| `--danger`, `--success` | delete, switches that are on |
| `--glass`, `--glass-strong`, `--glass-border`, `--glass-blur`, `--glass-sat`, `--glass-shadow` | the frosted cards, sheets and menus |
| `--glass-rim`, `--glass-tint`, `--glass-tint-frosted`, `--glass-highlight`, `--glass-foreground` | the liquid-glass tabs (from 21st.dev) |
| `--r-card`, `--r-ctl` | corner radius of cards and of controls |
| `--font`, `--font-display`, `--font-numeric` | text, titles, times and numbers |
| `--label-case`, `--title-case` | `none` or `uppercase` |
| `--grain` | how much film grain lies over the sky (0 for none) |

Layout and words are not part of a theme: they live in the components and screens, and follow the rules in `AGENTS.md`.
