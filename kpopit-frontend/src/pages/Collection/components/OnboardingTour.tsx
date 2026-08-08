import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { markCollectionGuideSeen } from '../onboarding';

interface OnboardingTourProps {
    night: boolean;
    onClose: () => void;
    onShowSticker?: () => void;
}

interface TourStep {
    key: string;
    target?: string;
    mobileOnly?: boolean;
    title: string;
    body: string;
}

const STEPS: readonly TourStep[] = [
    {
        key: 'welcome',
        title: 'Welcome to your album',
        body: 'This is your KpopIt collection. Every idol and group, as a flip-book. Quick tour? It takes about 30 seconds.',
    },
    {
        key: 'night',
        target: '[data-tour="night"]',
        title: 'Day & night',
        body: 'Switch the album between light and dark.',
    },
    {
        key: 'info',
        target: '[data-tour="info"]',
        title: 'How it works',
        body: 'Forgot something? Everything about collecting, levels and navigation lives here. You can replay this tour from it.',
    },
    {
        key: 'settings',
        target: '#fx-panel-toggle',
        title: 'Graphics quality',
        body: 'Auto picks the best setting for your device. You can change it at any time. If your device struggles or glitches, lower the graphics here.',
    },
    {
        key: 'summary',
        target: '[data-tour="summary"]',
        title: 'Jump around',
        body: 'Open the summary to see every group, your progress, and jump straight to one.',
    },
    {
        key: 'pages',
        target: '[data-tour="pages"]',
        title: 'Every page at a glance',
        body: 'Open Pages and scrub the carousel to leap to any opening in the book.',
    },
    {
        key: 'book',
        target: '[data-tour="book"]',
        title: 'Turn the page',
        body: 'Tap the page edges, use the arrows or the ← → keys in your keyboard.',
    },
    {
        key: 'focus',
        target: '[data-tour="focus"]',
        mobileOnly: true,
        title: 'Focus mode',
        body: 'On a phone, Focus mode reads one page at a time, easier to see, and lighter on your device. Highly recommended here.',
    },
    {
        key: 'sticker',
        target: '.album-card-isolate, [data-treatment]',
        title: 'Your stickers',
        body: 'Win Classic or Blurry to collect a sticker. Win again to level it up: Base → Gold → Holo. Tap any sticker to zoom in.',
    },
    {
        key: 'done',
        title: "You're all set",
        body: 'Come back daily to fill your album. You can reopen this tour any time from the info button.',
    },
];

const CARD_WIDTH = 300;
const CARD_EST_HEIGHT = 210;
const MARGIN = 12;
const GAP = 16;
const NAVBAR = 64;
const PAD = 4;

interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

