# Album Compositing Fix + Quality Tiers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the mobile compositing corruption on the collection album (holo/gold/textures) and add a High/Light/Auto quality-tier system so the rich look is compositor-safe everywhere and phones default to a cheap tier.

**Architecture:** The corruption comes from `mix-blend-mode` + animated `filter`/`background-position` running inside the book's `preserve-3d` context. Fix the **High** treatment so no per-frame blend+filter happens inside the 3D layer (transform-driven motion, `isolation`+`contain` per card, animations paused during flips, `will-change` released). Add a **Light** tier (single cheap layer, no blend/filter) that is the mobile default via an **Auto** device probe. Both tiers ride the existing `collectionFx` store and `data-*` attribute system — no new global state, no engine rewrite.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind 4, CSS (native `@keyframes`, `mix-blend-mode`, `isolation`, `contain`), Vitest-style unit tests are NOT currently configured — pure-logic tasks use a temporary Node test script; visual/compositing tasks are verified in the in-app browser preview + a real Android phone over `dev:host` LAN.

## Global Constraints

- Keep the **visual identity** of High as close to current as possible (user: "we keep the main, BUT adjust and optimize it"). Any deviation must be intentional and cheaper, never richer-but-broken.
- **Zero corruption/flicker** at every tier on mobile is the hard acceptance bar. Lag is tolerable only as a last resort; corruption is never acceptable.
- Do **not** rewrite the AlbumOfCol engine — it already mounts only the current spread. Changes are localized to card/texture compositing + the FX store + FX panel.
- Follow existing repo patterns: `data-fx-*` attributes on the album/collections root drive CSS; leaf components read flags via `useFx(key)`; debug logs gated behind `import.meta.env.DEV`.
- Persisted FX key is `kpopit-collections-fx`; extend its shape backward-compatibly (spread over `DEFAULTS`).
- Every task ends green on `npm run build` and `npm run lint` (run from `kpopit-frontend/`).
- Commit after every task with a `feat:`/`fix:`/`perf:` message.

---

## File Structure

**Create:**
- `kpopit-frontend/src/pages/Collection/deviceTier.ts` — `Quality` type, `probeDeviceTier()`, `resolveTier(quality, probe)`.

**Modify:**
- `kpopit-frontend/src/pages/Collection/collectionFx.ts` — add `quality` to state; tier→group derivation.
- `kpopit-frontend/src/pages/Collection/useCollectionFx.ts` — expose `quality` + `setQuality`, and a resolved-effects view.
- `kpopit-frontend/src/pages/Collection/CollectionAlbum.tsx` — emit `data-quality` on the root; add quality to `fxAttrs`.
- `kpopit-frontend/src/pages/Collection/Collections.tsx` — emit `data-quality` on the root.
- `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.css` — compositor-safe High holo/gold (transform-driven, `isolation`+`contain`).
- `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.tsx` — `isolation` wrapper; Light-tier single-layer branch.
- `kpopit-frontend/src/pages/Collection/collections.css` — real `data-fx-lv3='off'` layer removal; `data-quality='light'` rules; pause-during-flip rules.
- `kpopit-frontend/src/components/Albums/AlbumOfCol/AlbumOfCol.tsx` — `data-turning` attribute on stage; `will-change` set only during transitions.
- `kpopit-frontend/src/components/Albums/AlbumOfCol/AlbumOfCol.css` — drop permanent `will-change`; add paused-state hooks.
- `kpopit-frontend/src/components/Albums/AlbumOfCol/shell/AlbumTextures.tsx` — `isolation`; gate off on Light.
- `kpopit-frontend/src/pages/Collection/components/CardZoomModal.tsx` — drop `backdrop-blur` on Light.
- `kpopit-frontend/src/pages/Collection/components/FxPanel.tsx` — quality selector row at top.

---

## Task 1: Device tier probe

**Files:**
- Create: `kpopit-frontend/src/pages/Collection/deviceTier.ts`
- Test: `kpopit-frontend/src/pages/Collection/deviceTier.test.mjs` (temporary Node script; deleted at end of task)

**Interfaces:**
- Produces:
  - `type Quality = 'auto' | 'high' | 'light'`
  - `type DeviceProbe = { mobile: boolean; deviceMemory: number | null; cores: number | null; coarsePointer: boolean }`
  - `function probeDeviceTier(): DeviceProbe` (reads `navigator`/`matchMedia`; SSR-safe)
  - `function resolveTier(quality: Quality, probe: DeviceProbe): 'high' | 'light'` (pure)

- [ ] **Step 1: Write the failing test**

```js
// deviceTier.test.mjs  — run with: node deviceTier.test.mjs
import assert from 'node:assert';
import { resolveTier } from './deviceTier.ts';

const desktop = { mobile: false, deviceMemory: 8, cores: 8, coarsePointer: false };
const weakPhone = { mobile: true, deviceMemory: 3, cores: 4, coarsePointer: true };
const unknownPhone = { mobile: true, deviceMemory: null, cores: null, coarsePointer: true };

// explicit choices always win
assert.equal(resolveTier('high', weakPhone), 'high');
assert.equal(resolveTier('light', desktop), 'light');
// auto: desktop -> high, phone -> light, unknown phone -> light (conservative)
assert.equal(resolveTier('auto', desktop), 'high');
assert.equal(resolveTier('auto', weakPhone), 'light');
assert.equal(resolveTier('auto', unknownPhone), 'light');
// auto: strong tablet-ish (not mobile, plenty of RAM) -> high
assert.equal(resolveTier('auto', { mobile: false, deviceMemory: 4, cores: 4, coarsePointer: true }), 'high');
console.log('deviceTier OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd kpopit-frontend && node --experimental-strip-types src/pages/Collection/deviceTier.test.mjs`
Expected: FAIL — module/function not found. (If `--experimental-strip-types` is unavailable on the installed Node, transpile inline is unnecessary: instead write the test against a `.mjs` copy of the pure function; keep the assertion set identical.)

- [ ] **Step 3: Write minimal implementation**

```ts
// deviceTier.ts
export type Quality = 'auto' | 'high' | 'light';

export interface DeviceProbe {
    mobile: boolean;
    deviceMemory: number | null;
    cores: number | null;
    coarsePointer: boolean;
}

/** SSR-safe read of device capability signals. */
export function probeDeviceTier(): DeviceProbe {
    if (typeof navigator === 'undefined') {
        return { mobile: false, deviceMemory: null, cores: null, coarsePointer: false };
    }
    const ua = navigator.userAgent || '';
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
    const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    return {
        mobile,
        deviceMemory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
        cores: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
        coarsePointer,
    };
}

/** Pure: map the chosen quality + probe to an effective tier. */
export function resolveTier(quality: Quality, probe: DeviceProbe): 'high' | 'light' {
    if (quality === 'high' || quality === 'light') return quality;
    // auto
    if (!probe.mobile) {
        // Non-mobile: high unless it's clearly a weak machine.
        if (probe.deviceMemory !== null && probe.deviceMemory < 4) return 'light';
        return 'high';
    }
    // Mobile: default light. Only a clearly strong phone earns high.
    const strong =
        (probe.deviceMemory !== null && probe.deviceMemory >= 8) &&
        (probe.cores !== null && probe.cores >= 8);
    return strong ? 'high' : 'light';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd kpopit-frontend && node --experimental-strip-types src/pages/Collection/deviceTier.test.mjs`
Expected: `deviceTier OK`

- [ ] **Step 5: Delete the temp test and commit**

```bash
rm kpopit-frontend/src/pages/Collection/deviceTier.test.mjs
cd kpopit-frontend && npm run lint && npm run build
git add kpopit-frontend/src/pages/Collection/deviceTier.ts
git commit -m "feat(collection): device capability probe + tier resolver"
```

---

## Task 2: Extend the FX store with a quality tier

**Files:**
- Modify: `kpopit-frontend/src/pages/Collection/collectionFx.ts`
- Modify: `kpopit-frontend/src/pages/Collection/useCollectionFx.ts`
- Test: `kpopit-frontend/src/pages/Collection/collectionFx.test.mjs` (temporary)

**Interfaces:**
- Consumes: `Quality`, `DeviceProbe`, `probeDeviceTier`, `resolveTier` from Task 1.
- Produces:
  - `collectionFx.ts`: `getQuality(): Quality`, `setQuality(q: Quality)`, `getEffectiveTier(): 'high' | 'light'`. Persisted field `quality` inside the same `kpopit-collections-fx` JSON.
  - `useCollectionFx.ts`: adds `quality`, `setQuality`, `tier` (`'high' | 'light'`) to the returned object.

**Design note:** `quality` is stored; the **effective tier** is derived (`resolveTier(quality, probe)`). When `quality` is `'light'` OR the effective tier is `'light'`, the store still keeps the granular `fx` flags as the user's advanced overrides, but the DOM `data-quality` attribute (Task 3) is what CSS keys off for the tier-level simplification. First-visit default `quality` is `'auto'`.

