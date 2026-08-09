# Safari Album Flip/Texture Bug — Master Context for Mac Codex

**Prepared:** 2026-08-09  
**Target environment:** the owner's MacBook, using real macOS Safari  
**Branch:** `safari-flip-fix`  
**Branch base:** `dev` at `23e1d32`  
**Current branch snapshot:** `843739e` (`feat: initial safari glitch fix`)  
**Status:** **OPEN / NOT FIXED.** The current committed compositor experiment made the owner's latest Windows-hosted Safari observation worse. It is evidence to inspect, not a solution to preserve.

## 1. Mission and completion contract

Diagnose and fix the Safari-only collection-album page-turn rendering defect without changing the intended visuals, quality-tier design, or behavior of Chromium/Firefox and other unaffected devices.

The Mac is the correct investigation host because it can run the real failing engine. Use native Safari, Safari Web Inspector, and any Codex browser/app-testing capability that can genuinely target installed Safari. If an available Codex browser tool controls only Chromium, use it only for non-Safari regression checks; it is not evidence that this bug is fixed.

Research WebKit behavior when evidence requires it. Prefer primary sources: WebKit Bugzilla, WebKit source/changesets, WebKit blog/release notes, and CSS specifications. Existing research is indexed below, but it describes hypotheses, not proof of the current root cause.

If this work is started under an explicit Codex goal, keep the goal active. Do not mark it complete merely because lint/build pass or a plausible CSS fix exists. Completion requires the real-Safari acceptance matrix in section 12 to pass and the branch documentation to be updated with observed evidence. If blocked on user interaction, record exactly what must be clicked/captured and continue every safe investigation that does not require that interaction.

## 2. Required reading order

Read these before editing. Later documents contain superseding notes, so follow this order instead of treating every historical conclusion as current truth.

### Project and design constraints

1. `AGENTS.md` — repository instructions and collection architecture.
2. `CLAUDE.md` — project architecture, commands, collection system, security, and code conventions.
3. `kpopit-frontend/DESIGN.md` — frontend visual/motion baseline. The album has intentional visual identity; this fix must preserve it.
4. `docs/superpowers/specs/2026-08-07-album-compositing-and-quality-tiers-design.md` — why card isolation, treatment tiers, mobile safeguards, and quality tiers exist.
5. `docs/superpowers/plans/2026-08-07-album-compositing-and-quality-tiers.md` — implementation history and addenda. Pay special attention to the compositing invariants, Task 4/5, QA task, and later granular-graphics handoffs. Historical instructions to pause treatment animation are superseded for this Safari bug: the owner explicitly requires continuous animation through a turn.

### Current Safari sources of truth

6. `safari-mac-codex-master-context.md` — this routing and reconciliation document.
7. `safari-texture-glitch-macbook-handoff.md` — concise current-state handoff and Mac inspection sequence.
8. `docs/superpowers/safari-texture-glitch-fix-report.md` — read the **Current patch state** and **Codex revision** first; lower sections preserve rejected historical work.
9. `docs/superpowers/safari-texture-glitch-briefing.md` — symptom/treatment map and hard constraints. Its references to an uncommitted decode WIP are historical.
10. `docs/superpowers/safari-texture-glitch-diagnosis.md` — selector-level reasoning; proposals A/B are hypotheses and A+B is known-bad.
11. `docs/superpowers/safari-texture-glitch-research.md` — primary-source WebKit research and candidate compositor mechanisms.

### Chronology and superseded experiments

12. `safari-flip-flash-handoff.md` — full chronology from page-paper flash through leaf lifetime, image warming, decode gating, and later compositor work. Preserve its evidence; do not blindly implement its older recommendations.
13. `safari-card-animation-final-handoff.md` — animation-reset evidence, negative-delay design, and the later superseding notes.
14. `safari-texture-glitch-open-handoff-for-codex.md` — records the rejected A+B experiment, rollback/data-loss audit, and current A-only revision.
15. `docs/superpowers/specs/2026-08-09-safari-continuous-card-animation-and-image-reveal-design.md` — historical design. Its image-readiness section is superseded.
16. `docs/superpowers/plans/2026-08-09-safari-continuous-card-animation-and-image-reveal.md` — Task 1 remains useful; Task 2 is explicitly superseded and must not be restored automatically.

