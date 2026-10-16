# KpopIt Design System — Puff Pop (default) + Retro-Pop (secondary)

KpopIt ([kpopit.net](https://kpopit.net)) is a daily K-pop Wordle-style guessing game. Players guess the idol of the day from attribute clues (**Classic**), a blurred photo (**Blurry**) or a pixelated album cover (**Pixelated**), and collect idol stickers in a sticker album (**Collections**). Mobile-first web app, React 19 + Tailwind 4. Audience: K-pop fans. Tone: playful, fan-to-fan, short and cute.

The look is **cute neo-brutalism / retro-pop on paper**: cream ground, 2px ink outlines, solid offset shadows, press-down buttons, stickers, washi tape, vinyl records and record sleeves, slight alternating tilts — with neon pink as the single loud accent. Two themes: Day (cream) and Night (#0B0C0F with pink borders/offsets).

This system is the reference for redesigning the whole app. Only **Pixelated mode** and **Collections** follow the look today; Home, Classic and Blurry still use the old dark style and are what will be redesigned from here.

## Puff Pop (catalogue) — the default style
**Puff Pop** is the main KpopIt look. Say "make this page Puff Pop" (or just use this system) and you get it. It extends Retro-Pop with **puffy objects and lettering**: a white face over a pink body, an ink outline and a solid offset shadow. Retro-Pop stays available as a rollback: put `data-style="retro"` on any element (or ask for "Retro-Pop style").

Source: the "KpopIt Idols Catalogue" project handoff (`PUFF-POP-HANDOFF.md`) and its canonical pages `IdolsFormV2`, `AlbumsForm`, `AlbumPage`, plus Idol page lab 14a (reference, not final). Prop **defaults** in those pages are the decisions.

**How it differs from Retro-Pop (deliberate):**
- **Ground:** 19px halftone dots (day `rgba(26,20,24,.07)`, night `rgba(255,255,255,.05)`), not grid paper.
- **Ink:** `#1A1418` by day (`#0A0A0A` at night), not `#0A0A0A`.
- **Night:** graphite `#1E1C1F` ground, grey shells `#2F2B2F` (hover `#3B343A`, panel `#262226`), ink outlines with a **pink `#FF8AC4` offset**. No glows. Night search-result hover is soft grey `--chip-hover`, never pink.
- **Thickness layer:** cards have a pink side body offset by `--depth` (5px) behind the face.
- **Shape:** card radius 23px, tilt ±0.5° alternating (0° on hover). Controls: 2px ink, offset `2px 3px`, hover lifts to `2.5px 3.5px`, press moves `translate(2px,3px)` with a flat shadow.
- **Idol page is "sharp":** radius 0, skewed (−7°, −12° labels, −3° panel). Catalogue pages are rounded. Intentional.
- **Text on pink:** white letters are allowed only with an ink stroke (`--tag-text`, puffy recipes). Plain white on pink is still banned.
- **Korean:** no Hangul line under the idol stage name. Hangul stays as small sub-labels (title chip, group tag, tabs, band) in Noto Sans KR. **No star signs anywhere.**

**Pink roles (keep #FF3399 ≈10% of a view):**
- `#FF3399` `--neon-pink` — **signal**: active tab, back button, current-idol dot, pink offsets on dark, focus ring.
- `#FF8AC4` `--pink-body` / `--side` — **body**: card side layer, puffy extrusion, active pill/filter fill, year sticker, scrollbar.
- `#FF70B8` `--pink-soft` / `--tag` — **tag**: "In album", JP/EN release tags, pink press buttons (with stroked white text).
- `#C62368` `--pink-deep` / `--group` — **small pink text** on light grounds (night: `#FF8AC4`).

**Puffy lettering recipe** (helpers `stroke`, `shift`, `puff` in the source pages; precomputed as tokens):
`stroke(c,w)` = 8 hard shadows at (±w,±w),(0,±w),(±w,0). `puff(ink,side,w,[dx,dy])` = stroke(ink,w) + 3 steps to (dx,dy) in the side colour + stroke(ink,w) shifted by (dx,dy). DynaPuff 700, white fill.
- Page title 64px (48 mobile), −1.5° — `--puff-title` (w 2.5, [4,5.5])
- Empty-state title 34px — `--puff-empty` (w 1.8, [2.6,3.4])
- Card names 17px — `PuffLetters`: four stacked spans moved with translate3d (rest [1.6,2.2] / hover [2.6,3.4] / press [0.6,0.8]); static fallbacks `--puff-name-rest|hover|press`
- Profile values / related names 20–30px — `--puff-value` (w 2, [3,4]); ink-on-pink tab text `--puff-ink`

**Which display type when:** puffy lettering = **names and titles only** (page title, card names, profile values, idol name). **Section headers** never puffy: use Major Mono Display ("related idols"), Caveat (one handwritten note per page) or spaced DynaPuff caps (menu headers, tile labels). Album titles: puffy on catalogue/album pages; Major Mono stays for Collections and modal titles.

**Motion:** settle `cubic-bezier(.22,1,.36,1)`, bounce `--ease-pop`, soft spring `--ease-spring`; global multiplier `--m: 1.25`. Entrances `puffIn` (rise 22px + .97), `puffSide` (−18px x), `puffDrop` (−14px y), `puffMenu` (−10px + .97); grid stagger 45ms after 260ms, capped 900ms. Transforms and opacity only — never width/height. Everything off under `prefers-reduced-motion`.

**Page shell:** `<div class="pp-page" data-theme="day|night"><div class="pp-wrap">…` — `.pp-page` paints the dot ground and is the container for every responsive rule (900 / 580 for catalogue; 1180 / 980 / 560 for the idol page).

## Sources
- Original Retro-Pop kit `kpopit-retropop-design-system.zip` and the Idols Catalogue handoff — imported once, not kept in this folder. Hand-built from `ThiagoRoss1/Kpopit@dev (4b81339)`; the token files here are now the source of truth.
- GitHub: **https://github.com/ThiagoRoss1/Kpopit** (`kpopit-frontend/`). Relevant: `src/pages/PixelatedMode`, `src/components/Pixelated`, `src/pages/Collection`. Ignore the old dark Home/Classic/Blurry. `kpopit-frontend/DESIGN.md` holds the Puff Pop rules and points back here for exact values. Explore the repo for more context when building screens. `github.md` records the sync.

## Index
- `styles.css` — the one file to link. Imports only:
  - `tokens/fonts.css` (Google Fonts import — same source and weights as the frontend; no local font files), `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css` (space, radii, borders, shadows, motion)
  - `components/components.css` — all `kp-*` component classes + utilities (`.kp-grid-bg`, `.kp-margin-rule`, `.kp-tilt-l/-r`, `.kp-ko`, `.kp-hand`, `.kp-mono`)
- `tokens/tokens.json` — original token source with per-token usage notes.
- `components/<group>/` — React primitives (`.jsx` + `.d.ts` + `.prompt.md` + a card).
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand).
- `ui_kits/web-app/` — click-through Pixelated → Victory → Collections.
- `assets/` — `logos/` (app icon), `icons/` (filled SVG glyphs), `textures/` (paper, foils, overlays), `flags/` (country flags for nationality clues). Idol photos and album covers are not stored here — load them from the CDN (below).

## Imagery (CDN)
Production images live on the KpopIt R2 bucket. Always reference them by CDN URL — there are no local copies in this folder.
- Idols: `https://cdn.kpopit.net/images/idols/<idolname>.webp` (e.g. `ahyeon.webp`) — square 500×500 portraits.
- Group photos (Collections): `https://cdn.kpopit.net/images/groups/<groupname>.webp?v=1` (e.g. `lesserafim.webp`).
- Album covers: `https://cdn.kpopit.net/images/albums/<albumname>.webp` (e.g. `summer_magic.webp`). Names are lowercase snake_case; symbols survive as-is (`&twice`, `[12_00]`, `[hash]`, `[+_+]`) — URL-encode them in `src`.
- Pixelated mode pixelates by drawing the cover small and scaling up with smoothing off (`PixelCover` in `ui_kits/web-app/data.jsx`).
- `thumbnail.html`, `SKILL.md`, `github.md`.

## Components
Consumers: `const { PressButton, GuessRow } = window.KpopItDesignSystem_07fd81`. Set `data-theme="day"|"night"` on a root; components read only tokens.

### Puff Pop (default) — `components/puffpop/`
- **nav/** — `PuffNav`
- **title/** — `PuffTitle`
- **search/** — `PuffSearch`
- **filters/** — `FilterButton`, `FilterMenu`, `AppliedChip`
- **cards/** — `IdolCard`, `AlbumCard`, `PuffLetters` (intentional addition: the stacked puffy name both cards share)
- **states/** — `EmptyState` (empty · error · loading)
- **idol-toolbar/** — `BackButton`, `SlideSearch`
- **idol-hero/** — `CutoutName`, `GroupTag`
- **idol-profile/** — `ProfileTabs`, `ProfileTile` (+ `.ip-panel` / `.ip-tiles` classes)
- **idol-related/** — `RelatedBand`, `RelatedCard`
- Styles: `components/puffpop/puffpop.css` (`pp-*` catalogue, `ip-*` idol page). Tokens: `tokens/puffpop.css`; rollback: `tokens/retropop.css`.
- UI kit: `ui_kits/puffpop/index.html` — Idols list → idol profile → related idols, Albums, day/night.
- Not built (by decision or not final): idol hero photo frame lives in the UI kit (`IdolPhoto`); the −9° hero band is kept in the kit (from 14a); the vertical "IDOL FILE Nº" caption is cut; `shape="puff"` idol variant, album "sticker"/"jewel" covers and Album page hero are not ported yet.

### Retro-Pop (secondary)

- **actions/** — `PressButton` (primary pink press-down / outline mono), `IconButton` (pink stats, circle share, round close, toggle)
- **labels/** — `Pill`, `Cap`
- **surfaces/** — `Panel` (card · feature · paper · sunken · cream), `ModalShell`, `InfoRow`
- **feedback/** — `ProgressBar`, `RewardBanner`, `StatTile`
- **decoration/** — `WashiTape`, `Vinyl`, `AlbumSleeve`, `Wordmark`
- **game/** — `GuessRow`, `PixelCluster`, `HintSleeve`, `SearchField`
- **collections/** — `ThemedCard`
- **icons/** — `Icon`

### Intentional additions (beyond the kit's 15)
- `Vinyl`, `AlbumSleeve` — the kit lists them as "not built yet"; built from `PixelatedMode.tsx/.css` classes.
- `Wordmark` — from the `.kpop-part` / `.it-part` classes in `src/index.css`.
- `StatTile` — the victory-card stat chip from `PixelatedVictory.tsx`.
- `Icon` — function wrapper for the kit's inline lucide glyphs (was an object of components).
- Not built (no source read yet): victory card as a component, album flip-book, sticker cards.

---

## CONTENT FUNDAMENTALS
- **Voice:** a fellow fan. Short, playful, sentence case, second person: "Guess today's album...", "Tap to reveal", "New card collected!", "Card maxed out!", "You were the 24th fan to guess the album!".
- **Labels live inside values:** "23 people already found today's album", "+ 3" (guesses left), "40 stickers", "73% complete". Never "Players: 23".
- **Ellipsis is a brand tic** in titles and prompts: "Stats...", "Transfer Data...", "Guess today's album...", "Loading Kpopit...". Exclamation marks for reward moments only.
- **Korean as a sub-label**, always Noto Sans KR: `발매년도` under Release Year, `케이팝잇 ● 앨범 1` under an album title, giant `케이팝잇` as a 6% watermark.
- **Handwritten aside** (Caveat), one per view at most: "Guess the album" on the sleeve, "Yesterday's album was…".
- **Casing:** sentence case for UI; Title Case for some headings ("Yesterday's Album", "Coming Soon!", "Share Results"); UPPERCASE only for Major Mono titles, caps eyebrows and stat labels ("ATTEMPTS").
- **Emoji:** none in UI. The ♪ glyph appears in "Congratulations! ♪"; share text may carry 🎶.
- Brand name is written **KpopIt** (also "Kpopit" in some copy). Mode wordmarks: PixelIt, etc.

## VISUAL FOUNDATIONS
- **Colour:** `neon-pink #FF3399` is the accent, not a background — one primary action, progress fill, active borders, numbers that matter. More than ~10% pink in a view is overuse. Day: cream page → white cards → warm-white paper (modals, dropdowns). Night: #0B0C0F → #16181E → #1C1F27; card borders drop to 10% white; the focused surface (modal, close button, outline button) gets a pink border and pink offset. No pure greens (except `correct`), yellows or saturated oranges as decoration.
- **Contrast fixes (vs source):** text on neon-pink and on correct/incorrect rows is **ink**, not white; small pink text uses `--text-pink` (#C62368); `--text-faint` darkened to #776A60; caps raised from 8–9px mono to 11/10px DynaPuff 600; night faint text .40 → .55.
- **Type:** DynaPuff for everything (UI and body; bold carries hierarchy, body 400–500). Major Mono Display UPPERCASE + 0.02em for album/collection/modal titles. Caveat for handwritten notes. Noto Sans KR for every Hangul character. No other fonts (the source's system-mono caps and system-sans body were folded into DynaPuff). Scale 12·14·16·18·20·24·30·36·48·60·72; display line-height 1–1.1, body 1.45–1.5; truncate titles in rows.
- **Wordmark:** live text, two gradient halves (pink → deep pink, white → cream) with stacked 1–2px ink drop-shadows and a soft pink glow.
- **Backgrounds:** Day = cream with a 28px neon-pink grid at 12%, a faint pink radial at the top, and a 2px pink "notebook margin" rule on the left. Collections can use the paper texture (15% multiply). Night = 19px white halftone dots at 5%. No full-bleed photography; imagery is album covers and idol photos inside frames.
- **Borders:** 2px default, 2.5px hero cards, 3px reward frames, 1.5px pills. Never above 4px. Borders separate surfaces, not shadows.
- **Shadows:** solid and offset — `press` 0 4px 0 ink for buttons, `offset-sm…xl` 2/3/4/6px diagonal for chips, cards, modals, `row` for guess rows. Diffuse shadows only for physical objects (sleeve, vinyl, album book), dropdowns and the modal scrim. No glows on cards (night press has a pink under-glow).
- **Press states:** PressButton sinks 4px onto `press-down`; outline and round buttons translate 2px and lose their offset; header toggles sink 2px. **Hover:** brightness 1.1 + scale 1.05; stat tiles slide 4px into their offset; search items slide 4px right on a 20% pink tint.
- **Radii:** pill for buttons, pills, guess rows; 20px panels/modals; 16px cards; 14px sunken boxes; 12px tiles/covers; 24px victory card and stat tiles; sleeves 16px top / 24px bottom.
- **Cards:** white (night #16181E), 2–2.5px ink border, solid 4–6px ink offset, 16–20px radius, 12–22px padding. Never coloured left-border accents.
- **Controlled chaos:** stacked items alternate ±0.6°; sleeves −2° to −4° (−8° open); tape ±34.8°; fabric stickers ±14° on row corners. One tilted family per view; everything else square to the grid.
- **Objects:** vinyl (dark purple `#0D0008` grooves, cover as label, warm key-light top-right, cool fill-light left, 4s linear spin), record sleeves (ink with cream edge, two washi tapes, white corner brackets), washi tape (45° pink stripes, 75%), fabric stickers (woven pink squares).
- **Motion:** juicy only at reward moments — guess row drops in (0.4s), colour washes in after 1s, cluster squares pop with overshoot `cubic-bezier(.34,1.56,.64,1)` staggered 0.2s, modals scale from 0.85 (0.3s), sleeves spring open `cubic-bezier(.34,1.4,.64,1)`. Micro 0.15s, state 0.2–0.3s. Confetti on win. Everything respects `prefers-reduced-motion`.
- **Transparency & blur:** modal scrim rgba(30,20,28,.55) + 4px blur; the search shell is frosted (16px blur, 5% pink). Otherwise opaque.
- **Imagery vibe:** real album covers and square idol portraits (soft, warm, film-ish editorial photos), always framed — ink border, sleeve, vinyl label or round thumb — never full-bleed; textures are warm paper, gold and holo foil (sticker levels 2/3).
- **Focus:** 2px solid `line-strong` outline offset 2px (ink by day, pink by night).
- **Layout:** mobile-first single column; Pixelated goes two-column at ≥1024px (hero left, game right), max-width 1360px. Collections max 1200px with a newspaper header (caps rule, giant title, double rule).

## ICONOGRAPHY
- **System:** [lucide](https://lucide.dev) stroke icons (2.5–3 stroke at 16–24px) for UI chrome — chart (stats), x, arrows, search, lock, copy, sun/moon, sliders. Components draw the ones they need inline via `Icon`; for others, use lucide from CDN at the same stroke.
- **Filled glyphs:** `assets/icons/*.svg` — the app's Phosphor-style "-fill" set (chart-bar, fire streak + gray inactive, trophy, ranking, target, trending-up, share, lock open/closed, star-four, microphone) plus social marks (X, Twitter, Instagram). Most are single-ink **white** (for pink or ink grounds); pick the file whose ink suits the ground. Use via `<img>` — they don't take `currentColor`.
- **Flags:** `assets/flags/*.svg` for nationality clues.
- **Logo:** `assets/logos/kpopit-icon-svg.svg` / `.png` (512px). Never recolour or redraw. The wordmark is live type.
- **Unicode:** ♪ in "Congratulations! ♪", ● as separator in Korean labels, · in meta lines. No emoji icons.
- **Decorative:** 4- and 5-point star outlines pressed into the Collections paper plus ≤5 pink sparkles.
