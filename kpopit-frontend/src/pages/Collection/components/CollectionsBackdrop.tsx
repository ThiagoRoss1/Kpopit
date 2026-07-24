import paperSrc from '../../../assets/materials/AlbumOfCol/crumpled_paper.jpg';

// Phosphor star glyphs (viewBox 0 0 256 256): 5-point outline, 4-point outline,
// and the solid 4-point used for the colored sparkles.
const STAR_FIVE =
    'M235.36,98.49A12.21,12.21,0,0,0,224.59,90l-61.47-5L139.44,27.67a12.37,12.37,0,0,0-22.88,0L92.88,85,31.41,90a12.45,12.45,0,0,0-7.07,21.84l46.85,40.41L56.87,212.64a12.35,12.35,0,0,0,18.51,13.49L128,193.77l52.62,32.36a12.12,12.12,0,0,0,13.69-.51,12.28,12.28,0,0,0,4.82-13l-14.32-60.42,46.85-40.41A12.29,12.29,0,0,0,235.36,98.49Zm-8.93,7.26-48.68,42a4,4,0,0,0-1.28,3.95l14.87,62.79a4.37,4.37,0,0,1-1.72,4.65,4.24,4.24,0,0,1-4.81.18L130.1,185.67a4,4,0,0,0-4.2,0L71.19,219.32a4.24,4.24,0,0,1-4.81-.18,4.37,4.37,0,0,1-1.72-4.65L79.53,151.7a4,4,0,0,0-1.28-3.95l-48.68-42A4.37,4.37,0,0,1,28.25,101a4.31,4.31,0,0,1,3.81-3L96,92.79a4,4,0,0,0,3.38-2.46L124,30.73a4.35,4.35,0,0,1,8.08,0l24.62,59.6A4,4,0,0,0,160,92.79l63.9,5.15a4.31,4.31,0,0,1,3.81,3A4.37,4.37,0,0,1,226.43,105.75Z';
const STAR_FOUR =
    'M228.13,116.77,162.94,93.06,139.23,27.87a11.95,11.95,0,0,0-22.46,0L93.06,93.06,27.87,116.77a11.95,11.95,0,0,0,0,22.46l65.19,23.71,23.71,65.19a11.95,11.95,0,0,0,22.46,0l23.71-65.19,65.19-23.71a11.95,11.95,0,0,0,0-22.46Zm-2.73,15-67,24.34a4,4,0,0,0-2.39,2.39l-24.34,67a4,4,0,0,1-7.44,0l-24.34-67a4,4,0,0,0-2.39-2.39L30.6,131.72a4,4,0,0,1,0-7.44L97.55,99.94a4,4,0,0,0,2.39-2.39L124.28,30.6a4,4,0,0,1,7.44,0l24.34,66.95a4,4,0,0,0,2.39,2.39l67,24.34a4,4,0,0,1,0,7.44Z';
const STAR_FOUR_FILL =
    'M240,128a15.79,15.79,0,0,1-10.5,15l-63.44,23.07L143,229.5a16,16,0,0,1-30,0L89.94,166.06,26.5,143a16,16,0,0,1,0-30L89.94,89.94,113,26.5a16,16,0,0,1,30,0l23.07,63.44L229.5,113A15.79,15.79,0,0,1,240,128Z';

// Neon riso washes — wide, soft, anchored to the composition (title top-left,
// hero bottom-right, with a cool counter-light top-right). Night stays gentle so
// the neon glows without washing out the ink.
const WASHES: { day: string; night: string }[] = [
    {
        day: 'radial-gradient(72% 62% at 4% -6%, rgba(255,51,153,0.11), transparent 60%)',
        night: 'radial-gradient(72% 60% at 4% -6%, rgba(255,51,153,0.13), transparent 62%)',
    },
    {
        day: 'radial-gradient(66% 58% at 104% 106%, rgba(176,102,196,0.09), transparent 58%)',
        night: 'radial-gradient(66% 58% at 104% 106%, rgba(168,85,247,0.12), transparent 60%)',
    },
    {
        day: 'radial-gradient(48% 42% at 100% 2%, rgba(120,158,214,0.055), transparent 66%)',
        night: 'radial-gradient(48% 42% at 100% 2%, rgba(96,150,220,0.07), transparent 66%)',
    },
];

// Large stars pressed into the sheet, framing the corners around the content.
const GHOST_STARS: { shape: string; className: string; tilt: number }[] = [
    { shape: STAR_FIVE, className: 'right-[6%] top-[9%] size-52', tilt: -16 },
    { shape: STAR_FOUR, className: 'left-[7%] top-[38%] size-28', tilt: 11 },
    { shape: STAR_FIVE, className: 'bottom-[11%] left-[15%] size-28', tilt: -7 },
    { shape: STAR_FOUR, className: 'bottom-[15%] right-[11%] size-20', tilt: 14 },
];