- [ ] **Step 1: Write the failing test**

```js
// collectionFx.test.mjs — run: node collectionFx.test.mjs
import assert from 'node:assert';
// Minimal localStorage + matchMedia shim
globalThis.localStorage = (() => { let s = {}; return {
  getItem: k => (k in s ? s[k] : null), setItem: (k,v)=>{s[k]=String(v)}, removeItem:k=>{delete s[k]} }; })();
globalThis.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
globalThis.navigator = { userAgent: 'node', hardwareConcurrency: 8 };
const fx = await import('./collectionFx.ts');
assert.equal(fx.getQuality(), 'auto');            // default
fx.setQuality('light');
assert.equal(fx.getQuality(), 'light');
assert.equal(fx.getEffectiveTier(), 'light');
fx.setQuality('high');
assert.equal(fx.getEffectiveTier(), 'high');
// persisted round-trip
assert.ok(localStorage.getItem('kpopit-collections-fx').includes('"quality":"high"'));
console.log('collectionFx OK');
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd kpopit-frontend && node --experimental-strip-types src/pages/Collection/collectionFx.test.mjs`
Expected: FAIL — `getQuality` not exported.

- [ ] **Step 3: Implement**

In `collectionFx.ts`:
- Import: `import { probeDeviceTier, resolveTier, type Quality } from './deviceTier';`
- Extend the persisted state shape to include `quality: Quality`. Add to `DEFAULTS`: `quality: 'auto'`. Because `readStored` spreads over `DEFAULTS`, older stored blobs without `quality` become `'auto'` automatically — no migration needed.
- Add to `FX_ORDER` handling: `quality` is not a boolean FxKey, so keep it out of `FX_ORDER` (which only diffs booleans). Store it as a sibling field and diff it explicitly in `commit`.

Replace the state/commit section so `quality` persists alongside the flags:

```ts
// --- add near the top-level state ---
let quality: Quality = readStoredQuality();

function readStoredQuality(): Quality {
    try {
        const raw = localStorage.getItem(FX_KEY);
        if (!raw) return 'auto';
        const parsed = JSON.parse(raw) as { quality?: Quality };
        return parsed.quality === 'high' || parsed.quality === 'light' ? parsed.quality : 'auto';
    } catch {
        return 'auto';
    }
}

export function getQuality(): Quality {
    return quality;
}

export function getEffectiveTier(): 'high' | 'light' {
    return resolveTier(quality, probeDeviceTier());
}

export function setQuality(next: Quality) {
    if (next === quality) return;
    quality = next;
    persist();
    listeners.forEach((listener) => listener());
}
```

Add a shared `persist()` used by both `commit` and `setQuality` so `quality` is always written with the flags:

```ts
function persist() {
    try {
        localStorage.setItem(FX_KEY, JSON.stringify({ ...state, quality }));
    } catch {
        // private mode / quota
    }
}
```

Change `commit(next)` to call `persist()` instead of writing `state` alone:

```ts
function commit(next: FxState) {
    if (FX_ORDER.every((k) => next[k] === state[k])) return;
    state = next;
    persist();
    listeners.forEach((listener) => listener());
}
```

Ensure `readStored()` ignores the extra `quality` field when building `FxState` (it already spreads only known keys via `{ ...DEFAULTS, ...parsed }` — `quality` lands in state harmlessly but is never in `FX_ORDER`; to keep `FxState` clean, strip it: `const { quality: _q, ...flags } = parsed;` then `return { ...DEFAULTS, ...flags }`).

In `useCollectionFx.ts`, extend both hooks:

```ts
import { useSyncExternalStore, useCallback } from 'react';
import {
    FX_GROUPS, getFxSnapshot, setFx, setFxGroup, subscribeFx,
    getQuality, setQuality, getEffectiveTier,
    type FxGroup, type FxKey, type FxState,
} from './collectionFx';
import type { Quality } from './deviceTier';

export function useCollectionFx() {
    const fx = useSyncExternalStore(subscribeFx, getFxSnapshot, getFxSnapshot);
    const quality = useSyncExternalStore(subscribeFx, getQuality, getQuality);
    const tier = useSyncExternalStore(subscribeFx, getEffectiveTier, getEffectiveTier);

    const groupOn = useCallback((group: FxGroup) => FX_GROUPS[group].some((key) => fx[key]), [fx]);

    return { fx, setFx, setFxGroup, groupOn, quality, setQuality, tier };
}

export type { FxGroup, FxKey, FxState, Quality };
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd kpopit-frontend && node --experimental-strip-types src/pages/Collection/collectionFx.test.mjs`
Expected: `collectionFx OK`

- [ ] **Step 5: Delete temp test, verify build, commit**

```bash
rm kpopit-frontend/src/pages/Collection/collectionFx.test.mjs
cd kpopit-frontend && npm run lint && npm run build
git add kpopit-frontend/src/pages/Collection/collectionFx.ts kpopit-frontend/src/pages/Collection/useCollectionFx.ts
git commit -m "feat(collection): persist quality tier in fx store"
```

---

## Task 3: Emit `data-quality` on the collection roots

**Files:**
- Modify: `kpopit-frontend/src/pages/Collection/CollectionAlbum.tsx:111-118`
- Modify: `kpopit-frontend/src/pages/Collection/Collections.tsx:18-23`

**Interfaces:**
- Consumes: `tier` from `useCollectionFx()` (Task 2).
- Produces: DOM attribute `data-quality="high" | "light"` on both collection root elements, so CSS in later tasks can key off it.

- [ ] **Step 1: Add `tier` to the destructure + attrs (CollectionAlbum.tsx)**

Change `const { fx } = useCollectionFx();` to `const { fx, tier } = useCollectionFx();` and add to `fxAttrs`:

```ts
    const fxAttrs = {
        'data-quality': tier,
        'data-fx-backdrop': fx.backdrop ? 'on' : 'off',
        'data-fx-sparkles': fx.sparkles ? 'on' : 'off',
        'data-fx-shadows': fx.shadows ? 'on' : 'off',
        'data-fx-blur': fx.blur ? 'on' : 'off',
        'data-fx-lv2': fx.lv2 ? 'on' : 'off',
        'data-fx-lv3': fx.lv3 ? 'on' : 'off',
    } as const;
```

- [ ] **Step 2: Same for Collections.tsx**

Add `data-quality` to its `fxAttrs` object (mirror the block above; pull `tier` from `useCollectionFx()`).

- [ ] **Step 3: Verify in the browser**

Ensure the dev servers are running (backend `preview_start name: kpopit-backend`, frontend `kpopit-frontend`). Navigate to `http://localhost:5173/collections/1/<slug>` (use `?spread=3` to land on a members spread). With `read_page`/`javascript_tool`, confirm the root carries `data-quality`. On desktop UA it should be `high`.

Run in `javascript_tool`:
```js
document.querySelector('[data-quality]')?.getAttribute('data-quality')
```
Expected: `"high"` on desktop.

- [ ] **Step 4: Commit**

```bash
cd kpopit-frontend && npm run lint && npm run build
git add kpopit-frontend/src/pages/Collection/CollectionAlbum.tsx kpopit-frontend/src/pages/Collection/Collections.tsx
git commit -m "feat(collection): expose effective quality tier as data-quality"
```

---

## Task 4: High compositing fix — cards (the critical fix)

**Files:**
- Modify: `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.css`
- Modify: `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.tsx:64-69`

**Goal:** Fixes Bugs A + B on High. No animated `filter`/`background-position`; `mix-blend` isolated per card so it flattens once; motion driven by `transform`.

**Interfaces:**
- Produces: unchanged component API. New requirement: the card root wrapper carries `isolation: isolate` + `contain: paint` via a class `album-card-isolate`.

- [ ] **Step 1: Add the isolation wrapper class in AlbumMemberCard.tsx**

Change the card root `className` (line ~67) to append `album-card-isolate`:

```tsx
        <div
            ref={cardRef}
            className={`album-card-isolate relative h-55 w-40 overflow-clip rounded-sm ${isBaseLevel ? 'p-0.75' : 'p-1.25'}`}
            style={isBaseLevel ? groupColorFill : undefined}
        >
```

- [ ] **Step 2: Add isolation + convert animations to transform in AlbumMemberCard.css**

At the top of the file add:

```css
/* Each treated card is its own isolated, paint-contained group so mix-blend
   flattens WITHIN the card and composites into the 3D book as a single layer,
   instead of forcing a whole-page re-blend every frame. */
.album-card-isolate {
    isolation: isolate;
    contain: paint;
}
```

Replace the **holo shimmer** keyframe (lines ~69-104) so motion is a `transform` on an oversized gradient, with **no `filter` and no `background-position` animation**. Bake the lost `hue-rotate` contrast into brighter stops:

```css
@keyframes album-holo-shimmer {
    from { transform: translate3d(-18%, 0, 0); }
    to   { transform: translate3d(18%, 0, 0); }
}

.album-holo-fill,
.album-holo-overlay {
    background: linear-gradient(
        125deg,
        #ff4fa6, #ffae4d 16%, #f4ff6e 32%, #4dffb4 48%, #4bc6ff 64%, #b07bff 82%, #ff4fa6
    );
    background-size: 200% 200%;
    background-position: 50% 50%;
    /* oversized so the translate never exposes an edge */
    width: 140%;
    height: 140%;
    left: -20%;
    top: -20%;
    animation: album-holo-shimmer 4.2s ease-in-out infinite alternate;
    will-change: transform;
}
```

> Note: the fills use `position: absolute; inset: 0` from the Tailwind `absolute inset-0` classes. Adding `width/height/left/top` above overrides `inset-0` to give the oversized travel area. Keep `pointer-events-none` (already on the element).

Replace the **glare sweep** (lines ~125-155) the same way — transform, not `background-position`:

```css
@keyframes album-holo-glare-sweep {
    from { transform: translate3d(-60%, 0, 0); }
    to   { transform: translate3d(60%, 0, 0); }
}

.album-holo-glare {
    background: linear-gradient(
        105deg,
        transparent 26%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0.5) 50%,
        rgba(255,255,255,0.2) 60%, transparent 74%
    );
    background-size: 160% 100%;
    background-repeat: no-repeat;
    background-position: 50% 0;
    width: 160%;
    left: -30%;
    animation: album-holo-glare-sweep 4.2s ease-in-out infinite alternate;
    mix-blend-mode: screen;
    will-change: transform;
}
```

Replace the **gold sheen** (lines ~35-60) with a transform sweep:

```css
@keyframes album-gold-sheen-sweep {
    0%   { transform: translate3d(-70%, 0, 0); }
    55%, 100% { transform: translate3d(70%, 0, 0); }
}

.album-gold-sheen {
    background: linear-gradient(
        115deg,
        transparent 38%, rgba(255,248,214,0.55) 47%, rgba(255,255,255,0.9) 50%,
        rgba(255,248,214,0.55) 53%, transparent 62%
    );
    background-size: 140% 100%;
    background-repeat: no-repeat;
    background-position: 50% 0;
    width: 160%;
    left: -30%;
    animation: album-gold-sheen-sweep 3.4s linear infinite;
    mix-blend-mode: screen;
    will-change: transform;
}
```

Keep `.album-holo-overlay { mix-blend-mode: screen; opacity: 0.5 }`, `.album-holo-foil` (static, unchanged), `.album-gold-tint` (static `overlay`, unchanged), and the `prefers-reduced-motion` block (unchanged). Remove every remaining `transform: translateZ(0)` on these layers (the animation now owns `transform`; a static `translateZ` would fight the keyframe).

- [ ] **Step 3: Verify on desktop (look preserved) in the browser**

Reload `http://localhost:5173/collections/1/<slug>?spread=3` (a spread with holo cards — user 3973 has holo on the first pages). Screenshot. Confirm the holo still shimmers (rainbow drifts, glare sweeps) and gold still has a sheen. Compare against a pre-change screenshot; differences should be subtle.

- [ ] **Step 4: Verify no per-frame filter repaint**

In `javascript_tool`, confirm no element animates `filter`/`background-position` anymore:
```js
[...document.querySelectorAll('.album-holo-fill,.album-holo-glare,.album-gold-sheen')]
  .flatMap(el => el.getAnimations())
  .map(a => a instanceof CSSAnimation ? a.animationName : a.constructor.name)
```
Expected: only `album-holo-shimmer` / `album-holo-glare-sweep` / `album-gold-sheen-sweep` (transform-based). Then check `getComputedStyle` of a fill has no animated `filter`.

- [ ] **Step 5: Commit**

```bash
cd kpopit-frontend && npm run lint && npm run build
git add kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.css kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.tsx
git commit -m "perf(album): compositor-safe holo/gold — transform motion + per-card isolation"
```

---

## Task 5: Pause animations during flips + release `will-change`

**Files:**
- Modify: `kpopit-frontend/src/components/Albums/AlbumOfCol/AlbumOfCol.tsx` (stage wrapper ~line 491-494; add data attribute driven by `turning`)
- Modify: `kpopit-frontend/src/components/Albums/AlbumOfCol/AlbumOfCol.css`
- Modify: `kpopit-frontend/src/pages/Collection/collections.css` (pause rule)

**Goal:** Fixes Bug C (flip glitch) and Bug F (permanent compositor layers).

**Interfaces:**
- Consumes: `turning` boolean (already computed in AlbumOfCol at line ~333).
- Produces: DOM attribute `data-turning="on"|"off"` on `.album-stage`; CSS that pauses card animations while turning and only sets `will-change` during transitions.

- [ ] **Step 1: Emit `data-turning` on the stage**

In `AlbumOfCol.tsx`, on the `.album-stage` div (line ~491), add:
```tsx
        <div
            ref={albumStageRef}
            data-turning={turning ? 'on' : 'off'}
            className="album-stage flex h-full min-h-0 w-full flex-col items-center px-3 pt-3 pb-3 lg:pb-28"
        >
```

- [ ] **Step 2: Pause card animations while turning (collections.css)**

Append to `collections.css`:
```css
/* While a leaf is turning, freeze the card shimmer/sheen so the flip is a single
   clean 3D recomposite instead of blend+animation fighting the rotation. */
[data-turning='on'] .album-holo-fill,
[data-turning='on'] .album-holo-overlay,
[data-turning='on'] .album-holo-glare,
[data-turning='on'] .album-gold-sheen {
    animation-play-state: paused;
}
```

- [ ] **Step 3: Release permanent `will-change` (AlbumOfCol.css)**

Remove the standalone `will-change: transform;` from `.album-book` and `.album-leaf` and the `.album-zoom-in` `will-change`. Instead scope `will-change` to the active states only:

```css
.album-book {
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.album-stage[data-turning='on'] .album-book,
.album-stage[data-turning='on'] .album-leaf {
    will-change: transform;
}
.album-leaf {
    transform-style: preserve-3d;
    transition: transform 0.8s cubic-bezier(0.42, 0.04, 0.3, 1);
}
.album-leaf-face {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
}
```

Leave `.album-zoom-in` as-is functionally but drop its permanent `will-change` (the open animation is one-shot; `both` fill keeps the end state). If the open animation regresses visually, re-add `will-change` guarded by the animation only — verify in Step 4.

- [ ] **Step 4: Verify flip is clean on desktop**

Reload the album, flip several spreads (click right half / press ArrowRight). Screenshot mid-flip if possible; confirm no flicker on desktop. Confirm `data-turning` toggles `on` during a flip via `javascript_tool` polling `document.querySelector('.album-stage').dataset.turning`.

- [ ] **Step 5: Commit**

```bash
cd kpopit-frontend && npm run lint && npm run build
git add kpopit-frontend/src/components/Albums/AlbumOfCol/AlbumOfCol.tsx kpopit-frontend/src/components/Albums/AlbumOfCol/AlbumOfCol.css kpopit-frontend/src/pages/Collection/collections.css
git commit -m "perf(album): pause card fx during flips; release will-change off-transition"
```

---

## Task 6: Real `data-fx-lv3='off'` + texture isolation + Light-off

**Files:**
- Modify: `kpopit-frontend/src/pages/Collection/collections.css:488-497`
- Modify: `kpopit-frontend/src/components/Albums/AlbumOfCol/shell/AlbumTextures.tsx`

**Goal:** Fixes Bug G (toggle only paused animation) and Bug E (per-page blend cost); starts Light texture handling.

**Interfaces:**
- Consumes: `useFx('textures')` already in AlbumTextures; add tier awareness by reading the ancestor `data-quality` in CSS (no new prop needed).

- [ ] **Step 1: Make `data-fx-lv3='off'` remove the blend layers, not just the animation**

Replace the `[data-fx-lv3='off']` block in `collections.css`:
```css
/* Off = the holo layers are removed entirely (not just frozen), so no static
   mix-blend cost remains inside the 3D book. */
[data-fx-lv3='off'] .album-holo-fill,
[data-fx-lv3='off'] .album-holo-overlay,
[data-fx-lv3='off'] .album-holo-foil,
[data-fx-lv3='off'] .album-holo-glare {
    display: none;
}
```

Do the same for gold sheen/tint under `data-fx-lv2='off'` (currently only `.album-gold-sheen` is handled):
```css
[data-fx-lv2='off'] .album-gold-sheen,
[data-fx-lv2='off'] .album-gold-tint {
    display: none;
}
```

- [ ] **Step 2: Isolate the full-bleed textures**

In `AlbumTextures.tsx`, add `isolate` to each texture `<img>` className so its blend flattens against the page, not the whole 3D stack. Add the Tailwind `isolate` utility (maps to `isolation: isolate`) to the three images (`TextureLighting`, `GrainParticles`, `PaperGrain`) — e.g. `... object-cover isolate mix-blend-screen ...`.