When documents disagree, trust in this order: fresh real-Safari evidence → current source/diff → this master context → top/current sections of the Mac handoff and fix report → older addenda/plans.

## 3. Owner's observations, in chronological order

The recordings are not committed to the repository. Ask the owner to make the relevant files available on the Mac if frame comparison is needed. The black circle around the pointer in early Mac recordings is the macOS recorder's click indicator, not application UI.

Recording index from the investigation:

- `Gravação de Tela 2026-08-08 às 17.21.26.mov` — earlier-code Safari baseline.
- `Gravação de Tela 2026-08-08 às 17.30.20.mov` — earlier-code Safari baseline.
- `Desktop 2026.08.08 - 21.15.24.01.mp4` — 74-second recording of then-current code, re-recorded because the original iCloud video could not be downloaded.
- `Gravação de Tela 2026-08-08 às 21.32.50.mov` — partial-fix result with residual texture/group-photo behavior.
- `Gravação de Tela 2026-08-09 às 03.20.48.mov` — treated-card/group-photo delay and gold/holo behavior.
- `Gravação de Tela 2026-08-09 às 03.33.03.mov` — complementary forward/back page-side evidence.
- `Gravação de Tela 2026-08-09 às 03.58.47.mov` — animation freeze/reset-to-zero evidence, especially during backward flips.

1. **Initial Safari flip flash:** newly revealed pages briefly showed a bright/light paper rectangle and card layers repainted during turns. Earlier recordings were from previous code; a later 74-second recording showed the same class of failure on then-current code.
2. **First partial improvement:** the large page-backing flash was mostly reduced, but the album paper texture could still blink intermittently, group photos could blink, and images sometimes appeared late on the Mac. Localhost was served over LAN from the PC, which was considered as a latency amplifier but never established as the cause.
3. **Late treated artwork:** cards stopped showing the earlier whole-card corruption, but group photos and some cards appeared extremely late. The problem strongly followed gold/holo treatments. Base cards remained reliable.
4. **Safari gold/zoom defects:** on High quality, gold could look dead/incorrect compared with other browsers. In group-photo zoom, holo/gold treatment coverage could miss the top or side edges while normal/base borders did not. Album textures were at one point removed/disabled on Safari, which the owner rejected: preserve the intended album treatment unless a deliberate low-device quality policy is chosen.
5. **Treatment-first reveal:** on holo group photos and some cards, the texture was visible before the photo. On gold, the photo could already exist while the animated gold stripes appeared later, as though the animation/compositor were held and then released. Base did not exhibit this.
6. **Page-side correlation:** the late/glitched surface was disproportionately the page carried/revealed by the active leaf. Group intro photos reproduce often because their position repeatedly places them on the animated side when navigating forward/backward.
7. **Animation reset/freeze:** during backward turns, holo/gold animation could freeze or jump back to a zero/initial phase. The required behavior is continuous motion identical in spirit to the unaffected desktop implementation—no pause during the turn and no restart at mount.
8. **After Claude changes:** the owner reported the code had been disturbed and requested an audit/restoration before continuing. This led to the rollback/data-loss audit documented in the handoffs.
9. **Latest result:** the current A-only Safari child-`transform` experiment is worse in the owner's observation: card glitches returned during the flip and textured images still appeared late. Treat the current branch as a reproducible failing baseline.

## 4. Stable facts versus hypotheses

### High-confidence facts

