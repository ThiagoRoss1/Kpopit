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

const FLIP_DURATION_MS = 800;

function buildAlbumStats(groups: AlbumGroup[]): AlbumStats {
    const totalStickers = groups.reduce((sum, group) => sum + group.members.length, 0);
    const ownedStickers = groups.reduce(
        (sum, group) => sum + group.members.filter((member) => member.owned).length,
        0,
    );
    const completeGroups = groups.filter((group) => group.members.every((member) => member.owned)).length;
    return { owned: ownedStickers, total: totalStickers, groups_complete: completeGroups, groups_total: groups.length };
}

/** First spread each group's block starts on — feeds the chrome's index/carousel */
export interface AlbumGroupSpread {
    group_id: number;
    pos: number;
}

function buildGroupPages(group: AlbumGroup, stats: AlbumStats, firstPageIndex: number): ReactNode[] {
    const memberPageCount = Math.ceil(group.members.length / ALBUM_CARDS_PER_PAGE);

    const memberPages = Array.from({ length: memberPageCount }, (_, memberPageIndex) => {
        const startSlot = memberPageIndex * ALBUM_CARDS_PER_PAGE;
        const pageSlots = Array.from(
            { length: ALBUM_CARDS_PER_PAGE },
            (_, slotIndex) => group.members[startSlot + slotIndex] ?? null,
        );
        const pageIndexInBook = firstPageIndex + 3 + memberPageIndex;
        return (
            <AlbumMembersPage
                key={`members-${group.group_id}-${memberPageIndex}`}
                group={group}
                slots={pageSlots}
                startSlot={startSlot}
                pageLabel={`${memberPageIndex + 1}/${memberPageCount}`}
                side={pageIndexInBook % 2 === 0 ? 'left' : 'right'}
            />
        );
    });

    const pages: ReactNode[] = [
        <AlbumStatsPage key={`stats-${group.group_id}`} stats={stats} />,
        <AlbumNextGroupPage key={`next-${group.group_id}`} group={group} />,
        <AlbumGroupIntroPage key={`intro-${group.group_id}`} group={group} side="left" />,
        ...memberPages,
    ];

    const endsOnLeftPage = (firstPageIndex + pages.length) % 2 !== 0;
    if (endsOnLeftPage) {
        pages.push(
            <AlbumBlankPage
                key={`blank-${group.group_id}`}
                group={group}
                pageLabel={`${memberPageCount}/${memberPageCount}`}
            />,
        );
    }
    return pages;
}

function buildInteriorPages(groups: AlbumGroup[], stats: AlbumStats) {
    const interiorPages: ReactNode[] = [];
    const groupSpreads: AlbumGroupSpread[] = [];
    for (const group of groups) {
        groupSpreads.push({ group_id: group.group_id, pos: interiorPages.length / 2 + 1 });
        interiorPages.push(...buildGroupPages(group, stats, interiorPages.length));
    }
    return { interiorPages, groupSpreads };
}

interface FlipState {
    direction: 1 | -1;
}

/** Imperative controls handed to the album-page chrome via `controlRef` */
export interface AlbumOfColControls {
    go: (direction: 1 | -1) => void;
    jumpTo: (position: number) => void;
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
    controlRef?: React.RefObject<AlbumOfColControls | null>;
    onPosChange?: (position: number, flipping: boolean) => void;
    onBookInit?: (book: AlbumBookInit) => void;
    keysDisabled?: boolean;
}

