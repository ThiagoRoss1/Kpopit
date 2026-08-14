# Safari Album Texture Glitch — WebKit Rendering Research (2026-08-09)

Companion to `safari-texture-glitch-briefing.md`. This document collects the documented
WebKit/Safari rendering bugs and behaviors that explain the treated-card (gold/holo/group-photo)
glitch inside the rotating `preserve-3d` album leaf, and the accepted, visually-invisible,
Safari-scopable workarounds. Grounded in the actual source:

- Card treatment layers: `cards/AlbumMemberCard.css` — every gold/holo layer carries its **own**
  `transform: translateZ(0)` and a `mix-blend-mode: screen|overlay`; `.album-holo-fill/.overlay/.glare`
  run the animated `@keyframes album-holo-shimmer { filter: hue-rotate(0→75deg) }`.
- Isolation wrapper: `.album-card-isolate { isolation: isolate; contain: paint }` on the card host.
- Flip engine: `AlbumOfCol.css` `.album-leaf { transform-style: preserve-3d; will-change: transform }`,
  `.album-leaf-face { backface-visibility: hidden }`, back face `transform: rotateY(180deg) translateZ(0)`;
  `AlbumOfCol.tsx` rotates the leaf via `rotateY(±180deg)` inside a `perspective: 2600px` stage.

---

## Summary

The glitch is **not** image delivery. It is WebKit compositing: the treated card is a stack of
separately-promoted `mix-blend-mode` layers (each with its own `translateZ(0)` backing store) plus an
**animated `filter`**, all living inside an element that WebKit must re-composite as it rotates into the
3D scene. Three documented WebKit behaviors stack up here, and each independently predicts exactly the
observed symptoms (blend/holo area paints, underlying photo arrives ~1s late; white flash above the gold
image; a blink right as the leaf turns). The base tier has none of these layers, so it is always clean —
which is the single strongest piece of evidence that the treatment/compositing path is the cause.

The fix that matches the evidence is to **stop fragmenting the treated card into many racing backing
stores on Safari, give the card host one settled composited layer before the rotation starts, and keep
the animated `filter` from invalidating the blended backing store every frame** — all Safari-scoped, all
visually identical.

---

## Most-likely root cause(s), ranked

### 1. WebKit drops/re-derives `mix-blend-mode` when a composited layer switches tiling mode (HIGHEST)
When a composited layer transitions between **tiled and non-tiled** backing-store modes, WebKit *lost the
blend mode* until it was told to recompute it (fix: add `BlendModeChanged` to the dirty bits in
`GraphicsLayerCA::changeLayerTypeTo()`). Promoting the leaf for a `rotateY` flip, and re-sizing/re-tiling
the card's blended sublayers as they enter the 3D scene, is exactly the tiled↔non-tiled transition that
triggers this class of bug. Symptom match is precise: the blend/holo layer shows, but the content it is
supposed to blend over (the photo) is missing until WebKit re-derives the group a beat later → the "only
the holo texture shows, photo appears ~1s later" behavior, worst on group photos (largest layer → most
likely to be tiled).

### 2. Redundant per-layer `translateZ(0)` promotion → competing backing stores that race the leaf composite
Every treatment layer (`.album-gold-tint`, `.album-gold-sheen`, `.album-holo-fill/.overlay/.foil/.glare`)
carries its own `transform: translateZ(0)`. Each becomes its own GPU-promoted backing store that must be
rastered and re-blended when the parent leaf composites into 3D. The documented WebKit "white flash on
transform start" is precisely the moment WebKit switches an element to GPU-accelerated rendering; a card
made of many just-promoted layers multiplies that race → the **white flash above the gold image** and the
**blink right before the leaf turns**. `contain: paint` + `isolation: isolate` already give the card ONE
isolated group, so the per-layer promotion is redundant — it fragments the very layer the isolation was
meant to flatten.

### 3. Animated `filter: hue-rotate` continuously re-rasterizes the blended layer
`filter` is a grouping/flattening property; an *animated* filter forces the layer's backing store to be
re-rastered every frame. When that same element also carries `mix-blend-mode`, each re-raster re-triggers
the blend re-derivation from (1). This is why **animations ON is dramatically worse** (100% on group
photos, 70–80% on stickers) and animations OFF degrades to a one-frame flash: with the filter static the
backing store settles after the first paint. The filter must stay (it is load-bearing for the holo look),
but it does not have to live *on the blended layer*.

Underlying all three: `mix-blend-mode`, `filter`, `opacity<1`, `overflow≠visible`, and `clip-path` are
**grouping properties that flatten `preserve-3d`** (per CSS-WG / WPT, and confirmed cross-browser by
CSS-Tricks). Chromium/Gecko flatten cleanly; WebKit's re-establishment of that isolated/filtered group
*during* a live 3D rotation is where the late paint and flashing appear. Same spec rule, buggier WebKit
implementation — which is exactly why it is Safari-only.

