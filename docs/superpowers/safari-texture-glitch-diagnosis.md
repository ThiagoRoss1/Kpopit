# Safari Album Texture Glitch — Diagnosis & Minimal Fix Proposal (2026-08-09)

Companion to `safari-texture-glitch-briefing.md`. **Diagnosis only — no source files were
edited.** A second engineer implements from the proposal in the last section.

Scope reminder: the fix must be **Safari-only**, change **nothing visually** on any browser,
keep `.album-card-isolate` (`isolation: isolate; contain: paint`), and make no git commit.

---

## 0. The relevant DOM/CSS shape

A treated card (`AlbumMemberCard.tsx`) / group photo (`AlbumGroupIntroPage.tsx`,
`CardZoomModal.tsx`) is:

```
.album-card-isolate            isolation: isolate; contain: paint   ← single flattening group
  TextureFill (gold):
    <img.album-gold-base>       plain raster (gold.jpg)
    <span.album-gold-tint>      mix-blend-mode: overlay;  transform: translateZ(0)
    <span.album-gold-sheen>     mix-blend-mode: screen;   transform: translateZ(0); animation
  TextureFill (holo):
    <span.album-holo-fill>      animation (bg-pos + filter: hue-rotate); transform: translateZ(0)
  content div (NOT promoted):
    <img> the actual member/group PHOTO           ← paints into the isolate backing store
  HoloLaminate (holo only):
    <span.album-holo-overlay>   mix-blend-mode: screen; animation (+ hue-rotate); translateZ(0)
    <span.album-holo-foil>      mix-blend-mode: overlay; transform: translateZ(0)
    <span.album-holo-glare>     mix-blend-mode: screen; animation; transform: translateZ(0)
```

The whole card lives inside a **rotating `preserve-3d` leaf**:
`.album-leaf { transform-style: preserve-3d; will-change: transform }` →
`.album-leaf-face { backface-visibility: hidden }` (front uses `transform-gpu`, back uses
`rotateY(180deg) translateZ(0)`).

The single most important structural fact: **every treatment layer carries its own
`transform: translateZ(0)`**, which asks WebKit for a *separate compositor backing store* per
layer. The underlying **photo `<img>` is NOT promoted** — it paints into the
`.album-card-isolate` backing store. So a treated card is composited as:

> `[isolate backing store: frame + PHOTO]` + `[N separate promoted blend/filter layers on top]`

`base` has **zero** promoted layers and **no** blend/filter → the card is one backing store,
photo included. That is why base is flawless.

---

## 1. Why the glitch scales base → gold → holo, and why "animations on" is far worse

Tie each symptom to a specific mechanism:

### The scaling (base none → gold some → holo worst)
It scales with **the number of separately-promoted `translateZ(0)` blend layers that must be
composited against a backdrop during the 3D rotation**:

- **base** — 0 promoted layers, no `mix-blend-mode`, no `filter`. One backing store, painted as
  a unit with the leaf face. Nothing to race, nothing to blend against an unpainted backdrop.
  **Flawless — always.**
- **gold** — 2 promoted blend layers: `.album-gold-tint` (`overlay`) and `.album-gold-sheen`
  (`screen`), each `translateZ(0)`. Two extra backing stores that Safari composites and blends
  against the card's backdrop while the leaf rotates.
- **holo** — up to **5** promoted layers (`.album-holo-fill`, `.album-holo-overlay`,
  `.album-holo-foil`, `.album-holo-glare`, badge fill) **plus an animated
  `filter: hue-rotate`** on `.album-holo-fill`/`.album-holo-overlay`. Most backing stores, plus
  a per-frame re-rasterizing layer. **Worst.**

The number of independent backing stores that must be allocated-then-painted-then-blended at the
exact moment the leaf is inserted into the 3D scene *is* the glitch magnitude.

### The two concrete symptoms

