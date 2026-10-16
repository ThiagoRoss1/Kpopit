---
name: KpopIt
description: Wordle-inspired daily K-pop idol guessing game — Puff Pop neo-brutalist style
version: 2.0.0
tags: [game, kpop, wordle, daily-challenge, idol-guessing, web-game]
---

# KpopIt — Design System

> **How to use this file:** Rules, conventions and implementation tips for the KpopIt frontend. Read before creating or modifying any UI component. Exact values (tokens, components, specimens, sample UI kit) live in the **KpopIt Design System** at `docs/design-system/` — this file points there instead of duplicating it. If the two disagree, the token files win (see §19).

---

## 1. Project Overview

**KpopIt** is a Wordle-inspired daily K-pop idol guessing web game. Players try to guess the featured idol of the day based on attribute clues (Classic Mode) or by identifying an increasingly unblurred photo (Blurry Mode). All players worldwide share the same daily idol, resetting at midnight EST.

The game features idols from popular K-pop groups including TWICE, BLACKPINK, NewJeans, IVE, aespa, LE SSERAFIM, ITZY, and many more.

---

## 2. Design Philosophy — Puff Pop

**Puff Pop** is KpopIt's visual direction: neo-brutalist retro-pop built from **puffy objects and puffy lettering**. Every object is a **white face sitting on a pink body**, wrapped in a **2px ink outline** and grounded by a **solid offset shadow**. It should feel like stickers and toy plastic — things you want to press.

- **Solid over blurred** — offset shadows have no blur; depth comes from the pink body and the ink shadow, never from a gaussian glow.
- **Bold over subtle** — thick ink outlines, chunky puffy display type, clear press-down feedback.
- **Playful over corporate** — slight tilts, sticker-like tags, halftone-dot grounds.
- **Pink is an accent** — cream and ink carry most of the page; pink marks bodies, tags and the single signal per view.
- **Energy without chaos** — objects tilt lightly (±0.5°), titles and tags more; inputs and body text never tilt.
- **Textured ground** — a cream (day) or graphite (night) ground with a halftone-dot pattern.

Avoid the generic "AI-generated SaaS" look — no soft gaussian shadows on objects, no bubble-rounded-everything without an outline, no glow effects.

**Retro-Pop** (the previous dark neon style) is kept only as a secondary style for rollback: `docs/design-system/tokens/retropop.css`, activated by `data-style="retro"`. Don't build new UI against it.

---

## 3. Frontend Stack

- **React 19** + **TypeScript 5.8**
- **Tailwind CSS 4** — utilities for layout, color, spacing, and most visual effects
- **CSS files** — only for keyframe animations, token definitions and complex effects not covered by Tailwind
- **Framer Motion** — component animations
- **Lucide React** — icons
- **React Router 7** — navigation
- **TanStack Query 5** — server state management

> Chakra UI is listed in `package.json` (legacy from early development) but is **not used**. Do not import or add Chakra components.

---

## 4. Colors — roles, not hex values

Exact values: `docs/design-system/tokens/puffpop.css` (Puff Pop roles) and `tokens/colors.css` (shared palette). Specimens: `docs/design-system/guidelines/puffpop-pinks.html`, `colors-*.html`.

### How tokens are wired

- Tokens are **CSS variables defined once**: port `docs/design-system/tokens/puffpop.css` into `src/index.css`.
- Map the variables actually used in markup into Tailwind's `@theme` so they're available as utilities; anything else is referenced with Tailwind 4's variable shorthand, e.g. `bg-(--face)` (not `bg-[var(--face)]`).
- Themes switch with `data-theme="day" | "night"` on the root element. Day is the default (`:root` carries day values).
- **Never hardcode a hex in a component** — use the role. If a role is missing, add it to the design system first (§19).

### Day (default) vs Night

| Role | Token | Day | Night |
|---|---|---|---|
| Ground (page) | `--ground` | `#FAF6F0` cream | `#1E1C1F` graphite |
| Face (object top) | `--face` | `#FFFDFA` | `#2F2B2F` |
| Ink / outline | `--ink` | `#1A1418` | `#0A0A0A` |
| Text on face | `--face-ink` / `--text` | `#1A1418` | `#FAF6F0` |
| Muted text | `--muted` / `--face-muted` | `#6B5F66` | `#CFC5CB` |
| Offset shadow colour | `--ctl-off` | ink `#1A1418` | **pink `#FF8AC4`** |
| Ground dots | `--dot` | ink @ 7% | white @ 5% |

At night the **offset shadows turn pink** automatically because every offset token reads its colour from `--ctl-off`. Night also adds the `--pp-glow` vignette over the ground.

