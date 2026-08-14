# AlbumOfCol Safari production-fix implementation report

**Review date:** 2026-08-14  
**Reviewer:** Codex (solo review; no subagents)  
**Renderer:** V1 only  
**Status:** core Safari/iPad defects are implemented, statically verified, and reported fixed by the owner on native hardware. The final solo review correction has been applied; no blocking code finding remains.

## Review scope

This review covers the production changes in:

- `2cbf7d2` — initial Safari glitch fix;
- `9bd2e5e` — Safari rendering, disclosure lifecycle, responsive zoom, and test hardening;
- `61168b1` — iPad/tablet zoomed member-card typography correction.

The review inspected the flip-leaf lifecycle, artwork loading policy, Safari-only compositor rules, zoom FLIP, responsive card geometry, disclosure state machine, every disclosure call site, event/timer/observer cleanup, carousel preview behavior, graphics tiers, and the focused tests.

## What was fixed

- Active member artwork and unlocked group-photo artwork use `loading="eager"` with `decoding="async"`. This is the variable that stopped Safari from flashing the artwork during page turns without forcing synchronous main-thread decoding.
- The loading policy is shared through `EAGER_ARTWORK_PROPS`, keeping member pages, group-intro pages, and zoom artwork consistent.
- Safari's transient LV3 leaf uses a filter-free holo keyframe. The rainbow background still moves, but the animated `hue-rotate` surface is removed only while Safari is compositing the rotating leaf.
- Other browsers and settled Safari cards retain the original full holo animation.
- The temporary leaf keeps one compositor hint for its short mounted lifetime; there is no permanent `will-change` on every settled album page.
- Group-photo zoom no longer clips its treatment frame. The outer frame can paint visibly while the nested image viewport still clips the photo and preserves its corners.
- Member-card zoom geometry is bounded by viewport width and height from the tablet breakpoint upward and preserves the 8:11 card ratio.
- Zoomed member cards now opt into an explicit `zoomed` surface. The fixed 160×220 sticker is geometrically transformed as a single unit, so the image, LV badge, and name banner scale consistently across the iPad/1024px breakpoint.
- Modal titles, subtitles, row labels, and values received the accepted tablet typography increase.
- The zoom opening FLIP remains 800 ms. The return FLIP, panel exit animation, disclosure timeout contract, and CSS duration all share the same 300 ms close duration.
- The group/photo source stays hidden only while its zoom clone is mounted, allowing the return FLIP to land without showing two copies.
- Focus mode now conditionally removes the bottom status/carousel subtree rather than leaving the carousel hidden with active observers.
- The temporary Safari diagnostic store, settings rows, attributes, CSS probes, and probe-only branches were removed.

## Disclosure and unmount review

`useDisclosure` is a reasonable abstraction for these animated panels. It represents three real states—closed, open, and closing—rather than using a display-only boolean.

The reviewed behavior is correct:

- close starts the exit animation while the component remains mounted;
- the owning element's expected `animationend` normally completes the close;
- descendant animation events cannot close the owner;
- stale events from an earlier close/reopen generation are rejected;
- reduced motion completes on the next animation frame;
- a duration-plus-100-ms watchdog guarantees eventual unmount if CSS never emits an event;
- reopening cancels the previous frame/timeout through the effect cleanup and generation guard;
- timers and RAFs are removed when the disclosure changes state or unmounts;
- callbacks remain stable across ordinary renders because callers use shared animation-name constants.

Every disclosure consumer conditionally renders from `.mounted`: Summary rail, Pages carousel, mobile index, information modal, visual-effects panel, and card zoom. They are removed from the React tree after close; they are not retained with `display: none`.

The one intentional visibility exception is the original sticker/group photo during zoom. It remains mounted but invisible while the modal clone flies out and back. When the zoom disclosure finishes, the modal unmounts, `zoomTarget` is cleared, `flyingCardId` becomes null, and the source is visible again. This is required for FLIP geometry and is not a leaked closed component.

## Effects, listeners, and observer review

No effect loop or unbounded background task was found.

- Album flip timers are active only during a turn and are cleared on dependency change/unmount.
- The landed leaf is retained for two paint frames, with a bounded timeout fallback, then unmounted.
- The album stage `ResizeObserver` disconnects on cleanup. Updating the same numeric scale is safely ignored by React.
- Card zoom owns one `ResizeObserver` and at most one zero-width retry RAF. Both are cancelled on unmount.
- Zoom keyboard and `popstate` listeners exist only while zoom is mounted and are removed on close/unmount.
- Safari gesture listeners are browser-gated and removed on unmount.
- Focus-mode, keyboard-navigation, settings-panel, tour, and carousel listeners/observers all provide cleanup functions.
- The settings panel's document listeners exist only while the panel itself is mounted.
- Carousel thumbnail `IntersectionObserver`s disconnect when the carousel or focus-mode chrome unmounts.
- `useSyncAlbumAnimations` runs once per mounted treatment/dependency change on Chromium/Firefox and intentionally skips Safari; it is not a per-frame React effect.
- `useAlbumAnimationPhase` computes one stable CSS delay at mount and does not schedule timers or rerenders.