- **Gold: "white flash / glitch ABOVE the image, then the animation starts."**
  `.album-gold-sheen` (and `.album-holo-overlay`/`.album-holo-glare` on holo) use
  `mix-blend-mode: screen` over near-white gradient stops (`rgba(255,255,255,0.9)` etc.). On the
  first composited frame after the leaf mounts, the promoted sheen layer has a backing store but
  the card's *backdrop* (photo) backing store is **not painted yet**. `screen` blended against an
  empty/near-transparent backdrop resolves toward **white** → a white sheet "above the image."
  Once the backdrop paints a frame later, the blend resolves correctly and the sweep animation
  proceeds. The flash is literally the screen-blend layer compositing ahead of its backdrop.

- **Holo / group_photo: "only the holo texture shows, then ~1s later the photo appears" (100% for
  group photos, ~70–80% for stickers).**
  `.album-holo-fill`/`.album-holo-overlay` are `absolute inset-0` promoted layers with an
  **animated `filter: hue-rotate`** (`@keyframes album-holo-shimmer`, lines 80–89). Because they
  are promoted *and* continuously animating a `filter`, WebKit rasterizes and composites them
  **immediately and every frame** — they win the paint race. The underlying photo lives in the
  large, non-animated `.album-card-isolate`/leaf-face backing store, which WebKit defers under the
  raster pressure of the active filter animation. Result: the promoted rainbow layer is on screen
  while the photo backing store is still pending → "only the holo texture area shows," then the
  deferred backing store finally paints (~1s) and the photo appears. It is 100% on group photos
  because the group-photo card is the **largest** backing store (`h-62.5 w-full`), so its deferred
  paint is the most expensive and the most reliably starved.

### Why "animations on" makes it far worse
With animations off, there is **no `filter` animation forcing continuous re-raster**, so no
promoted layer monopolizes the raster budget and no layer wins a paint race against the photo —
you only get a **1-frame** blend-against-unpainted-backdrop flash ("flashes for a millisecond,
then normal"). With animations **on**, the animated `filter: hue-rotate` (and to a lesser degree
the animated `background-position` on the screen-blend layers) keeps its promoted layer perpetually
"fresh" and prioritized, which is exactly what starves the photo's backing store for ~1s. The
`filter` animation is the amplifier; the per-layer `translateZ(0)` promotion is what makes the
photo a *separate*, starvable layer in the first place.

### The "pisca"/blink right before the page turns
The leaf subtree mounts (`flip` set) with `will-change: transform` and `preserve-3d`. On that first
composite WebKit must **allocate all the promoted backing stores** for the treated card (2 for
gold, ~5 for holo) before any of them is painted. The gap between allocate and paint is one or
more blank/blend-against-nothing frames — a blink. `base` allocates **one** store, so there is no
visible gap.

---

## 2. Exact declarations responsible

**(a) Delays painting the underlying photo** — `AlbumMemberCard.css`:

- `@keyframes album-holo-shimmer` (lines 80–89): `filter: hue-rotate(0deg → 75deg)` — the animated
  `filter` is the primary cause of the ~1s photo starvation. It forces perpetual re-raster of a
  promoted layer that outranks the photo's backing store.
- `.album-holo-fill, .album-holo-overlay` (lines 99–116): `animation: album-holo-shimmer …` +
  `transform: translateZ(0)` — promotes the animated-filter content to its own backing store that
  covers `inset: 0` and races the photo.
- `.album-holo-glare` (152–168) and `.album-gold-sheen` (55–71): `animation … infinite` +
  `transform: translateZ(0)` + `mix-blend-mode: screen` — additional promoted animated layers.
- `.album-card-isolate` (6–9): `contain: paint; isolation: isolate` establishes the *photo's*
  backing store as a distinct, deferrable surface separate from the promoted children. (Keep it —
  it is load-bearing — but note it is what makes the photo a separable layer.)

**(b) Flash on flip** — near-white **`mix-blend-mode: screen`** layers compositing before their
backdrop is painted:

- `.album-gold-sheen` (line 69) `mix-blend-mode: screen` over `rgba(255,255,255,0.9)`.
- `.album-holo-overlay` (line 121) `mix-blend-mode: screen; opacity: 0.5`.
- `.album-holo-glare` (line 166) `mix-blend-mode: screen` over `rgba(255,255,255,0.5)`.
- Each paired with `transform: translateZ(0)` (their own backing store) so they can be composited
  ahead of the backdrop.