---

## Evidence (per source)

- **WebKit — blend mode lost on tiled↔non-tiled layer-type change** (root cause #1). Commit/changelog:
  "when a composited layer goes between tiled and non-tiled mode, it would lose its blend mode"; fixed by
  adding `BlendModeChanged` to the dirty bits in `GraphicsLayerCA::changeLayerTypeTo()`.
  https://www.mail-archive.com/webkit-changes@lists.webkit.org/msg220005.html
  Shows WebKit genuinely drops `mix-blend-mode` across backing-store mode switches — the mechanism behind
  "blend layer paints, blended-under content shows late."

- **WebKit Bug 235106 — Rendering/clipping glitches using mix-blend-mode** (NEW/unresolved as of 2022).
  Blended content leaves residue / fails to repaint within correct bounds; Simon Fraser traces it to
  repaint bounds not covering content that projects outside the element. Confirms WebKit mix-blend repaint
  invalidation is buggy and WebKit-specific. https://bugs.webkit.org/show_bug.cgi?id=235106

- **Viget — "-webkit-transform: kill-the-flash"** (root cause #2). "The flash seems to occur when the
  browser switches to GPU-accelerated rendering for an element." Fix: promote the element with
  `-webkit-transform: translateZ(0)` / `translate3d(0,0,0)` **from the start** so WebKit never switches
  rendering modes mid-interaction. https://www.viget.com/articles/webkit-transform-kill-the-flash

- **GSAP forum — perspective / preserve-3d + mix-blend-mode in Safari.** Moderator's accepted fixes:
  `-webkit-backface-visibility: visible/hidden`, `translate3d(0,0,0)` to force a unified rendering layer,
  and z-index/stacking adjustments — i.e. **consolidate blend + 3D onto one layer**. Directly supports the
  "one settled composited layer for the card host" recommendation.
  https://gsap.com/community/forums/topic/21802-issues-with-safari-perspective-mix-blend-mode/

- **CSS-Tricks — Things to Watch Out for When Working with CSS 3D.** Enumerates the grouping properties
  that force `transform-style: flat` and break `preserve-3d`: `overflow≠visible`, `clip-path`, `opacity<1`,
  **`filter≠none`**, **`mix-blend-mode`**. Confirms the card's own layers flatten the 3D context; the
  question is purely how each engine re-composites — cleanly (Chromium/Gecko) vs. late/flashy (WebKit).
  https://css-tricks.com/things-watch-working-css-3d/

- **WPT + CSS-WG discussion — mix-blend-mode overrides preserve-3d.** Web-platform-test asserting blend
  flattens the 3D context is *spec-intended* behavior, with CSS-WG discussion about tightening the
  isolation/grouping rules — so relocating the effect, not fighting the flattening, is the correct posture.
  https://github.com/web-platform-tests/wpt/blob/master/css/compositing/mix-blend-mode/mix-blend-mode-with-transform-and-preserve-3D.html
  https://lists.w3.org/Archives/Public/public-css-archive/2021May/0030.html

- **Apple Developer Forums — Safari 15.4 rendering/flicker regressions** ("elements loading multiple times
  and flickering"; `transform: translateZ(0)` at the lowest level stops the flicker). Establishes the
  broader Safari-only compositing-flicker family this bug belongs to.
  https://developer.apple.com/forums/thread/705172

- **`will-change` guidance (Apple "Using 2D and 3D Transforms"; Nic Chan; Surma).** `will-change: transform`
  and `translateZ(0)` each create a compositing layer that costs memory; use *judiciously*, not as a
  blanket. Backs "Avoid" #2 — do not answer this by promoting even more layers.
  https://developer.apple.com/library/archive/documentation/InternetWeb/Conceptual/SafariVisualEffectsProgGuide/Using2Dand3DTransforms/Using2Dand3DTransforms.html
  https://www.nicchan.me/blog/a-use-case-for-will-change/ · https://surma.dev/things/forcing-layers/

---

## Recommended Safari-only mitigations (ranked by confidence × invisibility)

All gated by `isSafari` (`src/hooks/useIsDevice.tsx`) or a Safari-only CSS path (e.g.
`@supports (-webkit-hyphens:none)` or a `data-safari` attribute). None change pixels on any layer.

### A. Drop the redundant per-layer `transform: translateZ(0)` on Safari (HIGH confidence, fully invisible)
Remove `translateZ(0)` from `.album-gold-tint`, `.album-gold-sheen`, `.album-holo-fill`, `.album-holo-overlay`,
`.album-holo-foil`, `.album-holo-glare` **on Safari only**. `.album-card-isolate` already provides one
isolated, paint-contained group; the blend layers then rasterize *into that single layer* instead of each
minting its own backing store that races the leaf composite. Attacks root cause #2 head-on and reduces the
surface for #1 (fewer sublayers to re-tile). Zero visual effect — `translateZ(0)` with no other transform
is a pure compositing hint. Keep it on non-Safari where it is harmless and was tuned for the mobile fix.

### B. Give the treated card host ONE settled composited layer before the rotation (HIGH confidence, invisible)
On Safari, add `transform: translate3d(0,0,0)` + `-webkit-backface-visibility: hidden` to the
`.album-card-isolate` host (not the sublayers). This is the Viget/GSAP fix: the card is GPU-promoted *from
the start*, so WebKit does not switch rendering modes — nor tiled↔non-tiled backing-store modes (#1) — at
the instant the leaf turns. Combined with A, the card becomes exactly one pre-warmed composited surface.
Directly targets the white flash (#2) and the tiling-mode blend drop (#1). Confirm it does not *re*-flatten
anything visible (the card already flattens via `contain: paint`).

### C. Move the animated `filter: hue-rotate` off the blended layer onto a non-blended wrapper (MEDIUM, invisible-if-careful)
Keep the hue-rotate (it is load-bearing) but run it on a wrapper that does **not** carry `mix-blend-mode`,
with the blended gradient as a child. This stops every animation frame from re-rastering *and* re-deriving
the blend group (#1 × #3), which is why animations-ON is so much worse. Because `filter` and
`mix-blend-mode` currently sit on the same element, the pixel result of hue-rotating-then-screen-blending
vs. hue-rotating-a-child-inside-a-screen-wrapper must be spot-checked to be identical (blend is applied to
the filtered result in both orders when the wrapper itself has no blend). Safari-only; leave the single-element
form on other browsers to guarantee zero cross-browser change.

### D. Keep — do not regress — the existing correct pieces (baseline)
`.album-leaf { will-change: transform }` scoped to the leaf's lifetime, `.album-leaf-face { backface-visibility:
hidden }`, the back-face `translateZ(0)`, and the continuous `useAlbumAnimationPhase` negative-delay approach
are all consistent with the WebKit guidance and cheap — retain them. The image `decode()`/warmup machinery
(`albumRevealReadiness.ts`) chases the wrong axis per the owner and can be dropped from the Safari fix.

**Suggested order:** A + B together first (they are the mechanism fix and are unconditionally invisible),
verify on device; add C only if a residual holo/group-photo flash remains.

---

## Approaches to AVOID (and why)

1. **Removing `.album-card-isolate` (`isolation`/`contain: paint`).** Load-bearing fix for the earlier mobile
   compositing nuke; without it mix-blend re-blends the whole page every frame. Hard constraint. Keep it.

2. **Adding more `will-change: transform` / more per-layer `translateZ(0)` to "force" a layer.** Every promotion
   is another backing store that costs memory and *adds* a surface to race the composite — the opposite of the
   fix. Apple's own docs and `will-change` guidance say promote judiciously. This bug is caused by too many
   layers, not too few.

3. **Dropping or simplifying `filter: hue-rotate` (or capping treated cards to base on Safari).** Changes the
   look — the hue-rotate is explicitly documented as what gives the holo its non-luminance-preserving swing,
   and "cap to base" is forbidden by the no-visual-change constraint. Relocate the filter (C), do not remove it.

4. **A blanket (non-Safari-gated) change to blend layers, promotion, or the leaf.** Violates the Safari-only
   constraint and risks the mobile/Chromium/Firefox paths that are currently correct. Gate everything behind
   `isSafari` or a Safari-only CSS selector.

5. **Chasing image `decode()`/`fetchPriority`/eager-load as the fix.** Owner-confirmed the images are not the
   problem (base tier with the same images is flawless). Symptom-level; will not remove the compositing glitch.

---

## Top recommendation (10 lines)

1. Root cause is WebKit compositing of the treated card, not images (base tier is flawless).
2. Three documented WebKit behaviors stack: blend-mode dropped on tiled↔non-tiled layer switches,
3. GPU-promotion "white flash" when a layer changes rendering mode mid-transform,
4. and an animated `filter` re-rasterizing (and re-deriving) the blended layer every frame.
5. Fix A (highest, invisible): on Safari, remove the redundant per-layer `translateZ(0)` from the
   gold/holo layers so they rasterize into the single `.album-card-isolate` layer instead of racing backing stores.
6. Fix B (pair with A, invisible): promote the `.album-card-isolate` host itself with
   `translate3d(0,0,0)` + `-webkit-backface-visibility: hidden` so it has one settled layer before the leaf rotates.
7. Fix C (only if residual flash): move `filter: hue-rotate` onto a non-blended wrapper, pixel-verified identical.
8. Keep `.album-card-isolate`, the leaf `will-change`, backface-hidden faces, and the continuous animation phase.
9. Avoid: removing isolation, adding more promotion/`will-change`, weakening the holo, un-gated changes, decode chasing.
10. Ship A+B behind `isSafari`, verify on device, then add C if needed — no non-Safari pixels change.
