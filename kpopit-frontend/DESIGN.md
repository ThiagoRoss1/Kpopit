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
