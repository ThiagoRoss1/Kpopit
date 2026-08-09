# Safari Continuous Card Animation and Image Reveal Design

> **Superseded implementation note (2026-08-09):** The owner confirmed the remaining defect is the
> treatment/compositor path, not image loading. The readiness/decode section below is retained as the
> earlier investigation record, but the current implementation removes that axis and uses a Safari-only
> stage-scoped treatment-layer experiment. See `docs/superpowers/safari-texture-glitch-fix-report.md`.

**Date:** 2026-08-09

## Goal

Make Safari card and group-photo treatments preserve the same continuous gold/holo phase as Chromium and Firefox, and prevent artwork from appearing after a page turn has begun, without changing any visual design, keyframe, treatment layer, or non-Safari navigation behavior.

## Evidence

The recording `Gravação de Tela 2026-08-09 às 03.58.47.mov` repeatedly shows newly mounted group pages at the same orange→yellow→green holo start frame. Two independent reset frames measured `SSIM=0.972694`; values above `0.95` are treated as the RED signature.

The current Safari branch deliberately skips `CSSAnimation.startTime` synchronization. Because the book renders static pages and temporary leaf faces as separate React trees, every new tree therefore begins its CSS animation at local time zero. WebKit bug 290993 documents Safari animations created during rendering updates becoming ready at `currentTime=0`, unlike Chrome and Firefox.

The same recording still shows group artwork entering after the treatment shell. The current off-DOM `Image.decode()` warm-up is not sufficient: the actual destination `<img>` is mounted only when the flip starts, and Safari has documented cached-image/decode timing defects.

## Design

### Continuous phase

Every treated host receives `--album-animation-delay: -<performance.now()>ms` in its initial React render. Existing gold/holo CSS animations consume that variable as their delay. A newly mounted clone therefore starts at the document's current monotonic phase instead of zero. No keyframes, durations, easing, blend modes, opacity, treatment layers, or quality-tier selectors change.

The old post-mount Web Animations synchronization is removed. This avoids both prior Safari failure modes: forcing `startTime=0` and skipping synchronization entirely.

### Safari reveal readiness

Safari page turns gain a preparation phase. The flip state mounts the real leaf and its actual destination image elements without rotating it. Those destination images are decoded sequentially, followed by one rendering frame, before rotation starts. Sequential decoding limits Safari memory pressure.

Direct `jumpTo()` navigation waits on the existing URL warmer before replacing the spread. Chromium and Firefox retain their immediate current behavior. Errors release the gate so navigation cannot deadlock.

## Constraints

- Preserve original gold/holo keyframes pixel-for-pixel.
- Preserve `.album-card-isolate`, album paper textures, and every quality tier.
- No Safari quality cap or visual fallback.
- No non-Safari navigation delay.
- No broad persistent page mounting or additional permanent compositor layers.

## Verification

- Pure regression test for global negative-delay phase derivation.
- Readiness test proving sequential decode and post-decode rendering-frame order.
- Existing image warmer tests.
- TypeScript, ESLint, and production Vite build.
- Real Safari remains the final visual acceptance environment.
