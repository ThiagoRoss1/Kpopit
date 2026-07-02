---
name: KpopIt
description: A Wordle-inspired daily K-pop idol guessing game with a modern retro-pop aesthetic
version: 1.0.0
tags: [game, kpop, wordle, daily-challenge, idol-guessing, web-game]
---

# KpopIt — Design System

> **How to use this file:** Visual reference for the KpopIt frontend. Read before creating or modifying any UI component. Keeps consistency across all pages and features.

---

## 1. Project Overview

**KpopIt** is a Wordle-inspired daily K-pop idol guessing web game. Players try to guess the featured idol of the day based on attribute clues (Classic Mode) or by identifying an increasingly unblurred photo (Blurry Mode). All players worldwide share the same daily idol, resetting at midnight EST.

The game features idols from popular K-pop groups including TWICE, BLACKPINK, NewJeans, IVE, aespa, LE SSERAFIM, ITZY, and many more.

---

## 2. Design Philosophy

The KpopIt visual identity blends **modern dark UI** with **retro-pop personality**. The interface should feel:

- **Bold and confident** — thick borders, solid offset shadows, uppercase display typography
- **Atmospheric, not flat** — subtle textures, layered elements, dark base with neon accents
- **K-pop fan culture** — pink as the dominant color, Korean typography elements, playful but polished

Avoid the generic "AI-generated SaaS" look — no soft gaussian shadows, no bubble-rounded everything, no excessive glow effects. When in doubt, choose **solid over blurred**, **bold over subtle**, **playful over corporate**.

The aesthetic borrows from Y2K design (chunky borders, solid color blocks), retro arcade games (offset shadows, press-down buttons), and modern dark mode UIs (deep blacks, neon accents). The result is a game that feels alive, fun, and unmistakably K-pop.

---

## 3. Frontend Stack

- **React 19** + **TypeScript 5.8**
- **Tailwind CSS 4** — utilities for layout, color, spacing, and most visual effects
- **CSS files** — only for keyframe animations and complex effects not covered by Tailwind
- **Framer Motion** — component animations
- **Lucide React** — icons
- **React Router 7** — navigation
- **TanStack Query 5** — server state management

> Chakra UI is listed in `package.json` (legacy from early development) but is **not used**. Do not import or add Chakra components.

---

## 4. Colors

### Main palette

```css
/* Defined in index.css @theme */
--color-neon-pink: #FF3399;

/* Tailwind usage */
text-neon-pink
bg-neon-pink
border-neon-pink
```

| Name | Hex | Usage |
|---|---|---|
| Neon Pink | `#FF3399` | Primary color — CTAs, highlights, active borders |
| Secondary Pink | `#EF1F72` | Auth pages, active tab backgrounds, action buttons |
| Deep Pink | `#e70a7d` | Logo, accent gradients |
| Dark Pink | `#b43777` | Secondary elements, icons |
| Coral Pink | `#ec4850` | Logo gradient end |
| Background Dark | `#0a0a0a` | Main page background |
| Background Panel | `#111111` | Panels, cards, modals |
| Background Input | `#1a1a1a` | Inputs, form fields |
| Border Default | `#2a2a2a` | Default border for inputs and cards |
| White | `#ffffff` | Primary text |
| Gray Text | `#888888` | Secondary text, placeholders |

### Logo gradient

The site logo "Kpopit" uses a vertical gradient from deep pink to coral pink:

```css
background: linear-gradient(180deg, #e70a7d, #ec4850);
```

### Default page background

```css
background: linear-gradient(#0a0a0a 30%, #0a0a0a 100%);
```

---

## 5. Typography

### Fonts

| Font | Usage |
|---|---|
| **DynaPuff** | Default site font for most UI elements |
| **Tailwind sans** (`font-sans`) | Currently used as the most common alternative — clean and neutral |
| **Noto Sans KR** | Always used for Korean/Hangul text — `font-korean` class |
| **Arial / Helvetica** | Fallback for plain text — `normal-font` class |

