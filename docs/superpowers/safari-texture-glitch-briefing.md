# Safari Album Texture Glitch — Shared Briefing (2026-08-09)

This is the single source of truth for the current bug. All agents working on it read this first.

## The bug (Safari ONLY — confirmed by the app owner)

On the Collection flip-book album (`kpopit-frontend/src/components/Albums/AlbumOfCol/`), when a page is
flipped, the **treated cards** (gold = LV2, holo = LV3) and **group photos** glitch. Confirmed observations:

- **CONFIRMED root cause is the TEXTURE / TREATMENT LAYERS**, not lazy-loading, not `decode()`, not the images
  themselves. Proof: turning on the **"border" graphics option** (which renders cards at the `base` treatment,
  i.e. NO gold/holo overlay layers) makes the album **flawless** — zero glitch. Base tier is always safe.
- **Animations ON:**
  - `group_photo` cards: on flip, the photo does NOT appear — only the **holo texture area** shows — then ~1s
    later the photo appears. Happens **100%** of the time for group photos.
  - idol stickers: same, but **~70–80%** of the time.
  - gold cards: the image DOES load, but a **white flash / glitch appears ABOVE the image**, then the animation
    starts.
  - On flip it also **flashes/blinks** ("pisca" in PT-BR) right before the page turns.
- **Animations OFF:**
  - Image starts already loaded (holo, gold and base). It just **flashes/glitches for a millisecond** then is
    normal. Affects holo and probably gold. **Base is fine.**

So: base = perfect always. The glitch scales with treatment complexity (holo worst, gold less, base none), and
gets much worse with animations on. This points squarely at **Safari compositing of the mix-blend-mode +
`isolation`/`contain` + `transform: translateZ(0)` + animated `filter: hue-rotate` treatment layers stacked
inside the rotating `preserve-3d` album leaf** — NOT image delivery.

## Hard constraints (do not violate)

1. **Safari-only.** Must NOT change rendering or navigation on Chromium, Firefox, or any other browser/device.
   Gate every behavioral change behind `isSafari` (from `src/hooks/useIsDevice.tsx`) or a Safari-only CSS path.
2. **No visual design change.** Gold/holo keyframes, colors, blend modes, opacity, layer count, and every
   quality tier must stay pixel-identical on non-Safari. On Safari the treatment must still look like the same
   gold/holo — no "cap to base", no visual fallback, unless it is genuinely invisible to the eye.
3. Keep `.album-card-isolate` (`isolation: isolate; contain: paint`) — it is the load-bearing fix for the
   earlier mobile compositing nuke. Do not remove it globally.
4. Preserve the dirty working tree; make NO git commit. This is uncommitted WIP.
5. No broad persistent page mounting; no new permanent compositor layers on non-Safari.

## Relevant files

- `components/Albums/AlbumOfCol/cards/AlbumMemberCard.css` — all gold/holo treatment layers + keyframes.
  The animated `filter: hue-rotate(0→75deg)` lives in `@keyframes album-holo-shimmer`. Each layer carries
  `transform: translateZ(0)` and `mix-blend-mode: screen|overlay`.
- `components/Albums/AlbumOfCol/cards/AlbumMemberCard.tsx` — `TextureFill`, `HoloLaminate`, card markup.
- `components/Albums/AlbumOfCol/AlbumOfCol.tsx` — the flip engine (`preserve-3d` `.album-leaf`, flip phases).
- `components/Albums/AlbumOfCol/AlbumOfCol.css` — `.album-leaf { transform-style: preserve-3d; will-change }`.
- `components/Albums/AlbumOfCol/pages/AlbumGroupIntroPage.tsx` — group photo host (gold/holo frame + photo).
- `pages/Collection/components/CardZoomModal.tsx` — zoomed card / group photo.
- `hooks/useIsDevice.tsx` — `isSafari` export.

## Current uncommitted attempt (this is what is being reviewed/fixed)

The WIP diff chases the WRONG axis (image decode/warmup):
- `cards/useAlbumAnimationPhase.ts` (new): negative `animation-delay` = `-performance.now()ms` so newly mounted
  clones start at the shared document phase instead of 0. Applied via `--album-animation-delay` on gold/holo
  selectors. Replaces the old `useSyncAlbumAnimations` (Web Animations `startTime` mutation, now deleted).
- `albumRevealReadiness.ts` (new): `prepareAlbumImages()` sequential `img.decode()` + one RAF.
- `AlbumOfCol.tsx`: added a Safari `preparing | turning | landed` flip phase that decodes the leaf back-face
  `<img>`s before rotating; `warmAlbumGroupImages`; `jumpTo` warms on Safari; `will-change` scoped to leaf life.
- Various `loading="eager" decoding="sync" fetchPriority="high"` on group-photo imgs.

The continuous-phase (`useAlbumAnimationPhase`) idea is fine and worth keeping (cheap, no visual change). The
image-readiness machinery is treating a symptom — the owner says the images are NOT the problem. The fix must
target Safari's **compositing of the blend/filter treatment layers during the 3D leaf rotation**.

## Fix direction to investigate (not prescriptive)

The glitch is Safari failing to have the treated card's backing store / blended content painted at the moment
the leaf is composited into the 3D scene, and the animated `filter` continuously re-rasterizing. Candidate
Safari-only mitigations to weigh (pick the minimal set that actually removes the glitch without touching
non-Safari or the look):
- Remove/avoid the redundant per-layer `transform: translateZ(0)` on Safari so the blend layers rasterize into
  the card's single isolated layer instead of separate backing stores that race the leaf composite.
- Force the treated card (or the leaf) to have a settled backing store before/without the animated filter
  invalidating it — e.g. move `filter: hue-rotate` off the mix-blend layer, or run it on a non-blended wrapper.
- Consider whether `contain: paint` + `isolation` interact badly with `preserve-3d` on Safari and need a
  Safari-only backface/`translateZ` on the card host.
- Ensure the underlying photo `<img>` and the blend overlays share one composited layer on Safari.

Verify with `npm run lint` and `npm run build` in `kpopit-frontend/`. Real Safari is the final acceptance
environment (the owner tests on device).