- Enabling condition in `AlbumOfCol.css`: `.album-leaf { will-change: transform }` +
  `transform-style: preserve-3d` + `.album-leaf-face { backface-visibility: hidden }` — the leaf
  mount that triggers the fresh multi-backing-store allocation.

The common denominator of (a) and (b) is the **per-layer `transform: translateZ(0)`** promoting
each blend/filter span into an independent backing store that composites out of step with the
photo it sits on.

---

## 3. Verdict on the WIP image-readiness / decode machinery

The owner is correct: **images are not the cause** (base tier loads the identical photos instantly
and never glitches — the photo is decoded and available; the problem is compositing, not delivery).
Everything that treats decode/warmup as the fix is chasing a symptom.

| WIP piece | Verdict | Reason |
|---|---|---|
| `albumRevealReadiness.ts` (`prepareAlbumImages`, `waitForAlbumRenderFrame`) | **DELETE** | Decodes leaf-back `<img>`s before rotating. The photo is already decoded (base proves it). Adds real latency to every Safari turn (`preparing` phase blocks the flip) and does not touch the compositing race. Pure symptom-chase. |
| `preparing` flip phase in `AlbumOfCol.tsx` (`FlipState.phase = 'preparing'`, the `useLayoutEffect` that calls `prepareAlbumImages`, `preparingRef`/`preparing` state, the Safari branch in `go`) | **DELETE / REVERT** to the old `landed: boolean` two-state model | Exists only to run `prepareAlbumImages`. Once decode-gating is gone it has no purpose and it slows Safari navigation. |
| `warmAlbumGroupImages` + the position-warming `useEffect` + `albumImageWarmup.ts` (`warmAlbumImage`) + Safari warming inside `jumpTo` | **DELETE** (harmless but useless) | A CDN prefetch. Not harmful, but it does nothing for the glitch and adds a Safari-only `jumpTo` code path + module. Remove to keep the revert clean; if the team wants prefetch it should be a separate, non-glitch PR. |
| `loading="eager"` on member/group imgs; `decoding="sync"` + `fetchPriority="high"` on group imgs (`AlbumMemberCard.tsx`, `AlbumGroupIntroPage.tsx`, `AlbumNextGroupPage.tsx`) | **REVERT** `decoding` to `async`; restore original `loading` | `decoding="sync"` forces a synchronous decode on the main thread — it can *add* jank and is itself a symptom-chase. It does not fix the composite race. Return these attrs to their pre-WIP values. |
| `collections.css` `[data-cards='border'] [data-treatment='gold'/'holo']` background fill | **KEEP** (unrelated) | This is a genuine base/border-tier visual fix (fills the `p-1.25` frame gap), not part of the glitch. Leave it. |

Net: delete the entire decode/warmup axis. It neither fixes the glitch nor is free.

---

## 4. Verdict on `useAlbumAnimationPhase` (negative animation-delay continuous phase)

**KEEP.** It is correct and worth keeping, independent of the glitch fix.

- It sets `--album-animation-delay: -{performance.now()}ms` once at mount and feeds it into the
  `animation-delay` of the gold/holo keyframed layers (the three `animation-delay:
  var(--album-animation-delay, 0ms)` lines added in the WIP). A negative delay starts a freshly
  mounted clone at the shared document-clock phase instead of at 0, so a card that mounts mid-turn
  is in phase with cards already on screen — no visible "restart" of the shimmer.
- It is **cheap** (one `useState` initializer, one CSS var, no ref, no WAAPI mutation) and
  **visually invisible** — it only aligns phase, never changes the animation itself.
- It correctly replaces the deleted `useSyncAlbumAnimations` (which mutated WebKit `Animation`
  `startTime` after promotion — fragile). The CSS-var approach avoids touching the compositor.
- It does **not** cause the glitch and does **not** fix it; it is orthogonal polish. Keep as-is.

Minor correctness note (not a bug): because each component instance reads `performance.now()` at
its own mount, two instances mounting a few ms apart differ by a few ms of phase — imperceptible
for 3.4s/4.2s loops. Fine.

---

## 5. Minimal Safari-only fix proposal

