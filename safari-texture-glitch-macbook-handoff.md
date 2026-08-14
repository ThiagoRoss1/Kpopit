# Safari texture/flip glitch — MacBook handoff

**Date:** 2026-08-10
**Status:** Native Mac Safari reproduced the late group-photo reveal, but no production fix is proven. The A-only compositor experiment was worse and has been rolled back. A browser-neutral `loading="eager"` control also remained gradient-only before the photo appeared and was reverted. The V2 candidate now contains lifecycle, z-order, and zoom fixes behind `?albumEngine=v2`; V1 remains the default and is not merged.

> **Mac Codex entry point:** read `safari-mac-codex-master-context.md` first. It reconciles the full
> conversation, experiment history, conflicting/superseded documents, required project/design reading,
> native-Safari tooling expectations, goal completion contract, and final acceptance matrix. This file
> remains the concise current-state handoff and should be updated with measured Mac results.

## Owner's final Windows observation

- Gold/holo cards flash or glitch when the leaf turns.
- Cards with textures can reveal the treatment shell before the photo/artwork.
- The base/border treatment is still the reliable control.
- The current Safari-only child-transform experiment did not solve the symptom and may have made the flip regression visible again.
- The next investigation must run on the real MacBook Safari, not infer success from Chrome, TypeScript, or a production build.

## Current working-tree state

The A-only stage marker and six `transform:none` rules are removed. The current album code preserves the
original treatment transforms, leaf geometry, and negative Safari animation phase. The exact Safari gate
is still used for gesture/animation behavior, but no temporary browser selector remains. The image path
is still an open hypothesis: the destination intro image is first mounted as a hidden `leafBack` under a
rotated/backface-hidden face, beneath an animated holo fill. Do not add eager/decode/warm-up behavior or a
host transform without a decisive Web Inspector capture.

The isolated V2 engine now contains a separate lifecycle candidate behind `?albumEngine=v2`; it does not
replace the legacy/default engine. The candidate keeps complete physical sheet faces mounted, waits on both
visible faces of a target opening, preserves the pre-turn sheet window through settling, and keeps the
geometrically departing face on top until the 3D midpoint. These changes directly target the Stats/grain,
backward-underlay, and late-card-field failures in the owner recording, but they are not declared Safari
visual-green until a visible high-rate Safari capture confirms the transition frames.

The V2 group-photo zoom also uses an unclipped outer FLIP geometry shell and an inner clipped treatment
shell, preventing the transformed flight from clipping the top treatment edge. The legacy/V1 zoom branch
is intentionally unchanged. Collection list/album queries wait for auth restoration before their first
request, preventing an anonymous response from winning the saved-session race; existing login/logout
invalidations remain in place.

Relevant code:

- `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.css`
- `kpopit-frontend/src/components/Albums/AlbumOfCol/AlbumOfCol.tsx`
- `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/useAlbumAnimationPhase.ts`
- `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/useSyncAlbumAnimations.ts`
- `kpopit-frontend/src/hooks/safariDetection.ts`
- `kpopit-frontend/src/hooks/useIsDevice.tsx`
- `kpopit-frontend/src/components/Albums/AlbumOfCol/pages/AlbumGroupIntroPage.tsx`
- `kpopit-frontend/src/pages/Collection/components/CardZoomModal.tsx`

## What was verified on Windows

- Focused V2/model/machine/integration/phase/detector tests: **49/49 pass**.
- `npm run lint`: pass.
- `npm run build`: pass; only the pre-existing Vite chunk-size warning remains.
- `git diff --check`: pass; only CRLF conversion warnings.
- Historical Chrome runtime smoke: the old A-only experiment mounted `.album-leaf` while the stage had no `data-browser` attribute, so that Safari-only selector did not match. The selector and experiment are no longer present.
- Native Mac Safari static evidence exists, but visible high-rate transition automation remains unavailable;
  WebDriver's document was hidden and Apple Events JavaScript was disabled.
