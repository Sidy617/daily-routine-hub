# Themes

A theme is one CSS file of tokens. Anyone in the team can make one, and anyone can pick any theme in **Me > Theme**. The choice is saved to your account, so it follows you to every device.

| Theme | By | Look |
|---|---|---|
| `meulic` | Meulic | Glass over a sky that follows the sun through the day; stars on dark nights; your colour as the tint; light or dark with the device |
| `white` | Meulic | Pure white, cards with fine edges, only the sun's light moving over it; always light |
| `original` | The first design | Dark with cyan, monospace times, capital labels; always dark |

The size of everything (85% to 120%) is not part of a theme: each person sets it per device in **Me > Appearance > Size**.

## The sun

The sun rises at the left at 06:15, is highest at 12:30 and sets at the right at 18:45; the moon takes the same path by night. Through the day the sky passes seven phases, `night`, `dawn`, `morning`, `noon`, `afternoon`, `sunset` and `dusk`, and `components/Wallpaper.tsx` blends the two it is between, once a minute (`lib/sky.ts` has the times).

A theme joins in by giving each phase its colours, `--phase-<phase>-top`, `-horizon`, `-sun` and `-glow`, then using the blends `--sky-top`, `--sky-horizon`, `--sky-sun`, `--sky-glow`: in `--wallpaper`, on the `.sky-sun` layer, and on `.sky-stars` (with `[data-sun='down']` for night). The `.sky-sun` layer reaches 35% above the screen so the sun can rise in without its edge showing; draw the sun there at `var(--sun-at)` with a fixed size, as Meulic does (`circle 64vmax at var(--sun-at)`). `--sun-x` and `--sun-y` are the sun's place on the screen itself. Meulic uses all of them; White only `-sun`; Original none, so its sky stays as it was.

## Make your own

1. Copy `meulic.css` to `yourname.css`.
2. Change the selector to `:root[data-theme-id='yourname']` and set the tokens. Add `.dark` rules if it follows the device's dark mode.
3. Import it in `styles/app.css` and add an entry to `THEMES` in `index.ts`: id, name, `by`, a short note, its dark mode (`device`, `always` or `never`), and the colours its preview card shows. If it is never dark, add it to the early script in `web/index.html` too.
4. Open a pull request with a phone screenshot of Today and Team.

Your theme is yours: others may use it but do not edit it without asking you.

## Tokens

| Token | What it colours |
|---|---|
| `--wallpaper` | the sky behind everything (gradients are allowed here); see The sun above |
| `--phase-<phase>-top`, `-horizon`, `-sun`, `-glow` | the colours of each phase of the day; Meulic's two drifting lights (`.wallpaper::before`, animation `sky-drift`) use `-glow` and `-sun` |
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