export default function AlbumOfCol({ groups, controlRef, onPosChange, onBookInit, keysDisabled = false }: AlbumOfColProps) {
    const stats = useMemo(() => buildAlbumStats(groups), [groups]);
    const { interiorPages, groupSpreads } = useMemo(() => buildInteriorPages(groups, stats), [groups, stats]);

    // Pair the flat page list into spreads: [left page, right page]
    const spreads = useMemo(() => {
        const pairs: Array<[ReactNode, ReactNode | null]> = [];
        for (let pageIndex = 0; pageIndex < interiorPages.length; pageIndex += 2) {
            pairs.push([interiorPages[pageIndex], interiorPages[pageIndex + 1] ?? null]);
        }
        return pairs;
    }, [interiorPages]);

    const spreadCount = spreads.length;
    const backCoverPosition = spreadCount + 1;

    // Dev-only deep link: ?spread=N opens the book on that spread, so a page under
    // work can be reloaded straight into view. Production always opens closed.
    const [position, setPosition] = useState(() => {
        if (!import.meta.env.DEV) return 0;
        const spreadParam = new URLSearchParams(window.location.search).get('spread');
        const requested = spreadParam === null ? NaN : Number(spreadParam);
        if (!Number.isInteger(requested)) return 0;
        return Math.min(Math.max(requested, 0), backCoverPosition);
    });
    const [flip, setFlip] = useState<FlipState | null>(null);

    const frontClosed = position === 0;
    const backClosed = position === backCoverPosition;

    const stageRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);
    useLayoutEffect(() => {
        const stageElement = stageRef.current;
        if (!stageElement) return;

        const updateScale = () => {
            const stageRect = stageElement.getBoundingClientRect();
            // Let the book grow past its native size on large screens so it fills
            // more of the stage instead of floating small between the arrows. The
            // width/height fit terms below still cap it, so it can never overflow
            // the stage — smaller/shorter screens stay purely fit-bound.
            const viewportWidth = window.innerWidth;
            const maxScale =
                viewportWidth >= 1536 ? 1.35 : viewportWidth >= 1280 ? 1.22 : viewportWidth >= 1024 ? 1.1 : 1;
            const fittedScale = Math.min(
                maxScale,
                (stageRect.width - 24) / (ALBUM_PAGE_W * 2),
                (stageRect.height - 24) / ALBUM_PAGE_H,
            );
            // Snap so each page maps to a whole pixel count — a fractional page
            // width rasterizes the spine seam differently per scroll frame
            // (white line / shadow flicker between the two pages).
            const clampedScale = Math.max(0.2, fittedScale);
            setScale(Math.floor(clampedScale * ALBUM_PAGE_W) / ALBUM_PAGE_W);
        };

        updateScale();
        const resizeObserver = new ResizeObserver(updateScale);
        resizeObserver.observe(stageElement);
        return () => resizeObserver.disconnect();
    }, []);

    const frontCover = useMemo(() => <AlbumCover variant="front" stats={stats} />, [stats]);
    const backCover = useMemo(() => <AlbumCover variant="back" />, []);

    const leftPageAt = useCallback(
        (bookPosition: number): ReactNode => {
            if (bookPosition === backCoverPosition) return backCover;
            if (bookPosition >= 1 && bookPosition <= spreadCount) return spreads[bookPosition - 1][0];
            return null;
        },
        [spreads, spreadCount, backCoverPosition, backCover],
    );
    const rightPageAt = useCallback(
        (bookPosition: number): ReactNode => {
            if (bookPosition === 0) return frontCover;
            if (bookPosition >= 1 && bookPosition <= spreadCount) return spreads[bookPosition - 1][1];
            return null;
        },
        [spreads, spreadCount, frontCover],
    );

    // Starts a page turn — just mounts the leaf; the layout effect below kicks
    // off the rotation on the very next paint.
    const go = useCallback(
        (direction: 1 | -1) => {
            if (flip) return;
            const canGoForward = direction > 0 && position < backCoverPosition;
            const canGoBackward = direction < 0 && position > 0;
            if (!canGoForward && !canGoBackward) return;
            setFlip({ direction });
        },
        [flip, position, backCoverPosition],
    );

    const leafRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (!flip) return;
        const leafElement = leafRef.current;
        if (!leafElement) return;
        void leafElement.offsetWidth;
        leafElement.style.transform = `rotateY(${flip.direction > 0 ? -180 : 180}deg)`;
    }, [flip]);

    // The leaf lands: advance the position and unmount the leaf together.
    useEffect(() => {
        if (!flip) return;
        const flipTimeout = setTimeout(() => {
            setPosition((previousPosition) => previousPosition + flip.direction);
            setFlip(null);
        }, FLIP_DURATION_MS);
        return () => clearTimeout(flipTimeout);
    }, [flip]);

    // The album page (collection_album.tsx) drives the book through
    // controlRef and mirrors its state via the two callbacks.
    const jumpTo = useCallback(
        (targetPosition: number) => {
            setFlip(null);
            setPosition(Math.min(Math.max(targetPosition, 0), backCoverPosition));
        },
        [backCoverPosition],
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

    const shownPosition = flip ? position + flip.direction : position;
    useEffect(() => {
        onPosChange?.(shownPosition, !!flip);
    }, [onPosChange, shownPosition, flip]);

    useEffect(() => {
        if (keysDisabled) return;
        const onKeyDown = (event: KeyboardEvent) => {
            // Don't hijack arrow keys while the user is editing text (e.g. the
            // group search field) — they need them to move the caret.
            const active = document.activeElement;
            const isEditingText =
                active instanceof HTMLElement &&
                (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
            if (isEditingText) return;
            if (event.key === 'ArrowRight') go(1);
            if (event.key === 'ArrowLeft') go(-1);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [go, keysDisabled]);

    const leftPagePosition = flip ? (flip.direction > 0 ? position : position - 1) : position;
    const rightPagePosition = flip ? (flip.direction > 0 ? position + 1 : position) : position;
    const leftPage = leftPageAt(leftPagePosition);
    const rightPage = rightPageAt(rightPagePosition);

    const flippingForward = flip !== null && flip.direction > 0;
    const leafSide: 'left' | 'right' = flippingForward ? 'right' : 'left';
    const leafFront = flip ? (flippingForward ? rightPageAt(position) : leftPageAt(position)) : null;
    const leafBack = flip ? (flippingForward ? leftPageAt(position + 1) : rightPageAt(position - 1)) : null;

    // Closed covers sit centered: shift the (empty-page-less) book by half a page
    const bookShiftPx = Math.round(
        frontClosed && !flip ? (-ALBUM_PAGE_W * scale) / 2 : backClosed && !flip ? (ALBUM_PAGE_W * scale) / 2 : 0,
    );

    return (
        <div
            className="album-level-clock flex h-full min-h-0 w-full flex-col items-center px-3 pb-28 pt-3"
        >
            <div ref={stageRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
                <div className="album-perspective album-zoom-in transform-gpu">
                    <div
                        className="album-book relative"
                        style={{
                            width: ALBUM_PAGE_W * 2 * scale,
                            height: ALBUM_PAGE_H * scale,
                            transform: `translateX(${bookShiftPx}px)`,
                        }}
                    >
                        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})` }}>
                            <div className="relative" style={{ width: ALBUM_PAGE_W * 2, height: ALBUM_PAGE_H }}>
                                {leftPage != null && (
                                    <div className="absolute left-0 top-0 h-225 w-150 overflow-hidden shadow-[inset_-14px_0_26px_-12px_rgba(24,16,25,0.32)]">
                                        {leftPage}
                                    </div>
                                )}
                                {rightPage != null && (
                                    <div className="absolute left-150 top-0 h-225 w-150 overflow-hidden shadow-[inset_14px_0_26px_-12px_rgba(24,16,25,0.32)]">
                                        {rightPage}
                                    </div>
                                )}
                                {/* Spine shading over the page seam */}
                                {!frontClosed && !backClosed && (
                                    <div className="pointer-events-none absolute top-0 left-148.25 z-40 h-225 w-3.5
                                    bg-[linear-gradient(90deg,transparent,rgba(20,12,22,0.45)_50%,transparent)]" />
                                )}
                                {flip && (
                                    <div
                                        ref={leafRef}
                                        className="album-leaf absolute top-0 z-60 h-225 w-150"
                                        style={{
                                            left: leafSide === 'right' ? ALBUM_PAGE_W : 0,
                                            transformOrigin: leafSide === 'right' ? 'left center' : 'right center',
                                            transform: 'rotateY(0deg)',
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
                                    tabIndex={-1}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => go(-1)}
                                    className={`absolute left-0 top-0 z-80 h-225 w-150 focus:outline-none ${position > 0 && !flip ? 'cursor-pointer' : 'cursor-default'}`}
                                />
                                <button
                                    type="button"
                                    aria-label="Next page"
                                    tabIndex={-1}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => go(1)}
                                    className={`absolute left-150 top-0 z-80 h-225 w-150 focus:outline-none ${position < backCoverPosition && !flip ? 'cursor-pointer' : 'cursor-default'}`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