- No package was installed and no dependency lockfile was changed.
- Temporary `vite-runtime.log` and `vite-runtime.err.log` files created for the smoke test were removed.
- The focused tests remain dependency-free; no test dependency was installed.
- No commit was made. Preserve the dirty tree and unrelated user/Claude changes.

## Prior investigation decisions

- The symptom is correlated with treated surfaces, but the native Mac capture narrowed the clearest case to a
  group-intro photo: Safari showed the holo gradient first and the photo about a second later. This does not
  yet distinguish image readiness from hidden-face paint/compositor ordering.
- The previous image-readiness plan (`albumRevealReadiness`, `albumImageWarmup`, `preparing → turning → landed`) remains removed. A single `loading="eager"` control did not fix the observed frame, but that does not fully rule out first-mount timing because the destination DOM is created at turn time.
- `translateZ(0)` is not guaranteed to be a visual no-op in WebKit: removing a transform can change stacking/compositing. The A-only selector was therefore only an experiment; it is now rolled back after native Safari showed worse gradients/late-photo behavior.
- The host-promotion B half broke the card-flight/FLIP geometry and must remain rejected.
- Do not pause holo/gold animations during the turn; the requested behavior is continuous motion.

## MacBook investigation sequence

Run this handoff from the current tree on the MacBook:

1. Read this file, `docs/superpowers/safari-texture-glitch-fix-report.md`, the design/spec, and the plan before changing code.
2. Capture a baseline in Safari with Web Inspector open: base, gold, holo idol, holo group-photo; animations on and off; forward and backward turns; static page and zoom.
3. In Safari's Elements/Computed panels, record for the failing leaf:
   - all duplicate destination `<img>` elements and their `complete`, `naturalWidth`, and `currentSrc`;
   - computed `transform` for each six treatment span;
   - computed `animation-delay`, `animation-play-state`, and `filter`;
   - whether the photo `<img>` is already painted before the leaf starts rotating;
   - whether the failure occurs with the treatment spans temporarily disabled one at a time.
4. Compare only one narrowly scoped alternative at a time against this baseline: first the intro image
   wrapper `z-index`, then (only if needed) the intro holo fill's transform. Do not combine child removal
   with host promotion, eager loading, or decode/warm-up.
5. Use Safari Layers/Rendering tools to identify whether the photo and treatment are separate backing surfaces during `rotateY()`. A screenshot/video of the exact failing frame is required.
6. Verify the stationary card before/after each variant. Any pixel-visible gold/holo change rejects the variant under the no-design-change constraint.
7. Recheck iOS Safari separately if available. Recheck iOS Chrome/Firefox and desktop Chrome/Firefox to ensure the exact gate remains absent.
8. Only after visual evidence choose a code change. Then rerun lint/build/tests and append the result to this handoff.

## Safe rollback guidance for the next Codex

If a future experiment is worse, remove only that experiment and restore this baseline:

- remove the six `[data-browser='safari'] .album-leaf ... { transform: none; }` declarations;
- remove `data-browser` from the stage;
- restore the album consumers to the pre-experiment decision after observing Safari, but keep the strict-vs-broad detector split until all unrelated consumer behavior is verified;
- do not restore image decode/warm-up automatically;
- do not add `.album-card-isolate { transform: translateZ(0) }`.

## Agent/review context

Five delegated roles were completed: two senior frontend audits, a WebKit/Safari researcher, senior QA assurance, and a frontend fix-architect follow-up. The requested “Luna” profile was not exposed by the tool runtime; delegates ran on the available Terra xhigh profile. Their consensus was that the image-readiness axis is unrelated, non-Safari behavior must be preserved, and real Safari is the only valid visual acceptance gate.

## Handoff outcome

The Mac session is intentionally ended without claiming a fix. Native Safari automation became unavailable
(`kLSNoExecutableErr`/Apple Events restrictions), and no iOS device or simulator is connected. The next
bounded test must sample duplicate destination images during the 800ms turn; if that cannot be done, leave
this baseline documented and move on rather than starting another speculative cycle.