// Colored sparkles scattered near the edges. `delay` desyncs the drift/twinkle
// loops so the field never pulses in unison.
const SPARKLES: { color: string; className: string; tilt: number; delay: number }[] = [
    { color: '#ff3399', className: 'left-[13%] top-[24%] size-6.5', tilt: -6, delay: 0 },
    { color: '#ffd166', className: 'right-[18%] top-[30%] size-4', tilt: 12, delay: 1.4 },
    { color: '#a855f7', className: 'bottom-[26%] left-[9%] size-5', tilt: 6, delay: 2.6 },
    { color: '#38bdf8', className: 'bottom-[18%] right-[13%] size-3.5', tilt: -12, delay: 0.8 },
    { color: '#ff3399', className: 'right-[8%] top-[54%] size-4.5', tilt: 12, delay: 3.4 },
];

/** The base sheet — a top-lit gradation, never a flat fill. */
function BaseSheet({ night }: { night: boolean }) {
    return (
        <div
            className="absolute inset-0"
            style={{
                background: night
                    ? 'radial-gradient(ellipse 130% 100% at 50% -8%, #16171d, #0b0c0f 72%)'
                    : 'radial-gradient(ellipse 130% 100% at 50% 0%, #fbf8f2, #f4efe6 82%)',
            }}
        />
    );
}

/** The sheet's texture: subtle paper creases by day, a halftone dot grid by
 *  night (which reads cleaner under the neon). */
function SheetTexture({ night }: { night: boolean }) {
    if (night) {
        return (
            <div className="absolute inset-0 bg-size-[19px_19px] bg-[radial-gradient(rgba(255,255,255,0.05)_1.4px,transparent_1.4px)]" />
        );
    }
    return (
        <img
            src={paperSrc}
            alt=""
            aria-hidden
            decoding="async"
            style={{ filter: 'saturate(0.2) brightness(1.07)' }}
            className="absolute inset-0 size-full object-cover opacity-[0.15] mix-blend-multiply"
        />
    );
}

/** A retro-pop star pressed into the paper — a near-transparent fill plus an
 *  offset highlight so it reads as debossed rather than a flat outline. */
function GhostStar({ shape, className, tilt, night }: { shape: string; className: string; tilt: number; night: boolean }) {
    return (
        <span className={`absolute ${className}`} style={{ transform: `rotate(${tilt}deg)` }}>
            <svg
                viewBox="0 0 256 256"
                className="size-full"
                style={{ filter: night ? 'drop-shadow(0 2px 0 rgba(0,0,0,0.5))' : 'drop-shadow(0 2px 0 rgba(255,255,255,0.9))' }}
            >
                <path d={shape} fill={night ? 'rgba(255,255,255,0.05)' : 'rgba(32,28,44,0.06)'} />
            </svg>
        </span>
    );
}

/** One colored 4-point sparkle with glow, drifting and twinkling. */
function Sparkle({ color, className, tilt, delay, night }: { color: string; className: string; tilt: number; delay: number; night: boolean }) {
    return (
        <span className={`collections-drift absolute ${className}`} style={{ transform: `rotate(${tilt}deg)`, animationDelay: `${delay}s` }}>
            <svg
                viewBox="0 0 256 256"
                className="collections-twinkle size-full"
                style={{
                    animationDelay: `${delay * 0.6}s`,
                    filter: night ? `drop-shadow(0 0 6px ${color})` : 'drop-shadow(1px 1.4px 0 rgba(38,24,34,0.35))',
                }}
            >
                <path d={STAR_FOUR_FILL} fill={color} />
            </svg>
        </span>
    );
}

/** Every theme-dependent layer, rendered once per theme and cross-faded. */
function BackdropLayers({ night }: { night: boolean }) {
    return (
        <>
            <BaseSheet night={night} />
            <SheetTexture night={night} />
            {WASHES.map((wash, index) => (
                <div key={index} className="absolute inset-0" style={{ background: night ? wash.night : wash.day }} />
            ))}
            {GHOST_STARS.map((star, index) => (
                <GhostStar key={index} shape={star.shape} className={star.className} tilt={star.tilt} night={night} />
            ))}
        </>
    );
}

export default function CollectionsBackdrop({ night }: { night: boolean }) {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className={`absolute inset-0 transition-opacity duration-300 ${night ? 'opacity-100' : 'opacity-0'}`}>
                <BackdropLayers night />
            </div>
            <div className={`absolute inset-0 transition-opacity duration-300 ${night ? 'opacity-0' : 'opacity-100'}`}>
                <BackdropLayers night={false} />
            </div>
            {/* Sparkles sit above both trees; their glow is theme-aware. */}
            {SPARKLES.map((sparkle, index) => (
                <Sparkle key={index} color={sparkle.color} className={sparkle.className} tilt={sparkle.tilt} delay={sparkle.delay} night={night} />
            ))}
        </div>
    );
}