- [ ] **Step 3: Turn textures off on Light via CSS**

Append to `collections.css`:
```css
/* Light tier: no full-bleed blend textures at all. */
[data-quality='light'] .album-holo-foil { display: none; }
```
(The `TextureLighting`/`PaperGrain`/`GrainParticles` images are gated in Task 7 at the component level for Light; the rule above only strips the static holo foil, which has no toggle of its own.)

- [ ] **Step 4: Verify**

With `data-fx-lv3` off (toggle "Holo shine" off in the FX panel), confirm in `javascript_tool` that `.album-holo-fill` computes `display: none`:
```js
getComputedStyle(document.querySelector('.album-holo-fill')).display
```
Expected: `"none"`.

- [ ] **Step 5: Commit**

```bash
cd kpopit-frontend && npm run lint && npm run build
git add kpopit-frontend/src/pages/Collection/collections.css kpopit-frontend/src/components/Albums/AlbumOfCol/shell/AlbumTextures.tsx
git commit -m "perf(album): lv2/lv3 off removes blend layers; isolate textures"
```

---

## Task 7: Light-tier card + texture rendering

**Files:**
- Modify: `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.tsx`
- Modify: `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.css`
- Modify: `kpopit-frontend/src/components/Albums/AlbumOfCol/shell/AlbumTextures.tsx`

**Goal:** Light = single cheap layer per treated card (static gradient + one transform sheen), no `mix-blend`, no `filter`; full-bleed textures off. Fixes Bug A/B guarantee on the weakest phones.

