# Rules for this repo

For people and for AI tools (Claude, Copilot, Cursor and others). Read this before changing anything.

## What this is

**Simulation Routine**: a daily routine app for the Simulation team. Each person keeps their own day (time blocks, tasks, evening review), chooses whether the team can see it, and every day is kept as a record.

- `index.html` at the root is **the first design**. Do not change it. It is served unchanged at `/original/`.
- The new app is in `web/` (Vite, React 19, TypeScript, Tailwind 4, Motion), with Supabase for sign-in and data.
- UI pieces follow shadcn conventions in `web/src/components/ui`, so components from shadcn or 21st.dev can be added with `npx shadcn add`. Read any downloaded component before using it, and note where it came from at the top of the file.
- Database changes go in `supabase/migrations/`, one file per change, never edited after they are applied.

## Themes

A theme is one CSS file of tokens in `web/src/themes/`. Each theme belongs to the person who made it: use anyone's, change only your own. See `web/src/themes/README.md`.

## Look: Apple-like, calm, glass

The direction (Meulic): a sky that follows the time of day with slow drifting lights, frosted glass over it, one tint (the person's own colour), the type sizes most apps use, smooth motion.

Checked by `npm run check:design` (fails the build):

- Screens use theme tokens and Tailwind classes only; no colours written into `.tsx` files (the logo and the share picture are drawings and are exempt).
- Gradients only in theme files (the sky). No purple, violet or indigo.
- Type sizes: `text-large`, `text-title`, `text-head`, `text-body`, `text-sub`, `text-cap`. On phones body is 16px, second lines 14px, captions 12px (between Apple's 17pt body and Material's 16sp); laptops one step smaller. Nothing under 11px (Apple's minimum).
- No fixed capital letters; use `label-case` and `title-case` so each theme decides.
- No emoji, no em dashes.
- Text stays readable in light, dark and Original (found in dark mode, 27 Nov 2026):
  - White text on your colour sits on `bg-tint-fill`; `text-tint` and `bg-tint` are the colour for text, rings and dots, which brightens in dark mode.
  - Secondary text is `text-ink-2`. `text-ink-3` is only for placeholders, arrows and disabled controls.
  - Tinted controls turn grey when disabled (`disabled:text-ink-3`); a faded tint reads as black on dark glass.
  - Someone's own colour (rings, bars, calendar squares) goes through `personStyle()` and `var(--mark)` or `var(--heat)`, never as picked: some colours are too light on white, others too dark on black.

Also, by review:

- Few buttons. Actions live where you need them: a sheet, a menu, or a "+" beside the tab bar. Things save as you type; only sheets that change several things at once have Save.
- Sheets for editing (they slide up on phones), pop-up menus for choices, toasts for "saved". Never a page of bordered buttons.
- Motion is short and springy, and off when the device asks for reduced motion.
- Touch targets at least 40px. Check every screen at 390px wide and on a laptop before a pull request.
- Times and counts are picked from lists, never typed.

## Words

- A label is one to three words. Placeholders are short hints, not instructions.
- No praise or advice the app made up. Show only what the records say; say plainly when there is no record.

## Safety

- Row rules (RLS) on every table, from the migration that creates it.
- Each person writes only their own rows; teammates read only what a person shares.
- Test new rules with a second account that must fail to change someone else's day.
- Only the publishable key lives in the code (`web/src/lib/config.ts`). Never commit a secret or service key.
- Check that every package an AI suggests really exists before installing it.

## Working together

- Draw or describe a screen and agree on it before building it.
- One change per pull request; someone else reviews it.
- Put a phone screenshot in every pull request that changes a screen.
- Never merge code you cannot explain.
- Run `npm run check` before pushing: types, tests, design rules, and the live database check (every table, link, column and action the app uses must exist).
- Walks with made-up answers never prove the database; the live check does.
