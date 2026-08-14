# Safari album cards: continuous animation and image-reveal handoff

**Date:** 2026-08-09  
**Status:** implementation and automated checks complete; the final visual GREEN still requires real macOS/iOS Safari.

## Scope and invariant

This pass addresses the residual behavior in `Gravação de Tela 2026-08-09 às 03.58.47.mov`:

1. independently mounted gold/holo cards and group-photo treatments restart at their initial visual phase during page turns, especially backwards turns;
2. an image on the destination leaf can appear after its treatment shell is already visible.

No visual design was changed. Gold/holo keyframes, durations, easing, gradients, colors, opacity, blend modes, layer count, borders, card geometry, paper textures, and quality-tier behavior remain unchanged. The image gate is Safari-only. The shared-clock change is browser-neutral and removes post-mount animation-object work.

## What the recording proved

The repeat is not just network loading. Unrelated holo group pages mounted at different points in the recording repeatedly show nearly the same orange → yellow → green starting frame.

- A crop comparison between independent reset events measured `SSIM=0.972694`.
- The investigation threshold was `0.95`.
- Therefore the recording produced a deterministic RED for a local animation-clock restart.

The source matched that evidence:

- the flip book renders a logical page as separate static-page and temporary leaf React trees;
- Safari was deliberately excluded from `syncAlbumAnimations()` after an earlier `CSSAnimation.startTime` workaround froze treatments;
- every Safari clone therefore started its native CSS animation at local time zero;
- the previous URL warmer decoded an off-DOM `Image`, while the actual destination `<img>` did not exist until the flip tree mounted.

## Research conclusion

