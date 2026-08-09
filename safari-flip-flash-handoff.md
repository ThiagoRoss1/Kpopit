# Safari Collection-Album Flip Flash — Investigation Handoff

**Status:** OPEN. Root cause narrowed, not confirmed. Two fix attempts made; #1 proven wrong, #2 shipped but unverified on WebKit.
**Audience:** Claude (Opus) + Codex, working together. This is the shared source of truth — append findings, don't rewrite history.
**Date opened:** 2026-08-08
**Branch:** `dev` (nothing committed — all changes are uncommitted working-tree edits)

---

## 1. The bug (symptoms)

On **Safari only**, when turning a page in the collection album flip-book, the **newly-revealed page flashes** for ~1–2 frames as the leaf lifts off it:

- **"Light texture pops up"** — the destination page appears as a bright/blank light rectangle for a frame, *then* the cream paper texture + content paint in. Reported as happening on the **group intro / stats / next-group pages too, i.e. even on pages with no cards.**
- **"Stickers refresh"** — owned cards on the revealed page visibly re-paint/re-load at the same moment (same class of glitch, on the card layers).

### Environment / scope
- **Reproduces on:** macOS Safari (user's machine "Neo") **and** iPad Air (2025). Both WebKit → **it is a Safari/WebKit engine bug, not a device-capability bug.**
- **Does NOT reproduce on:** Chromium (the in-app preview browser). Claude cannot repro locally — all WebKit verification must be done by the user on Safari.
- **Independent of graphics settings** — happens on every card-graphics tier including `border`/`low` (user confirmed; did not toggle any effect off because it glitched even with no cards / effects reduced).
- This is a **different mechanism** from the historic "Android compositing nuke" (which was whole-page mix-blend re-blend crashing the whole page). Here it is **per-page/per-card**, cosmetic, and Safari-specific.

---

## 2. How to reproduce / test rig

- **Backend + frontend:** `npm run dev:host` (frontend, LAN) + `.venv/Scripts/python.exe app.py` (backend). LAN URL e.g. `http://192.168.0.108:5173`. Dev routes API through the Vite `/api` proxy, so LAN works with no `api.ts` change.
- **Album URL:** `/collections/1/album-1` (dev deep-link `?spread=N` opens directly on spread N — see `AlbumOfCol.tsx` `position` init).
- **Test user with a full board:** `user_id = 3986` — granted **40 holo (lv3) / 40 gold (lv2) / 71 base (lv1)** + 34 group-photo covers via `kpopit-backend/scripts/grant_test_cards.py` (re-run with `--clear`). NOTE: localStorage token is AES-encrypted (`tokenEncryption.ts`), so you cannot just paste a raw UUID into Safari's localStorage to become 3986 — the site must be loaded *as* that user, or grant to whatever anon user Safari created.
- **Best capture:** QuickTime screen recording at 60fps, then scrub frame-by-frame around the moment the leaf reveals the destination page. Safari Web Inspector → **Layers** tab shows the composite-layer count (see §4).

---

## 3. The flip mechanism (code map)

Main engine: `kpopit-frontend/src/components/Albums/AlbumOfCol/AlbumOfCol.tsx`

- A page turn sets `flip` state; a `.album-leaf` is **conditionally mounted only during the turn** (`{flip && (...)}`, ~line 531). It has two faces (`.album-leaf-face`), front + back, `backface-visibility: hidden`.
- The leaf carries the **old** page on its front face and rotates `rotateY(0 → ±180deg)` over `FLIP_DURATION_MS = 800ms` (`AlbumOfCol.css` `.album-leaf` transition).
- The **destination page is rendered statically underneath** the leaf from the start of the turn: during a forward turn `leftPagePosition = position`, `rightPagePosition = position + 1` (~lines 417–420), so `rightPage = rightPageAt(position+1)` (the new page) is mounted at turn start but **fully occluded by the opaque leaf front face** until the leaf rotates past 90°.
- Static page wrappers: `<div className="absolute left-0/left-150 ... overflow-hidden">` (~lines 515–524). These wrappers have **no compositing hint**.
- `data-turning='on'` is set on `.album-stage` during the turn.

Key CSS: `kpopit-frontend/src/components/Albums/AlbumOfCol/AlbumOfCol.css`
- `.album-book`, `.album-leaf` → `transform-style: preserve-3d`.
- **`will-change: transform` is scoped to `[data-turning='on']`** on `.album-book` AND `.album-leaf` (added at turn start, removed at turn end) — deliberately scoped to save GPU memory on mobile (see comment there). This is a toggle → possible layer churn (see §6, hypothesis B).
- `.album-leaf-face { backface-visibility: hidden }`; `.album-book img { backface-visibility: visible; transform: none }`.

Page shells (where the light base + blend textures live):
- `shell/AlbumContentShell.tsx` — used by **BlankPage, GroupIntroPage, MembersPage**. Root: `relative h-225 w-150 overflow-hidden bg-white`.
- `shell/AlbumCoverShell.tsx` — used by **Cover, NextGroupPage, StatsPage**. Root: `relative h-225 w-150 overflow-hidden bg-[#d9d9d9]`.
- `shell/AlbumTextures.tsx` — `TextureLighting` (`mix-blend-screen`), `PaperGrain` / `GrainParticles` (`mix-blend-multiply`), each an `<img loading? decoding="async">` with class `isolate`. **The light/white base + these multiply/screen blend layers = why an un-painted page reads as a bright light rectangle** (base shown before the multiply paper darkens it to cream).

Cards: `cards/AlbumMemberCard.tsx` + `cards/AlbumMemberCard.css`
- `.album-card-isolate { isolation: isolate; contain: paint }` — the **load-bearing mobile compositing fix**: each treated card flattens its mix-blend + animated `filter: hue-rotate` (LV3 holo) / `background-position` (LV2 gold sheen) WITHIN the card and composites as one layer. **Do NOT remove isolate/contain or the holo/gold keyframes** — that is the fix for the Android nuke and is unrelated to this Safari flash.

---

## 4. Evidence gathered (from the two 60fps screen recordings)

Recordings (macOS Safari, Web Inspector open on Layers tab):
- `Gravação de Tela 2026-08-08 às 17.21.26.mov` (45s)
- `Gravação de Tela 2026-08-08 às 17.30.20.mov` (102s)
- Frame extraction was done with ffmpeg contact sheets (Claude cannot "watch" video; extracts frames).

**Findings from frame-by-frame (cropped to the album spread, 30fps sheet of one IZ\*ONE → aespa forward turn):**
1. The old (source) page stays stable through the whole turn — **it does not flash.**
2. **Only the newly-revealed page flashes**, and it flashes **at the reveal moment** (as the leaf passes ~90° and lifts off it), not at turn start and not clearly at turn end.
3. The flash = destination renders as a **bright/blank light rectangle for ~1–2 frames (≈16–66ms)**, then the paper texture + content appear.
4. **Layers tab:** a very large number of separate composite layers — a dense overlapping cluster (current spread's cards) plus a long horizontal chain (carousel thumbnails / other pages, each its own layer). High layer count makes each on-demand raster expensive enough to be a visible blank frame.

**Interpretation of the signature (only-revealed-page, at-reveal-timing):** points to **WebKit deferring the raster of the occluded destination page until it is revealed, then painting it cold** — NOT a whole-book repaint (which would flash both pages / at turn start) and NOT (per §5) a mix-blend re-blend.

---

## 5. Fix attempts & results

| # | Change | Hypothesis | Result |
|---|--------|-----------|--------|
| 1 | Added `.album-page-isolate { isolation: isolate; contain: paint }` to both shell roots | Flash = page-level mix-blend **re-blend** against book backdrop on reveal; flatten to one isolated layer to reveal ready | **FAILED — zero change.** This *disproves the re-blend hypothesis.* Key lesson: `isolation`/`contain` only create a stacking context + paint containment; **they do NOT force a maintained GPU compositing layer**, so WebKit still re-rasters the page cold on reveal. |
| 2 | Changed `.album-page-isolate` to `{ isolation: isolate; transform: translateZ(0); -webkit-transform: translateZ(0); backface-visibility: hidden; -webkit-backface-visibility: hidden }` (still on both shell roots) | Flash = occluded page's backing store discarded/deferred; force a **maintained GPU layer** so WebKit keeps it rasterized while occluded | **SHIPPED, UNVERIFIED on Safari.** Chromium: no visual regression, flip works, `tsc`/`lint`/`build` all pass. Awaiting user's Safari test. |

**Caveat on attempt #2:** the shells already spawn composited layers via their `mix-blend` children, yet still flashed under attempt #1. So it is *possible* WebKit invalidates/defers the occluded layer's backing even when promoted. If #2 fails, promotion is ruled out and we escalate.

---

## 6. Open hypotheses (ranked)

- **A (leading): WebKit paint-deferral of the occluded destination.** The destination page sits under the opaque leaf for most of the 800ms turn; WebKit doesn't maintain/paint the occluded layer and rasters it cold at reveal. Supported by the frame signature (§4). Attempt #2 targets this.
- **B (secondary): `will-change: transform` toggle churn** on `.album-book` (added/removed each turn via `[data-turning='on']`). Toggling `will-change` on WebKit can destroy/recreate the layer and repaint the subtree. *Weaker* fit: a whole-book repaint would flash both pages / at turn boundaries, but the video shows only the revealed page at reveal. Cheap to test: drop `.album-book` from the will-change rule (leaf mounts/unmounts anyway).
- **C: leaf back-face cold raster.** The leaf back face carries freshly-mounted content (`leafBack`) and becomes visible past 90°; a cold face layer could flash. Overlaps with A in timing. Would explain the *left* page on a forward turn; the observed flash was on the *right* (revealed static page), so this is likely secondary.
- **D: card `<img>` decode-on-reveal** for the "stickers refresh" specifically (`loading="lazy" decoding="async"`). Separate from the page-base flash; may need its own fix (eager decode / solid placeholder) even after the page flash is solved.

---

## 7. Decisive diagnostic (run if attempt #2 fails)

To end the guessing between "cold occluded raster" vs other causes: **temporarily make the flipping leaf semi-transparent** (e.g. `opacity: 0.5` on `.album-leaf`) and record a turn. Then observe the destination page *through* the translucent leaf mid-turn:
- If it is **blank/white under the leaf before reveal** → paint-deferral of the occluded layer is CONFIRMED (hypothesis A). Promotion (attempt #2) didn't help → go to §8 option 3.
- If it is **already textured under the leaf** → paint is not deferred; cause is the leaf's own face raster or the will-change toggle (B/C) → pivot.

---

## 8. Escalation ladder (cheapest first)

1. **CSS layer-warming** — attempt #2 (shipped). No behavior change.
2. **Safari-only pre-warm** — gate behind `isSafari` (already imported in `AlbumOfCol.tsx` from `hooks/useIsDevice`): force-paint the destination spread one frame *before* the leaf begins rotating (e.g. mount + `requestAnimationFrame` + read layout, or briefly render un-occluded). Risk: if occlusion defers paint regardless, this won't stick.
3. **Safari-only 2D transition** — replace the `preserve-3d` page-turn with a crossfade / slide **on Safari only**. GUARANTEED to kill the flash (no occluded 3D reveal = nothing to cold-raster), but changes the flip feel for Mac + all iPhones/iPads. **This is a UX decision for the product owner, not a silent code change.**

---

## 9. Hard constraints (do NOT break)

- **Keep** `.album-card-isolate { isolation: isolate; contain: paint }` and the original holo/gold keyframes (`background-position` + `filter: hue-rotate`) — this is the load-bearing mobile compositing fix, independent of this bug.
- **Keep** `will-change` scoped to the turn *unless* hypothesis B is being tested — permanent `will-change` on every leaf/book was deliberately avoided for mobile GPU-memory reasons.
- Anything touching the flip must be verified on **real Safari** (Mac + iOS), not just Chromium. Chromium is green on everything so far and tells us nothing about this bug.
- Nothing is committed. Verify `tsc -b`, `npm run lint`, `npm run build` before any commit.

---

## 10. Current working-tree state (uncommitted)

Flash-related:
- `AlbumOfCol.css` — added `.album-page-isolate` (attempt #2 form).
- `shell/AlbumContentShell.tsx`, `shell/AlbumCoverShell.tsx` — added `album-page-isolate` class to shell root.

Unrelated but also uncommitted this session (context, not part of this bug):
- Border-tier card padding fix (`collections.css` — gold/holo frame fill under `[data-cards='border']`).
- Onboarding tour first-spotlight slide fix (`OnboardingTour.tsx` — distinct `key` on spotlight vs dim div).
- `kpopit-backend/scripts/grant_test_cards.py` — new QA script (test board for user 3986).

---

## 11. Log (append below — who/when/what)

- **2026-08-08 — Claude (Opus):** Opened. Characterized via recordings; disproved re-blend (attempt #1); shipped GPU-promotion (attempt #2, unverified). Wrote this doc for handoff.
- **2026-08-08 — Codex:** Reviewed all three recordings, including the current-code 74.25s MP4. Attempt #2 is now **proven failed**. The current recording contains a more decisive end-of-turn event than the earlier contact sheets: the destination spread is fully painted, then its right page loses the paper/decor backing for exactly two sampled 60fps frames at the 800ms landing commit, while the independently isolated card layers remain visible. The page returns after the two-rAF leaf cleanup. Implemented the targeted hypothesis-B fix and reverted attempt #2; real Safari verification remains pending.

---

## 12. Codex addendum — current recording, diagnosis, and fix under test

### New evidence from the current code

Recording: `Desktop 2026.08.08 - 21.15.24.01.mp4` (74.2504s, 1920×1080, nominal 120fps; the embedded Mac recording was sampled at 60fps).

On the GOT THE BEAT turn, the destination spread is already complete and stable before the fault. At local turn-window times `1.617s` and `1.633s`, the right page becomes bright/washed out; at `1.650s`, it is complete again. A crop over that page measured a stable `YAVG` near `194`, a two-frame peak of `216.485`, then a return near baseline. This is a repeatable RED signal, not a subjective color shift.

Most importantly, the member cards remain visible during the bright frames while the page paper/decor treatment disappears. That means the card compositor islands survive while the surrounding book/page backing is rebuilt. This contradicts the old cold-first-reveal interpretation and rules out attempt #2: the promoted page had already painted before it flashed.

The timing matches `AlbumOfCol.tsx` exactly:

1. The leaf transition lasts `FLIP_DURATION_MS = 800`.
2. At 800ms, `position` advances and `flip.landed` becomes `true`.
3. `turning` immediately becomes false, so `data-turning` changes from `on` to `off`.
4. The old CSS therefore removed `will-change: transform` from both `.album-book` and `.album-leaf` in that commit.
5. The landed leaf remains mounted for two `requestAnimationFrame` callbacks, matching the two bad frames, and is then removed.

### Fix now implemented

- `AlbumOfCol.css`: removed `.album-book` from the turn-scoped `will-change` selector. Only the element that actually turns, `.album-leaf`, is promoted. This removes the Safari book-layer teardown/rebuild at landing and also avoids holding an unnecessary extra GPU layer.
- Reverted failed attempt #2 completely: removed `.album-page-isolate` and its `translateZ(0)`/backface promotion from `AlbumContentShell` and `AlbumCoverShell`. It added layers without changing the bug.
- `AlbumMemberCard.tsx` and `AlbumGroupIntroPage.tsx`: changed visible card/group-photo loads from lazy to eager. The current recording separately shows a group photo appearing after the spread is stable; eager loading starts while the destination spread is mounted for the turn. This addresses late image decode/loading and is not being used to explain the page-backing flash.
- Preserved `.album-card-isolate`, all gold/holo animations, and the Android compositing fix.

### Verification completed

- `npm run lint` — PASS
- `npm run build` (`tsc -b && vite build`) — PASS
- No Chromium claim is being used as proof for the WebKit bug.

### Required Safari check / fallback

This fix is **implemented but not yet GREEN on real Safari**. Re-test several forward and backward turns on macOS Safari and iPad Safari. Check both the paper/decor flash and card/group-photo late paint.

If the same two-frame flash remains, do not restore page-shell promotion. The next isolated experiment is cleanup ordering: keep the compositor/turn state active through the landed leaf's two-rAF lifetime, then remove the leaf and turn state together. That tests whether the intermediate `landed + leaf mounted` state itself is the remaining WebKit trigger.

---

## 13. Codex addendum — residual flash and image warm-up

Recording: `Gravação de Tela 2026-08-08 às 21.32.50.mov` (37.66s, 2816×1762, 60fps), captured after the section 12 change.

### Result of the previous fix

Removing turn-scoped promotion from `.album-book` fixed almost all of the page flash. The large two-frame full-page backing loss from the previous recording is gone. A smaller/intermittent texture disturbance remains.

The remaining lifecycle gap is now explicit: `.album-leaf` still received `will-change` only while `turning === true`, but `turning` becomes false at the 800ms landing commit while the leaf stays mounted for another two animation frames. Thus the book stopped churning, but Safari could still de-promote a visible landed leaf immediately before it was removed.

### Image evidence

The group-photo behavior is separate and repeatable. On several first visits (LE SSERAFIM, aespa, TWICE, MISAMO, IVE), the intro page is already stable with its treatment placeholder, then the photo enters atomically roughly 250–350ms later. A frame-difference check over the LE SSERAFIM photo region produced a RED peak `YDIF=26.7427`.

The same group photo had often already appeared on the preceding next-group page. That rules out localhost/LAN transfer as the sole cause: WebKit is also postponing the decoded surface for the newly mounted intro-page `<img>`. `loading="eager"` alone did not guarantee a warm decoded surface.

### Final changes under Safari verification

- `.album-leaf` now owns `will-change: transform` directly. Since the leaf DOM node exists only during a turn, promotion lasts for exactly the node's full lifetime with no idle GPU cost and no landed-but-depromoted interval.
- Removed the now-unused `data-turning` DOM attribute and selector.
- `AlbumOfCol.tsx` warms owned artwork for only the current and adjacent groups using `Image.decode()`. It keeps pending `Image` objects alive, deduplicates URLs, retries failed requests on a later visit, and avoids downloading the full collection up front.
- Group photos on both the next-group and intro pages use eager loading, synchronous decode, and high fetch priority. Member cards stay async but are included in adjacent-group warm-up.
- No change to `.album-card-isolate`, card treatments, gold/holo animation, or the Android compositor fix.

### Verification

- `npm run lint` — PASS
- `npm run build` (`tsc -b && vite build`) — PASS
- There is no honest automated GREEN for the compositor artifact without real WebKit. The captured-video detector remains the regression feedback loop; final macOS/iPad Safari confirmation is required.

---

## 14. Codex addendum — decoded-turn gate and Safari treatment-clone fix

**Date:** 2026-08-09  
**Status:** IMPLEMENTED; focused tests, TypeScript, and lint are green. Real-Safari visual GREEN is still required.

### New recordings reviewed

- `Gravação de Tela 2026-08-09 às 03.20.48.mov` — 47.163s, 2816×1762, nominal 60fps.
- `Gravação de Tela 2026-08-09 às 03.33.03.mov` — 69.315s, 2816×1762, nominal 60fps, with Safari Web Inspector Layers visible.

The earlier card corruption is no longer present. Three residual WebKit-only faults are visible:

1. artwork on the leaf involved in a turn can still appear after the page/treatment shell;
2. the LV2 gold treatment in card zoom can remain visually frozen/dead for the modal lifetime;
3. treated group-photo zooms can lose/underpaint the top material edge while base borders remain correct.

The gold failure has a repeatable video RED, not only a visual judgment. Across 68 settled frames from the LV2 Yeonjung zoom, a crop of the top material edge measured mean frame-to-frame `YDIF=0.001` (required probe threshold `>=0.2`). The 3.4s sheen rests for at most ~1.53s, while the recording remains static for more than two seconds, so this is not merely the keyframe's intentional off-screen rest.

### Root causes and corrections

#### A. Warm-up was fire-and-forget

The section-13 warm-up kept an `Image` alive and called `decode()`, but callers could not await it. A click during an already-pending warm request therefore started the 3D turn immediately and raced the same decode. That explains why `loading="eager"` improved frequency without eliminating the late reveal.

- Extracted `albumImageWarmup.ts` with a promise-based, URL-deduplicated warmer.
- Concurrent callers now share the same promise.
- The promise resolves only after load + decode (decode failure is tolerated after bytes load; network failure releases the gate and remains retryable).
- On Safari only, `go()` waits for the destination group's owned artwork before mounting/rotating the leaf. The wait therefore occurs before motion rather than revealing pixels after motion.
- Chromium keeps its existing immediate navigation behavior; background current/adjacent-group warming remains enabled everywhere.
- `preparingRef` closes the rapid-click race synchronously, while `preparing` participates in the existing navigation-busy state.

#### B. WebKit animation clock was forcibly rewritten during clone promotion

`useSyncAlbumAnimations` assigned `animation.startTime = 0` to every `album-*` CSS animation below a newly mounted card/group-photo clone. On WebKit, doing this while the clone is being promoted/transformed can leave the CSS animation held until a later repaint. This exactly fits the recording: base is unaffected, the photo and treatment can activate independently, and the gold stripes sometimes appear suddenly.

- Added `albumAnimationSync.ts` as the narrow clock-alignment boundary.
- Safari now retains the native CSS animation clock. Chromium/Firefox keep the existing clone synchronization.
- Original gold/holo keyframes, animation toggles, and `.album-card-isolate { isolation: isolate; contain: paint }` are unchanged.

#### C. The group-photo texture shell was also the animated FLIP shell

The group-photo modal applied the flight transform, permanent `transform-gpu`, rounded overflow clipping, and the gold/holo texture to the same element. WebKit could clip/raster the treated padding as part of that moving composited surface, producing sides/bottom with a missing top edge.

- Split the modal into an unclipped outer FLIP shell and a separate inner isolated/clipped treatment shell.
- Removed the permanent GPU transform from the texture shell.
- The group photo inside the modal is eager, sync-decoded, and high-priority.
- Base/gold/holo geometry is now identical; only the inner treatment differs.

### Quality-tier decision

Do **not** disable album paper textures on Safari. The recordings identify lifecycle/clone defects rather than an album-texture capability limit. Auto still resolves from device capability, and the existing heavy-graphics warning still covers at-risk devices when users elevate settings. A Safari-wide downgrade would hide the symptoms while unnecessarily degrading capable Macs and would not repair the malformed zoom edge.

### Automated checks added

- `albumImageWarmup.test.mjs`: concurrent requests allocate one image, remain pending through decode, then cache the decoded result.
- `albumAnimationSync.test.mjs`: Safari preserves the native CSS animation clock instead of forcing `startTime=0`.

RED was observed before implementation (both imports absent). GREEN command:

```powershell
node --experimental-strip-types --test src/components/Albums/AlbumOfCol/albumImageWarmup.test.mjs src/components/Albums/AlbumOfCol/cards/albumAnimationSync.test.mjs
```

Focused result: 2/2 pass. `npx tsc -b --pretty false` and `npm run lint` also pass. Run the full production build after this documentation update.

### Required Safari acceptance pass

1. Use Auto, then explicitly High, without changing Gold/Holo animation toggles.
2. Flip forward and backward rapidly across several group intro/member spreads. The turn may wait briefly on the first cold group, but no photo/card may enter after the leaf starts moving.
3. Open two LV2 cards and leave each open for at least four seconds. Gold must move naturally and retain the intended jewelry-gold color.
4. Open gold and holo group photos from both left- and right-page contexts. Confirm continuous treatment on all four edges, including the top, during and after flight.
5. Confirm album paper/grain/lighting textures still render on Safari in High; they were intentionally preserved.

---

## 15. Codex addendum — continuous phase and mounted-destination gate

**Date:** 2026-08-09  
**Status:** automated GREEN; real-Safari visual GREEN pending. Full standalone context: `safari-card-animation-final-handoff.md`.

The final recording (`Gravação de Tela 2026-08-09 às 03.58.47.mov`) disproved section 14's Safari strategy of simply preserving each clone's native animation clock. Independent holo pages repeatedly reappeared at the same initial orange/yellow/green frame; two such crops measured `SSIM=0.972694` against a `0.95` reset threshold. The old workaround stopped the forced-clock freeze but made every new Safari page clone start from local CSS time zero.

The replacement uses no post-mount Web Animations mutation. Every treated card/group-photo host receives a stable negative `animation-delay` derived from `performance.now()` during its initial render. CSS defines a negative delay as beginning already advanced, so separately mounted static-page and leaf clones share document time without changing any keyframe, duration, easing, blend mode, color, or layer.

The late image was also narrowed further. Safari now mounts the real destination leaf at zero rotation, sequentially decodes only the mounted destination face's actual `<img>` elements, waits one rendering frame, and then starts the existing turn. Flip lifecycle is explicit: `preparing → turning → landed`. Chromium/Firefox enter `turning` immediately. Safari index `jumpTo()` waits for the relevant group warmer; other engines remain synchronous.

Removed the obsolete `useSyncAlbumAnimations`/`albumAnimationSync` path. Added focused phase/readiness tests. Fresh result: 3/3 Node tests pass, ESLint exits 0, production TypeScript/Vite build exits 0, `git diff --check` exits 0 (line-ending warnings only), and no old sync/debug instrumentation remains.

Real Safari must still verify continuous phase during backward/forward turns and that a cold destination waits before motion instead of revealing pixels after motion. Do not downgrade textures or treatments if it fails; capture animation `currentTime`/`playState` and Network timing first.

---

## 16. Codex latest revision — treatment compositor only

The section-15 readiness gate is now superseded by the owner's later confirmation that photos and
texture shells have separate timing, but the same source images and base tier remain reliable. The
current working tree therefore removes `preparing`, `decode()` gating, background URL warming, and
browser-neutral eager/synchronous image attributes. It restores the original CardZoom host DOM and
keeps the continuous animation phase only on detected desktop Safari.

The active visual experiment is deliberately narrower than the rejected A+B attempt: the album stage
gets `data-browser="safari"` only for Safari, and only the six treatment spans lose their child
`translateZ(0)` under that marker. No transform is added to `.album-card-isolate`; no keyframe,
filter, blend mode, palette, texture, or quality tier changes. Chromium, Firefox, iOS Chrome, and
iOS Firefox do not receive the rule. The stale `data-turning` animation pause selector was removed
so holo/gold motion remains continuous.

The prior non-Safari animation-clock behavior is preserved through the existing
`useSyncAlbumAnimations` hook. That hook now exits early only on Safari, where the CSS negative-delay
phase replaces the unsafe Web Animations mutation.

The exact album gate is separate from the site's broad legacy `isSafari` flag, so iOS Chrome/Firefox
retain their pre-existing VictoryCard and album-page behavior.

Automated evidence for this revision: focused phase and Safari-gate tests 6/6, ESLint exit 0,
TypeScript/Vite production build exit 0, and `git diff --check` exit 0 (only line-ending warnings). This still needs
real Safari visual acceptance across base/gold/holo member and group-photo turns, animations on/off,
reduced motion, zoom flight, and non-Safari regression checks before it can be called fixed.

Chromium runtime smoke also passed: while a real page turn mounted one `.album-leaf`, the stage had
no `data-browser` attribute, so the Safari-only child-transform rule did not match.