### Pink roles — each has one job

| Token | Value | Job |
|---|---|---|
| `--pink-body` (`--side`) | `#FF8AC4` | The puffy body/side under faces and lettering |
| `--tag` | `#FF70B8` | Tags, chips, group labels |
| `--sig` | `#E70A7D` (night `#FF70B8`) | The **single signal** per view — active state, primary CTA |
| `--pink-deep` / `--group` | `#C62368` | Pink small text on light grounds (contrast-safe) |
| `--neon-pink` | `#FF3399` | Legacy signal — don't use as body text on cream |

### Rules

- **One signal-pink element per view.** If two things are `--sig`, one of them is wrong.
- **Never grey text on pink** — use ink or `#C62368` (`--pink-deep`).
- **Logo gradient stays** `linear-gradient(180deg, #e70a7d, #ec4850)`.

---

## 5. Typography

Exact values: `docs/design-system/tokens/typography.css`, `tokens/fonts.css`. Specimens: `guidelines/type-*.html`, `guidelines/puffpop-lettering.html`.

| Font | Usage |
|---|---|
| **DynaPuff** | Display — titles, buttons, card names (puffy lettering) |
| **Major Mono Display** | Small labels, counters, eyebrow/meta text — uppercase, tracked |
| **Caveat** | Handwritten aside — **one per view at most** ("Guess the album", "Yesterday's album was…") |
| **Noto Sans KR** (`font-korean`) | **All Hangul, always** |

Puffy lettering is for **names and titles only** (page title, card names, profile values, idol name). Section headers are never puffy — use Major Mono Display, the one Caveat note, or spaced DynaPuff caps.

No other families. `font-sans` is allowed only for long-form body copy (e.g. legal/about pages) where DynaPuff hurts readability.

### Puffy lettering

Puffy text = a white/cream **face** with a layered `text-shadow` stack: **ink outline → pink body → ink shadow**. Never hand-roll the stack — use the token presets:

| Preset | Use |
|---|---|
| `--puff-title` | Page titles |
| `--puff-value` | Large values / numbers |
| `--puff-empty` | Empty-state headings |
| `--puff-name-rest` / `-hover` / `-press` | Card names, tracking the card's press state |
| `--puff-ink` | All-ink puffy text (no pink body) |
| `--tag-text` / `--tag-text-lg` | Text on tags |

```tsx
<h1 className="font-[DynaPuff] text-white text-shadow-(--puff-title) rotate-[-1.5deg]">Idols</h1>
```

---

## 6. Breakpoints

Defined in `index.css @theme` plus Tailwind defaults:

```css
--breakpoint-sxs: 340px;
--breakpoint-xxs: 370px;
--breakpoint-xs:  414px;
--breakpoint-xm:  430px;
--breakpoint-zm:  480px;
--breakpoint-3xl: 1728px;
```

Standard Tailwind breakpoints (`sm`, `md`, `lg`, `xl`, `2xl`) also available.

---

## 7. Visual Patterns — Puff Pop

Exact values: `tokens/puffpop.css`, `tokens/spacing.css`. Specimens: `guidelines/puffpop-card-anatomy.html`, `puffpop-surfaces.html`, `spacing-*.html`.

### Outline
Always **2px `var(--ink)`** — `border-2 border-(--ink)`. No 1px or grey borders on objects.

### Radius
| Element | Token | Value |
|---|---|---|
| Cards | `--r` | 23px |
| Inner / media | `--r-inner` | 16px |
| Fields | `--radius-field` | 18px |
| Menus | `--radius-menu` | 20px |
| Menu options | `--radius-opt` | 13px |
| Chips, toggles | — | pill (`rounded-full`) |

### Offset shadows (solid, no blur)
Elevation scale, smallest to largest:

```
--off-flat (pressed) → --off-rest 2px 3px → --off-hover 2.5px 3.5px → --off-lift 3px 5px → --off-field 4px 5px → --off-focus 6px 7px
```

Colour always comes from `--ctl-off`, so night mode turns them pink with no component changes. Apply with `[box-shadow:var(--off-rest)]`.

### Press-down
Every clickable object does this:
- **Hover** — lift: `translate(0,-1px)` and the next offset up (`--off-hover` / `--off-lift`).
- **Active** — translate *into* the shadow and drop to `--off-flat`.
- Card names follow along with `--puff-name-rest/hover/press`.

### Inner highlight
- Faces get `--in` (top white line, bottom shade).
- Pink bodies get `--in-pink`.
- Combine with the offset: `[box-shadow:var(--in),var(--off-rest)]`.

