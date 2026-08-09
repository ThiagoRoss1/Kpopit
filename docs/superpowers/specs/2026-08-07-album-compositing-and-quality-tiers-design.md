# Album (AlbumOfCol) — Mobile Compositing Bugs + Quality-Tier Fix

**Date:** 2026-08-07
**Status:** Design (awaiting confirmation before implementation plan)
**Scope:** `kpopit-frontend/src/components/Albums/AlbumOfCol/**`, `src/pages/Collection/**`
**Trigger:** Post-prod. Mobile browsers glitch/nuke on the collection album; desktop is fine. Three screen recordings supplied.

---

## 1. Confirmed root cause (one mechanism behind most bugs)

The book renders inside a **3D compositing context**: `.album-perspective { perspective: 2600px }` wrapping `.album-book` and `.album-leaf`, both `transform-style: preserve-3d` (`AlbumOfCol.css:7–21`). Every page + card lives inside that 3D layer.

Inside it we stack **blend + animated-filter** work that the GPU cannot flatten cheaply:

- **Holo (LV3)** card = up to **6 layers**, several `mix-blend-mode: screen/overlay` (`AlbumMemberCard.css:58,109,120,153`), and the shimmer keyframe animates **both `filter: hue-rotate()` and `background-position`** (`AlbumMemberCard.css:69–78`). Both are **non-compositable → full re-raster every frame**. Up to **12 holo cards per spread** (6/page × 2).
- **Gold (LV2)** = fewer layers (tint `overlay` + sheen `screen`, animated `background-position`) — same class of cost, lighter.
- **Textures** (`AlbumTextures.tsx`) = **full-bleed** `mix-blend-screen`/`multiply` images, so the *entire page area* recomposites through a blend layer.
- **Every page already** carries 2 full-bleed blend layers (`TextureLighting` z-10 screen, `PaperGrain` z-30 multiply) + a `GroupWatermark` of 27 lines × up to ~70 repeats (`AlbumContentShell.tsx:16–27,68–69`). Owned holo cards sit at z-40 → **blend-on-blend inside 3D**.

**Why mobile only:** `mix-blend-mode` cannot be cheaply flattened inside `preserve-3d`; the browser renders each blended layer to an intermediate texture and re-blends against its backdrop. The animated `hue-rotate` **invalidates those textures every frame**, so the GPU re-rasterizes + re-blends the whole stack ~60×/s. Mobile GPUs (fraction of desktop fill-rate/bandwidth) fall off a cliff and the compositor emits corruption. This is a known Chrome-on-Android bug class: **`mix-blend-mode` inside 3D transforms**.

**Visual proof (extracted video-1 frames @8fps):** cards momentarily render as **solid black boxes** (layer raster dropped) and one frame washes **pale cyan** (mix-blend-screen texture layer composited wrong). Not lag — compositor layer failure.

**Natural bisection (video 2) confirms it:** `data-fx-lv3='off'` only sets `animation: none` (`collections.css:493`) — it **leaves the static blend layers in the DOM**. So holo-anim-off is calm *until* textures ON re-add the big blend layer that forces the whole stack to recomposite → nuke returns. Exactly what the user observed.

---

## 2. Bug catalog (ranked)

| # | Bug | Severity | Root cause | Evidence |
|---|-----|----------|-----------|----------|
| **A** | Holo + textures **nuke** whole page (corruption/flicker/black cards/cyan wash) | **Critical** | mix-blend + animated `hue-rotate`/`background-position` inside `preserve-3d`, over full-bleed blend textures | Video 1; extracted frames (black cards, cyan wash) |
| **B** | Gold (LV2) lag + minor glitch | High | Same mechanism, fewer layers (sheen `screen` + tint `overlay`, animated bg-position) | Video 1/2 |
| **C** | **Page-flip** dies in glitch even when static view is calm | High | Flip = heavy 3D recomposite of both leaf faces; card animations + blend layers are **not paused** during the turn | Videos 1–3 ("obviously at the page flip the album dies") |
| **D** | Zoom mode: lag + rare whole-page invisible (no nuke) | Medium | `CardZoomModal` reuses `AlbumMemberCard` (animated holo still running) at large size over a **full-viewport `backdrop-blur`**; but it's a `fixed` modal *outside* the 3D book → lags, doesn't corrupt | Video 3 |
| **E** | Static per-page cost even before cards | Medium | 2 always-on full-bleed `mix-blend` texture layers + `GroupWatermark` (hundreds of DOM nodes) per page | `AlbumContentShell.tsx` |
| **F** | Permanent compositor layers / GPU-memory pressure | Medium | `will-change: transform`/`opacity` left permanently on `.album-book`, `.album-leaf`, `.album-leaf-face`, `.album-zoom-in` (`AlbumOfCol.css:14,20,27,51`) → layers never released; feeds mobile memory pressure | code; prior RAM notes |
| **G** | `data-fx-lv3='off'` doesn't actually remove the cost | Medium | Toggle stops animation only; static mix-blend layers remain (`collections.css:493–497`) | Video 2 |
| **H** | Firefox seam white line (sparkles off) | Low | Known-open from prior sessions; out of scope here, tracked separately | prior memory |