**Root cause to remove:** the per-layer `transform: translateZ(0)` on the treatment spans forces
each blend/filter layer into its **own** compositor backing store, separate from the photo. During
the 3D leaf composite those separate stores (a) blend against a not-yet-painted backdrop (white
flash) and (b) — with the animated `filter` — win the paint race and starve the photo (~1s). The
`.album-card-isolate` host **already** provides a single flattening group (`isolation: isolate;
contain: paint`); the per-layer `translateZ(0)` is redundant *for correctness* and actively
harmful on Safari. Removing it on Safari folds every overlay into the card's one backing store, so
the photo and its treatment paint **together** — no race, no blend-against-nothing.

`translateZ(0)` is a visual no-op (zero translation). Removing it moves **zero pixels** and leaves
the blend/filter output pixel-identical. This is why it is safe under the "no visual change" rule.

### Change 1 (primary) — drop the redundant per-layer promotion, Safari only

Gate with the existing `isSafari` (from `hooks/useIsDevice.tsx`) by stamping an attribute on the
album root, mirroring the existing `data-*` pattern in `AlbumOfCol.tsx`.

**`AlbumOfCol.tsx`** — on the `.album-stage` div (it already carried `data-turning`; add a static
engine flag):

```tsx
import { isSafari } from '../../../hooks/useIsDevice';
// ...
<div
  ref={albumStageRef}
  data-engine={isSafari ? 'webkit' : undefined}
  className="album-stage ..."
>
```

**`AlbumMemberCard.css`** — append one Safari-only block (do NOT edit the existing rules; the
`translateZ(0)` stays for every other browser):

```css
/* Safari-only: the per-layer translateZ(0) asks WebKit for a separate backing
   store per blend/filter layer, which races the photo's .album-card-isolate
   store during the 3D leaf composite (white screen-blend flash + ~1s photo
   starvation under the animated hue-rotate). .album-card-isolate already
   flattens the card into one layer, so the promotion is redundant here.
   translateZ(0) is a zero-pixel no-op — dropping it changes nothing visually. */
[data-engine='webkit'] .album-gold-tint,
[data-engine='webkit'] .album-gold-sheen,
[data-engine='webkit'] .album-holo-fill,
[data-engine='webkit'] .album-holo-overlay,
[data-engine='webkit'] .album-holo-foil,
[data-engine='webkit'] .album-holo-glare {
    transform: none;
}
```

> The card-zoom modal and group-intro page render the same treatment spans but are **not** inside
> `.album-stage`. Since these selectors key off `[data-engine='webkit']` on the stage, the zoom
> modal/group-intro instances outside the book won't be covered. That's acceptable — the glitch is
> a *3D-leaf-composite* artifact; static (non-rotating) instances don't exhibit it. If the zoom
> modal ever flashes on Safari too, prefer a global Safari feature-query wrapper instead:
> `@supports (-webkit-hyphens: none) { .album-gold-tint, … { transform: none } }`
> (`-webkit-hyphens` is a WebKit/Safari-only `@supports` probe among current browsers). Pick the
> `@supports` form if the team would rather not thread a prop; it is still Safari-only and needs no
> TSX change. **Recommendation: ship the `@supports (-webkit-hyphens: none)` variant** — it covers
> the book, the zoom modal and the group-intro page uniformly with a pure-CSS Safari gate and no
> TSX edit, which is the smaller, lower-risk change.

Recommended concrete form (pure CSS, no TSX):

```css
@supports (-webkit-hyphens: none) {
    .album-gold-tint,
    .album-gold-sheen,
    .album-holo-fill,
    .album-holo-overlay,
    .album-holo-foil,
    .album-holo-glare {
        transform: none;
    }
}
```

### Change 2 (only if Change 1 leaves a residual mount flash) — settle the card as one layer first

If, on device, a 1-frame blink still shows at leaf mount, promote the **card host** (not the child
layers) once on Safari so the whole flattened card is a single settled backing store before the
overlays blend:

```css
@supports (-webkit-hyphens: none) {
    .album-card-isolate {
        transform: translateZ(0);            /* one store for the whole card */
    }
}
```