### Tilt
| Element | Token | Value |
|---|---|---|
| Objects (cards, tiles) | `--tilt` | ±0.5° |
| Titles | `--tilt-title` | -1.5° |
| Tags | `--tilt-tag` | 4° |
| Logo | `--tilt-logo` | -5° |

Alternate the sign in grids (`odd:` / `even:`) so rows don't lean one way. **Never tilt inputs or body text.**

### Ground
Cream (day) or graphite (night) `--ground` with halftone dots in `--dot`, plus the `--pp-glow` vignette at night.

### Controls
Height `--ctl-h` 40px (44px on `pointer:coarse`), fields `--field-h` 50px.

### Blur
Gaussian blur only for modal backdrops (`backdrop-blur-*`). Never for cards or buttons.

---

## 8. Animations

### Decision rule

- **Tailwind** — everything except keyframe animations (colors, spacing, hover, focus, transforms, transitions)
- **CSS files** — keyframe animations only (`@keyframes`, complex multi-step animations)
- **Framer Motion** — component-level enter/exit, page transitions, complex interactive animations

### Motion tokens

Exact values: `tokens/puffpop.css`. Specimen: `guidelines/brand-motion.html`.

| Token | Value | Use |
|---|---|---|
| `--ease-settle` | `cubic-bezier(.22,1,.36,1)` | Entries |
| `--ease-sweep` | `cubic-bezier(.25,1,.5,1)` | Slides |
| `--m` | `1.25` | Global duration multiplier — `calc(200ms * var(--m))` |
| `--stagger-start` | 260ms | Delay before the first staggered item |
| `--stagger` | 45ms | Step between items |
| `--stagger-booted` | 28ms | Step after first boot (return visits within the session) |
| `--stagger-cap` | 900ms | Max total stagger delay |

### Keyframes available
`puffIn`, `puffSide`, `puffDrop`, `puffMenu`, `ipDrop`, `ipMenu`, `ipTile`, `ipSide`, `ipPhoto`, `ipBeam` — defined in `tokens/puffpop.css`; port them, don't redefine.

### Reduced motion
Respect `prefers-reduced-motion`: drop transforms, keep opacity fades.

### Legacy
`star-twinkle` is still used by `components/Background/BackgroundStyle.tsx` and the collections backdrop; keep it until those are migrated. The old `.logo::after` blur glow has no live consumer — don't use it.

---

## 9. Scrollbar & Selection

- **Scrollbar** — thumb `#FF8AC4` (`--pink-body`) with a 2px ink border on a cream (`--ground`) track. Night: graphite track.
- **Selection** — `#FF8AC4` background, ink text.

```css
::-webkit-scrollbar { width: 10px; background: var(--ground); }
::-webkit-scrollbar-thumb { background: var(--pink-body); border: 2px solid var(--ink); border-radius: 999px; }
::selection { background: var(--pink-body); color: var(--ink); }
```

---

## 10. Color Theory

### Color Wheel

12 hues arranged in a circle — the foundation of all color decisions.

- **Primary**: red, yellow, blue
- **Secondary**: orange, green, violet (mixing two primaries)
- **Tertiary**: the six between primary and secondary

Gurney uses the **Munsell 3D model** rather than a flat wheel. Color has three independent axes:

- **Hue** — position on the wheel, 0–360°
- **Chroma** — perceived purity/intensity, from gray at center outward. More perceptual than "saturation" (which refers to light purity).
- **Value** — lightness, 0 (black) → 10 (white)

These three axes are independent. Changing value does not force a chroma change.

### Peak Chroma Value

Each hue reaches its maximum chroma at a specific value — not always mid-gray:

- **Yellow**: maximum chroma at very light value (~8/10)
- **Blue**: maximum chroma at very dark value (~3/10)
- **Red**: maximum chroma at middle value (~5/10)

**KpopIt implication:** the pink family spans value deliberately — `#FF8AC4` (body) is light and soft so it reads as a puffy side, `#E70A7D` (signal) sits near red's peak-chroma value so it pops on cream, and `#C62368` is dark enough to be readable as small text on `#FAF6F0`. On the night graphite ground the light pinks maximize value contrast instead.

### Color Harmonies

- **Complementary**: 180° apart. Maximum contrast and vibrancy. Use for accents and CTAs, never for large adjacent areas (visual vibration). KpopIt: pink ↔ green-cyan `~#33FF99`
- **Analogous**: within 30–60°. Calm, cohesive. KpopIt: pink → rose → warm cream — the Puff Pop day palette
- **Triadic**: 120° apart. Balanced and energetic; one hue dominant, two as accents
- **Split-complementary**: a color + the two neighbors of its complement. Strong contrast with less tension than pure complementary
- **Monochromatic**: single hue, varying chroma and value. Safe, elegant, cohesive — the pink roles (§4) are a monochromatic ladder

