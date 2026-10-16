# AGENTS.md — KpopIt design system (for Codex / any coding agent)

You are working with the KpopIt design system. **Puff Pop is the default style.** Retro-Pop (the previous dark neon look) is kept only for rollback, behind `data-style="retro"` (`tokens/retropop.css`).

The project-level rules live in `kpopit-frontend/DESIGN.md`. If a value there disagrees with `tokens/*.css`, the token file wins.

## Read first
1. `README.md` — product context, content voice, Puff Pop rules (pink roles, lettering recipe, puffy vs Major Mono, night rules), iconography, CDN image paths.
2. `tokens/puffpop.css` — every Puff Pop colour role, radius, offset shadow, puffy text-shadow preset, motion token and keyframe, for day (`:root` / `data-theme="day"`) and night (`data-theme="night"`). `tokens/*.css` + `tokens/tokens.json` hold the shared palette, type and spacing.
3. `components/puffpop/` — the Puff Pop parts: PuffNav, PuffTitle, PuffSearch, FilterButton, FilterMenu, AppliedChip, IdolCard, AlbumCard, EmptyState, BackButton, SlideSearch, CutoutName, GroupTag, ProfileTabs, ProfileTile, RelatedBand, RelatedCard. Each has `.jsx` + `.d.ts` + `.prompt.md` + a `*.card.html` specimen.
4. `ui_kits/puffpop/` — the reference page (catalogue + idol profile). Match its spacing and behaviour.
5. `guidelines/` — specimens for colours, type, spacing, shadows, tilt, motion.

## Target stack
React 19 + Tailwind 4 (`kpopit-frontend/`). Port `tokens/puffpop.css` into `src/index.css` and map the tokens used in markup into Tailwind's `@theme`. Rebuild parts as TSX + Tailwind in `src/components/puffpop/` with all states (rest/hover/press/focus/disabled, day/night) — do not ship the reference CSS as-is unless asked.

## Rules
- **Tokens only** — no hex literals in components. Theme via `data-theme="day|night"` on the root.
- **Fonts:** DynaPuff (display, titles, buttons, card names), Major Mono Display (small labels, counters, eyebrows — uppercase, tracked), Caveat (one handwritten aside per view at most), Noto Sans KR (every Hangul string). No others. Loaded from Google Fonts (`tokens/fonts.css`).
- **Puffy lettering** for names and titles only, via the presets (`--puff-title`, `--puff-value`, `--puff-name-*`, …) — never hand-rolled. Section headers are never puffy.
- **Objects:** white face on a pink body, 2px `var(--ink)` outline, SOLID offset shadow from the `--off-*` scale (colour from `--ctl-off`, so it turns pink at night). No blurry card shadows; blur only for modal backdrops.
- **Press-down:** hover lifts 1px to a bigger offset; active translates into the shadow and drops to `--off-flat`.
- **Tilt:** objects ±0.5° alternating in grids, titles -1.5°, tags 4°, logo -5°. Never tilt inputs or body text.
- **Pink:** one `--sig` element per view. Small pink text on cream is `#C62368`; never grey text on pink.
- **Contrast:** body text ≥ 4.5:1.
- **Images:** `https://cdn.kpopit.net/images/{idols|groups|albums}/<name>.webp` — always by CDN URL; there are no local copies. Fonts load from Google Fonts via `tokens/fonts.css`, the same way the frontend loads them.
- **Motion:** transform/opacity only, `--ease-settle` / `--ease-sweep`, respect `prefers-reduced-motion`.
- **New values** (colours, radii, shadows) are added to the design system first, never invented in code.