- The defect is Safari/WebKit-specific in the reported environments and reproduces on macOS Safari; related earlier behavior also appeared on iPad Safari.
- Base treatment is the primary control. Gold and holo fail more often/severely, and animation increases severity.
- The same underlying image can behave correctly as base and fail with treatment layers, so network delivery or `img.decode()` alone cannot explain the defect.
- The failing DOM combines a rotating `preserve-3d` leaf, isolated/paint-contained card hosts, multiple `mix-blend-mode` layers, per-layer `translateZ(0)`, and animated `filter: hue-rotate`/background-position.
- Real Safari is the visual acceptance gate. Chrome smoke tests, TypeScript, lint, and production builds cannot detect the compositor artifact.
- The requested visual behavior includes continuous gold/holo motion through forward and backward turns.

### Plausible but unproven mechanisms

- Separate WebKit backing stores created by treatment-layer `translateZ(0)` may composite out of phase with the image/card host during leaf rotation.
- Animated `filter: hue-rotate` on a blended layer may repeatedly invalidate/rasterize that surface and amplify the race.
- WebKit may change/rebuild backing-layer type or lose/rederive blend state during 3D promotion, reveal, landing, or teardown.
- A React clone mounted for the static page versus the leaf face may begin with a different CSS animation timeline unless explicitly phase-aligned.
- Some apparent “late loading” may actually be paint/compositor visibility of an already available image, not network or decode latency.

Do not promote any one of these to “root cause” until a controlled Safari experiment discriminates it.

### Delegated audit context

The Windows investigation used five delegated review roles: two senior frontend/compositor audits, one Apple/WebKit researcher, one senior QA audit, and a frontend fix-architect follow-up. The requested “Luna” profile was not exposed by that runtime; the available delegates ran as Terra at xhigh reasoning while the primary agent remained Sol. This affects provenance only, not the required Mac validation.

Their reconciled findings were:

- the image-readiness/preparation axis was high-complexity and poorly matched the base-versus-treated control;
- the old preparation gate decoded only the leaf back while a turn reveals two destination surfaces, and successful `decode()` still did not prove destination compositing;
- changing `translateZ(0)` to `none` is not automatically pixel/behavior neutral because every non-`none` transform creates stacking/containing/compositing semantics;
- the A+B host-promotion experiment could not isolate A and changed `CardZoomModal` geometry;
- the strict Safari detector must not replace the broad legacy flag globally;
- browser-neutral eager/sync loading, warming, CardZoom restructuring, and leaf `will-change` edits would violate the Safari-only constraint unless independently justified;
- the stale `data-turning` animation-pause selector was dead after its producer disappeared and conflicted with the owner's continuous-motion requirement;
- no Windows audit could turn the visual result GREEN without native Safari.

## 5. Attempt history and what each attempt taught us

### A. Page-shell `isolation` + `contain: paint`

- **Intent:** flatten page paper/blend content to prevent a page-level re-blend flash.
- **Result:** no meaningful change.
- **Lesson:** stacking/paint containment did not force WebKit to retain a ready backing store; page-level re-blend alone was not the full explanation.

### B. Page-shell `translateZ(0)` + backface hiding

- **Intent:** keep the destination page GPU-promoted while occluded.
- **Result:** failed. Later video showed the page already painted, then briefly losing its backing at landing.
- **Lesson:** cold first reveal was not sufficient as an explanation. Do not restore shell promotion as a default fix.

### C. Turn-scoped `.album-book` and `.album-leaf` `will-change`

- **Finding:** the large paper/decor flash aligned with the 800 ms landing commit, where `data-turning` removed `will-change` while the landed leaf remained mounted for two animation frames.
- **Change:** remove `.album-book` from the turn-scoped promotion; later let `.album-leaf` own `will-change` for its entire DOM lifetime.
- **Result:** substantially reduced the large full-page flash, but did not finish the treated-card/group-photo issue.
- **Keep:** leaf-lifetime `will-change` is the current baseline unless Safari evidence disproves it. Do not add permanent book-wide promotion without measuring memory/layer cost.

