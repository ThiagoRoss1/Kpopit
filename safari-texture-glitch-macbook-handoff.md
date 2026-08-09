# Safari texture/flip glitch — MacBook handoff

**Date:** 2026-08-09  
**Status:** Windows attempt stopped. Owner reports the latest patch is worse: textured cards glitch again during the flip and textured artwork still appears late; base cards remain the control. Do not call the current experiment fixed.

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

## Current working-tree experiment

The current dirty tree contains an A-only experiment that should be treated as **untrusted** until Mac Safari inspection:

1. `AlbumOfCol.tsx` stamps `data-browser="safari"` only when `isSafariAlbumEngine` is true.
2. `AlbumMemberCard.css` applies `transform: none` to six treatment layers only below `[data-browser='safari'] .album-leaf`:
   - `.album-gold-tint`
   - `.album-gold-sheen`
   - `.album-holo-fill`
   - `.album-holo-overlay`
   - `.album-holo-foil`
   - `.album-holo-glare`
3. No host `.album-card-isolate` transform or backface override is present. The rejected A+B host-promotion experiment must not be reintroduced without a measured Safari test.
4. `useAlbumAnimationPhase` supplies the negative CSS delay only to `isSafariAlbumEngine`.
5. `useSyncAlbumAnimations` is retained for the original non-Safari clock behavior and exits only for the exact album Safari gate.
6. The old broad `isSafari` export was restored for unrelated site-wide consumers (`VictoryCardSmall` and `CollectionAlbum`); do not replace it globally with the strict detector again.
7. The decode/warmup/preparing path was removed because the owner confirmed that images are not causal. Do not bring back eager/synchronous decode or background warm-up as a texture fix.

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

- Focused phase + Safari-gate tests: **6/6 pass**.
- `npm run lint`: pass.
- `npm run build`: pass; only the pre-existing Vite chunk-size warning remains.
- `git diff --check`: pass; only CRLF conversion warnings.
- Chrome runtime smoke: a real turn mounted `.album-leaf` while the stage had no `data-browser` attribute, so the Safari selector did not match.
- No Safari/WebKit runtime, `safaridriver`, or Playwright WebKit was available on Windows.
- No package was installed and no dependency lockfile was changed.
- Temporary `vite-runtime.log` and `vite-runtime.err.log` files created for the smoke test were removed.
- The two temporary focused test files created by this Windows attempt were removed after recording their 6/6 result in this handoff; no test dependency was installed.
- No commit was made. Preserve the dirty tree and unrelated user/Claude changes.

## Prior investigation decisions

- The symptom is strongly correlated with treatment compositing: base is safe; gold is intermittent; holo/group-photo is worst; animations-off still flashes.
- The previous image-readiness plan (`albumRevealReadiness`, `albumImageWarmup`, `preparing → turning → landed`) was symptom-chasing and has been removed from source. Its old plan/spec sections are retained as historical context only.
- `translateZ(0)` is not guaranteed to be a visual no-op in WebKit: removing a transform can change stacking/compositing. Therefore the current A-only selector is an experiment, not a proven fix.
- The host-promotion B half broke the card-flight/FLIP geometry and must remain rejected.
- Do not pause holo/gold animations during the turn; the requested behavior is continuous motion.

## MacBook investigation sequence

Run this handoff from the current tree on the MacBook:

1. Read this file, `docs/superpowers/safari-texture-glitch-fix-report.md`, the design/spec, and the plan before changing code.
2. Capture a baseline in Safari with Web Inspector open: base, gold, holo idol, holo group-photo; animations on and off; forward and backward turns; static page and zoom.
3. In Safari's Elements/Computed panels, record for the failing leaf:
   - `data-browser` value;
   - computed `transform` for each six treatment span;
   - computed `animation-delay`, `animation-play-state`, and `filter`;
   - whether the photo `<img>` is already painted before the leaf starts rotating;
   - whether the failure occurs with the treatment spans temporarily disabled one at a time.
4. Compare three controlled variants, one at a time:
   - current A-only rule;
   - current rule removed (true baseline);
   - a narrowly scoped alternative that preserves stacking semantics. Do not combine child removal with host promotion.
5. Use Safari Layers/Rendering tools to identify whether the photo and treatment are separate backing surfaces during `rotateY()`. A screenshot/video of the exact failing frame is required.
6. Verify the stationary card before/after each variant. Any pixel-visible gold/holo change rejects the variant under the no-design-change constraint.
7. Recheck iOS Safari separately if available. Recheck iOS Chrome/Firefox and desktop Chrome/Firefox to ensure the exact gate remains absent.
8. Only after visual evidence choose a code change. Then rerun lint/build/tests and append the result to this handoff.

## Safe rollback guidance for the next Codex

If the current experiment is the cause of the worse behavior, remove only the A-only experiment first:

- remove the six `[data-browser='safari'] .album-leaf ... { transform: none; }` declarations;
- remove `data-browser` from the stage;
- restore the album consumers to the pre-experiment decision after observing Safari, but keep the strict-vs-broad detector split until all unrelated consumer behavior is verified;
- do not restore image decode/warm-up automatically;
- do not add `.album-card-isolate { transform: translateZ(0) }`.

## Agent/review context

Five delegated roles were completed: two senior frontend audits, a WebKit/Safari researcher, senior QA assurance, and a frontend fix-architect follow-up. The requested “Luna” profile was not exposed by the tool runtime; delegates ran on the available Terra xhigh profile. Their consensus was that the image-readiness axis is unrelated, non-Safari behavior must be preserved, and real Safari is the only valid visual acceptance gate.

## Handoff outcome

The Windows session is intentionally ended without claiming a fix. The next MacBook Codex should use Safari evidence to either validate or roll back the A-only compositor experiment, then update this file with the measured result and final patch.
