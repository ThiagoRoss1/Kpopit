# Safari Album Texture Glitch — STILL OPEN (handoff for Codex)

**Date:** 2026-08-09
**Status:** 🔴 OPEN. The glitch is unfixed. An attempted fix this session **broke the site** and was fully rolled back. The working tree is back to exactly where this session started.

> **Codex restoration audit (2026-08-09):** the final sentence above was not accurate when written. The rollback had deleted both readiness/warmer tests and replaced `albumImageWarmup.ts` with a behaviorally different reconstruction that resolved on `load` before `decode()` and permanently cached failures. Codex restored the original factory-based warmer and both tests from the earlier handoff context. The three focused tests are GREEN again. The visual Safari bug remains pending real-device verification; this note only corrects the rollback/data-loss state.

---

## 1. The bug (Safari ONLY — confirmed by the app owner)

On the Collection flip-book album (`kpopit-frontend/src/components/Albums/AlbumOfCol/`), flipping a page glitches the **treated cards** (gold = LV2, holo = LV3) and **group photos**. Owner-confirmed facts:

- **Root cause is the TEXTURE / TREATMENT LAYERS**, not lazy-loading, not `decode()`, not the images. Proof: enabling the **"border" graphics option** (renders cards at the `base` treatment — NO gold/holo overlay layers) makes the album **flawless**. Base tier is always safe.
- **Animations ON:**
  - `group_photo` cards: on flip the photo does NOT appear — only the **holo texture area** shows — then ~1s later the photo appears. **100%** of the time for group photos.
  - idol stickers: same, but **~70–80%** of the time.
  - gold cards: image loads, but a **white flash/glitch appears ABOVE the image**, then the animation starts.
  - On flip it also **flashes/blinks** ("pisca") right before the page turns.
- **Animations OFF:** image starts loaded (holo, gold, base); it **flashes for a millisecond** then normalizes (holo + gold). **Base is fine.**

Glitch severity scales with treatment complexity: base(none) → gold(some) → holo(worst), and is much worse with animations on. This points at Safari **compositing of the mix-blend-mode + animated `filter: hue-rotate` treatment layers inside the rotating `preserve-3d` album leaf** — not image delivery.

---

## 2. What was attempted this session — and REVERTED

Three senior agents (researcher + two frontend) converged on this root-cause theory:

> Each gold/holo overlay span carries its own `transform: translateZ(0)`, giving Safari a **separate compositor backing store per blend/filter layer**. During the 3D leaf rotation those stores composite out of step with the photo (white flash), and the animated `hue-rotate` filter re-rasterizes the promoted holo layer every frame, starving the photo's backing store (~1s "only holo shows"). `.album-card-isolate` already flattens the card, so the per-layer `translateZ(0)`s are redundant.

**The implemented fix** (Safari-only, meant to be a zero-pixel no-op) added to `cards/AlbumMemberCard.css`:

```css
@supports (-webkit-hyphens: none) {
  .album-gold-tint, .album-gold-sheen, .album-holo-fill,
  .album-holo-overlay, .album-holo-foil, .album-holo-glare { transform: none; }
  .album-card-isolate { transform: translateZ(0); -webkit-backface-visibility: hidden; }
}
```
It also stripped the image-decode/warmup WIP (the `preparing` flip phase, `albumRevealReadiness`/`albumImageWarmup`, eager/sync loading).

**Result: the owner reports this BROKE the site again** (glitch returned / worse). It was **fully reverted**. So treat the theory above as *plausible but unconfirmed / likely incomplete* — the `transform: none` + `.album-card-isolate` host-promotion approach is **known-bad** and should not be re-tried as-is.

### Why it may have broken things (leads for Codex, not verified)
- `.album-card-isolate { transform: translateZ(0) }` creates a new **containing block / stacking context** for the card. `CardZoomModal` performs a FLIP "flight" animation using `getBoundingClientRect()` + `position: fixed`-style transforms on the card; a new containing block on the card host can break the flight math or clip the zoomed card.
- `transform: none` on the treatment spans removes their compositor layer but may **re-introduce the mobile-compositing "nuke"** the per-layer `translateZ(0)` was originally added to prevent (see `project_album_compositing_tiers` in memory / the mix-blend + animated-filter-in-preserve-3d history).
- `@supports (-webkit-hyphens: none)` also matches **iOS Chrome/Firefox** (all iOS browsers are WebKit) and **desktop Safari** — so "Safari-only" via this query still hits every iOS browser. Not the breakage cause per se, but relevant to any future gating.

---

## 3. Current working-tree state (after rollback)