### D. Eager/sync/high-priority image attributes and background URL warming

- **Intent:** have artwork decoded before reveal.
- **Variants:** eager loads; `decoding="sync"`; `fetchPriority="high"`; off-DOM `Image` warming; adjacent-group warming; sequential mounted-image decode; `preparing → turning → landed` phase; delayed Safari `jumpTo`.
- **Result:** added delay/complexity and did not fix the treatment-correlated failure. Some variants decoded only one leaf surface while a turn exposes two destination surfaces. Decode success also did not prove that WebKit had composited the mounted destination.
- **Decision:** removed. Current images are restored to their intended lazy/async behavior. Do not resurrect this axis unless Safari Network/Elements/paint evidence proves an actual source-readiness failure distinct from compositor visibility.

### E. Web Animations API `animation.startTime = 0`

- **Intent:** synchronize independently mounted card clones.
- **Result on Safari:** associated with held/frozen treatment behavior; skipping it entirely caused newly mounted Safari clones to restart at local phase zero.
- **Current design:** preserve the established Web Animations synchronization for non-Safari. On exact Safari, skip WAAPI mutation and use a CSS negative delay based on `performance.now()`.
- **Acceptance:** verify computed delay, animation `currentTime`/phase, direction, and continuity during real turns. The approach is sound by specification but the current visual result is not yet accepted.

### F. Pausing treatments under `data-turning`

- **Intent in older quality work:** reduce mobile compositor load and avoid a “death glitch.”
- **Conflict:** owner explicitly requires treatments to continue moving during the flip. Later source removed the `data-turning` producer while a stale pause selector remained.
- **Decision:** stale pause selector removed. Do not restore pause as the final behavior. It may be used only as a temporary diagnostic, clearly labeled and reverted.

### G. Safari A+B compositor experiment

- **A:** remove child treatment-layer `translateZ(0)`.
- **B:** add one `translateZ(0)`/backface rule to `.album-card-isolate` host.
- **Intent:** flatten child layers and promote one settled card surface.
- **Result:** owner reported the site/flip behavior was broken or worse. The host transform also changes stacking/containing-block semantics and interferes with `CardZoomModal` FLIP geometry.
- **Decision:** known-bad as a combination. Do not reintroduce it.

### H. Current A-only experiment

- **Implementation:** exact Safari stage marker plus `transform: none` on six treatment spans only inside `.album-leaf`; no host transform.
- **Result:** latest owner report says card glitches returned and textured image reveal is still late/worse.
- **Decision:** untrusted failing experiment. On the Mac, measure it against a true baseline with the rule disabled before retaining any part of it.

### I. Strict Safari detector applied globally

- **Problem found in review:** replacing the legacy broad `isSafari` constant would change unrelated behavior for iOS Chrome/Firefox in `VictoryCardSmall` and `CollectionAlbum`.
- **Current correction:** retain broad legacy `isSafari` semantics for existing consumers and add `isSafariAlbumEngine` only for the exact Safari album experiment.
- **Constraint:** do not casually consolidate these flags. If the album workaround should cover all WebKit shells, make that an evidence-backed product/engine decision and audit every consumer.

## 6. Current committed implementation to inspect first

Compare the branch against its base:

```bash
git diff --stat dev...HEAD
git diff dev...HEAD
git log --oneline dev..HEAD
```

Relevant code:

- `kpopit-frontend/src/components/Albums/AlbumOfCol/AlbumOfCol.tsx`
  - imports `isSafariAlbumEngine`;
  - stamps `data-browser="safari"` on `.album-stage` for exact Safari;
  - uses exact Safari for the gesture blocker;
  - no decode/preparing lifecycle remains.
- `kpopit-frontend/src/components/Albums/AlbumOfCol/AlbumOfCol.css`
  - `.album-leaf` owns `will-change: transform` for its mounted lifetime;
  - old turn-scoped book/leaf selector is gone.