**Interfaces:**
- Consumes: `useFx` pattern; add `import { useFx } from ...` is not enough (tier isn't an FxKey). Instead read tier via a new tiny hook `useTier()` exported from `useCollectionFx.ts` (returns `'high' | 'light'`), OR read `data-quality` through CSS only. **Chosen approach: CSS-only** — keep the same DOM, let `[data-quality='light']` restyle the holo/gold layers into a single cheap layer. This avoids re-rendering cards on tier change.

- [ ] **Step 1: Collapse holo/gold to one cheap layer on Light (AlbumMemberCard.css)**

Append:
```css
/* LIGHT TIER — one flat layer, no blend, no filter, one transform sheen. */
[data-quality='light'] .album-holo-overlay,
[data-quality='light'] .album-holo-foil,
[data-quality='light'] .album-holo-glare,
[data-quality='light'] .album-gold-tint {
    display: none;
}

[data-quality='light'] .album-holo-fill {
    /* static rainbow, no animation, normal blend */
    mix-blend-mode: normal;
    opacity: 0.9;
    animation: none;
    width: 100%; height: 100%; left: 0; top: 0;
}

[data-quality='light'] .album-gold-sheen {
    /* keep a single cheap sheen sweep, normal blend */
    mix-blend-mode: normal;
    opacity: 0.5;
}
```

- [ ] **Step 2: Gate full-bleed textures off on Light (AlbumTextures.tsx)**

The texture components read `useFx('textures')`. Add a tier gate so Light never mounts them. Export a `useTier` hook from `useCollectionFx.ts`:
```ts
export function useTier(): 'high' | 'light' {
    return useSyncExternalStore(subscribeFx, getEffectiveTier, getEffectiveTier);
}
```
In each of `TextureLighting`, `GrainParticles`, `PaperGrain`, change the gate:
```tsx
    const on = useFx('textures');
    const tier = useTier();
    const preview = useAlbumPreview();
    if (!on || preview || tier === 'light') return null;
```

- [ ] **Step 3: Verify Light visually + cost**

In `javascript_tool`, force Light without a device: set the store via the panel (Task 9) isn't built yet, so temporarily flip via console:
```js
localStorage.setItem('kpopit-collections-fx', JSON.stringify({ ...JSON.parse(localStorage.getItem('kpopit-collections-fx')||'{}'), quality:'light' })); location.reload();
```
After reload, confirm `data-quality='light'`, `.album-holo-fill` computes `mix-blend-mode: normal` + `animation: none` for the overlay/foil/glare (`display:none`), and the page has no `TextureLighting`/`PaperGrain` images. Screenshot — holo should read as a static rainbow sheen, gold as a soft sheen. Reset quality to `auto` afterward.

- [ ] **Step 4: Commit**

```bash
cd kpopit-frontend && npm run lint && npm run build
git add kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.css kpopit-frontend/src/components/Albums/AlbumOfCol/shell/AlbumTextures.tsx kpopit-frontend/src/pages/Collection/useCollectionFx.ts
git commit -m "feat(album): Light tier — single-layer holo/gold, textures off"
```

---

## Task 8: Zoom modal on Light (drop backdrop-blur)

**Files:**
- Modify: `kpopit-frontend/src/pages/Collection/components/CardZoomModal.tsx:189-193`

**Goal:** Fixes most of Bug D (zoom lag/whole-page-invisible) on Light: the full-viewport `backdrop-blur-xs` is the main cost there.

**Interfaces:**
- Consumes: `useTier()` from Task 7.

- [ ] **Step 1: Gate the backdrop blur by tier**

```tsx
import { useTier } from '../useCollectionFx';
// ...
    const tier = useTier();
// ...
        <div
            onClick={onClose}
            className={`fixed inset-0 z-260 flex items-center justify-center bg-[#1e141c]/55 px-7 py-10 ${backdropMotion} ${
                tier === 'light' ? '' : 'backdrop-blur-xs'
            }`}
        >
```

- [ ] **Step 2: Verify**

With `quality:'light'` (console trick from Task 7), open a card (tap a sticker). Confirm the backdrop has no blur (`getComputedStyle(document.querySelector('.fixed.inset-0.z-260')).backdropFilter` → `"none"`), the flight animation still plays, and no whole-page flicker on repeated open/close. On High, blur remains.

- [ ] **Step 3: Commit**

```bash
cd kpopit-frontend && npm run lint && npm run build
git add kpopit-frontend/src/pages/Collection/components/CardZoomModal.tsx
git commit -m "perf(album): drop zoom backdrop-blur on Light tier"
```

---

## Task 9: FX panel quality selector

**Files:**
- Modify: `kpopit-frontend/src/pages/Collection/components/FxPanel.tsx`

**Goal:** Ship the graphics-settings selector (Auto / High / Light) at the top of the panel, with a "may stutter" note on High. Fulfills §3 UX.

**Interfaces:**
- Consumes: `quality`, `setQuality`, `tier` from `useCollectionFx()` (Task 2).

- [ ] **Step 1: Add the selector UI**

In `FxPanel.tsx`, pull the new values: `const { fx, setFx, setFxGroup, groupOn, quality, setQuality, tier } = useCollectionFx();`

Add, directly above the `<div className="mt-3.5 flex flex-col gap-2.5">` groups block, a segmented control:

```tsx
                <div className={`mt-3.5 rounded-2xl border-2 p-3 ${night ? 'border-white/12' : 'border-ink/15'}`}>
                    <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-neon-pink [text-shadow:1px_1px_0px_rgba(0,0,0,1)]">
                        Quality
                    </p>
                    <div role="radiogroup" aria-label="Album quality" className="mt-2 flex gap-1.5">
                        {(['auto', 'high', 'light'] as const).map((q) => {
                            const active = quality === q;
                            return (
                                <button
                                    key={q}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() => setQuality(q)}
                                    className={`flex-1 cursor-pointer rounded-lg border-2 px-2 py-1.5 text-[12px] font-bold uppercase transition-colors ${
                                        active
                                            ? night ? 'border-neon-pink bg-neon-pink text-white' : 'border-ink bg-neon-pink text-white'
                                            : night ? 'border-white/25 text-white/70' : 'border-ink/30 text-[#3c2f38]'
                                    }`}
                                >
                                    {q === 'auto' ? `Auto (${tier})` : q}
                                </button>
                            );
                        })}
                    </div>
                    {quality === 'high' && (
                        <p className={`mt-2 font-sans text-[11px] leading-[1.4] ${night ? 'text-white/55' : 'text-[#7a6b74]'}`}>
                            Highest quality — may stutter on some phones.
                        </p>
                    )}
                    {tier === 'light' && quality !== 'high' && (
                        <p className={`mt-2 font-sans text-[11px] leading-[1.4] ${night ? 'text-white/55' : 'text-[#7a6b74]'}`}>
                            Light mode is on for smooth performance. Switch to High for full effects.
                        </p>
                    )}
                </div>
```

- [ ] **Step 2: Verify the selector drives the DOM**

Open the FX panel (the gear/FX toggle). Click High / Light / Auto and confirm `document.querySelector('[data-quality]').dataset.quality` updates, holo layers switch between the rich and single-layer forms, and the note text appears for High. Reload and confirm the choice persisted.

- [ ] **Step 3: Commit**

```bash
cd kpopit-frontend && npm run lint && npm run build
git add kpopit-frontend/src/pages/Collection/components/FxPanel.tsx
git commit -m "feat(collection): quality selector (Auto/High/Light) in FX panel"
```

---

## Task 10: QA verification pass (device + repro of the 3 videos)

**Files:** none (verification only). Produces an evidence note at `docs/collection-album-mobile-qa-2026-08-07.md`.

**Goal:** Prove the acceptance criteria on real hardware, at every tier, reproducing the three original video scenarios.

- [ ] **Step 1: Desktop regression (High unchanged)**
Open the album on desktop, flip through several groups with holo + gold cards, open/close zoom, toggle every FX switch. Screenshot High cards; compare to pre-change look. No visual regression, no console errors.

- [ ] **Step 2: Mobile — Auto (Light) smoke test**
On the real Android phone via `http://<LAN-ip>:5173/collections/1/<slug>` (the `dev:host` network URL). Confirm `data-quality='light'`. Flip pages fast, open zoom, scroll. **Expected: no corruption, no black cards, no cyan wash, smooth.**

- [ ] **Step 3: Mobile — opt into High (the original nuke scenario)**
On the phone, FX panel → Quality → High (all FX on — reproduce video 1). Flip/glance. **Expected: at worst reduced FPS; ZERO corruption/flicker/black-cards/cyan-wash.** If corruption still appears, STOP — invoke the §4 fallback (pre-baked holo sprite) and re-plan Task 4/7.

- [ ] **Step 4: Mobile — reproduce video 2 (toggle textures on/off with holo)**
High tier, holo on, textures off → on. **Expected: turning textures on no longer re-triggers corruption.**

- [ ] **Step 5: Mobile — reproduce video 3 (zoom)**
Open a card zoom on Light and on High. **Expected: Light has no whole-page-invisible flicker; High acceptable.**

- [ ] **Step 6: Page-flip on all tiers**
Flip repeatedly on Light and High. **Expected: clean flip, no death-glitch.**

- [ ] **Step 7: Write the QA note + commit**
Record device model, tier, pass/fail per step, and FPS observations. Include how it was measured.

```bash
git add docs/collection-album-mobile-qa-2026-08-07.md
git commit -m "docs: mobile album compositing QA results"
```

---

## Self-Review

**Spec coverage:**
- Bug A (holo+textures nuke) → Tasks 4, 6, 7. ✓
- Bug B (gold lag) → Task 4 (transform sheen), Task 6/7. ✓
- Bug C (page-flip glitch) → Task 5. ✓
- Bug D (zoom lag/invisible) → Task 8. ✓
- Bug E (per-page blend cost) → Task 6 (isolation), Task 7 (Light textures off). ✓
- Bug F (permanent will-change) → Task 5. ✓
- Bug G (lv3-off doesn't remove cost) → Task 6. ✓
- Bug H (Firefox seam) → out of scope (noted in spec §2). ✓
- Quality tiers (High/Light/Auto) → Tasks 1, 2, 3, 7, 9. ✓
- Settings UX → Task 9. ✓
- Device default / auto-degrade → Tasks 1, 2, 3. ✓
- QA acceptance → Task 10. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N" — each task carries real code. ✓

**Type consistency:** `Quality`, `DeviceProbe`, `probeDeviceTier`, `resolveTier`, `getQuality`, `setQuality`, `getEffectiveTier`, `useTier`, `tier` used consistently across Tasks 1→9. `data-quality`/`data-turning`/`data-fx-lv2`/`data-fx-lv3` attribute names consistent across TSX + CSS. ✓

**Risk note:** Task 4's transform-driven gradient over `inset-0` requires overriding to `width/height/left/top`; verify no edge exposure in Step 3. If `contain: paint` clips a wanted overflow (e.g. the badge sheen bleeding past the card), relax to `contain: layout paint` or drop `contain` and keep `isolation` alone — isolation is the load-bearing part.

---

# ADDENDUM — Round 2 (2026-08-07 PM, after first review)

User reviewed the first build on desktop. Verdict: mechanics good, but corrections + follow-ups below. **All code items in this addendum are IMPLEMENTED and verified on desktop; sections 6 (onboarding) and 7 (confirm dialog) are SPEC-ONLY, not built.**

## A. Holo animation must be pixel-identical (DONE)
The Round-1 Task 4 replaced the holo/gold motion with `transform` sweeps — that **changed the look** (it read as sliding stripes). Reverted `AlbumMemberCard.css` to the **exact original keyframes**: holo `background-position: 0%→100%` + `filter: hue-rotate(0→75deg)`, glare `140%→-40%`, gold sheen `160%→-60%`. The optimization is carried entirely by `isolation: isolate` + `contain: paint` on the card (flattens the mix-blend so it can't nuke the page) — this is independent of how the gradient moves, so we keep the original animation AND the corruption fix. Verified: holo keyframes animate `filter: hue-rotate` again.

## B. Quality ↔ FX harmonization + Custom (DONE)
Previously `quality` (auto/high/light) and the granular `fx` flags were independent: Light unmounted textures via a `tier==='light'` render gate while `fx.textures` stayed `true`, so the "Album textures" pill lied. Refactored `collectionFx.ts` to a **preset model**:
- `HIGH` preset = all texture+motion flags on. `LIGHT` preset = textures/blur/sparkles off, shadows/backdrop/lv2/lv3 on. Presets own only texture+motion keys, never Controls (tapZoom/arrows).
- Selecting a preset sets the actual flags. `Auto` follows the device probe and applies the resolved preset. Toggling any preset-owned flag drops `autoMode` and the label derives to **`custom`**.
- `getEffectiveTier()` returns the stored `renderTier` (drives the cheap-card CSS via `data-quality`). Textures are now **flag-driven only** (removed the `tier==='light'` gate in `AlbumTextures.tsx`) — so the pill always reflects reality.
- Persistence extended (`{...flags, auto, renderTier}`) with back-compat for the old `{quality}` blob.
- Verified: Light preset → `textures/blur/sparkles=false` + texture switch reads off; toggling textures on → label flips to Custom.

## C. Quality selector UI (DONE)
`FxPanel.tsx`: replaced the 3 flex pills (unequal widths) with a **2×2 grid** (`grid-cols-2`) of equal cells — `Auto (tier) · High · Light · Custom`. Custom is a non-clickable status chip (dimmed until active). Measured: all four cells 444px. Added the `album-index-scroll` (+ `--night`) class to the panel so its scrollbar matches the Summary rail (pink gradient thumb, rounded track) instead of the default squared bar.

## D. Light gold colour (DONE)
Light was hiding `.album-gold-tint`, leaving the raw bronze `gold.jpg` base. Now Light KEEPS the bright jewelry-gold tint but with `mix-blend-mode: normal` (cheap, no blend cost) at opacity 0.62, so gold reads gold, not bronze. Holo in Light unchanged (user liked it).

## E. Device detector (INFO — user to confirm on real devices)
It's a browser, so there's no true GPU/CPU query like a native game. `deviceTier.ts` uses the signals the platform does expose: `navigator.userAgent` (mobile match), `navigator.deviceMemory` (GB, coarse buckets, Chromium-only), `navigator.hardwareConcurrency` (logical cores), and `(pointer: coarse)`. `resolveTier('auto')`: non-mobile → High unless `deviceMemory < 4`; mobile → Light unless it's a clearly strong phone (`deviceMemory ≥ 8 && cores ≥ 8`). This preview machine probed `{mobile:false, deviceMemory:16, cores:8}` → High, as expected. Safari/iOS does NOT expose `deviceMemory` (returns null) → those phones fall to Light by the mobile default, which is the safe choice. Thresholds are easy to tune once we see real-device numbers.

---

## 6. SPEC ONLY — First-run onboarding guide (DO NOT BUILD YET)

A game-style coach-mark tour, shown once (persisted in `localStorage`, e.g. `kpopit-collections-guide-seen`). Reuse the modal look of `AlbumInfoModal`/`CardZoomModal` (border-2, offset shadow, night-aware, `collection-*` enter/exit animations). Mechanic: a full-screen dark/blurred scrim with a "spotlight" cutout over the feature being introduced (the highlighted control stays at normal brightness and is the only lit element); a small step card sits beside the spotlighted control and follows it step to step; only the card's Next/Back/Skip and the highlighted control are interactive. Include a "Skip tour" on every step and a final "Got it". Re-openable later from the Info modal.

**Step order + copy (draft — review/edit freely):**

1. **Welcome** (centered, no spotlight)
   - Title: `Welcome to your album`
   - Body: `This is your KpopIt collection — every idol and group, as a flip-book. Quick tour? (30 seconds.)`
   - Buttons: `Start` · `Skip`
2. **Day / Night** (spotlight the sun/moon button)
   - Title: `Day & night`
   - Body: `Switch the album between light and dark. Your choice is remembered.`
3. **Info** (spotlight the info button)
   - Title: `How it works`
   - Body: `Forgot something? Everything about collecting, levels and navigation lives here.`
4. **Quality / Graphics** (spotlight the graphics/sliders button — mark as the main one)
   - Title: `Graphics quality`
   - Body: `Auto picks the best setting for your device. On a phone it starts on Light for smooth flipping — switch to High any time for the full holo effects, or fine-tune each effect yourself.`
5. **Summary** (spotlight the summary/menu button + rail)
   - Title: `Jump around`
   - Body: `Open the summary to see every group, your progress, and jump straight to one.`
6. **Carousel / Pages** (spotlight the bottom mini-page carousel)
   - Title: `Every page at a glance`
   - Body: `Scrub the carousel to leap to any opening in the book.`
7. **Flipping** (spotlight the book / side arrows)
   - Title: `Turn the page`
   - Body: `Tap the page edges, use the arrows or ← → keys. On a phone, try Focus mode to read one page at a time.`
8. **Stickers** (spotlight a card, if one is owned on screen)
   - Title: `Your stickers`
   - Body: `Win Classic or Blurry to collect a sticker. Win again to level it up: Base → Gold → Holo. Tap any sticker to zoom in.`
9. **Done** (centered)
   - Title: `You're set`
   - Body: `Come back daily to fill your album. You can reopen this tour from the info button.`
   - Button: `Got it`

Open questions for the build phase: spotlight positioning strategy (measure target rect via ref + reposition on resize/flip), what to do when a step's target is off-screen or absent (e.g. no owned sticker visible → skip step 8), and mobile vs desktop step differences (Focus mode is phone-only).

## 7. DISCUSSION — "Are you sure?" when raising quality (NOT BUILT — needs your call)

Goal: warn before a user pushes graphics past what their device handles, without nagging. Dimensions to decide:

- **When does it trigger?**
  - (a) Only when a device that Auto-resolved to **Light** manually picks **High** (or turns on textures/holo on such a device). ← *recommended: only warn the at-risk devices.*
  - (b) Every device when picking High. (Noisy on desktop — not recommended.)
  - (c) Never a modal; just the inline "may stutter" note already under the High pill. (Lightest touch.)
- **How often?**
  - (a) **Once ever** — `localStorage` flag `kpopit-collections-hi-warned`. ← *recommended.*
  - (b) Once per session — `sessionStorage`.
  - (c) Every time. (Annoying.)
- **Scope of the warning** — only the full **High** preset, or also individual heavy toggles (textures / holo shine) when on a Light-default device?
  - *recommended: the High preset and the two heavy individual toggles (`textures`, `lv3`), sharing the same one-time flag.*
- **Copy (draft):** Title `Heads up` · Body `High quality turns on the full textures and holographic effects. On some phones this can stutter or flicker. You can switch back to Light any time.` · Buttons `Use High` (primary) · `Stay on Light` (secondary).
- **Reuse** the `AlbumInfoModal` shell for consistency.

My recommendation bundle: **trigger only on Light-default devices, once ever (localStorage), covering the High preset + `textures`/`lv3` toggles.** Confirm or adjust and I'll build it alongside the onboarding guide.

**DECIDED (2026-08-07, user):** ✅ Trigger = only Light-default devices · ✅ Frequency = once ever (`localStorage`, e.g. `kpopit-collections-hi-warned`) · ✅ Scope = the High preset **and** the `textures` + `lv3` individual toggles, sharing one dismissal flag. Build alongside the onboarding guide (§6) — both queued, not yet implemented. Trigger condition in code: device auto-resolves to the lowest tier at the moment of the action, flag unset. On confirm, apply the pending quality/flag change; on cancel, leave state unchanged. *(Note: with §8 the "Light-default" test becomes "auto-resolves to Low"; and the confirm dialog was never built in round 2 — it is part of the §8 build batch.)*

---

# ADDENDUM — Round 3 (2026-08-07, granular graphics system)

Round-2 review outcomes:
- **Animation toggles fixed (DONE, verified):** `[data-fx-lv2='off']` / `[data-fx-lv3='off']` reverted from `display:none` back to `animation:none` (+ `opacity:0` on the gold sheen band). The holo/gold **texture stays** (card keeps its LV2/LV3 identity); only the shimmer freezes. Safe now because per-card `isolation`/`contain` stops a frozen mix-blend layer from forcing a whole-page recomposite. Removing a treatment entirely is the job of the new "Border-only" card tier (§8), never the Animation tab.
- **Confirm/warn dialog:** still NOT built (spec §7). User couldn't see it because it doesn't exist yet — folded into the §8 build batch.

## 8. DESIGN-LOCKED — Granular graphics settings (build AFTER device test)

User decisions: presets = **Auto / High / Medium / Low** (+ derived Custom); granular controls = **segmented sliders**; **design-lock now, build after the on-device test** of the round-1/2 fixes. Keep card LV1/2/3 identity at every tier (only the explicit Border-only stop drops the gradient art, and even it keeps a level-colored border).

### 8.1 Panel structure (three groups + preset row)
- **Preset row** (top): `Auto · High · Medium · Low · Custom`. Custom is derived (non-clickable chip), same 2×2/grid pattern already shipped. Picking a preset writes all Graphics + Animation controls; moving any of them → Custom. Controls group is never touched by presets.
- **Graphics** (new group, segmented sliders):
  - **Card treatment** — `High · Medium · Low · Border` (4 stops)
  - **Album textures** — `High · Low · Off` (3 stops) — grain/lighting/particles
  - **Background paper** — `On · Off` (2 stops)
  - **Shadows** — `On · Off`
  - **Toolbar blur** — `On · Off`
- **Animation** (existing): Background sparkles `On/Off`, Gold shine `On/Off` (freeze), Holo shine `On/Off` (freeze). Independent of Card treatment — you can run High cards with the shine frozen.
- **Controls** (existing): Tap-to-zoom, Side arrows.

### 8.2 Card treatment tiers (CSS, keyed off `data-cards` on the album root)
Replace the current `data-quality='light'` card rules with `data-cards`:
- `high` — full original: `.album-holo-fill` + `.album-holo-overlay` (screen) + `.album-holo-foil` (overlay) + `.album-holo-glare` (screen) + animated `hue-rotate` shimmer; gold = base + tint (overlay) + sheen (screen). (isolation-contained — already done.)
- `medium` — drop `.album-holo-foil` + `.album-holo-glare` (`display:none`); keep fill + overlay + animation. Gold keeps tint + sheen. Fewer blend layers, same motion.
- `low` — keep only `.album-holo-fill` at `mix-blend-mode:normal; opacity:.9`, animation may stay (cheap) or freeze; drop overlay/foil/glare. Gold = base + tint at `mix-blend:normal; opacity:.62` (the round-2 light-gold rule) + optional cheap sheen. Single flat layer, still clearly holo/gold, still level-distinct.
- `border` — drop ALL gradient layers (`display:none` on fill/overlay/foil/glare/gold-tint/gold-sheen). Card body plain; show a CSS border by level via a new `data-treatment` attr on the card root:
  - LV1 (base): `border: 2px solid var(--album-main)` (group color — already the base fill color)
  - LV2 (gold): `border: 2px solid #E8B923` (gold-yellow)
  - LV3 (holo): `border: 2px solid transparent; border-image: linear-gradient(125deg,#b07bff,#4bc6ff,#ff5ba8) 1` (holo purple/blue gradient border)
  - Requires: add `data-treatment={base|gold|holo}` to the `AlbumMemberCard` root, and border rules `[data-cards='border'] [data-treatment='holo'] {…}` etc.

### 8.3 Album textures levels (`AlbumTextures.tsx`)
Read the enum instead of the boolean:
- `high` — current behavior (srcSet serves 1200w on large screens).
- `low` — render the image but force the small asset only (`src={smallSrc}`, drop the large srcSet / clamp `sizes` so it never upgrades).
- `off` — `return null` (unmounts — frees the bitmap, as today).

### 8.4 Data model refactor (`collectionFx.ts`)
Move from booleans+`renderTier` to a settings object:
```ts
interface GfxSettings {
  cards: 'high' | 'medium' | 'low' | 'border';
  albumTextures: 'high' | 'low' | 'off';
  paper: boolean;      // background scrapbook paper
  shadows: boolean;
  blur: boolean;       // toolbar blur
  sparkles: boolean;   // (Animation group)
  goldShine: boolean;  // freeze toggle (was lv2)
  holoShine: boolean;  // freeze toggle (was lv3)
  // Controls (never set by presets):
  tapZoom: boolean;
  arrows: boolean;
}
```
- **Presets** (set everything except Controls):
  - **High**: cards `high`, albumTextures `high`, paper on, shadows on, blur on, sparkles on, goldShine on, holoShine on.
  - **Medium**: cards `medium`, albumTextures `low`, paper on, shadows on, blur off, sparkles off, goldShine on, holoShine on.
  - **Low**: cards `low`, albumTextures `off`, paper off, shadows on, blur off, sparkles off, goldShine on, holoShine on.
- **Auto** → `resolveDeviceTier` now returns `'high' | 'medium' | 'low'`:
  - non-mobile: `deviceMemory>=8 || null` → high; `4–7` → medium; `<4` → low.
  - mobile: strong (`deviceMemory>=8 && cores>=8`) → medium; else → low. (Safari/iOS: no `deviceMemory` → low.)
- **Custom**: any control differs from the active preset's values.
- **Emit** `data-cards` (+ keep `data-fx-*` for the animation/paper/blur/shadow booleans, and `data-treatment` on cards). Remove `data-quality` once `data-cards` covers the card rules.
- **Persistence + migration**: bump the stored shape; migrate the round-2 blob — `textures:true→albumTextures:'high'`, `textures:false→'off'`; `renderTier:'high'→cards:'high'`, `'light'→cards:'low'`; `lv2→goldShine`, `lv3→holoShine`; `blur/shadows/backdrop/sparkles` carry over; `auto` carries over.

### 8.5 UI (`FxPanel.tsx`)
- Add a reusable **segmented slider** control: a labelled row with N equal segments (2–4), active segment highlighted in neon-pink, keyboard + `role="radiogroup"`. Same border/offset-shadow language as the existing switches (DESIGN.md §7).
- Graphics group uses segmented sliders; Animation/Controls keep the existing switches.
- Keep the styled `album-index-scroll` scrollbar; keep equal-width preset grid.

### 8.6 Build order (when greenlit)
1. `deviceTier` → 3-way tier; `collectionFx` → `GfxSettings` + presets + migration (unit-test the pure bits).
2. CSS: `data-cards` medium/low/border tiers + `data-treatment` border colors.
3. `AlbumTextures` → 3-level; `AlbumMemberCard` → `data-treatment`.
4. `FxPanel` → segmented slider component + Graphics group.
5. Confirm dialog (§7) + onboarding (§6).
6. Device QA (Task 10) across High/Medium/Low/Border.

---

# ADDENDUM — Round 4: HANDOFF TO CODEX (2026-08-07)

**This file is the single source of truth for the next session.** Path: `docs/superpowers/plans/2026-08-07-album-compositing-and-quality-tiers.md`. Companion spec: `docs/superpowers/specs/2026-08-07-album-compositing-and-quality-tiers-design.md`.

## Current working-tree state (ALL UNCOMMITTED)
Nothing has been committed. Build on top of these working-tree changes; do not redo them.

**New file:** `kpopit-frontend/src/pages/Collection/deviceTier.ts`
**Modified (12):** `AlbumOfCol/AlbumOfCol.css`, `AlbumOfCol/AlbumOfCol.tsx`, `AlbumOfCol/cards/AlbumMemberCard.css`, `AlbumOfCol/cards/AlbumMemberCard.tsx`, `AlbumOfCol/shell/AlbumTextures.tsx`, `Collection/CollectionAlbum.tsx`, `Collection/Collections.tsx`, `Collection/collectionFx.ts`, `Collection/collections.css`, `Collection/components/CardZoomModal.tsx`, `Collection/components/FxPanel.tsx`, `Collection/useCollectionFx.ts`.

Verify current state compiles: `cd kpopit-frontend && npx tsc -b && npm run lint && npm run build` (all were green at handoff).

## DONE & verified on desktop (rounds 1–3)
- **Compositing corruption fix (the core one):** per-card `isolation: isolate` + `contain: paint` (`AlbumMemberCard.css` `.album-card-isolate`, applied in `AlbumMemberCard.tsx`). This flattens the mix-blend so it can't force a whole-page recomposite inside the book's `preserve-3d` context. **Holo/gold animation is the pixel-exact original** (`background-position` + `filter: hue-rotate`) — do NOT "optimize" the keyframes away again; the fix is isolation, not changing motion.
- **Flip glitch:** `data-turning` on `.album-stage` + `[data-turning='on'] … { animation-play-state: paused }`; `will-change` scoped to turns only (`AlbumOfCol.css`).
- **Animation toggles = freeze (not delete):** `[data-fx-lv2='off']`/`[data-fx-lv3='off']` → `animation:none` (texture stays; card keeps LV2/LV3 identity).
- **Quality tier v1:** `deviceTier.ts` (probe + resolve), `collectionFx.ts` preset model (Auto/High/Light + derived Custom), `useCollectionFx` (`quality`/`setQuality`/`tier`/`useTier`), `data-quality` on both roots. Textures are flag-driven (pill reflects reality). Light = single-layer holo + gold-tint at normal blend (not bronze). Zoom modal drops backdrop-blur on Light.

## TODO for codex (in priority order)

### T1 — Quality pills: FIXED dimensions (quick, do first)
User pain: clicking a preset changes the label length (`Auto (light)` vs `High`) and the pills resize; they band-aided 12px→11px. **Requirement (general rule for this codebase):** interactive controls (buttons, pills, search bars) must have **fixed width & height that do NOT depend on text content** — responsive to *screen size* (breakpoints) only, never to the label. Only pad/size with the text when a specific component explicitly needs it.
- In `FxPanel.tsx` quality grid: restore `text-[12px]`; add a **fixed height** (e.g. `h-9`) and `whitespace-nowrap` to every cell; keep the equal widths from `grid-cols-2`.
- **Remove the variable `(tier)` suffix from the Auto button.** Labels become fixed: `Auto`, `High`, `Medium`, `Low`, `Custom`. Show the resolved auto tier in the caption line below instead (e.g. "Auto is following your device: Medium").
- Consider promoting the fixed-control-size rule to `kpopit-frontend/DESIGN.md` §7 (ask user first).

### T2 — Settings panel scrollbar (still wrong)
Symptom: the scrollbar sits flush to the rounded border and pokes past the corners ("getting off the component"). Root cause: `album-index-scroll` was put on the **outer** rounded dialog, so the square scrollbar strip overlaps the `rounded-[20px]` corners + border.
- Fix like `AlbumPageIndex.tsx` does: don't scroll the rounded container. Make the dialog a non-scrolling flex column with the header fixed; put a **inner** `overflow-y-auto` div carrying `album-index-scroll` (+ `--night`), inset from the corners (`-mx-2 px-2`, or `scrollbar-gutter: stable` + right padding), with `contain: paint`. The rounded parent gets `overflow: hidden` so nothing escapes the radius.

### T3 — Granular graphics system (the big one) — full spec in §8 above
Presets **Auto/High/Medium/Low** (+Custom), **segmented sliders**, new **Graphics** group. Card treatment tiers `high/medium/low/border` (border-only keeps a CSS border by level: LV1 group color, LV2 `#E8B923`, LV3 holo gradient). Album textures `high/low/off`. Refactor `collectionFx` booleans+`renderTier` → `GfxSettings` enum object + presets + migration; `resolveDeviceTier` → 3-way; emit `data-cards`+`data-treatment` (replace `data-quality`). Build order in §8.6. **Keep the animation-toggle-as-freeze and the isolation fix intact through this refactor.**

### T4 — Confirm dialog (§7, DECIDED) + T5 — Onboarding tour (§6, spec'd)
Build in the §8 batch. Reuse `AlbumInfoModal` shell. Confirm dialog: only when device auto-resolves to the lowest tier, once ever (`localStorage kpopit-collections-hi-warned`), covering the High preset + textures/holo.

### T6 — Device QA (Task 10) — the acceptance gate
Only the user's Android phone (as user 3973, 185 cards, via `dev:host` LAN) reproduces the original nuke. Must show ZERO corruption at every tier, incl. opting into High on mobile.

## For codex — 4-line brief
> Continue the KpopIt collection-album graphics work. All changes are uncommitted in the working tree (see file list). The mobile-corruption root cause is fixed (per-card `isolation`+`contain`); keep it. Do T1→T6 in `docs/superpowers/plans/2026-08-07-album-compositing-and-quality-tiers.md` (§8 is the big granular-graphics spec). Verify with `npx tsc -b && npm run lint && npm run build`; the real corruption test is on a physical Android phone (user 3973).

## For future-me — where we are
Rounds 1–3 landed the corruption fix + a v1 Auto/High/Light tier system, all uncommitted, desktop-verified. User then asked for a full game-style graphics menu (Auto/High/Medium/Low + per-effect segmented sliders + Border-only tier) — that's design-locked in §8 but NOT built. Two small annoyances remain (T1 fixed pill size, T2 scrollbar). User is delegating the build to codex after a session reset. Memory: `project_album_compositing_tiers`. When resuming, re-read this addendum + §8 first, and confirm nothing was committed/changed by codex in between.

---

# ADDENDUM — Round 5: CODEX IMPLEMENTATION + CLAUDE FINISHING HANDOFF (2026-08-07)

**This addendum supersedes the Round 4 “where we are” paragraph above.** Codex completed and reviewed **T1–T3**. The user stopped the session before T4/T5 to preserve context; Claude should finish the two review findings below, then build the warning/onboarding work and run device QA. Everything remains **uncommitted** in the shared `dev` checkout.

## Completed by Codex (T1–T3)

### T1 — fixed-size preset controls

- Preset row is now exactly `Auto · High · Medium · Low · Custom`.
- Every cell has equal grid width, fixed `h-9`, `text-[12px]`, and `whitespace-nowrap`; labels never resize from dynamic tier text.
- Auto’s resolved tier appears in a stable caption below the controls.
- `Custom` is derived and non-clickable.
- `DESIGN.md` was intentionally not changed because the earlier handoff said to ask before promoting the fixed-control-size rule globally.

### T2 — contained settings scrollbar

- `FxPanel` is a non-scrolling, rounded, `overflow-hidden` flex shell.
- Header stays fixed; an inset inner `album-index-scroll` flex child owns `overflow-y-auto` and `contain: paint`.
- The scrollbar no longer paints through the mobile sheet or desktop popover corners.

### T3 — granular graphics system

- Auto now resolves `high | medium | low` through `deviceTier.ts`.
- Store/persistence was refactored to version 3 with `{ preset, settings }` and the design-locked `GfxSettings` fields:
  - `cards: high | medium | low | border`
  - `albumTextures: high | low | off`
  - `paper`, `shadows`, `blur`, `sparkles`, `goldShine`, `holoShine`, `tapZoom`, `arrows`
- Auto/High/Medium/Low presets set Graphics + Animation while preserving Controls. Direct Graphics/Animation changes derive Custom; Controls do not.
- Round-2 flat storage migrates defensively (`textures`, `renderTier`, `quality`, `backdrop`, `lv2/lv3`, etc.); malformed storage falls back safely.
- Collection roots emit `data-cards` plus the existing `data-fx-*` booleans through the shared typed `collectionFxAttrs.ts` helper. Runtime `data-quality`, `renderTier`, `useTier`, and the old boolean FX API are gone; old names remain only in migration code.
- Card treatment tiers implement High/Medium/Low/Border. Border identity covers member cards, in-book group photos, and zoomed group photos without changing dimensions or overwriting their outer drop shadows.
- Album textures implement High (responsive large asset), Low (small asset only), and Off (unmounted bitmap).
- Graphics controls are segmented ARIA radio groups with roving focus, Arrow keys, Home/End, wraparound, and disabled-Custom skipping. Animation/Controls stay switches.
- Critical inherited invariants remain intact: member-card `isolation: isolate` + `contain: paint`, original holo/gold keyframes, flip-time pause, turn-only `will-change`, and Animation Off = freeze rather than treatment deletion.

## Review work completed

Codex ran task review and two scoped fix/re-review rounds:

1. Added Border identity to group-photo cards and zoom, not only member cards.
2. Added complete keyboard behavior to both preset and segmented radio groups.
3. Extracted duplicated collection-root `data-*` mapping.
4. Reworked Base/Gold Border paint to pseudo-elements so group-photo outer shadows remain intact.

The scoped reviewer approved these fixes. A final two-axis review reported **Spec clean** for completed T1–T3 and found the two remaining engineering items below.

## Claude must fix first (new final-review findings)

### R1 — HIGH: isolate the animated group-photo frame

`AlbumGroupIntroPage.tsx` uses `TextureFill` + `useSyncAlbumAnimations` for the unlocked group-photo frame inside the book’s 3D context, but its treated frame root does **not** carry the member card’s `album-card-isolate` boundary. Gold/holo blend layers can therefore still force page-wide recompositing through this path.

**Required fix:** apply an equivalent `isolation: isolate; contain: paint` boundary to the correct animated group-photo treatment root in the album. Confirm the isolation clips/rounds correctly and does not alter the zoom flight geometry or existing shadow. Audit the zoomed group-photo treatment too; the fixed modal is outside the book’s `preserve-3d`, so do not add containment blindly if it would clip the intended zoom art.

### R2 — MEDIUM: make Auto conservative for iPadOS desktop UA

`deviceTier.ts` records `coarsePointer` but does not use it. An iPad requesting desktop-style Safari can appear `mobile=false` with `deviceMemory=null`, which currently resolves High.

**Required fix:** detect iPadOS desktop-UA/touch capability (for example Mac-like UA + touch points) or conservatively resolve unknown-memory coarse-pointer/touch devices below High. Add RED/GREEN pure tests for a desktop Mac, normal desktop coarse-pointer edge cases if supported, and an iPadOS desktop-UA probe so real desktops do not regress.

## Deferred to Claude (not started by Codex)

### T4 — one-time low-device quality warning (§7)

- Trigger only when Auto resolves Low and `kpopit-collections-hi-warned` is unset.
- Cover High preset, Album textures → High, and Holo shine → On.
- Do not apply the pending setting until confirm; cancel leaves state and flag unchanged.
- Once confirmed, persist the one-time flag. Storage failures must not break settings.
- Update copy to the new Low tier terminology.

### T5 — first-run onboarding tour (§6)

- Build the nine-step tour, shown once via `kpopit-collections-guide-seen` and replayable from `AlbumInfoModal`.
- Use stable `data-tour` targets and skip absent targets (especially an owned sticker) without getting stuck.
- Use four lightweight fixed dim panels around the measured target rather than a full-screen blur/mask, so onboarding does not recreate compositor pressure.
- Re-measure on resize/scroll/layout changes; clamp the coach card to the viewport.
- Keep fixed button dimensions, Escape/Skip/Back/Next/Got it behavior, visible focus, reduced-motion support, and include tour state in AlbumOfCol’s `keysDisabled` gate.
- Do not mutate page position, settings, or night mode just to stage a step.

### T6 — physical Android acceptance QA

Still not executable from Codex. Test as user 3973 / 185 cards through `dev:host` on the reproducing Android device:

1. Auto/High/Medium/Low/Border, including rapid flips.
2. High + album textures + holo (original corruption repro).
3. Texture Off → High while holo is present.
4. Gold and Holo shine freeze toggles.
5. Member-card and group-photo zoom at every card tier.
6. Confirm zero black cards, cyan wash, flicker, invisible page, or broken flip.
7. Record device/browser, resolved Auto tier, pass/fail, and FPS observations in a QA note.

## Files in the completed T1–T3 change

**New:**

- `kpopit-frontend/src/pages/Collection/deviceTier.ts`
- `kpopit-frontend/src/pages/Collection/collectionFxAttrs.ts`
- `kpopit-frontend/src/pages/Collection/components/radioNavigation.ts`

**Modified:**

- `kpopit-frontend/src/components/Albums/AlbumOfCol/AlbumOfCol.css`
- `kpopit-frontend/src/components/Albums/AlbumOfCol/AlbumOfCol.tsx`
- `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.css`
- `kpopit-frontend/src/components/Albums/AlbumOfCol/cards/AlbumMemberCard.tsx`
- `kpopit-frontend/src/components/Albums/AlbumOfCol/pages/AlbumGroupIntroPage.tsx`
- `kpopit-frontend/src/components/Albums/AlbumOfCol/shell/AlbumTextures.tsx`
- `kpopit-frontend/src/pages/Collection/CollectionAlbum.tsx`
- `kpopit-frontend/src/pages/Collection/Collections.tsx`
- `kpopit-frontend/src/pages/Collection/collectionFx.ts`
- `kpopit-frontend/src/pages/Collection/collections.css`
- `kpopit-frontend/src/pages/Collection/components/CardZoomModal.tsx`
- `kpopit-frontend/src/pages/Collection/components/CollectionsBackdrop.tsx`
- `kpopit-frontend/src/pages/Collection/components/FxPanel.tsx`
- `kpopit-frontend/src/pages/Collection/useCollectionFx.ts`

## Verification evidence at Codex handoff

- Pure RED/GREEN temporary scripts covered device tiering, presets/migration/malformed storage, radio navigation, and root attribute mapping; temporary scripts were deleted after GREEN.
- `git diff --check` passed.
- `npx tsc -b`, `npm run lint`, and `npm run build` passed after the review fixes. Vite still reports the pre-existing main-chunk size advisory; it is non-failing.
- No browser or physical-device QA was performed. Do not call the corruption bug fully accepted until T6 passes.
- No commits were created. Preserve all unrelated untracked files and the existing dirty working tree.

## Claude next-session order

1. Re-read this Round 5 addendum and §8; inspect current `git diff` before editing.
2. Fix R1 group-photo isolation and R2 iPadOS Auto detection with focused RED/GREEN coverage.
3. Run `npx tsc -b && npm run lint && npm run build`.
4. Implement T4 warning dialog.
5. Implement T5 onboarding tour.
6. Run browser QA, then the user’s physical Android T6 gate.
7. Update this file and the QA note with evidence; only then decide whether to commit.