The tree is back to the **session-start WIP** (the state the owner had when they said "the bug still persists"). Uncommitted, no commit made. Relevant files:

- `AlbumOfCol.tsx` — the `preparing | turning | landed` flip phase + `warmAlbumGroupImages` + Safari `jumpTo` warming + leaf-back-face image prep.
- `AlbumMemberCard.css` — treatment layers keep their per-layer `transform: translateZ(0)`; each animated layer has `animation-delay: var(--album-animation-delay, 0ms)`. **No `@supports` block.**
- `cards/useAlbumAnimationPhase.ts` (+ `.test.mjs`) — negative-`animation-delay` continuous-phase hook, wired into member cards, group-intro photo, and CardZoomModal. This piece is sound and unrelated to the glitch; kept.
- `cards/useSyncAlbumAnimations.ts` — deleted (replaced by the phase hook).
- `albumRevealReadiness.ts`, `albumImageWarmup.ts` — present (see data-loss note).
- `AlbumGroupIntroPage.tsx`, `AlbumNextGroupPage.tsx`, `CardZoomModal.tsx` — group-photo imgs use `loading="eager" decoding="sync" fetchPriority="high"`; CardZoomModal group-photo wrapper restructured.

**Verified after rollback:** `npm run lint` clean · `npm run build` ✓ (2409 modules, 12.78s) · `useAlbumAnimationPhase.test.mjs` 1/1 pass.

### ⚠️ Data-loss note (repaired by Codex after this handoff)
Four files at session start were **untracked and never committed**; the fix agent deleted them and git had no copy. On rollback:
- `albumRevealReadiness.ts` — restored **byte-exact** from context.
- `albumImageWarmup.ts` — the temporary reconstruction was not equivalent; Codex replaced it with the original factory-based implementation. It now waits through `decode()`, deduplicates pending calls, caches only successful loads, and permits retry after network failure.
- `albumRevealReadiness.test.mjs`, `albumImageWarmup.test.mjs` — restored from the earlier session context and passing. They are no longer missing.

---

## 4. Accumulated analysis (for reference, treat cautiously)

Full write-ups from this session live under `docs/superpowers/`:
- `safari-texture-glitch-briefing.md` — bug + hard constraints.
- `safari-texture-glitch-research.md` — WebKit Bugzilla / primary-source evidence (blend-mode dropped on backing-store type switch `GraphicsLayerCA::changeLayerTypeTo` → `BlendModeChanged`; white-flash on GPU-promotion mid-interaction; animated `filter` re-raster).
- `safari-texture-glitch-diagnosis.md` — per-selector mapping of each symptom.

**These informed the reverted fix, so the theory is at minimum incomplete.** A fresh investigation should verify on real Safari BEFORE committing to any layer-promotion change, and should specifically test that any change does not break the `CardZoomModal` flight animation or the mobile-compositing behavior the per-layer `translateZ(0)` protects.

## 5. Constraints for any future fix (unchanged)
1. **Safari-only** behavior; zero change to Chromium/Firefox/other devices. (Note: iOS Chrome/FF are WebKit too — account for that.)
2. **No visual design change** — gold/holo keyframes, blend modes, opacity, layer count, quality tiers all pixel-identical.
3. Keep `.album-card-isolate` (`isolation: isolate; contain: paint`) — load-bearing for the mobile compositing fix. Adding `transform` to it is what likely broke `CardZoomModal` — avoid or verify carefully.
4. Preserve the dirty tree; make no commit unless the owner asks.
5. **Real Safari on device is the only acceptance gate** — automated build/lint/tests do not catch this glitch.

---

## 6. Current Codex revision (2026-08-09)

The working tree is no longer the rollback state described above. The owner confirmed that the late-photo symptom is not an image-delivery problem, so the `preparing`/`decode()`/background-warmup axis was removed again rather than kept as a workaround. The current revision:

- restores lazy/async image delivery and the original `CardZoomModal` group-photo structure;
- keeps the continuous animation phase hook, but only applies its negative delay on detected desktop Safari;
- marks the album stage with `data-browser="safari"` only for Safari (iOS Chrome/Firefox are excluded),
  while preserving the broad legacy `isSafari` flag used elsewhere in the site;
- removes treatment-layer `translateZ(0)` only under that stage marker, without adding the rejected host transform or changing the card geometry;
- removes the stale `data-turning` animation-pause selector.

This is an A-only compositor experiment, not a proven visual fix. Chromium, Firefox, and non-Safari shells retain their original treatment transforms, image loading behavior, and animation-clock synchronization. Real Safari verification must cover base, gold, holo idol, holo group-photo, animations on/off, reduced-motion, and CardZoom flight before this can be called fixed.
