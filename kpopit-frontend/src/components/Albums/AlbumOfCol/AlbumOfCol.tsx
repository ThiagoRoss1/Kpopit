import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AlbumCover from './pages/AlbumCover';
import AlbumStatsPage from './pages/AlbumStatsPage';
import AlbumNextGroupPage from './pages/AlbumNextGroupPage';
import AlbumGroupIntroPage from './pages/AlbumGroupIntroPage';
import AlbumMembersPage from './pages/AlbumMembersPage';
import AlbumBlankPage from './pages/AlbumBlankPage';
import type { AlbumGroup, AlbumStats } from '../../../interfaces/albumInterfaces';
import { ALBUM_CARDS_PER_PAGE, ALBUM_PAGE_H, ALBUM_PAGE_W } from './albumConstants';
import './AlbumOfCol.css';

const FLIP_MS = 800;

function buildAlbumStats(groups: AlbumGroup[]): AlbumStats {
    let owned = 0;
    let total = 0;
    let groups_complete = 0;
    for (const g of groups) {
        total += g.members.length;
        const got = g.members.filter((m) => m.owned).length;
        owned += got;
        if (got === g.members.length) groups_complete += 1;
    }
    return { owned, total, groups_complete, groups_total: groups.length };
}

/** First spread each group's block starts on — feeds the chrome's index/carousel */
export interface AlbumGroupSpread {
    group_id: number;
    pos: number;
}

function buildInteriorPages(groups: AlbumGroup[], stats: AlbumStats): { interior: ReactNode[]; groupSpreads: AlbumGroupSpread[] } {
    const interior: ReactNode[] = [];
    const groupSpreads: AlbumGroupSpread[] = [];
    for (const group of groups) {
        groupSpreads.push({ group_id: group.group_id, pos: Math.floor(interior.length / 2) + 1 });
        interior.push(<AlbumStatsPage key={`stats-${group.group_id}`} stats={stats} />);
        interior.push(<AlbumNextGroupPage key={`next-${group.group_id}`} group={group} />);
        interior.push(<AlbumGroupIntroPage key={`intro-${group.group_id}`} group={group} side="left" />);
        const pageCount = Math.ceil(group.members.length / ALBUM_CARDS_PER_PAGE);
        for (let p = 0; p < pageCount; p++) {
            const side = interior.length % 2 === 0 ? 'left' : 'right';
            const startSlot = p * ALBUM_CARDS_PER_PAGE;
            const slots = Array.from(
                { length: ALBUM_CARDS_PER_PAGE },
                (_, i) => group.members[startSlot + i] ?? null,
            );
            interior.push(
                <AlbumMembersPage
                    key={`members-${group.group_id}-${p}`}
                    group={group}
                    slots={slots}
                    startSlot={startSlot}
                    pageLabel={`${p + 1}/${pageCount}`}
                    side={side}
                />,
            );
        }
        if (interior.length % 2 !== 0) {
            interior.push(<AlbumBlankPage key={`blank-${group.group_id}`} group={group} pageLabel={`${pageCount}/${pageCount}`} />);
        }
    }
    return { interior, groupSpreads };
}

interface FlipState {
    dir: 1 | -1;
    angle: number;
}

/** Imperative controls handed to the album-page chrome via `controlRef` */
export interface AlbumOfColControls {
    go: (dir: 1 | -1) => void;
    jumpTo: (pos: number) => void;
}

/** Book snapshot handed to the chrome on init — page nodes feed the carousel's mini-page thumbs */
export interface AlbumBookInit {
    spreadCount: number;
    groupSpreads: AlbumGroupSpread[];
    spreads: Array<[ReactNode, ReactNode | null]>;
    frontCover: ReactNode;
    backCover: ReactNode;
}

interface AlbumOfColProps {
    groups: AlbumGroup[];
    chromeless?: boolean;
    controlRef?: React.RefObject<AlbumOfColControls | null>;
    onPosChange?: (pos: number, flipping: boolean) => void;
    onBookInit?: (book: AlbumBookInit) => void;
    keysDisabled?: boolean;
}