### Color Temperature

Warm colors visually **advance** (come toward the viewer); cool colors visually **recede**.

| Temperature | Range | Approx rgba |
|---|---|---|
| Warm | Yellow-green through red | `rgba(255, 240, 200, x)` |
| Neutral | White | `rgba(255, 255, 255, x)` |
| Cool | Blue-green through violet | `rgba(180, 210, 240, x)` |

**The Shadow Rule (from Gurney):** A warm key light always produces cool shadows, and vice versa — physics, not a choice. Outdoor shadows are blue because they receive only sky light. A neon pink key casts green-cyan shadows.

**Temperature is relative:** a green can be "warm" relative to a blue-green next to it. Always compare, never judge in isolation.

### The Form Principle — 8 Zones of Light and Shadow

When light hits a solid surface, it creates a predictable sequence of tones:

1. **Center Light** — most directly lit, lightest point on the lit side
2. **Highlight** — specular reflection of the light source itself
3. **Halftone** — lit side turning away, still receiving direct light
4. **Terminator** — transition line where light rays become tangent to the surface
5. **Core of Shadow** — darkest part of the shadow, just beyond the terminator
6. **Reflected Light** — ambient light bouncing back into the shadow; raises shadow tone and tints it with surrounding color
7. **Cast Shadow** — shadow projected onto another surface
8. **Occlusion Shadow** — darkest accent where two forms press together and cut off all light

**Critical rule:** Pure black (`#000`) in shadows is almost always wrong. Shadows contain reflected light — they have color and are never fully dark. Puff Pop's ink `#1A1418` is already a warm-purple dark, not black; Puff Pop's `--in` inner highlight is a direct application of zones 1 and 5 on a face.

### Lighting Model (Key / Fill / Rim)

Applies to emulated-light surfaces (album textures, holo cards) — flat Puff Pop objects use the face/body/offset model in §7 instead.

