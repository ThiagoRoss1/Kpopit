# Safari Album Texture Glitch — Implementation Report (2026-08-10)

> **Codex revision (2026-08-10):** The historical A+B and A-only compositor experiments are not the
> current implementation. A-only made native Safari captures worse and was rolled back. A separate
> `loading="eager"` control also remained gradient-only before the photo appeared and was reverted.
> The current tree preserves the original treatment transforms and leaf geometry. Native Mac Safari
> reproduces a group-intro gradient→photo delay, but the exact hidden-image status at the bad frame was
> not captured; this remains unresolved and is not visual GREEN. Historical sections below are retained
> as rejected experiments and hypotheses.

## Current baseline state

- Deleted the decode/warmup modules, tests, Safari preparation phase, background warming, and global
  eager/synchronous image attributes. Those historical paths remain removed, but the native Mac evidence
  means image readiness/paint cannot be categorically excluded for the hidden destination image.
- Restored the simple `{ direction, landed }` flip lifecycle and the original CardZoom FLIP host DOM.
- Kept the negative animation phase only when the exact `isSafariAlbumEngine` gate is true; Chromium/Firefox retain their previous
  `useSyncAlbumAnimations` clock path, while Safari skips the Web Animations `startTime` mutation.
- The A-only `data-browser="safari"` marker and six treatment `transform:none` rules were removed after
  native Safari showed broader gradient/late-photo regressions. No host transform, backface override,
  keyframe, filter, blend mode, opacity, or quality-tier change is present.
- Extracted the Safari user-agent gate into a pure helper and covered macOS Safari, iPadOS desktop-mode
  Safari, iOS Chrome, and iOS Firefox with focused tests so the compositor rule cannot leak into those shells.
- Removed the dead `[data-turning='on']` animation pause rule after the producer was removed; treatment motion remains continuous.
- Focused pure tests are 49/49, lint/build pass, and `git diff --check` passes; these are engineering checks
  only and do not establish Safari visual correctness.
- V1 remains the default renderer and its treatment/FLIP structure is unchanged. V2 is still available
  only through the development-only `?albumEngine=v2` switch; it now keeps both target faces ready,
  preserves the source window through settling, delays face z-priority until the eased 90° midpoint,
  and separates the V2 group-photo zoom's FLIP geometry shell from its clipped treatment shell.
- Collection queries now wait for `AuthProvider` session restoration before their first request. This
  closes the saved-session race where an anonymous in-flight response could be cached before the JWT;
  login/logout invalidation keys and anonymous UUID behavior remain unchanged.

The V1 baseline remains intentionally unchanged. The V2 lifecycle candidate is the only implementation
under review; its transition-frame, zoom, cross-browser, and RAM gates remain open until the owner
captures visible Safari/Firefox/Chrome results.

## WebKit research continuation