This keeps exactly **one** promoted layer per card (down from 2/5), which is what base effectively
has. Apply only if needed — Change 1 alone should remove the race. Do **not** add both a host
promotion and child promotions; the point is one store, not more.

### What to DELETE from the current WIP (symptom-chasing)

1. `albumRevealReadiness.ts` (whole file) + its imports.
2. The `preparing` flip phase: revert `FlipState` to `{ direction, landed: boolean }`, remove the
   `prepareAlbumImages` `useLayoutEffect`, `preparingRef`, `preparing` state, `leafBackRef`, and
   the `isSafari ? 'preparing' : 'turning'` branch in `go` — restore the pre-WIP two-state turn.
3. `albumImageWarmup.ts` (whole file), `warmAlbumGroupImages`, the position-warming `useEffect`,
   and the Safari warming branch inside `jumpTo` (restore `jumpTo` to the simple
   `setPosition(clamp(...))`).
4. `decoding="sync"` (→ `async`) and revert `loading` to the originals (`lazy`) on the member card
   and group-photo `<img>`s in `AlbumMemberCard.tsx`, `AlbumGroupIntroPage.tsx`,
   `AlbumNextGroupPage.tsx`. `fetchPriority="high"` is harmless but unnecessary — drop for cleanliness.

### KEEP from the WIP
- `useAlbumAnimationPhase.ts` and the three `animation-delay: var(--album-animation-delay, 0ms)`
  lines (Section 4).
- The `collections.css` `[data-cards='border']` gold/holo background fills (unrelated visual fix).
- `.album-leaf { will-change: transform }` as-is — the leaf only mounts during a turn, so scoping
  it to the leaf lifetime is equivalent to the old `data-turning` gate and is neutral-to-good on
  Safari. (`data-turning` on the stage can be removed if nothing else reads it.)

### Leak risk to non-Safari & how the gate prevents it
- Both proposed forms are **Safari-only**: `@supports (-webkit-hyphens: none)` matches WebKit/Safari
  only among current engines; the `[data-engine='webkit']` attribute is written only when
  `isSafari` is true. Chromium/Firefox never match, so their `transform: translateZ(0)` promotion
  is untouched — their compositing already works and stays byte-for-byte the same.
- No keyframe, color, blend mode, opacity, filter, or layer count changes for anyone. The only
  Safari delta is dropping a zero-translation transform, which is visually undetectable.
- `.album-card-isolate` is preserved globally (constraint #3). Change 2, if used, only *adds* a
  Safari-only host promotion — it never removes the isolate.

### Verification
`npm run lint` + `npm run build` in `kpopit-frontend/`, then real-Safari device QA (owner) with:
gold sticker flip, holo sticker flip, group-photo flip (the 100% case), animations on **and** off,
and the card-zoom modal open on a holo card. Success = no white flash, no photo starvation, photo
and treatment appear together; non-Safari visually unchanged.
```

---

## TL;DR

- **Cause:** every gold/holo treatment span carries its own `transform: translateZ(0)`, giving each
  blend/filter layer a **separate compositor backing store**. During the 3D leaf rotation those
  stores composite out of step with the (non-promoted) photo: `screen`-blend near-white layers
  paint before their backdrop → **white flash**, and the **animated `filter: hue-rotate`** keeps
  its promoted layer prioritized so it starves the photo's deferred backing store → **~1s photo
  delay**. Scales base(0 layers)→gold(2)→holo(5+filter). `.album-card-isolate` already flattens the
  card, so the per-layer promotion is redundant.
- **Fix (Safari-only, zero visual change):** add one `@supports (-webkit-hyphens: none)` block that
  sets `transform: none` on the six treatment spans, folding them into the card's single isolated
  backing store so photo + treatment paint together. Optional Change 2 promotes the *card host*
  once if a residual mount blink remains. Pure CSS, no TSX needed.
- **Delete the WIP decode/warmup axis** (`albumRevealReadiness.ts`, the `preparing` phase,
  `albumImageWarmup.ts`/`warmAlbumGroupImages`, `decoding="sync"`) — images aren't the cause.
- **Keep** `useAlbumAnimationPhase` (correct, cheap, invisible) and the border-tier CSS fill.
