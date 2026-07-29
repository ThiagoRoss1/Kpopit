import { memo, useEffect, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ALBUM_PAGE_H, ALBUM_PAGE_W } from '../../../components/Albums/AlbumOfCol/albumConstants';
import { AlbumPreviewProvider } from '../../../components/Albums/AlbumOfCol/AlbumPreviewProvider';

export interface AlbumOpening {
    pos: number;
    accent: string;
    /* 1 for the single-panel covers, 2 for interior spreads — drives the thumb layout */
    pageCount: number;
    /* The real page node(s) for this opening, rendered lightweight via AlbumPreviewProvider */
    nodes: [ReactNode, ReactNode | null];
}

interface AlbumPageCarouselProps {
    openings: AlbumOpening[];
    shown: number;
    onJump: (pos: number) => void;
    onStep: (dir: 1 | -1) => void;
    canPrev: boolean;
    canNext: boolean;
    night: boolean;
}

const THUMB = { w: 38, h: 28.5 };

const MiniOpening = memo(function MiniOpening({ opening, current, onJump, night }: { opening: AlbumOpening; current: boolean; onJump: (pos: number) => void; night: boolean }) {
    const twoPage = opening.pageCount === 2;
    const scale = twoPage ? THUMB.w / (ALBUM_PAGE_W * 2) : THUMB.h / ALBUM_PAGE_H;
    const contentW = opening.pageCount * ALBUM_PAGE_W * scale;

    return (
        <button
            type="button"
            onClick={() => onJump(opening.pos)}
            aria-label={`Go to page ${opening.pos}`}
            className={`relative flex-none cursor-pointer overflow-hidden rounded-sm border transform-gpu transition-transform duration-200 ease-out ${
                current
                    ? 'z-10 -translate-y-0.5 scale-[1.32]'
                    : `${night ? 'border-white/12' : 'border-ink/30'} hover:scale-105`
            } ${night ? 'bg-linear-to-br from-[#20232c] to-[#171a21]' : 'bg-linear-to-br from-[#f2e8dd] to-[#eaddd0]'}`}
            style={{
                width: THUMB.w,
                height: THUMB.h,
                ...(current ? { borderColor: opening.accent, boxShadow: `0 4px 10px -3px ${opening.accent}88` } : undefined),
            }}
        >
            <span
                className="pointer-events-none absolute top-0 select-none"
                style={{ left: (THUMB.w - contentW) / 2, width: contentW, height: THUMB.h }}
            >
                <span className="absolute left-0 top-0 flex origin-top-left" style={{ transform: `scale(${scale})` }}>
                    <AlbumPreviewProvider>
                        {Array.from({ length: opening.pageCount }).map((_, pageIndex) => (
                            <span key={pageIndex} className="relative block overflow-hidden" style={{ width: ALBUM_PAGE_W, height: ALBUM_PAGE_H }}>
                                {opening.nodes[pageIndex]}
                            </span>
                        ))}
                    </AlbumPreviewProvider>
                </span>
            </span>
            {twoPage && (
                <span className={`absolute inset-y-0 left-1/2 w-px ${night ? 'bg-white/14' : 'bg-[#3c2f38]/16'}`} />
            )}
        </button>
    );
});

function StepArrow({ direction, disabled, onClick, night }: { direction: -1 | 1; disabled: boolean; onClick: () => void; night: boolean }) {
    const Icon = direction < 0 ? ChevronLeft : ChevronRight;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={direction < 0 ? 'Previous page' : 'Next page'}
            className={`flex size-7 flex-none items-center justify-center rounded-full border-[1.5px] transition-colors duration-150 ${
                disabled
                    ? `cursor-default opacity-40 ${night ? 'border-white/12 text-white/50' : 'border-ink/25 text-ink/40'}`
                    : `cursor-pointer ${
                          night
                              ? 'border-neon-pink bg-[#1c1f27] text-neon-pink hover:bg-neon-pink hover:text-white'
                              : 'border-ink bg-white text-ink hover:bg-neon-pink hover:text-white'
                      }`
            }`}
        >
            <Icon className="size-4" strokeWidth={2.5} />
        </button>
    );
}

function useDragScroll(ref: React.RefObject<HTMLDivElement | null>) {
    const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });

    return {
        onPointerDown: (event: React.PointerEvent) => {
            if (event.pointerType !== 'mouse' || event.button !== 0 || !ref.current) return;
            drag.current = { down: true, startX: event.clientX, startLeft: ref.current.scrollLeft, moved: false };
        },
        onPointerMove: (event: React.PointerEvent) => {
            if (!drag.current.down || !ref.current) return;
            const dx = event.clientX - drag.current.startX;
            if (!drag.current.moved && Math.abs(dx) < 4) return;
            drag.current.moved = true;
            ref.current.scrollLeft = drag.current.startLeft - dx;
        },
        onPointerUp: () => { drag.current.down = false; },
        onPointerLeave: () => { drag.current.down = false; },
        onClickCapture: (event: React.MouseEvent) => {
            if (!drag.current.moved) return;
            event.preventDefault();
            event.stopPropagation();
            drag.current.moved = false;
        },
    };
}

export default function AlbumPageCarousel({ openings, shown, onJump, onStep, canPrev, canNext, night }: AlbumPageCarouselProps) {
    const railRef = useRef<HTMLDivElement>(null);
    const dragHandlers = useDragScroll(railRef);

    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;
        const current = rail.querySelector<HTMLElement>('[data-cur="1"]');
        if (current) rail.scrollTo({ left: current.offsetLeft - rail.clientWidth / 2 + current.clientWidth / 2, behavior: 'smooth' });
    }, [shown]);

    return (
        <div
            className={`collections-chrome-blur flex max-w-[min(560px,92vw)] items-center gap-2 rounded-2xl border-2 px-2.5 py-2
            backdrop-blur-md transition-colors duration-300 ${
                night
                    ? 'border-white/12 bg-[#16181e]/72 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.7)]'
                    : 'border-ink bg-[#fffcf6]/88 shadow-[0_8px_20px_-10px_rgba(60,40,50,0.35)]'
            }`}
        >
            <StepArrow direction={-1} disabled={!canPrev} onClick={() => onStep(-1)} night={night} />

            <div className="min-w-0 flex-1 overflow-hidden">
                <div
                    ref={railRef}
                    {...dragHandlers}
                    className="cursor-pointer overflow-x-auto px-1.5 pt-2 pb-6.5 -mb-4.5 select-none
                    active:cursor-pointer [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >

                    <div className="flex items-center gap-2.5">
                {openings.map((opening) => (
                    <span key={opening.pos} data-cur={opening.pos === shown ? '1' : '0'} className="inline-flex">
                        {/* onJump is passed through, not wrapped — a closure created
                            here would defeat MiniOpening's memo on every render. */}
                                <MiniOpening opening={opening} current={opening.pos === shown} onJump={onJump} night={night} />
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            <StepArrow direction={1} disabled={!canNext} onClick={() => onStep(1)} night={night} />
        </div>
    );
}
