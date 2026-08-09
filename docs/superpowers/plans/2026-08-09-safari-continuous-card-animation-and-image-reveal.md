# Safari Continuous Card Animation and Image Reveal Implementation Plan

> **Current status (2026-08-09):** Task 2's image-readiness implementation was superseded after
> owner confirmation that the remaining defect is treatment compositing, not image delivery. The
> current code removes that axis and applies only the stage-scoped Safari treatment experiment
> documented in `docs/superpowers/safari-texture-glitch-fix-report.md`. The checklist below is the
> historical investigation record; do not reintroduce Task 2 without new Safari evidence.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve continuous card-treatment animation phase across Safari page clones and finish destination artwork before Safari navigation reveals it.

**Architecture:** Replace post-mount Web Animations clock mutation with a render-time negative CSS delay derived from the document monotonic clock. Add a Safari-only preparation stage that decodes the actual leaf destination images sequentially before rotation; keep other engines on the existing immediate path.

**Tech Stack:** React 19, TypeScript 5.8, CSS Animations, Node test runner, Vite 7.

## Global Constraints

- Do not change gold/holo keyframes, duration, easing, colors, blend modes, or visual layer count.
- Keep album paper textures, `.album-card-isolate`, and all quality-tier behavior.
- Safari-only image gating; no Chromium/Firefox navigation delay.
- Preserve the dirty working tree and make no commit.

---

### Task 1: Continuous treatment phase

**Files:**
- Create: `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/useAlbumAnimationPhase.ts`
- Create: `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/useAlbumAnimationPhase.test.mjs`
- Modify: `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.tsx`
- Modify: `kpopit-frontend/src/components/Albums/AlbumOfCol/pages/AlbumGroupIntroPage.tsx`
- Modify: `kpopit-frontend/src/pages/Collection/components/CardZoomModal.tsx`
- Modify: `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.css`
- Modify: `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/useSyncAlbumAnimations.ts` (retain
  Chromium/Firefox behavior; skip the WebKit mutation)
- Delete: `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/albumAnimationSync.ts`
- Delete: `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/albumAnimationSync.test.mjs`

**Interfaces:**
- Produces: `animationDelayAt(timestampMs: number): string`
- Produces: `useAlbumAnimationPhase(): CSSProperties`

- [x] **Step 1: Write the failing test** proving mounts at `900ms` and `5100ms` receive `-900ms` and `-5100ms`, so a 4.2s animation mounted at `5100ms` begins at phase `900ms`, not zero.
- [x] **Step 2: Run** `node --experimental-strip-types --test src/components/Albums/AlbumOfCol/cards/useAlbumAnimationPhase.test.mjs` and confirm missing-module RED.
- [x] **Step 3: Implement** the pure delay helper and stable render-time hook; apply its CSS variable to member cards, group-photo cards, and group-photo zoom.
- [x] **Step 4: Add** `animation-delay: var(--album-animation-delay, 0ms)` to the existing animated gold/holo selectors without modifying their animation definitions.
- [x] **Step 5: Gate** the Web Animations synchronization implementation off on Safari while
  preserving the established Chromium/Firefox path, then run the focused test GREEN.

### Task 2: Safari destination readiness (superseded; do not reintroduce)

**Files:**
- Create: `kpopit-frontend/src/components/Albums/AlbumOfCol/albumRevealReadiness.ts`
- Create: `kpopit-frontend/src/components/Albums/AlbumOfCol/albumRevealReadiness.test.mjs`
- Modify: `kpopit-frontend/src/components/Albums/AlbumOfCol/AlbumOfCol.tsx`

**Interfaces:**
- Produces: `prepareAlbumImages(images, afterDecode): Promise<void>`

- [x] **Step 1: Write the failing test** proving actual images decode sequentially, decode failures do not deadlock, and the rendering-frame callback occurs only after every decode settles.
- [x] **Step 2: Run** the focused Node test and confirm missing-module RED.
- [x] **Step 3: Extend** flip state with `preparing | turning | landed`; mount the leaf during preparation and collect only the destination face's actual images.
- [x] **Step 4: On Safari**, prepare those images and wait one rendering frame before switching to `turning`; on other engines switch immediately.
- [x] **Step 5: Make** Safari `jumpTo()` await the relevant group's URL warmer before replacing position; keep other engines synchronous.
- [x] **Step 6: Run** both focused test files GREEN.

### Task 3: Verification and handoff

**Files:**
- Create: `safari-card-animation-final-handoff.md`
- Modify: `safari-flip-flash-handoff.md`

- [x] **Step 1: Run** focused Node tests, `npm run lint`, and `npm run build`.
- [x] **Step 2: Inspect** `git diff --check`, changed-file scope, and debug-instrumentation scan.
- [x] **Step 3: Write** the bug, video evidence, WebKit research, rejected approaches, implementation, automated evidence, and real-Safari acceptance checklist.
- [x] **Step 4: Remove** temporary extracted frames and report that real Safari is still the final visual GREEN.