function readRect(selector: string): Rect | null {
    const el = document.querySelector(selector);

    if (!el) return null;

    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    
    return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function OnboardingTour({ night, onClose, onShowSticker }: OnboardingTourProps) {
    const steps = useMemo(() => {
        const mobile = typeof window !== 'undefined' && window.innerWidth < 1024;
        return STEPS.filter((step) => !step.mobileOnly || mobile);
    }, []);

    const [index, setIndex] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);
    const [viewport, setViewport] = useState(() => ({
        w: typeof window === 'undefined' ? 0 : window.innerWidth,
        h: typeof window === 'undefined' ? 0 : window.innerHeight,
    }));
    const [cardH, setCardH] = useState(CARD_EST_HEIGHT);

    const rootRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const step = steps[index] ?? steps[steps.length - 1];
    const isFirst = index === 0;
    const isLast = index === steps.length - 1;

    const finish = useCallback(() => {
        markCollectionGuideSeen();
        onClose();
    }, [onClose]);

    const goNext = useCallback(() => {
        setIndex((current) => {
            if (current >= steps.length - 1) {
                finish();
                return current;
            }
            return current + 1;
        });
    }, [steps.length, finish]);

    const goBack = useCallback(() => setIndex((current) => Math.max(0, current - 1)), []);

    // Lock the page while the tour runs: no body scroll means the fixed dim panels
    // can't "sweep" out of place on mobile, and the highlighted chrome stays put.
    // Snap to the top first so the header targets are always in view.
    useLayoutEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const prevScrollY = window.scrollY;
        const prevHtml = html.style.overflow;
        const prevBody = body.style.overflow;
        window.scrollTo(0, 0);
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        
        return () => {
            html.style.overflow = prevHtml;
            body.style.overflow = prevBody;
            window.scrollTo(0, prevScrollY);
        };
    }, []);

    // Measure the current target; keep it in sync with viewport (orientation) changes.
    const measure = useCallback(() => {
        setViewport({ w: window.innerWidth, h: window.innerHeight });
        setRect(step.target ? readRect(step.target) : null);
    }, [step.target]);

    useLayoutEffect(() => {
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [measure]);

    // Measure the actual card height so centered placement is truly centered.
    useLayoutEffect(() => {
        if (cardRef.current) setCardH(cardRef.current.offsetHeight);
    }, [index, viewport]);

    // Entering the sticker step: open the book to a real sticker, then re-measure
    // once the page has turned so the spotlight lands on it (falls back to centered).
    useEffect(() => {
        if (step.key !== 'sticker') return;

        onShowSticker?.();
        
        const timer = window.setTimeout(measure, 900);
        return () => window.clearTimeout(timer);
    }, [step.key, onShowSticker, measure]);

    // Move focus to the tour dialog (not a button) so the primary action doesn't
    // flash its focus-visible ring the moment the welcome card appears.
    useEffect(() => {
        rootRef.current?.focus();
    }, []);

    // Keyboard: Esc skips, arrows/Enter navigate.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                finish();
            } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
                event.preventDefault();
                goNext();
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goBack();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [finish, goNext, goBack]);

    const dim = night ? 'rgba(6,4,8,0.66)' : 'rgba(20,12,22,0.55)';
    const reduceMotion =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const glide = reduceMotion ? undefined : 'top 0.32s cubic-bezier(0.4,0,0.2,1), left 0.32s cubic-bezier(0.4,0,0.2,1), width 0.32s cubic-bezier(0.4,0,0.2,1), height 0.32s cubic-bezier(0.4,0,0.2,1), bottom 0.32s cubic-bezier(0.4,0,0.2,1)';

    // Spotlight rect, hugging the target with a small pad; clamped to the viewport.
    const hole = useMemo(
        () =>
            rect
                ? {
                      top: Math.max(0, rect.top - PAD),
                      left: Math.max(0, rect.left - PAD),
                      width: Math.min(viewport.w, rect.width + PAD * 2),
                      height: Math.min(viewport.h, rect.height + PAD * 2),
                  }
                : null,
        [rect, viewport],
    );

    // Coach-card position: below the target if it fits, else above, else centered
    // over it (used for the big book step, which is too tall for above/below and
    // would otherwise slide behind the navbar). Always clamped to the viewport.
    const cardStyle = useMemo<React.CSSProperties>(() => {
        const width = Math.min(CARD_WIDTH, viewport.w - MARGIN * 2);
        const clampLeft = (l: number) => Math.min(Math.max(MARGIN, l), viewport.w - width - MARGIN);
        // True viewport-centered, clear of the navbar — uses the measured height.
        const centered = {
            width,
            left: Math.round((viewport.w - width) / 2),
            top: Math.round(Math.min(Math.max(NAVBAR + MARGIN, (viewport.h - cardH) / 2), viewport.h - cardH - MARGIN)),
            transition: glide,
        };

        if (!hole) return centered;

        const spaceBelow = viewport.h - (hole.top + hole.height);
        const spaceAbove = hole.top;

        if (spaceBelow >= cardH + GAP) {
            return { width, left: clampLeft(hole.left + hole.width / 2 - width / 2), top: hole.top + hole.height + GAP, transition: glide };
        }
        if (spaceAbove >= cardH + GAP) {
            return { width, left: clampLeft(hole.left + hole.width / 2 - width / 2), bottom: viewport.h - hole.top + GAP, transition: glide };
        }
        // Neither side fits (tall target, e.g. the book): float truly centered.
        return centered;
    }, [hole, viewport, glide, cardH]);

    const spotlightShadow = night ? 'shadow-[3px_3px_0px_rgba(255,51,153,0.9)]' : 'shadow-[3px_3px_0px_#0a0a0a]';

    const shell = night
        ? 'border-neon-pink bg-[#16181e] text-white shadow-[6px_6px_0px_rgba(255,51,153,1)]'
        : 'border-ink bg-[#fffaf3] text-[#3c2f38] shadow-[6px_6px_0px_#0a0a0a]';

    const panelTransition = reduceMotion ? undefined : 'all 0.32s cubic-bezier(0.4,0,0.2,1)';

    return (
        <div
            ref={rootRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Album tour"
            className="fixed inset-0 z-270 touch-none outline-none"
        >
            {hole ? (
                <>
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: hole.top, background: dim, transition: panelTransition }} />
                    <div style={{ position: 'fixed', top: hole.top + hole.height, left: 0, width: '100%', bottom: 0, background: dim, transition: panelTransition }} />
                    <div style={{ position: 'fixed', top: hole.top, left: 0, width: hole.left, height: hole.height, background: dim, transition: panelTransition }} />
                    <div style={{ position: 'fixed', top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height, background: dim, transition: panelTransition }} />
                    <div
                        style={{ position: 'fixed', top: hole.top, left: hole.left, width: hole.width, height: hole.height, transition: panelTransition }}
                        className={`rounded-xl border-2 border-neon-pink ${spotlightShadow}`}
                    />
                </>
            ) : (
                <div style={{ position: 'fixed', inset: 0, background: dim }} />
            )}

            <div ref={cardRef} style={cardStyle} className={`fixed rounded-[18px] border-2 p-4 ${shell}`}>
                <p className={`font-mono text-[9px] uppercase tracking-widest ${night ? 'text-neon-pink' : 'text-neon-pink'}`}>
                    {`Step ${index + 1} of ${steps.length}`}
                </p>
                <p className={`font-major-mono-display mt-1 text-[19px] uppercase leading-tight tracking-[0.02em] ${night ? 'text-white' : 'text-ink'}`}>
                    {step.title}
                </p>
                <p className={`mt-1.5 font-sans text-[12.5px] leading-normal ${night ? 'text-white/70' : 'text-[#5a4b54]'}`}>
                    {step.body}
                </p>

                <div className="mt-3.5 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={finish}
                        className={`h-8 cursor-pointer rounded-lg px-2 text-[11px] font-bold uppercase tracking-[0.04em] ${
                            night ? 'text-white/55 hover:text-white' : 'text-[#7a6b74] hover:text-ink'
                        }`}
                    >
                        Skip
                    </button>

                    <div className="flex items-center gap-2">
                        {!isFirst && (
                            <button
                                type="button"
                                onClick={goBack}
                                className={`h-8 w-16 cursor-pointer rounded-lg border-2 text-[11px] font-bold uppercase tracking-[0.04em] transition-colors ${
                                    night ? 'border-white/30 text-white/80' : 'border-ink/40 text-ink'
                                }`}
                            >
                                Back
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={goNext}
                            className={`collections-press h-8 w-20 cursor-pointer rounded-lg border-2 text-[11px] font-bold uppercase tracking-[0.04em] 
                            transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-pink active:translate-x-0.5 active:translate-y-0.5 ${
                                night
                                    ? 'border-neon-pink bg-neon-pink text-white shadow-[2px_2px_0px_rgba(255,51,153,0.5)] active:shadow-none'
                                    : 'border-ink bg-neon-pink text-white shadow-[2px_2px_0px_#0a0a0a] active:shadow-none'
                            }`}
                        >
                            {isLast ? 'Got it' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
