# Rules for this repo

For people and for AI tools (Claude, Copilot, Cursor and others). Read this before changing anything.

## What this is

**Simulation Routine**: a daily routine app for the Simulation team. Each person keeps their own day (time blocks, tasks, evening review), chooses whether the team can see it, and every day is kept as a record.

- `index.html` at the root is **the first design**. Do not change it. It is served unchanged at `/original/`.
- The new app is in `web/` (Vite, React, TypeScript), with Supabase for sign-in and data.
- Database changes go in `supabase/migrations/`, one file per change, never edited after they are applied.

## Themes

A theme is one CSS file of tokens in `web/src/themes/`. Each theme belongs to the person who made it: use anyone's, change only your own. See `web/src/themes/README.md`.

## Look

Checked by `npm run check:design` (fails the build):

- No gradients, no purple, violet or indigo, no glow shadows.
- Screens use theme tokens only; no colours written into `.tsx` files.
- Four type sizes (13, 16, 20, 28); nothing under 13px.
- No fixed capital letters; labels follow `--label-case`.
- No emoji, no em dashes.

Also, by review:

- One main (primary) button per screen. Rare or risky actions sit in Me, behind a confirm.
- Touch targets at least 44px. Check every screen at 390px wide before a pull request.
- Times and counts are picked from lists, never typed.

## Words

- A label is one to three words. No instructions inside input boxes.
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
- Run `npm run check` before pushing: types, tests, design rules.