export default function AlbumOfCol({ groups, chromeless = false, controlRef, onPosChange, onBookInit, keysDisabled = false }: AlbumOfColProps) {
    const stats = useMemo(() => buildAlbumStats(groups), [groups]);
    const { interior, groupSpreads } = useMemo(() => buildInteriorPages(groups, stats), [groups, stats]);
    const spreads = useMemo(() => {
        const result: Array<[ReactNode, ReactNode | null]> = [];
        for (let i = 0; i < interior.length; i += 2) {
            result.push([interior[i], interior[i + 1] ?? null]);
        }
        return result;
    }, [interior]);

    const spreadCount = spreads.length;
    const maxPos = spreadCount + 1;
    const [pos, setPos] = useState(() => {
        if (!import.meta.env.DEV) return 0;
        const raw = new URLSearchParams(window.location.search).get('spread');
        const parsed = raw === null ? NaN : Number(raw);
        return Number.isInteger(parsed) ? Math.min(Math.max(parsed, 0), spreadCount + 1) : 0;
    });
    const [flip, setFlip] = useState<FlipState | null>(null);

    const frontClosed = pos === 0;
    const backClosed = pos === maxPos;

    const stageRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);
    // Layout effect so the first paint already uses the fitted scale — the mount
    // zoom then comes only from the .album-zoom-in keyframe (consistent every open).
    useLayoutEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const update = () => {
            const rect = el.getBoundingClientRect();
            const next = Math.min(1, (rect.width - 24) / (ALBUM_PAGE_W * 2), (rect.height - 24) / ALBUM_PAGE_H);
            // Snap so each page maps to a whole pixel count — a fractional page width
            // rasterizes the spine seam differently per scroll frame (white line /
            // shadow flicker between the two pages).
            const fitted = Math.max(0.2, next);
            setScale(Math.floor(fitted * ALBUM_PAGE_W) / ALBUM_PAGE_W);
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const frontCover = useMemo(() => <AlbumCover variant="front" stats={stats} />, [stats]);
    const backCover = useMemo(() => <AlbumCover variant="back" />, []);

    const leftOf = useCallback(
        (sp: number): ReactNode => {
            if (sp === maxPos) return backCover;
            if (sp >= 1 && sp <= spreadCount) return spreads[sp - 1][0];
            return null;
        },
        [spreads, spreadCount, maxPos, backCover],
    );
    const rightOf = useCallback(
        (sp: number): ReactNode => {
            if (sp === 0) return frontCover;
            if (sp >= 1 && sp <= spreadCount) return spreads[sp - 1][1];
            return null;
        },
        [spreads, spreadCount, frontCover],
    );

    const go = useCallback(
        (dir: 1 | -1) => {
            if (flip) return;
            if (dir > 0 && pos < maxPos) {
                setFlip({ dir: 1, angle: 0 });
                requestAnimationFrame(() => requestAnimationFrame(() => setFlip({ dir: 1, angle: -180 })));
            } else if (dir < 0 && pos > 0) {
                setFlip({ dir: -1, angle: 0 });
                requestAnimationFrame(() => requestAnimationFrame(() => setFlip({ dir: -1, angle: 180 })));
            }
        },
        [flip, pos, maxPos],
    );

    useEffect(() => {
        if (!flip) return;
        const id = setTimeout(() => {
            setPos((p) => p + flip.dir);
            setFlip(null);
        }, FLIP_MS);
        return () => clearTimeout(id);
    }, [flip]);

    // Chrome wiring — the album page (collection_album.tsx) drives the book through
    // controlRef and mirrors its state via the two callbacks.
    const jumpTo = useCallback(
        (target: number) => {
            setFlip(null);
            setPos(Math.min(Math.max(target, 0), maxPos));
        },
        [maxPos],
    );
    useEffect(() => {
        if (!controlRef) return;
        controlRef.current = { go, jumpTo };
        return () => {
            controlRef.current = null;
        };
    }, [controlRef, go, jumpTo]);
    const bookInit = useMemo<AlbumBookInit>(
        () => ({ spreadCount, groupSpreads, spreads, frontCover, backCover }),
        [spreadCount, groupSpreads, spreads, frontCover, backCover],
    );
    useEffect(() => {
        onBookInit?.(bookInit);
    }, [onBookInit, bookInit]);
    const shownSpread = flip ? pos + flip.dir : pos;
    useEffect(() => {
        onPosChange?.(shownSpread, !!flip);
    }, [onPosChange, shownSpread, flip]);

    useEffect(() => {
        if (keysDisabled) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [go, keysDisabled]);

    // During a flip the static pages must NOT jump to the destination spread: the
    // page being uncovered shows the new content, the other side keeps the current
    // one until the leaf lands (pos only advances when the animation ends).
    const shownLeft = flip ? (flip.dir > 0 ? pos : pos - 1) : pos;
    const shownRight = flip ? (flip.dir > 0 ? pos + 1 : pos) : pos;

    let leafFront: ReactNode = null;
    let leafBack: ReactNode = null;
    let leafSide: 'left' | 'right' = 'right';
    if (flip) {
        if (flip.dir > 0) {
            leafSide = 'right';
            leafFront = rightOf(pos);
            leafBack = leftOf(pos + 1);
        } else {
            leafSide = 'left';
            leafFront = leftOf(pos);
            leafBack = rightOf(pos - 1);
        }
    }

    const navBtn =
        'flex size-11 items-center justify-center rounded-full border-2 font-bold transition-colors duration-200 ' +
        'disabled:cursor-default disabled:border-white/20 disabled:text-white/30 ' +
        'enabled:cursor-pointer enabled:border-neon-pink enabled:bg-neon-pink enabled:text-white enabled:shadow-[0_4px_0_#b43777]';

    return (
        <div
            className={
                chromeless
                    ? // The host stage owns the height and overlays its own nav at the
                      // bottom — pb reserves the room the status + carousel need.
                      'flex h-full min-h-0 w-full flex-col items-center px-3 pb-28 pt-3'
                    : 'flex min-h-[calc(100dvh-48px)] sm:min-h-[calc(100dvh-60px)] flex-col items-center gap-5 px-3 py-6'
            }
        >
            <div ref={stageRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
                {/* Zoom origin follows the book's visual center (the closed covers are
                    translated ±25%), so the mount zoom is a pure scale — no sideways drift */}
                <div
                    className="album-perspective album-zoom-in transform-gpu"
                    style={{
                        transformOrigin: `${50 + (frontClosed && !flip ? -25 : backClosed && !flip ? 25 : 0)}% 50%`,
                    }}
                >
                    <div
                        className="album-book relative"
                        style={{
                            width: ALBUM_PAGE_W * 2 * scale,
                            height: ALBUM_PAGE_H * scale,
                            transform: `translateX(${Math.round(frontClosed && !flip ? (-ALBUM_PAGE_W * scale) / 2 : backClosed && !flip ? (ALBUM_PAGE_W * scale) / 2 : 0)}px)`,
                        }}
                    >
                        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})` }}>
                            <div className="relative" style={{ width: ALBUM_PAGE_W * 2, height: ALBUM_PAGE_H }}>
                                {leftOf(shownLeft) != null && (
                                    <div className="absolute left-0 top-0 h-225 w-150 overflow-hidden shadow-[inset_-14px_0_26px_-12px_rgba(24,16,25,0.32)]">
                                        {leftOf(shownLeft)}
                                    </div>
                                )}
                                {rightOf(shownRight) != null && (
                                    <div className="absolute left-150 top-0 h-225 w-150 overflow-hidden shadow-[inset_14px_0_26px_-12px_rgba(24,16,25,0.32)]">
                                        {rightOf(shownRight)}
                                    </div>
                                )}
                                {!frontClosed && !backClosed && (
                                    <div className="pointer-events-none absolute top-0 left-148.25 z-40 h-225 w-3.5
                                    bg-[linear-gradient(90deg,transparent,rgba(20,12,22,0.45)_50%,transparent)]" />
                                )}
                                {flip && (
                                    <div
                                        className="album-leaf absolute top-0 z-60 h-225 w-150"
                                        style={{
                                            left: leafSide === 'right' ? ALBUM_PAGE_W : 0,
                                            transformOrigin: leafSide === 'right' ? 'left center' : 'right center',
                                            transform: `rotateY(${flip.angle}deg)`,
                                        }}
                                    >
                                        <div className="album-leaf-face transform-gpu absolute inset-0 overflow-hidden bg-[#d9d9d9]">
                                            {leafFront}
                                        </div>
                                        <div className="album-leaf-face absolute inset-0 overflow-hidden bg-[#d9d9d9] transform-[rotateY(180deg)_translateZ(0)]">
                                            {leafBack}
                                        </div>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    aria-label="Previous page"
                                    onClick={() => go(-1)}
                                    className={`absolute left-0 top-0 z-80 h-225 w-150 ${pos > 0 && !flip ? 'cursor-pointer' : 'cursor-default'}`}
                                />
                                <button
                                    type="button"
                                    aria-label="Next page"
                                    onClick={() => go(1)}
                                    className={`absolute left-150 top-0 z-80 h-225 w-150 ${pos < maxPos && !flip ? 'cursor-pointer' : 'cursor-default'}`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {!chromeless && (
            <div className="flex items-center gap-5 pb-2">
                <button type="button" className={navBtn} onClick={() => go(-1)} disabled={pos === 0 || !!flip}>
                    ◀
                </button>
                <div className="min-w-55 text-center">
                    <p className="text-[14px] font-bold text-white">
                        {frontClosed
                            ? 'Album 1 — tap to open'
                            : backClosed
                              ? 'Back cover — album closed'
                              : `Spread ${Math.min(pos, spreadCount)}/${spreadCount}`}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-neon-pink">
                        tap the pages to flip
                    </p>
                </div>
                <button type="button" className={navBtn} onClick={() => go(1)} disabled={pos >= maxPos || !!flip}>
                    ▶
                </button>
            </div>
            )}
        </div>
    );
}
