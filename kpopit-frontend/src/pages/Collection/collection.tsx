// Album 1 Collection — dev assembly page (/collection). Renders the whole album as a
// flip-book from mock data (pages/Collection/mockAlbumData.ts); the real
// CollectionService fetch swaps in later. Page sequence per group:
// [stats | next-group] → [we-are | members …] → blank filler when a group ends on a
// left page. The book opens from the front cover and closes on the back cover.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AlbumCover from '../../components/Albums/AlbumCover';
import AlbumStatsPage from '../../components/Albums/AlbumStatsPage';
import AlbumNextGroupPage from '../../components/Albums/AlbumNextGroupPage';
import AlbumGroupIntroPage from '../../components/Albums/AlbumGroupIntroPage';
import AlbumMembersPage from '../../components/Albums/AlbumMembersPage';
import AlbumBlankPage from '../../components/Albums/AlbumBlankPage';
import { ALBUM_CARDS_PER_PAGE, ALBUM_PAGE_H, ALBUM_PAGE_W, type AlbumGroup, type AlbumStats } from '../../components/Albums/albumTypes';
import { MOCK_ALBUM_GROUPS, buildAlbumStats } from './mockAlbumData';
import './collection.css';

const FLIP_MS = 800;

function buildInteriorPages(groups: AlbumGroup[], stats: AlbumStats): ReactNode[] {
    const interior: ReactNode[] = [];
    for (const group of groups) {
        interior.push(<AlbumStatsPage key={`stats-${group.group_id}`} stats={stats} />);
        interior.push(<AlbumNextGroupPage key={`next-${group.group_id}`} group={group} />);
        interior.push(<AlbumGroupIntroPage key={`intro-${group.group_id}`} group={group} side="left" />);
        const pageCount = Math.ceil(group.members.length / ALBUM_CARDS_PER_PAGE);
        for (let p = 0; p < pageCount; p++) {
            const side = interior.length % 2 === 0 ? 'left' : 'right';
            interior.push(
                <AlbumMembersPage
                    key={`members-${group.group_id}-${p}`}
                    group={group}
                    start={p * ALBUM_CARDS_PER_PAGE}
                    pageLabel={`${p + 1}/${pageCount}`}
                    side={side}
                />,
            );
        }
        if (interior.length % 2 !== 0) {
            interior.push(<AlbumBlankPage key={`blank-${group.group_id}`} group={group} pageLabel={`${pageCount}/${pageCount}`} />);
        }
    }
    return interior;
}

interface FlipState {
    dir: 1 | -1;
    angle: number;
}

export default function Collection() {
    const stats = useMemo(() => buildAlbumStats(MOCK_ALBUM_GROUPS), []);
    const interior = useMemo(() => buildInteriorPages(MOCK_ALBUM_GROUPS, stats), [stats]);
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
    useEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const update = () => {
            const rect = el.getBoundingClientRect();
            const next = Math.min(1, (rect.width - 24) / (ALBUM_PAGE_W * 2), (rect.height - 24) / ALBUM_PAGE_H);
            setScale(Math.max(0.2, next));
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

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [go]);

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
        <div className="flex min-h-[calc(100vh-90px)] flex-col items-center gap-5 px-3 py-6">
            <div ref={stageRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
                <div className="album-perspective">
                    <div
                        className="album-book relative"
                        style={{
                            width: ALBUM_PAGE_W * 2 * scale,
                            height: ALBUM_PAGE_H * scale,
                            transform: `translateX(${frontClosed && !flip ? (-ALBUM_PAGE_W * scale) / 2 : backClosed && !flip ? (ALBUM_PAGE_W * scale) / 2 : 0}px)`,
                        }}
                    >
                        <div className="absolute left-0 top-0 origin-top-left will-change-transform" style={{ transform: `scale(${scale})` }}>
                            <div className="relative" style={{ width: ALBUM_PAGE_W * 2, height: ALBUM_PAGE_H }}>
                                <div className="transform-gpu absolute left-0 top-0 h-225 w-150 overflow-hidden shadow-[inset_-14px_0_26px_-12px_rgba(24,16,25,0.32)]">
                                    {leftOf(shownLeft)}
                                </div>
                                <div className="transform-gpu absolute left-150 top-0 h-225 w-150 overflow-hidden shadow-[inset_14px_0_26px_-12px_rgba(24,16,25,0.32)]">
                                    {rightOf(shownRight)}
                                </div>
                                {!frontClosed && !backClosed && (
                                    <div className="pointer-events-none absolute -top-1 left-146.75 z-40 h-227 w-6.5 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.34)_34%,rgba(20,12,22,0.5)_50%,rgba(255,255,255,0.34)_66%,transparent)]" />
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
                                            <div
                                                className="pointer-events-none absolute bottom-0 top-0 w-11"
                                                style={{
                                                    [leafSide === 'right' ? 'left' : 'right']: 0,
                                                    background: `linear-gradient(${leafSide === 'right' ? '90deg' : '270deg'}, rgba(24,16,25,0.2), transparent)`,
                                                }}
                                            />
                                        </div>
                                        <div className="album-leaf-face absolute inset-0 overflow-hidden bg-[#d9d9d9] transform-[rotateY(180deg)_translateZ(0)]">
                                            {leafBack}
                                            <div
                                                className="pointer-events-none absolute bottom-0 top-0 w-11"
                                                style={{
                                                    [leafSide === 'right' ? 'right' : 'left']: 0,
                                                    background: `linear-gradient(${leafSide === 'right' ? '270deg' : '90deg'}, rgba(24,16,25,0.2), transparent)`,
                                                }}
                                            />
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
        </div>
    );
}