- `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.css`
  - animation keyframes and visuals remain;
  - animated selectors consume `--album-animation-delay`;
  - current failing A-only selector sets `transform: none` on six treatment layers inside exact-Safari leaves.
- `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.tsx`
  - uses `useAlbumAnimationPhase()` plus `useSyncAlbumAnimations()`;
  - image remains lazy/async.
- `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/albumAnimationPhase.ts`
  - pure negative-delay style derivation.
- `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/useAlbumAnimationPhase.ts`
  - returns a Safari-only stable initial phase style.
- `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/useSyncAlbumAnimations.ts`
  - keeps old non-Safari clock mutation and exits for exact Safari.
- `kpopit-frontend/src/hooks/safariDetection.ts`
  - exact Safari UA helper excluding CriOS/FxiOS/etc.
- `kpopit-frontend/src/hooks/useIsDevice.tsx`
  - preserves broad legacy `isSafari`; separately exports `isSafariAlbumEngine`.
- `kpopit-frontend/src/components/Albums/AlbumOfCol/pages/AlbumGroupIntroPage.tsx`
  - animation phase is applied to unlocked group-photo treatment host.
- `kpopit-frontend/src/pages/Collection/components/CardZoomModal.tsx`
  - original FLIP host geometry is preserved; animation phase is applied to the treatment host.
- `kpopit-frontend/src/pages/Collection/collections.css`
  - includes quality/border-tier adjustments and removal of the stale turning-pause rule. Separate Safari work from unrelated intended graphics changes during review.
- `kpopit-frontend/src/pages/Collection/components/OnboardingTour.tsx`
  - unrelated onboarding fix included in the branch snapshot; preserve unless separately reviewed.

The Windows session previously recorded focused phase/Safari-gate tests as 6/6, lint/build success, `git diff --check` success, and a Chrome runtime smoke proving the Safari selector did not match Chrome. Temporary focused test files and runtime logs were removed; no package or lockfile change was made. These checks establish code hygiene and gate scope only, not visual correctness.

## 7. Mac investigation protocol

### Establish a reproducible baseline

1. Confirm branch/commit and a clean working tree before experiments.
2. Install existing dependencies only from the lockfile; do not upgrade packages as part of this bug.
3. Run frontend/backend using the project's documented commands. Prefer opening the site directly on the Mac so localhost/LAN transport is removed as a variable.
4. Open the collection album in current macOS Safari with Web Inspector enabled.
5. Select a deterministic set containing:
   - base member card;
   - gold member card;
   - holo member card;
   - gold/holo group photo;
   - forward and backward turns;
   - static page and zoom modal.
6. Record Safari version, macOS version, quality preset and granular settings, reduced-motion state, cache state, and exact spread/group.
7. Capture an uncut screen recording at the highest practical frame rate. Keep Inspector visible when measuring compositor/animation state.

### Measure before changing code

For the failing card/group-photo on both the static page and active leaf, inspect:

- whether the source image request is complete before the turn;
- `img.complete`, `naturalWidth`, computed visibility/opacity, and whether the image is painted before rotation;
- computed `transform`, `filter`, `mix-blend-mode`, `isolation`, `contain`, `backface-visibility`, animation name/delay/play-state;
- `getAnimations()` values (`currentTime`, `startTime`, `playState`) without mutating them;
- the exact-Safari stage marker;
- Safari Layers/compositing information, repaint indicators, and layer changes across mount → 90° reveal → landing → two-frame cleanup;
- whether the glitch follows the static destination surface, leaf front, leaf back, or both.

### Run controlled experiments one variable at a time

Start with DevTools live edits where possible so failed experiments do not contaminate source:

1. Current A-only rule enabled.
2. A-only rule disabled (true branch baseline for treatment transforms).
3. Disable individual treatment spans one at a time while keeping the photo and remaining treatment intact.
4. Disable only animated `filter` while preserving the gradient animation, as a diagnostic—not a shippable visual change.
5. Compare animation enabled/disabled and reduced motion.
6. Compare leaf copy versus static-page copy of the same card.
7. If evidence still implicates blended-filter rasterization, prototype a non-blended wrapper for `filter` only in a narrowly Safari-scoped test. Pixel-compare stationary and moving states before considering it shippable.

Do not combine multiple compositor changes in one experiment. Never call a transform “zero-pixel/no-op” without checking stacking context, containing block, blend/flattening, clipping, hit testing, and `CardZoomModal` FLIP geometry.

## 8. Tooling expectations on the Mac

- Use real Safari as the primary browser.
- Use Safari Web Inspector: Elements/Computed, Network, Timelines/Rendering, Layers/compositing/repaint tooling available in that Safari version, and console read-only probes.
- If Codex exposes browser control for installed Safari, use it to automate repeatable forward/back navigation, screenshots, and state capture. First verify the controlled browser's user agent and engine. Do not assume a generic “browser” tool is Safari.
- If native automation is available, consider `safaridriver`/WebDriver for deterministic navigation and screenshots. Do not install a new automation stack unless needed and authorized; prefer capabilities already present on the Mac.
- Use the Codex web app/browser preview only for Safari evidence if it demonstrably runs WebKit/Safari. Otherwise use it for Chrome regression checks only.
- Search the web when the observed layer transition maps to a WebKit behavior. Update `docs/superpowers/safari-texture-glitch-research.md` with primary-source links and distinguish direct evidence from inference.
- Keep videos/screenshots/logs outside version control unless they are intentionally small evidence artifacts. Record their names and findings in Markdown.

## 9. Hard constraints

1. Preserve the intended gold/holo appearance: gradients, gold texture, keyframes, durations, easing, blend modes, opacity, borders, card geometry, paper textures, and quality tiers.
2. Preserve continuous treatment motion through forward and backward flips. No final pause/restart workaround.
3. Keep `.album-card-isolate { isolation: isolate; contain: paint }` unless a measured Safari experiment proves a replacement and all Android/mobile regression tests pass. It is load-bearing protection from the earlier mobile compositing failure.
4. Do not add the rejected host transform to `.album-card-isolate` without separately proving zoom/FLIP geometry and visual equivalence.
5. Do not reintroduce decode/warm-up/preparing machinery merely because a texture appears before the image.
6. Do not disable album/card textures on Safari as a silent fallback. A quality downgrade or warning is a separate product decision requiring owner approval.
7. Preserve non-Safari behavior. Any Safari behavior gate must be exact and audited; browser-neutral optimizations are acceptable only when genuinely proven equivalent and beneficial.
8. Do not globally change the semantics of the existing broad `isSafari` export.
9. Do not make unrelated cleanup while diagnosing. Once the fix is proven, perform a separate review/cleanup pass with clear commits.
10. Never read, print, commit, or expose `.env` files or secrets.

## 10. Suggested skills for the Mac agent

Invoke the smallest applicable set and follow their instructions:

- `diagnosing-bugs` or `superpowers:systematic-debugging` — evidence-first Safari diagnosis and controlled experiments.
- `research` — WebKit primary-source investigation when browser evidence identifies a specific mechanism.
- `code-review` — compare `dev...safari-flip-fix`, separate intended Safari changes from unrelated snapshot changes, and audit regression risks.
- `superpowers:test-driven-development` — for pure detection/phase helpers or any behavior that can be deterministically tested before implementation.
- `superpowers:verification-before-completion` — mandatory before declaring the goal complete.

Do not delegate the actual visual acceptance away from the Mac agent: subagents can audit or research, but the primary agent must inspect the real-Safari evidence and final diff itself.

## 11. Development and review workflow

Work only on `safari-flip-fix`. Make small, descriptive commits for controlled fixes after they are demonstrated on Safari. Keep failed experiments out of the final source; document them here or in the existing report.