```tsx
// Default DynaPuff (applied globally on body)
<p>Default text</p>

// Tailwind sans
<p className="font-sans">Clean text</p>

// Korean text — always Noto Sans KR
<span className="font-korean">아이돌</span>

// Plain Arial fallback
<span className="normal-font">Plain text</span>
```

### Typography hierarchy

Hierarchy is contextual — choose the font and weight that fits the page. The only strict rule:

- **Korean text always uses `font-korean`** (Noto Sans KR)

Beyond that, font choice depends on the section's tone (display retro-pop vs clean modern).

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

## 7. Visual Patterns — Modern Retro-Pop

### Borders

```tsx
// Tailwind classes
border-2 border-[#2a2a2a]      // default
border-[3px] border-neon-pink  // active/focus
border-4 border-neon-pink      // emphasis
```

Border thickness scale: `1px`, `2px`, `3px`, `4px`. Avoid borders thicker than `4px` unless intentional.

### Shadows

Solid offset shadows are the primary style for cards, buttons, and UI elements — they reinforce the retro-pop aesthetic. Gaussian blur shadows (`drop-shadow-*`, `backdrop-blur-*`) are acceptable for icons, overlays, and modal backdrops.

Tailwind uses bracket notation for custom shadows:

```tsx
// Soft retro shadow — cards, buttons
shadow-[4px_4px_0px_#000]

// Strong retro shadow
shadow-[6px_6px_0px_rgba(255,51,153,0.25)]

// Text shadow
[text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]

// Multiple stacked text shadows
[text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]

// Gaussian drop shadow — icons, decorative elements
drop-shadow-lg

// Backdrop blur — modal/overlay backgrounds
backdrop-blur-2xl
```

**Rule:** Always use Tailwind utilities for shadows. CSS files only for complex animations.

### Border radius

Use what fits the design — there's no hard cap on border radius. Pills (`rounded-full`) for toggles, larger radius for friendly cards, smaller radius for sharp retro-pop elements.

---

## 8. Animations

### Decision rule

- **Tailwind** — everything except keyframe animations (colors, spacing, hover, focus, transforms, transitions)
- **CSS files** — keyframe animations only (`@keyframes`, complex multi-step animations)
- **Framer Motion** — component-level enter/exit, page transitions, complex interactive animations

### Existing keyframe animations