- [WebKit bug 290993](https://bugs.webkit.org/show_bug.cgi?id=290993) documents Safari assigning animations created during a rendering update a shared start time with `currentTime=0`, visibly differing from Chrome/Firefox. The WebKit fix landed upstream, but the user's current Safari recording still reproduces the relevant behavior.
- [CSS Animations Level 1, `animation-delay`](https://www.w3.org/TR/css-animations-1/#animation-delay) explicitly defines a negative delay as starting immediately, already advanced as if the animation began in the past. That is the standards-based clock alignment used here.
- [WebKit bug 302801](https://bugs.webkit.org/show_bug.cgi?id=302801) explains that displaying an image and explicitly decoding one have different memory/subsampling behavior. This is why destination images are decoded sequentially, not all at once.
- [Safari Technology Preview 246 notes](https://webkit.org/blog/18128/release-notes-for-safari-technology-preview-246/) include a fix for `HTMLImageElement.decode()` resolving spuriously after adoption, `src` changes, or cached-image reuse. That supports not treating the older off-DOM decode alone as proof that the mounted destination surface is ready.

## Implementation

### 1. A document-wide CSS animation phase

New module:

- `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/useAlbumAnimationPhase.ts`

Each treated host receives this stable initial-render style:

```css
--album-animation-delay: -<performance.now()>ms;
```

The existing gold sheen, holo gradient, and holo glare declarations now consume:

```css
animation-delay: var(--album-animation-delay, 0ms);
```

Every clone therefore uses the same document monotonic clock. A clone created later is born at the phase the document animation would already have reached, including the correct alternating-iteration direction. No Web Animations API mutation is performed after mount.

Applied to:

- `AlbumMemberCard`;
- unlocked group-photo treatments in `AlbumGroupIntroPage`;
- the inner group-photo treatment shell in `CardZoomModal`.

Removed as obsolete:

- `cards/useSyncAlbumAnimations.ts`;
- `cards/albumAnimationSync.ts`;
- `cards/albumAnimationSync.test.mjs`.

### 2. Safari destination-leaf readiness

New module:

- `kpopit-frontend/src/components/Albums/AlbumOfCol/albumRevealReadiness.ts`

`FlipState` now has three explicit phases:

```text
preparing → turning → landed
```

On Safari:

1. the real leaf is mounted at `rotateY(0deg)`;
2. only the actual destination/back face is queried for `<img>` elements;
3. those mounted images are decoded sequentially;
4. decode errors are tolerated so navigation cannot be locked by a broken asset;
5. one rendering frame is allowed after decoding;
6. only then does the existing 800 ms rotation begin.

On Chromium/Firefox, `go()` enters `turning` immediately, preserving the prior behavior. Direct Safari `jumpTo()` navigation waits for the relevant group's existing URL warmer before replacing the spread; other engines remain synchronous.

## Automated regression evidence

New tests:

- `useAlbumAnimationPhase.test.mjs` proves mounts at 900 ms and 5100 ms receive `-900ms` and `-5100ms`; the latter enters a 4.2 s holo cycle at 900 ms rather than zero.
- `albumRevealReadiness.test.mjs` proves actual images decode sequentially, a rejected decode does not deadlock, and the render-frame callback runs last.
- Existing `albumImageWarmup.test.mjs` remains green.

The new tests were observed RED first with missing-module failures, then GREEN after implementation.

Fresh verification on 2026-08-09:

```text
Focused Node tests: 3/3 pass, 0 failures
npm run lint: exit 0
npm run build: exit 0 (tsc -b + Vite production bundle)
git diff --check: exit 0; line-ending warnings only
Debug scan: no syncAlbumAnimations/useSyncAlbumAnimations/debugger/console debug remnants
```

The build retains the pre-existing Vite chunk-size warning; it is unrelated to this fix.

## Rejected alternatives

- Do not restore `animation.startTime = 0`: it produced the earlier Safari freeze/held-treatment failure.
- Do not skip synchronization on Safari: that is the exact zero-phase restart shown in the final recording.
- Do not pause animations during a page turn: the requested behavior is continuous motion, not a frozen but consistent card.
- Do not disable gold/holo or album textures for Safari: the evidence is lifecycle-specific, not a capability-tier failure.
- Do not keep every page persistently mounted: it increases DOM/compositor/memory cost across all devices to avoid a Safari lifecycle bug.
- Do not decode all destination images concurrently: sequential decoding is the safer WebKit memory path.

## Real-Safari acceptance checklist

1. Test current macOS Safari in both Auto and explicitly High quality.
2. Flip forward and backwards across at least five holo/gold group/member spreads.
3. Watch the page being carried by the leaf: gold/holo motion must continue at its current phase, never jump to the orange/initial frame.
4. Confirm photos/cards are already present when the leaf begins moving. A cold first turn may wait before moving; pixels must not enter after rotation begins.
5. Open LV2 and LV3 member-card zooms for at least five seconds each; motion must remain continuous.
6. Open gold/holo group-photo zoom from both page sides; all treatment edges must remain covered.
7. Recheck Chrome/Firefox/Android navigation timing and visuals. They should have no image-gate delay and no treatment-design change.

If the same symptom remains, capture one uncut recording with Safari Web Inspector's Animations and Network panels visible. The next investigation should measure the computed `animationDelay`, `currentTime`, and `playState` on the destination leaf before changing CSS or quality settings.

## Workspace note for Claude

The repository was already intentionally dirty with the preceding Safari/compositing and graphics-tier work. These changes were integrated in place and were not committed. Preserve unrelated modified/untracked files. The plan of record is:

- `docs/superpowers/plans/2026-08-09-safari-continuous-card-animation-and-image-reveal.md`

The approved design is:

- `docs/superpowers/specs/2026-08-09-safari-continuous-card-animation-and-image-reveal-design.md`

## Restoration audit after Claude rollback

Claude's later Safari experiment was rolled back, but the rollback was not identical to this handoff's state: it deleted `albumImageWarmup.test.mjs` and `albumRevealReadiness.test.mjs`, and reconstructed `albumImageWarmup.ts` with different semantics. The reconstruction resolved its promise on `load` before `decode()` completed and retained failed URLs forever, so it could reintroduce late artwork and prevent retries.

Codex restored the original factory-based warmer and both tests from the prior session context. All other core invariants in this handoff were audited and already matched: the negative-delay phase hook and three consumers, unchanged treatment keyframes/layers, Safari-only preparation, actual leaf-back image decoding, and `preparing → turning → landed` lifecycle.

## Superseding texture-compositor pass

The owner later confirmed that image decode/warm-up is not causal: base cards use the same photos and
remain flawless while treated cards fail. The current pass therefore removes that entire readiness axis
again, restores lazy/async image defaults and the original CardZoom host, gates the animation phase to
Safari, and tests only the stage-scoped child-transform compositor change. The host-transform experiment
is intentionally not included. Real Safari remains the acceptance gate.

### Latest implementation state (2026-08-09)

The active patch removes the image-readiness/warm-up experiment after the owner confirmed that the
remaining symptom tracks treatment layers rather than image delivery. It restores lazy/async image
defaults and the original group-photo FLIP host, gates the negative animation phase to detected
desktop Safari, and scopes the child-transform experiment to `[data-browser='safari']`. The rejected
host `translateZ(0)` promotion is not present. Focused phase and Safari-gate tests (6/6), lint, production build,
and `git diff --check` are green; real Safari visual verification remains pending.

The original non-Safari `useSyncAlbumAnimations` clock path remains in place and is explicitly skipped
only by Safari, so Chromium and Firefox do not inherit this Safari workaround.