Useful commands:

```bash
git status --short --branch
git diff dev...HEAD
git diff --check

cd kpopit-frontend
npm run lint
npm run build
```

Run focused tests that exist in the Mac checkout. The temporary Windows phase/gate test files were intentionally removed after their results were recorded, so do not assume those files are present. If new pure regression tests are created and valuable, keep them in the repository rather than deleting them.

After a successful Mac fix:

1. Append the exact Safari/macOS versions, reproduction setup, experiment results, and final outcome to `safari-texture-glitch-macbook-handoff.md`.
2. Update `docs/superpowers/safari-texture-glitch-fix-report.md` so its top section describes the actual final implementation, not the failed A-only snapshot.
3. Mark superseded hypotheses clearly; preserve history rather than rewriting it as though the final cause was always known.
4. Run the complete acceptance matrix below.
5. Push the branch for Windows cleanup/review. Do not merge into `dev` from the Mac unless the owner explicitly requests it.

## 12. Required acceptance matrix

Do not claim fixed until all applicable rows pass on the actual final code.

### Real macOS Safari

- [ ] Base member cards remain flawless.
- [ ] Gold member cards: no pre-turn blink, white flash, late sheen, frozen phase, or visual degradation.
- [ ] Holo member cards: photo and treatment appear together; no late photo, flash, reset, or frozen animation.
- [ ] Gold/holo group photos: all treatment edges cover correctly in-page and in zoom; no missing top/side/bottom edge.
- [ ] Forward turns across at least five treated spreads pass.
- [ ] Backward turns across at least five treated spreads pass.
- [ ] Animation phase remains continuous across static-page ↔ leaf clone transitions.
- [ ] Animations OFF and `prefers-reduced-motion` produce no millisecond treatment flash.
- [ ] Auto and explicit High quality both pass; also spot-check lower presets/granular controls.
- [ ] Card zoom/flight opens and closes correctly for base, gold, holo, and group photo.
- [ ] Album paper/lighting/grain textures remain present and stable.
- [ ] Cold-cache first visit and warm-cache revisit both pass.

### Other engines/devices

- [ ] Desktop Chrome behavior/visuals match `dev` except for intentional unrelated branch changes.
- [ ] Desktop Firefox behavior/visuals match `dev`.
- [ ] iOS Safari is checked if available.
- [ ] iOS Chrome/Firefox exact-gate behavior is checked if available; unrelated legacy Safari/WebKit behavior must not regress.
- [ ] Android/mobile compositing remains stable, especially with High holo treatment.

### Engineering verification

- [ ] Focused regression tests pass.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `git diff --check` passes.
- [ ] No debug logs, Inspector-only code, temporary timing hacks, or abandoned experiment selectors remain.
- [ ] Final diff against `dev` has been manually reviewed file by file.
- [ ] Handoff and fix report describe the final measured result accurately.

## 13. First prompt for Mac Codex

Use this after opening the repository on the Mac:

> Read `safari-mac-codex-master-context.md` completely, then follow its required reading order. Work only on `safari-flip-fix`. Create/use the explicit goal I provide and keep it active until the real macOS Safari acceptance matrix is green. Start by reproducing and measuring the current committed A-only experiment versus the same rule disabled in native Safari. Use Safari Web Inspector and any available Codex browser automation only after confirming it controls Safari/WebKit. Research primary WebKit sources when the measured compositor transition gives a concrete lead. Preserve visuals and non-Safari behavior, document failed experiments, update the handoffs, test the final code in Safari, and push the branch for Windows review—do not merge into `dev`.

## 14. Immediate warning about repository transfer

At the time this file was created, `safari-flip-fix` and commit `843739e` were pushed, but several repository documents—including `AGENTS.md` and the 2026-08-07 compositing/quality-tier plan/spec—still appeared as untracked in the Windows working tree. A Mac `git pull` cannot receive untracked files.