```css
/* Star twinkle background */
@keyframes twinkle {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.06); }
}
.star-twinkle { animation: twinkle 4s ease-in-out infinite; }

/* Profile entry */
@keyframes profileEntry {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Logo glow effect

The `.logo::after` pseudo-element uses `filter: blur(10px)` with reduced opacity to create a soft depth glow behind the logo text. This is the only place `filter: blur()` is used for a decorative/depth purpose on a UI element — it is not a shadow substitute for other components.

```css
.logo::after {
  background: linear-gradient(180deg, #e70a7d, #ec4850);
  filter: blur(10px);
  opacity: 0.6;
}
```

### Standard durations

```
Micro-interactions (hover, focus): 0.15s ease
State transitions: 0.2-0.3s ease
Entry animations: 0.4-0.6s ease-out
Loop animations: 4s ease-in-out infinite
```

---

## 9. Custom Scrollbar

The site uses a custom pink gradient scrollbar defined in `index.css`:

```css
::-webkit-scrollbar { width: 8px; background: #000; }
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #b43777, #ec4850);
  border-radius: 10px;
}
```

Selection color is also custom:

```css
::selection { background: #b43777; color: white; }
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

**Kpopit implication:** `#FF3399` is both high-chroma and light in value simultaneously — rare and exactly why it reads as neon. On a dark `#111111` base it maximizes contrast on all three axes at once.

### Color Harmonies

- **Complementary**: 180° apart. Maximum contrast and vibrancy. Use for accents and CTAs, never for large adjacent areas (visual vibration). Kpopit: `#FF3399` ↔ green-cyan `~#33FF99`
- **Analogous**: within 30–60°. Calm, cohesive. Kpopit: pink → purple → blue — used for secondary UI and shadow undertones
- **Triadic**: 120° apart. Balanced and energetic; one hue dominant, two as accents
- **Split-complementary**: a color + the two neighbors of its complement. Strong contrast with less tension than pure complementary
- **Monochromatic**: single hue, varying chroma and value. Safe, elegant, cohesive

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

**Critical rule:** Pure black (`#000`) in shadows is almost always wrong. Shadows contain reflected light — they have color and are never fully dark. Use undertoned darks instead (e.g. `#0d0008`).

### Lighting Model (Key / Fill / Rim)

All 3D surfaces follow three-point lighting:

- **Key light**: warm (`#FFF0C8`), top-right, opacity 0.15–0.20 — defines form. The dominant source.
- **Fill light**: cold (`#B4D2F0`), left/bottom-left, opacity 0.10–0.14 — fills shadows. Always opposing temperature to the key.
- **Rim light**: near-white (`#FFFFFF`), edge only, opacity 0.06–0.09 — separates element from background.
- **Vignette**: black, radial center→edge, opacity 0.45–0.55 — seats the object in space.

**Non-negotiable rule:** Key and fill must ALWAYS be opposing temperatures. Two warm or two cool sources = flat, lifeless result.

**Shadow undertone:** `#0d0008` (dark purple) — complementary to the warm key light, adds depth without pure black.

**Tonal separation:** In direct light, maintain ~4–5 value steps between fully lit and fully shadowed zones. Less = flat/diffuse. More = dramatic/harsh.

### Local Color vs Perceived Color

**Local color** = the true surface color under neutral white light.
**Perceived color** = local color modified by light temperature, intensity, reflected surroundings, and atmosphere.

You never render local color directly — you always modulate it. A "black" vinyl under warm light has orange-brown highlights and purple-blue shadows, not gray halftones.

### Saturation in Light and Shadow

- Highlights desaturate toward the light source's color (toward white/warm)
- Shadows saturate toward the complementary / ambient color
- Never use pure neutral gray for shadows on colored surfaces — tint them toward the complement
- **Chromatic grays** (mixed from complementary pairs: blue+orange, red+green) are far richer than pure neutral grays. They maintain hue identity at low chroma.

### Gradation

Color never appears flat in nature. It always transitions in hue, chroma, or value — even subtly. A flat color reads as artificial or graphic. CSS radial/linear gradients simulate natural gradation; this is why they read as more realistic than flat fills.

### Opacity as Intensity

Control light strength via rgba opacity, not color changes:

- `0.05–0.08`: subtle, near-imperceptible when static — texture/rim detail
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

**Kpopit gamut:**

- Primary 1: `#FF3399` — neon pink, warm-red quadrant, high chroma
- Primary 2: `#b4d2f0` — cold blue-gray, fill light / ambient shadow
- Primary 3: `#0d0008` — dark purple shadow undertone
- Subjective neutral: desaturated warm-cool mid-gray (~`#8a8490`)
- **Excluded**: pure greens, pure yellows, saturated oranges — these break the retro-pop color mood

### Color Accent

A color accent is a small high-chroma element in a neutral or monochromatic field. It draws the eye immediately and doesn't need to be large. It's usually the complement or near-complement of the dominant color.

`#FF3399` functions as Kpopit's color accent — it sits in a dark neutral field and vibrates because it's the complement of that field's cool undertone. Overusing it collapses the effect.

### Contrast & Accessibility

- Value (lightness) contrast matters more than hue contrast for readability
- WCAG minimums: 4.5:1 for normal text, 3:1 for large text
- `#FF3399` on `#111111` passes; never put `#FF3399` text on white without darkening it first

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

### CSS imports

```tsx
import './page_name.css';
// Imported in the component that uses the keyframe animations
```

### Tailwind + CSS together

```tsx
// Tailwind for layout, colors, basic states
className="flex flex-col bg-[#111111] border-[3px] border-neon-pink rounded-xl
  hover:scale-105 transition-transform duration-300
  shadow-[6px_6px_0px_rgba(255,51,153,0.25)]"

// CSS class for keyframe animation
className="modal-enter"  // defined in page_name.css
```

### Avoid

- Don't put static colors, spacing, sizing, or shadows in CSS files — use Tailwind utilities. Exception: runtime-driven color values (e.g. CSS custom properties set by JS for animation, as in `guessgrid.css`) are acceptable in CSS when Tailwind cannot handle it dynamically.
- Don't use gaussian blur shadows for cards/buttons — use solid offset shadows for retro-pop. Blur is acceptable for icons, overlays, and modal backdrops (see Shadows section).
- Don't use fonts beyond the design system without discussion

---

## 12. Visual Hierarchy

Hierarchy is the single biggest factor in making an interface feel "designed." When everything competes for attention, the result is noise. Deliberately emphasizing what matters and de-emphasizing the rest does more than any color or font choice.

### Hierarchy is built from three levers, not one
Don't lean on font size alone — it leads to oversized primary text and unreadable secondary text. Combine three tools:
- **Size** — larger = more important, but use sparingly
- **Weight** — a heavier weight (600–700) emphasizes without enlarging; keep body at 400–500
- **Color/contrast** — a softer color de-emphasizes without shrinking

Stick to two or three text levels: primary, secondary, tertiary. In the **dark theme** this is white → muted grey (`#888888`) → lighter grey; in the **light retro-pop theme** it inverts → near-black ink → mid grey → soft grey. The principle is the same in both: each step is reduced contrast against its own background. Avoid font weights under 400 for UI text — they're only acceptable for large display headings (the DynaPuff branding can go lighter).

### Emphasize by de-emphasizing
When a primary element won't stand out no matter what you add to it, stop adding — instead soften everything competing with it. An active nav item pops not by getting louder, but by muting the inactive items. A main content area wins when the sidebar loses its background and sits flat on the page.

### Don't use grey text on colored backgrounds
Grey-on-white works because it's *reduced contrast*, not because it's grey. On a colored background (or Kpopit's `#FF3399` panels), don't use grey or transparent white — it looks washed out and disabled, and over images the background bleeds through. Instead, hand-pick a color with the **same hue** as the background, then adjust saturation and lightness until contrast feels right. This keeps the text crisp, not faded.

### Action hierarchy (buttons)
Semantics are secondary to hierarchy. Every page has a pyramid: one primary action, a few secondary, some tertiary.
- **Primary**: solid high-contrast background — in Kpopit, solid `#FF3399` with the retro offset shadow
- **Secondary**: outline or low-contrast background
- **Tertiary**: styled like a link

A destructive action isn't automatically big and red. If it's not the primary action, give it secondary/tertiary treatment, and save the bold red styling for the confirmation step where deleting *is* the primary action.

### Labels are a last resort
Data often reads without a label — a date, a percentage, or a score is obvious from its format. When a label is needed, fold it into the value ("3 guesses left", not "Guesses: 3"; "won by 23 players", not "Players: 23"). When a true label is unavoidable (a stats panel or leaderboard), treat it as secondary: smaller, lighter, lower contrast. The data is what matters.

### Balance weight and contrast
Heavy elements (bold text, solid icons) draw the eye. To balance an icon against text, lower the icon's contrast with a softer color. Conversely, to emphasize a too-subtle element (a thin 1px border), increase its weight (width) rather than darkening it into harshness.

---

## 13. Layout & Spacing

### Start with too much white space, then remove
White space should be *removed*, not added. Designers default to giving elements the minimum room to "not look bad" — but great design needs more breathing room. Start with too much space and pull it back until it feels right; what looks like "a little too much" on one element reads as "just enough" in a full UI. Dense layouts (a stats panel, a leaderboard, the Kpopit guess list) are valid, but make density a deliberate choice, not a default.

### Establish a spacing & sizing system
Never nitpick between 120px and 125px. Define a constrained scale up front and only pick from it. A linear "everything is a multiple of 4px" scale isn't enough — the system must respect *relative* difference: no two adjacent values should be closer than ~25%. Start from a base of 16px (browser default, divides cleanly) and grow with widening gaps:

```
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 192 · 256
```

Kpopit already defines custom breakpoints (section 6) — apply the same systematic discipline to spacing. Tailwind's default spacing scale already follows this principle; prefer its tokens over arbitrary bracket values.

### Avoid ambiguous spacing
When elements are grouped without a visible border, spacing alone communicates grouping. **Always make the space around a group larger than the space within it.** A form label must sit closer to its own input than to the next field. A section heading needs more space above it than below. This applies horizontally too. Ambiguous spacing forces the user to work harder — and looks worse.

### You don't have to fill the screen
If a layout only needs 600px, use 600px. Don't make something full-width just because the nav is. Give each element only the space it needs. When a narrow component feels unbalanced in a wide layout, split it into columns rather than stretching it.

### Relative sizing doesn't scale
Don't lock element sizes to each other with `em` ratios across breakpoints. A 2.5em headline that's perfect on desktop becomes absurd on mobile. Large elements must shrink *faster* than small ones — the gap between big and small should compress at smaller screens. The same applies within a component: a button's padding should grow generously at large sizes and tighten disproportionately at small sizes, so a large button feels genuinely larger, not just zoomed. (Reinforces Kpopit's mobile-first rule from CLAUDE.md.)

### Grids are a tool, not a master
A 12-column grid brings order, but don't outsource every layout decision to it. Give components the width they actually need; cap them with a max-width so they don't sprawl, and only force them smaller when the screen demands it. Don't be a slave to the grid — especially relevant for Kpopit's intentionally off-kilter, tilted retro-pop compositions (the chaos/tilt system), which deliberately break grid rigidity.

---

## 14. Depth & Dimensionality (Retro-pop + Modern)

Kpopit's aesthetic is built on **solid offset shadows** (section 7) — a flat, retro-pop depth language. This section extends that with the underlying physics so depth stays consistent across components, and clarifies when to use flat-retro depth vs. emulated-light depth. Depth cues read differently per theme: solid offset shadows in dark colors work on the light retro-pop theme; on the dark theme the same offset shadow needs a lighter or colored cast (or a neon-pink offset) to stay visible against the dark background.

### Light comes from above
The brain reads depth from a single assumption: light comes from above. A raised element has a lighter top edge (angled toward the light) and a darker bottom edge. An inset element is the reverse — dark at the top (light blocked), light at the bottom. To make anything feel raised or recessed, mimic this. (This is the same key-light logic documented in section 10's Lighting Model — top-right key in Kpopit's case.)

### Shadows convey elevation on a z-axis
Shadow size maps to distance from the surface, and closer = more attention:
- **Small, tight shadow** → slightly raised (buttons)
- **Medium shadow** → floating above UI (dropdowns)
- **Large, diffuse shadow** → close to the user (modals)

Define a fixed elevation scale (≈5 shadows, smallest to largest) just like the spacing system. **For Kpopit**: the retro-pop solid offset shadow (`shadow-[4px_4px_0px_#000]`) is the default flat-depth treatment for cards and buttons. Reserve blurred/diffuse shadows for modals and overlays (consistent with section 7).

### Interactive shadows
Shadows are feedback, not just decoration. A pressed button drops to a smaller shadow (or removes it) to feel pushed into the page — this is core to the retro arcade "press-down" personality. A dragged item gains a shadow to pop forward. Think in terms of where the element sits on the z-axis, then assign the shadow.

### Two-part shadows (for modern-depth components)
A realistic shadow combines two: a larger, softer, low-opacity shadow for the diffuse ambient cast, plus a tighter, darker shadow for the sharp contact edge. The tight contact shadow should fade as elevation increases (distinct at low elevation, nearly invisible at high). Use this only on modern-depth components (modals, overlays) — not on flat retro-pop cards, which use the solid offset.

### Flat designs still have depth
Even without shadows, depth comes from two sources:
- **Color**: lighter elements feel closer, darker feel further (consistent with section 10 — warm/light advances, cool/dark recedes). To raise an element, push it *away* from the background's lightness toward the viewer: in the **dark theme** make it lighter than its background; in the **light retro-pop theme** a raised element is often defined by its border and offset shadow rather than going darker, since going darker on white reads as inset. Invert the logic per theme — the rule is "contrast against background = elevation," not "lighter = up" in absolute terms.
- **Overlap**: overlapping elements create instant layering. Offset a card so it crosses two backgrounds, or make an element taller than its parent so it overlaps both edges. When overlapping images, give them an "invisible border" matching the background color so they don't clash.

Overlap is especially powerful for Kpopit's sticker/washi-tape/polaroid motifs — the tape straddling a card edge is exactly this layering principle.

---

## 15. Game Design Principles (The Art of Game Design — Jesse Schell)

Kpopit is a game, not just a website. These "lenses" — questions to interrogate the design — are the ones most relevant to a daily guessing game.

### The Lens of the Toy
Is the core interaction fun *before* you add rules and goals? A toy is fun to play with for its own sake. The guessing input, the pixel-reveal, the vinyl spin — these should feel satisfying to touch and watch even outside a "win." If the moment-to-moment interaction isn't pleasurable, no scoring system will save it.

### The Lens of Essential Experience
Define the feeling you're selling, then make every element serve it. Kpopit's essential experience: *the daily thrill of recognition* — that "I know this!" spark when a blurred photo or pixelated cover resolves into a familiar idol/album. Every design decision (reveal pacing, feedback, celebration) should amplify that spark.

### The Lens of Feedback (Juiciness)
Every player action needs immediate, satisfying feedback. A correct guess should feel *celebratory* — color, motion, sound-like visual punch. A wrong guess should inform without punishing. Kpopit's `PixelCluster` (green/red shrapnel) and the pixel-reveal steps are feedback moments — make them juicy, not flat. Disproportionately reward the win: the payoff is the whole point of the daily loop.

### The Lens of the Compulsion Loop
A daily game lives or dies on the return loop: **anticipation → play → reward → rest → anticipation**. The 00:00 KST reset, "23 people already found today's album," streak counters, and "come back tomorrow" all feed this. The reward must feel worth the wait, and the rest period (no more puzzle today) must build anticipation rather than frustration. Don't let unlimited tries dissolve the tension — the *reveal* is the scarce reward, not the attempts.

### The Lens of Reward
Reward types to deploy: praise (celebration screen), points/score, streaks (continuity pressure), and the satisfaction of completion. Vary and stack them. A streak is one of the strongest daily-return mechanics — losing it should sting just enough to bring the player back.

### The Lens of Accessibility (Skill vs. Luck)
A guessing game balances knowledge (skill) against the difficulty curve. The progressive pixelation/blur is the difficulty dial — start hard (high pixelation, res 4) so experts win fast and feel smart, then ease toward easy so casual fans still succeed and feel rewarded. Both ends must feel fair: never unguessable, never trivial.

### Applying the lenses
Before shipping a game feature, ask: Does it serve the essential experience (recognition thrill)? Is the feedback juicy? Does it strengthen the daily loop? If a feature is fun, fair, and feeds the return loop, it belongs. If not, cut it.

---

## 16. Typography in Practice

Section 5 defines the fonts (DynaPuff, font-sans, Noto Sans KR). This section covers how to *apply* type systematically. Korean text always uses `font-korean` (per section 5) — that rule is unchanged.

### Establish a type scale
Most UIs use too many font sizes. Define a constrained scale up front and pick only from it. A linear scale doesn't work — small jumps matter at the bottom, but nobody needs to choose between 46px and 48px. A purely modular scale (ratio-based) produces fractional pixel values and too few mid-range sizes for interface work. Hand-pick a practical scale instead, aligned with the spacing system (section 13):

```
12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48 · 60 · 72
```

**Never use `em` for the scale** — nested elements compute to values outside your scale. Use `px` or `rem` (or Tailwind's `text-*` tokens, which already follow this). This reinforces CLAUDE.md's existing stance against arbitrary `rem` where Tailwind alternatives exist — prefer the Tailwind type tokens.

### Line length
For reading comfort, keep paragraphs between **45 and 75 characters per line**. Wider is risky; narrower fragments the text. In a wide content area, still constrain paragraph width even if surrounding elements are full-width — mixing widths looks more polished, not less.

### Line-height is proportional, two ways
- **Inversely proportional to font size**: small text needs taller line-height (helps the eye find the next line); large display text can use line-height 1 or close. Kpopit's oversized DynaPuff headings should run tight; body text looser.
- **Proportional to line length**: narrow columns can use ~1.5; wide columns may need up to 2 so the eye doesn't lose its place jumping back.

### Baseline, not center
When mixing font sizes on one line (a large title beside smaller actions), align them by their **baseline**, not their vertical center. The baseline is an alignment reference the eye already perceives — centering offsets the baselines and looks subtly wrong, especially when the sizes are close.

### Letter-spacing
Fonts are spaced for an intended size. Tighten letter-spacing slightly on large display headings (DynaPuff branding, the oversized Hangul 케이팝잇), and leave body text at its default. All-caps labels (Kpopit uses uppercase tracking-heavy labels) benefit from increased letter-spacing for legibility — the existing `letterSpacing: '0.3em'` style on labels is correct.

### Two font families maximum
A change in typeface signals a change in function — restraint reads as intentional. One family across many weights is often enough; a second for contrast is fine. Kpopit's DynaPuff (display/retro-pop) + font-sans (clean/modern) + Noto Sans KR (Korean only) is exactly this discipline — don't introduce a fourth.

---

## 17. Composition Principles (Design Elements — Timothy Samara)

These are the higher-level composition rules that sit above individual UI patterns. They come from graphic design tradition and apply to every Kpopit page as a whole.

### Have a concept, communicate don't decorate
Every element must carry meaning. Form that doesn't contribute to the message or composition is eye candy. Before adding a decorative element (sticker, washi tape, floating shape), ask what it communicates. In Kpopit these motifs *do* carry meaning — they signal the playful, fan-culture personality — which is exactly why they earn their place. Decoration without purpose gets cut.

### Speak with one visual voice
Every element should reinforce every other — in shape, weight, placement, and concept. When one piece feels out of place, it disconnects and weakens the whole. The retro-pop language (offset shadows, thick borders, Hangul, washi tape) is Kpopit's unified voice; a soft gaussian-shadowed SaaS card would break it instantly.

### Fight the flatness — create tension through opposition
A composition where everything is the same size, weight, and distance is dead. Create depth and energy through deliberate *contrast*: cluster some elements and push others apart, make some advance (light/warm/large) and others recede (dark/cool/small). Kpopit's intentional tilt/chaos system is this principle applied — controlled opposition, not randomness.

### The seesaw method (congruence vs. opposition)
Relationships between elements work through balanced tension: establish some *congruence* (shared shape, alignment, color) and balance it with *opposition* (contrast in size, value, direction). Too much congruence = monotone and "enslaved"; too much opposition = disconnected chaos. As you increase contrast somewhere, reinforce a shared trait elsewhere to keep unity. This is how the tilted guess rows stay cohesive despite their angles — they share border, shadow, and pill shape.

### Beware symmetry
Symmetry reads as static, traditional, and sometimes lazy. Kpopit's off-axis, tilted, asymmetric compositions are deliberately anti-symmetric — that's the retro-pop energy. When symmetry is used, counteract its stiffness with scale contrast or rotation.

### Do it on purpose — trust the eye, not the measurement
Optical perception beats mathematical measurement. A circle and a square of identical pixel dimensions don't *look* the same size; equal mathematical spacing doesn't always *look* equal. If two elements are aligned by the numbers but look misaligned, the numbers don't matter — fix it by eye. Decisiveness reads as confident design; ambiguity reads as insecurity. Always make placement look intentional.