WebKit's own 3D-transform documentation describes `preserve-3d` as a shared 3D space, while its
blending implementation history notes that blend/filter effects interact with flattening in that
space. The long-running [WebKit preserve-3d nesting bug](https://bugs.webkit.org/show_bug.cgi?id=71624)
and [blend-mode/preserve-3d discussion](https://bugs.webkit.org/show_bug.cgi?id=99200) support treating
the rejected child-transform removal as a device-tested compositor hypothesis, not as a guaranteed
mathematical no-op. The current baseline keeps host geometry and treatment declarations unchanged.
[WebKit 3D transforms](https://webkit.org/blog/386/3d-transforms/)

Records the reconciled experiment from `safari-texture-glitch-diagnosis.md`, informed by WebKit
primary sources in `safari-texture-glitch-research.md`. **No git commit was made — the tree is left dirty.**

## The bug (Safari only)
On the Collection flip-book, flipping a page glitches **treated** cards (gold = LV2, holo = LV3) and
group photos: group-photo cards show only the holo texture then the photo appears ~1s later (100%),
idol stickers the same ~70–80%, gold cards flash a white sheet above the image, and there is a blink
right before the leaf turns. The **base** tier (no gold/holo overlay layers) is always flawless —
 proof that treatment and hidden-image paint paths both need testing; it is not proof that image delivery is irrelevant.

## Historical compositor hypothesis (not independently confirmed)
Every gold/holo treatment span carries its own `transform: translateZ(0)`, which asks WebKit for a
**separate compositor backing store per blend/filter layer**. The underlying photo is not promoted —
it paints into the single `.album-card-isolate` store (`isolation: isolate; contain: paint`). During
the 3D `preserve-3d` leaf rotation those separate stores composite out of step with the photo: the
near-white `mix-blend-mode: screen` layers paint before their backdrop is ready → **white flash**, and
the animated `filter: hue-rotate` keeps its promoted layer perpetually re-rasterized and prioritized,
starving the photo's deferred backing store → **~1s photo delay**. The glitch magnitude scales with
the number of promoted layers (base 0 → gold 2 → holo 5 + animated filter). `.album-card-isolate`
already flattens the card into one group, so the per-layer promotion is redundant *for correctness* and
actively harmful on Safari. WebKit-documented behaviors backing this: blend-mode dropped on
tiled↔non-tiled layer-type switches, the "white flash" when a layer switches to GPU rendering
mid-transform, and animated `filter` re-rasterizing a blended layer every frame.

## Historical A+B attempt (rejected)

### `cards/AlbumMemberCard.css` — appended ONE `@supports (-webkit-hyphens: none)` block
`@supports (-webkit-hyphens: none)` matches WebKit/Safari only among current engines, so this covers
the flip-book, the card-zoom modal, and the group-intro page uniformly with no TSX change and no leak
to Chromium/Firefox. The existing per-selector `transform: translateZ(0)` declarations were **left
intact** — non-Safari keeps them.

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

    .album-card-isolate {
        transform: translateZ(0);
        -webkit-backface-visibility: hidden;
    }
}
```

- **Change 1 (primary):** `transform: none` on the six treatment spans folds every overlay into the
  card's single `.album-card-isolate` backing store, so photo + treatment paint together — no race,
  no blend-against-nothing. `translateZ(0)` is a zero-translation no-op, so removing it moves zero
  pixels; the blend/filter output is pixel-identical.
- **Change 2 (included — see below):** promotes the **card host once** so the whole flattened card is
  a single settled backing store before the overlays blend, killing the mount-time blink and matching
  what base effectively has (one store). The host is never rotated, so `backface-visibility: hidden`
  cannot hide it; it only forces a stable GPU layer from the start (Viget/GSAP "kill-the-flash").

### Was optional Change 2 included? YES.
Reasoning: the briefing explicitly lists the "pisca/blink right before the page turns" as a distinct
symptom that also affects gold (multi-store allocation at leaf mount), which Change 1 alone does not
fully address — that is the mount-time allocate-then-paint gap. The research's top recommendation is to
**"Ship A+B behind isSafari"** (A = drop per-layer promotion, B = promote the host once). Change 2 is
strictly Safari-gated by the same `@supports` probe, is provably invisible (host never rotates), reduces
each treated card to exactly one backing store, and is trivially reversible if device QA shows it is
unnecessary. Given the owner tests on device and this is a single hand-off, including B maximizes the
chance the fix fully resolves both the photo-starvation and the mount blink in one pass, at zero
non-Safari risk. Do **not** add any further per-layer promotion — the point is one store, not more.

## Historical bookkeeping from the first texture pass (superseded)

The sections below describe the earlier A+B/readiness revision and are retained for Claude's audit
trail. They are not a description of the current working tree; the current state is the section at
the top of this report.

### What I deleted / reverted from the WIP (wrong axis — image decode/warmup)

The earlier Windows observation was recorded as “images are NOT the cause” because base-tier photos
loaded instantly. Native Safari later showed the destination intro image is first mounted inside the
hidden flip leaf, so that observation was insufficient to rule out readiness/paint timing. The entire
decode/warmup axis remains removed because it was not proven and added real Safari latency:

- **`AlbumOfCol.tsx`** — restored to HEAD behavior. Reverted `FlipState` to `{ direction; landed }`,
  removed the `preparing | turning | landed` phase machine, `preparingRef`/`preparing` state, the
  `leafBackRef` preparation `useLayoutEffect`, `warmAlbumGroupImages` + the position-warming `useEffect`,
  the Safari branch in `jumpTo` (back to the simple synchronous `jumpTo`), and the imports of
  `warmAlbumImage`/`prepareAlbumImages`/`waitForAlbumRenderFrame`. **One deliberate deviation from raw
  HEAD:** the `data-turning` attribute on `.album-stage` is NOT re-added, matching the WIP's simpler
  `AlbumOfCol.css` (`.album-leaf { will-change: transform }` permanently, no `[data-turning]` selector).
  The leaf only mounts during a turn, so a permanent leaf `will-change` is lifetime-equivalent to the old
  `data-turning` gate and neutral-to-good on Safari. This keeps the css/tsx pair consistent with the
  smallest churn (net `AlbumOfCol.tsx` diff vs HEAD = a single removed line).
- **Deleted files** (were untracked WIP, no remaining importers — verified by grep):
  `albumRevealReadiness.ts`, `albumRevealReadiness.test.mjs`, `albumImageWarmup.ts`,
  `albumImageWarmup.test.mjs`.
- **`AlbumMemberCard.tsx`** — reverted the member `<img>` `loading="eager"` → `loading="lazy"`
  (`decoding` was already `async`). Kept the `useAlbumAnimationPhase` wiring.
- **`AlbumGroupIntroPage.tsx`** — reverted the group-photo `<img>` to HEAD's `loading='lazy'` and
  dropped `decoding="sync"` / `fetchPriority="high"`. Kept the `useAlbumAnimationPhase` wiring.
- **`AlbumNextGroupPage.tsx`** — reverted fully to HEAD (dropped the added
  `loading`/`decoding`/`fetchPriority`); no longer appears in the diff.
- **`CardZoomModal.tsx`** — restored to HEAD, then applied only the minimal animation-phase swap
  (import + `const animationPhase = useAlbumAnimationPhase()` + spread `...animationPhase` into the
  group-photo treatment div's style). The WIP's outer/inner DOM restructure and the
  `loading="eager"`/`decoding="sync"`/`fetchPriority="high"` img attributes were purely for the
  readiness work and are gone; `artRef` (used for the card-flight animation) is preserved.

## What I kept (per plan)
- `useAlbumAnimationPhase.ts` + `useAlbumAnimationPhase.test.mjs` and its wiring in
  `AlbumMemberCard.tsx` / `AlbumGroupIntroPage.tsx` / `CardZoomModal.tsx`, plus the three
  `animation-delay: var(--album-animation-delay, 0ms)` lines in `AlbumMemberCard.css`. Correct, cheap,
  invisible, orthogonal to the glitch. (In the historical revision only, `useSyncAlbumAnimations.ts`
  was deleted; the current patch retains it for non-Safari and skips it on Safari.)
- The WIP's simpler `AlbumOfCol.css` (`.album-leaf { will-change: transform }` permanent).
- `collections.css` `[data-cards='border']` changes and `OnboardingTour.tsx` changes (unrelated).

## Verification (real output)

`npm run lint` — clean:
```
> kpopit-frontend@0.0.0 lint
> eslint .
```

`npm run build` — success:
```
✓ 2407 modules transformed.
✓ built in 6.26s
```

`node --experimental-strip-types --test .../useAlbumAnimationPhase.test.mjs` — pass:
```
# tests 1
# pass 1
# fail 0
```

`git diff --check` — CLEAN (only benign "LF will be replaced by CRLF" notices, no whitespace errors).

Grep of `src/` for `albumRevealReadiness | albumImageWarmup | useSyncAlbumAnimations | warmAlbumImage |
prepareAlbumImages` — **NONE** (no dangling imports).

## Real-Safari-on-device acceptance checklist (owner)
Test on real Safari (macOS + iOS), the final acceptance environment. Non-Safari (Chromium/Firefox) must
render and navigate byte-identically to HEAD — spot-check one browser to confirm nothing changed there.

- [ ] **Gold sticker flip** — no white flash above the image; treatment and photo appear together.
- [ ] **Holo sticker flip** — no ~1s photo starvation; photo present on the first painted frame.
- [ ] **Group-photo flip (the 100% case)** — photo appears with the frame, not ~1s later.
- [ ] **Animations ON** — no starvation, no white flash, no mount blink.
- [ ] **Animations OFF** — no millisecond flash/glitch on holo/gold; base still perfect.
- [ ] **Blink before turn** — the pre-turn "pisca" is gone on gold and holo (Change 2 target).
- [ ] **Card-zoom modal** on a holo group photo — opens with no flash (covered by the `@supports` gate).
- [ ] **Non-Safari regression** — Chromium/Firefox flip identical to before; no visual change anywhere.

If any residual holo/group-photo flash remains after this, the next (unshipped) lever is research Fix C:
move `filter: hue-rotate` onto a non-blended wrapper (Safari-only, pixel-verified identical) — not needed
unless device QA shows a leftover.

## Historical V2 execution update (2026-08-11 — superseded by rollback)

The report above preserves the rejected A-only/A+B history. The active `?albumEngine=v2` candidate is now
the V1-shaped renderer, not the rejected persistent-sheet checkpoint:

- two flat underlays at rest;
- one complete front/back leaf during a turn;
- V2 descriptors, reducer, readiness registry, motion clock, zoom identity, and chrome retained;
- V1 image paint rules copied into V2;
- Stats panel stacking scoped to V2;
- name/LV compositor ownership limited to the active leaf;
- camera, scale, leaf, zoom, and active text animation owners use GPU-backed transforms;
- no blanket promotion of every static paragraph/card/texture.

The current candidate passes **59/59** focused tests, lint, build, and diff-check. Local Chromium smoke shows
idle, forward, and backward hybrid states with ready target surfaces and no missing page subtree. Native
Safari/iOS visual frames, Firefox final-frame pacing, group-photo zoom border parity, and measured RAM remain
open; this report must not be read as a claim that Safari is already 100% fixed.

### Post-audit correction (2026-08-11)

The active candidate now freezes the V1 leaf payload through both settling frames, removes the hybrid
leaf/underlays from persistent-sheet 3-D and z-index selectors, aborts replaced readiness waits, and
keeps registry/motion-clock fallbacks lazy. The focused suite is now **59/59** green. Local browser
smoke confirms the intended 2-underlay idle / 2-underlay+1-leaf turn topology and the Yena multi-page
tuple at rest and after a backward return. Native Safari/iOS and RAM remain the release gates.

## Final owner-requested rollback (2026-08-11)

The owner reported that the V1-shaped hybrid candidate made the album materially worse when treatments
were enabled and that the sticker regression returned. It is not a deliverable and is not the active
V2 renderer. `AlbumOfColV2` was restored to the persistent V2 `AlbumBookStage` path; hybrid renderer,
layout, CSS, tests, and hybrid-only debug selectors were removed from the active tree. Recent experimental
text promotion, Stats marker/stacking, and hover-promotion edits were also rolled back. V1 remains the
default control and was not changed.

The persistent V2 baseline retains the descriptor document, reducer, bounded physical-sheet window,
passive artwork registry, abortable readiness cleanup, shared animation clock, descriptor-driven chrome,
and exact source-sheet zoom identity. These are engineering improvements, not proof of Safari visual parity.

### Experiment ledger

- Safari-only treatment `transform:none` / A-only selectors: rejected; native captures became broader/worse.
- `loading="eager"` for group photos: rejected; the late gradient-to-photo reveal remained.
- Global/host containment, `translateZ(0)`, blanket `transform-gpu`, and texture downgrades: rejected
  because they changed layers/geometry or risked the RAM budget without proving the target frame.
- Radius-one windows and per-face subtree culling: rejected because backward destinations disappeared or
  page subtrees remounted.
- Persistent face z-index timing: deterministic but never accepted by native Safari evidence.
- V1-shaped hybrid renderer: Chromium topology smoke and 59/59 tests passed, but the owner-visible
  recording showed treatment/sticker/page composition regressions, so it was removed rather than layered
  with more CSS.

After rollback, the persistent V2 baseline passes **50/50** focused Node tests, lint, build, and diff-check
(the six hybrid-only tests were removed with the rejected candidate). Native Safari/iOS frame capture,
Firefox/Chrome parity, zoom-border checks, and measured RAM remain open for a separate investigation.
No production cutover or V1/V2 folder merge is authorized.