`useMemo` and `useCallback` would not replace these effects: the effects synchronize React with DOM events, layout measurement, timers, history, and observers. The current use of effects is appropriate.

## RAM and rendering scope

The code shows no monotonic client-side retention path or album-wide hidden page stack.

- A settled book mounts at most the current left and right pages.
- A page turn temporarily mounts the two static under-pages plus the leaf's two faces: at most four real page trees.
- In a worst-case all-member spread, that means up to 12 mounted member artwork elements while settled and up to 24 transiently during a turn, followed by leaf cleanup.
- Zoom adds one temporary clone of the selected artwork while its source remains mounted for the return path.
- Carousel previews use `AlbumPreviewProvider` stand-ins, so near-viewport thumbnails do not mount member/group artwork or treatment textures.
- Reused image URLs allow normal browser request/cache coalescing; there is no JavaScript image registry retaining decoded resources.
- `decoding="async"` avoids synchronous decode stalls.
- High graphics intentionally keeps animated treatment layers on mounted cards. Medium/Low/Border settings remove or flatten the most expensive passes, and album texture components return `null` when disabled.
- The leaf compositor layer and zoom-art `will-change` are bounded by their component lifetimes.

This is a sound memory architecture. Static inspection cannot provide an exact RAM number or prove WebKit's decoded-image eviction behavior, so a long native session with Safari's Memory/Network tools remains the correct way to measure the final ceiling. Nothing in the reviewed React code suggests an accumulating leak.

## Final review correction

The V1 album previously initialized both the Summary rail and Pages carousel as open:

```ts
const rail = useDisclosure(true);
const carousel = useDisclosure(true);
```

The options migration preserved `initialOpen: true` for the rail but omitted it for the carousel:

```ts
const carousel = useDisclosure({
    exitDurationMs: COLLECTION_STANDARD_EXIT_MS,
    exitAnimationNames: COLLECTION_EXIT_ANIMATIONS.chrome,
});
```

The owner confirmed that Pages must start open. `initialOpen: true` was restored, preserving the V1 default and its initial `data-pages` stage geometry:

```ts
const carousel = useDisclosure({
    initialOpen: true,
    exitDurationMs: COLLECTION_STANDARD_EXIT_MS,
    exitAnimationNames: COLLECTION_EXIT_ANIMATIONS.chrome,
});
```

No other blocking code defect was found in the reviewed album changes.

## Non-blocking improvements

- The current tests exercise the pure disclosure reducer, event-clock filtering, animation-name policy, watchdog timing, zoom duration contract, and eager-artwork constant. They do not mount the React hook in a DOM. A future lightweight React integration test could prove actual mount → close → animation end/watchdog → DOM removal behavior, but the present implementation is coherent by inspection.
- `safariDetection.ts` is pure and small; adding UA fixtures for desktop Safari, iPadOS desktop mode, Chrome, CriOS, and FxiOS would protect the narrow browser gate from future edits.
- `AlbumInfoModal` rebuilds its small `INFO_ROWS` icon array on modal renders. This is negligible and does not justify memoization unless the modal becomes substantially more dynamic.
- `will-change` on the zoom art remains active while the modal is open so the return FLIP is ready. Releasing and re-adding it could save one compositor surface, but would add complexity and could reintroduce Safari instability; keeping it is the better tradeoff here.

## Verification completed

- `npm test` — passed, 14/14.
- `npm run lint` — passed.
- `npm run build` — passed; only the existing Vite chunk-size advisory remains.
- `git diff --check` — passed after the review correction and report update.
- Diagnostic residue search — clean under `kpopit-frontend/src` and `kpopit-frontend/tests` except for the intentional production `data-browser="safari"` gate.
- Earlier rebuilt Chromium smoke completed repeated page turns and disclosure open/close checks without console errors. Its anonymous session could not exercise owned-card zoom.
- Owner/device result: the reported Safari sticker flash, LV3/Holo render delay, zoomed group-photo border clipping, iPad zoom sizing, and iPad sticker typography are reported fixed in the latest native checks.

## Conclusion

The final implementation is substantially cleaner than the experimental versions and keeps the V1 renderer intact. The Safari fixes are narrow where browser-specific compositor behavior requires it, while the eager artwork policy, disclosure lifecycle, frame boundary, responsive geometry, and zoom scaling are valid cross-browser improvements.

The hooks are not running continuously, closed overlays unmount, observers/listeners/timers clean up, and the mounted artwork scope is bounded. No React-side RAM leak or unnecessary render loop was found. The remaining performance uncertainty is browser-level decoded-image/GPU memory behavior under a long native session, not an obvious ownership failure in this code.

The Pages-carousel regression found during the solo review is resolved. No blocking code issue remains; the candidate is ready for the planned final cross-browser/device review and merge decision.