- **Key light**: warm (`#FFF0C8`), top-right, opacity 0.15–0.20 — defines form. The dominant source.
- **Fill light**: cold (`#B4D2F0`), left/bottom-left, opacity 0.10–0.14 — fills shadows. Always opposing temperature to the key.
- **Rim light**: near-white (`#FFFFFF`), edge only, opacity 0.06–0.09 — separates element from background.
- **Vignette**: black, radial center→edge, opacity 0.45–0.55 — seats the object in space. (Night's `--pp-glow` is a mild version of this.)

**Non-negotiable rule:** Key and fill must ALWAYS be opposing temperatures. Two warm or two cool sources = flat, lifeless result.

**Shadow undertone:** day ink `#1A1418` is a warm-purple dark, never neutral black; at night shadows are carried by the pink offset (`--ctl-off`), not by a dark.

**Tonal separation:** In direct light, maintain ~4–5 value steps between fully lit and fully shadowed zones. Less = flat/diffuse. More = dramatic/harsh.

### Local Color vs Perceived Color

**Local color** = the true surface color under neutral white light.
**Perceived color** = local color modified by light temperature, intensity, reflected surroundings, and atmosphere.

You never render local color directly — you always modulate it. A "black" vinyl under warm light has orange-brown highlights and purple-blue shadows, not gray halftones.

### Saturation in Light and Shadow

- Highlights desaturate toward the light source's color (toward white/warm)
- Shadows saturate toward the complementary / ambient color
- Never use pure neutral gray for shadows on colored surfaces — tint them toward the complement
- **Chromatic grays** (mixed from complementary pairs: blue+orange, red+green) are far richer than pure neutral grays. They maintain hue identity at low chroma. Puff Pop's muted `#6B5F66` and night graphite `#1E1C1F` are chromatic greys leaning pink-purple.

### Gradation

Color never appears flat in nature. It always transitions in hue, chroma, or value — even subtly. A flat color reads as artificial or graphic. CSS radial/linear gradients simulate natural gradation; this is why they read as more realistic than flat fills. (Puff Pop is deliberately graphic — gradation lives in the ground dots, the `--in` highlight and the night glow, not on object faces.)

### Opacity as Intensity

Control light strength via rgba opacity, not color changes:

- `0.05–0.08`: subtle, near-imperceptible when static — texture/rim detail (the `--dot` halftone lives here)
- `0.10–0.18`: visible, defines form — fill light range
- `0.20+`: dominant — reserve for main key light only

### Gamut Mapping (Gurney)

The **gamut** is the complete set of colors available in a composition — visualized as a polygon on the color wheel. Everything inside is usable; everything outside is excluded.

> "Good color comes not just from what you include, but from what you leave out."

Key terms:

- **Subjective primaries**: the corners of the gamut polygon — the most extreme colors in the scheme
- **Subjective neutral**: center of the polygon — the color cast of the composition. Every "gray" leans toward this hue.
- **Saturation cost**: mixed/secondary colors are always lower chroma than the subjective primaries
- **Excluded colors**: hues outside the polygon — their presence breaks color unity

**KpopIt (Puff Pop) gamut:**

- **Dominant ground**: cream `#FAF6F0` / face `#FFFDFA` + ink `#1A1418` — these carry most of the page
- **Accent**: the pink family — body `#FF8AC4`, tag `#FF70B8`, signal `#E70A7D`, deep `#C62368`
- **Night**: graphite `#1E1C1F` / `#2F2B2F` with cream text and pink offsets
- **Subjective neutral**: warm pink-grey (~`#6B5F66`)
- **Excluded**: pure greens, pure yellows, saturated oranges, cool blue-greys — they break the Puff Pop mood. Game feedback colours (correct/partial/incorrect) are the documented exception: `guidelines/colors-results.html`.

### Color Accent

A color accent is a small high-chroma element in a neutral or monochromatic field. It draws the eye immediately and doesn't need to be large. It's usually the complement or near-complement of the dominant color.

`--sig` is KpopIt's color accent — one element per view on a cream/ink field. Overusing it collapses the effect, which is why §4 limits it to one per view.

### Contrast & Accessibility

- Value (lightness) contrast matters more than hue contrast for readability
- WCAG minimums: 4.5:1 for normal text, 3:1 for large text
- Ink on cream and cream on graphite both pass comfortably
- **Pink small text on cream must be `#C62368`** (`--pink-deep`); `#FF3399` / `#FF8AC4` text on cream fails — use them only as fills, bodies and large puffy lettering with an ink outline
- Contrast table: `guidelines/colors-contrast.html`

---

## 11. Code Patterns

### Page file structure

```
src/pages/PageName/
├── page_name.tsx      — main component (lowercase snake_case filename)
├── page_name.css      — keyframe animations only (if needed, not always present)
└── components/        — shared/reusable subcomponents live here, not at page level
```

Page-specific subcomponents that are only used within that page are placed directly in the page folder. The `components/` folder inside a page is for subcomponents shared or organized separately.

### Tokens only

- Components read **only tokens** (`var(--face)`, `var(--ink)`, `var(--off-rest)` …). No hex literals in components.
- Theme via `data-theme` on the root — components never branch on day/night in JS.
- Long shadow stacks stay in CSS variables; Tailwind references them: `[box-shadow:var(--off-rest)]`, `[text-shadow:var(--puff-title)]`.

### Reuse design-system parts first

Before building UI, check `docs/design-system/components/puffpop/` for an existing part:

`PuffNav` · `PuffTitle` · `PuffSearch` · `FilterButton` · `FilterMenu` · `AppliedChip` · `IdolCard` · `AlbumCard` · `EmptyState` · `BackButton` · `SlideSearch` · `CutoutName` · `GroupTag` · `ProfileTabs` · `ProfileTile` · `RelatedBand` · `RelatedCard`

Port it to `src/components/puffpop/` as **TSX + Tailwind**, matching all its states — rest / hover / press / focus / disabled, in day and night. Each part ships a `.jsx` reference, a `.d.ts` prop contract, a `.prompt.md` usage note and a `*.card.html` specimen.

`docs/design-system/ui_kits/puffpop/` is the **reference page** (catalogue + idol profile) — match its spacing and behaviour.

### Example

```tsx
<button
  className="h-(--ctl-h) rounded-full border-2 border-(--ink) bg-(--face) px-4 text-(--face-ink)
    [box-shadow:var(--in),var(--off-rest)] transition-[transform,box-shadow] duration-150
    hover:-translate-y-px hover:[box-shadow:var(--in),var(--off-hover)]
    active:translate-x-0.5 active:translate-y-0.75 active:[box-shadow:var(--in),var(--off-flat)]"
>
  Filter
</button>
```

### Test matrix
Test every page at **1440px and 390px**, in **day and night**.

### Avoid

- Don't put static colors, spacing, sizing, or shadows in CSS files — use tokens + Tailwind utilities. Exception: runtime-driven values (e.g. CSS custom properties set by JS for animation, as in `guessgrid.css`).
- Don't use gaussian blur shadows for cards/buttons.
- Don't use fonts beyond the design system without discussion.
- Don't invent new colours, radii or shadows in a component (§19).

---

## 12. Visual Hierarchy

Hierarchy is the single biggest factor in making an interface feel "designed." When everything competes for attention, the result is noise. Deliberately emphasizing what matters and de-emphasizing the rest does more than any color or font choice.

### Hierarchy is built from three levers, not one
Don't lean on font size alone — it leads to oversized primary text and unreadable secondary text. Combine three tools:
- **Size** — larger = more important, but use sparingly
- **Weight** — a heavier weight (600–700) emphasizes without enlarging; keep body at 400–500
- **Color/contrast** — a softer color de-emphasizes without shrinking

Stick to two or three text levels: primary, secondary, tertiary. In **day** this is ink `#1A1418` → muted `#6B5F66` → `--rule`-level faint; in **night** it is cream `#FAF6F0` → `#CFC5CB` → faint. The principle is the same in both: each step is reduced contrast against its own background. Avoid font weights under 400 for UI text — they're only acceptable for large display headings (the DynaPuff branding can go lighter).

### Emphasize by de-emphasizing
When a primary element won't stand out no matter what you add to it, stop adding — instead soften everything competing with it. An active nav item pops not by getting louder, but by muting the inactive items. A main content area wins when the sidebar loses its background and sits flat on the page.

### Don't use grey text on colored backgrounds
Grey-on-cream works because it's *reduced contrast*, not because it's grey. On a colored background (pink bodies, tags, `--sig` fills), don't use grey or transparent white — it looks washed out and disabled, and over images the background bleeds through. Use ink, or hand-pick a color with the **same hue** as the background (`#C62368` on pink), then adjust until contrast feels right.

### Action hierarchy (buttons)
Semantics are secondary to hierarchy. Every page has a pyramid: one primary action, a few secondary, some tertiary.
- **Primary**: `--sig` fill, ink outline, offset shadow — the one signal of the view
- **Secondary**: `--face` fill, ink outline, offset shadow
- **Tertiary**: styled like a link

A destructive action isn't automatically big and red. If it's not the primary action, give it secondary/tertiary treatment, and save the bold styling for the confirmation step where deleting *is* the primary action.

### Labels are a last resort
Data often reads without a label — a date, a percentage, or a score is obvious from its format. When a label is needed, fold it into the value ("3 guesses left", not "Guesses: 3"; "won by 23 players", not "Players: 23"). When a true label is unavoidable (a stats panel or leaderboard), treat it as secondary: smaller, lighter, lower contrast — Major Mono Display eyebrow style. The data is what matters.

### Balance weight and contrast
Heavy elements (bold text, solid icons) draw the eye. To balance an icon against text, lower the icon's contrast with a softer color. Conversely, to emphasize a too-subtle element, increase its weight (width) rather than darkening it into harshness.

---

## 13. Layout & Spacing

Exact values: `tokens/spacing.css`, `guidelines/spacing-scale.html`.

### Start with too much white space, then remove
White space should be *removed*, not added. Designers default to giving elements the minimum room to "not look bad" — but great design needs more breathing room. Start with too much space and pull it back until it feels right; what looks like "a little too much" on one element reads as "just enough" in a full UI. Dense layouts (a stats panel, a leaderboard, the KpopIt guess list) are valid, but make density a deliberate choice, not a default.

### Establish a spacing & sizing system
Never nitpick between 120px and 125px. Define a constrained scale up front and only pick from it. A linear "everything is a multiple of 4px" scale isn't enough — the system must respect *relative* difference: no two adjacent values should be closer than ~25%. Start from a base of 16px (browser default, divides cleanly) and grow with widening gaps:

```
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 192 · 256
```

KpopIt already defines custom breakpoints (section 6) — apply the same systematic discipline to spacing. Tailwind's default spacing scale already follows this principle; prefer its tokens over arbitrary bracket values.

### Avoid ambiguous spacing
When elements are grouped without a visible border, spacing alone communicates grouping. **Always make the space around a group larger than the space within it.** A form label must sit closer to its own input than to the next field. A section heading needs more space above it than below. This applies horizontally too.

### You don't have to fill the screen
If a layout only needs 600px, use 600px. Don't make something full-width just because the nav is. Give each element only the space it needs. When a narrow component feels unbalanced in a wide layout, split it into columns rather than stretching it.

### Relative sizing doesn't scale
Don't lock element sizes to each other with `em` ratios across breakpoints. A 2.5em headline that's perfect on desktop becomes absurd on mobile. Large elements must shrink *faster* than small ones — the gap between big and small should compress at smaller screens. The same applies within a component: a button's padding should grow generously at large sizes and tighten disproportionately at small sizes.

### Grids are a tool, not a master
A 12-column grid brings order, but don't outsource every layout decision to it. Give components the width they actually need; cap them with a max-width so they don't sprawl, and only force them smaller when the screen demands it. Puff Pop's alternating ±0.5° tilt deliberately softens grid rigidity without breaking alignment.

---

## 14. Depth & Dimensionality

Puff Pop's depth language is **face on pink body + solid offset shadow** (§7). This section gives the underlying physics so depth stays consistent. Depth cues flip per theme: in **day** offsets are ink on cream; in **night** they turn pink (`--ctl-off`) so they stay visible on graphite.

### Light comes from above
The brain reads depth from a single assumption: light comes from above. A raised element has a lighter top edge and a darker bottom edge; an inset element is the reverse. Puff Pop encodes this in `--in` (white top line, shaded bottom) and in the downward-right offset shadow.

### Shadows convey elevation on a z-axis
Shadow size maps to distance from the surface, and closer = more attention:
- **Small, tight offset** → resting objects (`--off-rest`)
- **Medium offset** → hovered/lifted, fields (`--off-lift`, `--off-field`)
- **Largest offset** → focused (`--off-focus`)
- **Diffuse blur** → modal backdrops only

The offset scale in §7 *is* the elevation scale — don't add values outside it.

### Interactive shadows
Shadows are feedback, not just decoration. A pressed object drops to `--off-flat` and moves into its shadow — core to the toy-plastic "press-down" personality. A dragged item gains a bigger offset to pop forward.

### Two-part shadows
A realistic shadow combines a soft ambient cast with a tight contact edge. Use this only on emulated-light components (album textures, card zoom) — never on Puff Pop objects, which use the solid offset.

### Flat designs still have depth
Even without shadows, depth comes from two sources:
- **Color**: contrast against the ground = elevation. In day, faces (`#FFFDFA`) sit slightly above the cream ground and are defined by outline + offset; in night, faces (`#2F2B2F`) are lighter than graphite. The rule is "contrast against background = elevation," not "lighter = up" in absolute terms.
- **Overlap**: overlapping elements create instant layering. Tags straddling a card edge and the pink body peeking under a face are exactly this principle.

---

## 15. Game Design Principles (The Art of Game Design — Jesse Schell)

KpopIt is a game, not just a website. These "lenses" — questions to interrogate the design — are the ones most relevant to a daily guessing game.

### The Lens of the Toy
Is the core interaction fun *before* you add rules and goals? A toy is fun to play with for its own sake. The guessing input, the pixel-reveal, the press-down of a puffy card — these should feel satisfying to touch and watch even outside a "win." If the moment-to-moment interaction isn't pleasurable, no scoring system will save it.

### The Lens of Essential Experience
Define the feeling you're selling, then make every element serve it. KpopIt's essential experience: *the daily thrill of recognition* — that "I know this!" spark when a blurred photo or pixelated cover resolves into a familiar idol/album. Every design decision (reveal pacing, feedback, celebration) should amplify that spark.

### The Lens of Feedback (Juiciness)
Every player action needs immediate, satisfying feedback. A correct guess should feel *celebratory* — color, motion, sound-like visual punch. A wrong guess should inform without punishing. KpopIt's `PixelCluster` (green/red shrapnel) and the pixel-reveal steps are feedback moments — make them juicy, not flat. Disproportionately reward the win: the payoff is the whole point of the daily loop.

### The Lens of the Compulsion Loop
A daily game lives or dies on the return loop: **anticipation → play → reward → rest → anticipation**. The midnight EST reset, "23 people already found today's album," streak counters, and "come back tomorrow" all feed this. The reward must feel worth the wait, and the rest period must build anticipation rather than frustration. Don't let unlimited tries dissolve the tension — the *reveal* is the scarce reward, not the attempts.

### The Lens of Reward
Reward types to deploy: praise (celebration screen), points/score, streaks (continuity pressure), collection cards, and the satisfaction of completion. Vary and stack them. A streak is one of the strongest daily-return mechanics — losing it should sting just enough to bring the player back.

### The Lens of Accessibility (Skill vs. Luck)
A guessing game balances knowledge (skill) against the difficulty curve. The progressive pixelation/blur is the difficulty dial — start hard so experts win fast and feel smart, then ease toward easy so casual fans still succeed and feel rewarded. Both ends must feel fair: never unguessable, never trivial.

### Applying the lenses
Before shipping a game feature, ask: Does it serve the essential experience (recognition thrill)? Is the feedback juicy? Does it strengthen the daily loop? If a feature is fun, fair, and feeds the return loop, it belongs. If not, cut it.

---

## 16. Typography in Practice

Section 5 defines the fonts (DynaPuff, Major Mono Display, Caveat, Noto Sans KR). This section covers how to *apply* type systematically. Korean text always uses `font-korean`.

### Establish a type scale
Most UIs use too many font sizes. Define a constrained scale up front and pick only from it (exact values: `tokens/typography.css`, `guidelines/type-scale.html`). Hand-picked practical scale, aligned with the spacing system (§13):

```
12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48 · 60 · 72
```

**Never use `em` for the scale** — nested elements compute to values outside your scale. Use `px` or `rem` (or Tailwind's `text-*` tokens). Puffy text-shadow presets are sized for specific type sizes — pick the preset that matches (`--puff-title` for titles, `--puff-name-*` for card names).

### Line length
For reading comfort, keep paragraphs between **45 and 75 characters per line**. In a wide content area, still constrain paragraph width even if surrounding elements are full-width.

### Line-height is proportional, two ways
- **Inversely proportional to font size**: small text needs taller line-height; large display text can use line-height 1 or close. Puffy DynaPuff titles run tight (leave room for the shadow stack below); body text looser.
- **Proportional to line length**: narrow columns can use ~1.5; wide columns may need up to 2.

### Baseline, not center
When mixing font sizes on one line (a large title beside smaller actions), align them by their **baseline**, not their vertical center.

### Letter-spacing
Tighten letter-spacing slightly on large display headings (DynaPuff titles, oversized Hangul 케이팝잇), and leave body text at its default. Major Mono Display labels are uppercase and tracked — the existing `letterSpacing: '0.3em'` label style is correct.

### Font families
A change in typeface signals a change in function — restraint reads as intentional. DynaPuff (display) + Major Mono Display (labels/meta) + Caveat (one handwritten aside per view) + Noto Sans KR (Korean only) is the whole system — don't introduce another.

---

## 17. Composition Principles (Design Elements — Timothy Samara)

These are the higher-level composition rules that sit above individual UI patterns.

### Have a concept, communicate don't decorate
Every element must carry meaning. Form that doesn't contribute to the message or composition is eye candy. Before adding a decorative element (sticker, tag, halftone, floating shape), ask what it communicates. In KpopIt these motifs *do* carry meaning — they signal the playful, fan-culture, toy-sticker personality — which is exactly why they earn their place. Decoration without purpose gets cut.

### Speak with one visual voice
Every element should reinforce every other — in shape, weight, placement, and concept. When one piece feels out of place, it disconnects and weakens the whole. The Puff Pop language (2px ink outline, pink body, solid offset, puffy lettering, light tilt) is KpopIt's unified voice; a soft gaussian-shadowed SaaS card — or a leftover dark Retro-Pop panel — would break it instantly.

### Fight the flatness — create tension through opposition
A composition where everything is the same size, weight, and distance is dead. Create depth and energy through deliberate *contrast*: cluster some elements and push others apart, make some advance and others recede. Puff Pop's tilt system is this principle applied — controlled opposition, not randomness.

### The seesaw method (congruence vs. opposition)
Relationships between elements work through balanced tension: establish some *congruence* (shared shape, alignment, color) and balance it with *opposition* (contrast in size, value, direction). Too much congruence = monotone; too much opposition = chaos. This is how alternately tilted cards stay cohesive — they share outline, radius, body and offset.

### Beware symmetry
Symmetry reads as static, traditional, and sometimes lazy. When symmetry is used, counteract its stiffness with scale contrast or rotation.

### Do it on purpose — trust the eye, not the measurement
Optical perception beats mathematical measurement. A circle and a square of identical pixel dimensions don't *look* the same size; equal mathematical spacing doesn't always *look* equal. If two elements are aligned by the numbers but look misaligned, fix it by eye. Decisiveness reads as confident design.

---

## 18. Open Decisions

Not final yet — implement behind a prop/flag with the noted default so either option can ship:

| Decision | Options | Default |
|---|---|---|
| Idol page corners | sharp vs soft | **soft** (`--r`) |
| Idol photo frame | single vs double pink frame | **single** |

---

## 19. Source of Truth

- Design changes are made in the **KpopIt Design System** first (`docs/design-system/`), then synced into this file.
- If a value in DESIGN.md and `docs/design-system/tokens/*.css` disagree, **the token file wins**.
- Don't invent new colours, radii or shadows in code — add them to the design system, then port the token.
- DESIGN.md is a baseline, not a cage: a feature may intentionally diverge (e.g. the collection flip-book) when the owner asks — record the divergence and, if it becomes the new baseline, update the design system and this file.