---

## 3. Product design — Quality Tiers (approved direction)

Two treatments + an auto default, layered on the existing `collectionFx` store (extend, don't replace):

- **`High`** — the rich look, **fixed & optimized** (§4) so it is compositor-safe on every device. **Desktop default.**
- **`Light`** — simplified, cheap, visually close (§5). **Mobile / low-end default.**
- **`Auto`** — chooses tier from a capability probe (mobile UA, `navigator.deviceMemory`, `hardwareConcurrency`, coarse pointer). Ships as the initial value.

**UX:** a **quality selector** at the top of the FX panel (Auto / High / Light), styled like a game's graphics setting. First-visit on a phone → Light. Switching to High shows a short **"higher quality — may stutter on some devices"** note. Existing granular toggles remain underneath as advanced overrides. Persisted with the FX state.

---

## 4. Fix for **High** (must eliminate corruption even if opted-in on mobile)

Principle: **no per-frame blend + filter inside the 3D layer.**

1. **Remove the two non-compositable animations.** Replace `filter: hue-rotate` (bake its added contrast into the gradient stops, or drop it) and `background-position` shimmer with **`transform: translate3d`** movement on oversized gradient layers. Transform/opacity animate on the compositor with no re-raster.
2. **Contain the blend.** Add `isolation: isolate` + `contain: paint` to each gold/holo card (card stays `transform-style: flat`) so `mix-blend-mode` flattens **within the card** and composites into the 3D scene as **one** layer, instead of forcing a whole-page re-blend. Apply the same isolation to the full-bleed textures.
3. **Pause when unseen.** During a flip (`turning`) and for non-active spreads, set a data attribute → `animation-play-state: paused` (fixes **Bug C**). Fold into a shared "animations active" gate.
4. **Release compositor layers.** Drop the permanent `will-change`; set it only for the duration of a transition, then clear (fixes **Bug F**). `CardZoomModal` already does this correctly — mirror that pattern.
5. **Make `data-fx-lv3='off'` real** (Bug G): when off, also drop the blend layers (render nothing / a flat fill), not just the animation.

**Fallback (only if on-device testing shows isolation isn't enough on the weakest phones):** pre-bake High's holo into a sprite/canvas texture so the card is a single flat layer.

---

## 5. Light tier rendering

Holo/gold become a **single cheap layer**: a static rainbow/gold gradient (**cheap-CSS first**; pre-rendered sprite as fallback) + at most **one `transform`-driven sheen sweep**. **No** `mix-blend-mode`, **no** `filter`, **no** `background-position`. Textures off (or one static pre-multiplied backdrop, no per-page blend). Sparkles/shadows/blur minimized. `CardZoomModal` on Light drops `backdrop-blur` (fixes most of **Bug D**).

---

## 6. Verification / QA (acceptance criteria)

- **Zero corruption/flicker** in all three video scenarios, at **every tier**, on a real Android phone (via `dev:host` LAN) and under throttled emulation.
- **Page-flip clean** at every tier.
- **High on desktop visually unchanged** (side-by-side).
- **Measured FPS** captured before/after per tier; Light holds ~60fps on mobile, High no longer corrupts.
- No new console errors; `npm run build` + `npm run lint` clean.

---

## 7. Orchestration (implementation phase)

After the implementation plan is written and approved:
- **Frontend-specialist subagent(s):** (a) High compositing fix §4; (b) Light tier §5; (c) tier probe + settings UX §3.
- **Senior-QA subagent:** device matrix, re-run the 3 video repros, capture FPS + corruption evidence.
- I orchestrate, review every diff, then run a codex review pass before calling it done.

---

## 8. Open sub-decisions

1. Light holo: **cheap-CSS first, sprite fallback** (recommended) vs straight-to-sprite. *(Proceeding cheap-CSS-first per default recommendation.)*
2. Auto tier thresholds (deviceMemory ≤ 4GB and/or ≤ 4 cores → Light) — to finalize during implementation with real device data.
