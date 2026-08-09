import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AlbumCover from './pages/AlbumCover';
import AlbumStatsPage from './pages/AlbumStatsPage';
import AlbumNextGroupPage from './pages/AlbumNextGroupPage';
import AlbumGroupIntroPage from './pages/AlbumGroupIntroPage';
import AlbumMembersPage from './pages/AlbumMembersPage';
import AlbumBlankPage from './pages/AlbumBlankPage';
import type { AlbumGroup, AlbumStats } from '../../../interfaces/albumInterfaces';
import { ALBUM_CARDS_PER_PAGE, ALBUM_PAGE_H, ALBUM_PAGE_W } from './albumConstants';
import { AlbumCardZoomContext, type AlbumCardZoomApi, type CardZoomTarget } from './albumCardZoom';
import { isSafariAlbumEngine } from '../../../hooks/useIsDevice';
import './AlbumOfCol.css';

const FLIP_DURATION_MS = 800;
const RAF_FLOOR_DELAY_MS = 200;
const FOCUS_MOVE_TIMEOUT_MS = FLIP_DURATION_MS + 50;
const ALBUM_SCALE_PIXEL_GRID = 300;

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
        const pages = buildGroupPages(group, stats, interiorPages.length);
        interiorPages.push(...pages);
    }
    return { interiorPages, groupSpreads };
}

interface FlipState {
    direction: 1 | -1;
    landed: boolean;
}

/** `off` shows the spread; `left`/`right` show one page, painted twice as large. */
export type AlbumFocus = 'off' | 'left' | 'right';

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

/** Absent (or withheld) means stickers are not zoom targets and every click
        on the book turns the page — see the tap-to-zoom switch in the FX panel. */

/** Focus mode shows one page at a time so it can be painted twice as large. */

interface AlbumOfColProps {
    groups: AlbumGroup[];
    controlRef?: React.RefObject<AlbumOfColControls | null>;
    onPosChange?: (position: number, busy: boolean) => void;
    onBookInit?: (book: AlbumBookInit) => void;
    keysDisabled?: boolean;
    onCardZoom?: (target: CardZoomTarget) => void;
    flyingCardId?: number | null;
    focus?: AlbumFocus;
    onFocusChange?: (focus: AlbumFocus) => void;
}

function AlbumOfCol({
    groups,
    controlRef,
    onPosChange,
    onBookInit,
    keysDisabled = false,
    onCardZoom,
    flyingCardId = null,
    focus = 'off',
    onFocusChange,
}: AlbumOfColProps) {
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
    const focusMovingRef = useRef(false);
    const focusMoveTimeoutRef = useRef<number | undefined>(undefined);
    const focusMoveFrameRef = useRef(0);
    const [focusMoving, setFocusMoving] = useState(false);

    const finishFocusMove = useCallback(() => {
        window.clearTimeout(focusMoveTimeoutRef.current);
        cancelAnimationFrame(focusMoveFrameRef.current);
        focusMoveTimeoutRef.current = undefined;
        focusMoveFrameRef.current = 0;
        focusMovingRef.current = false;
        setFocusMoving(false);
    }, []);

    const scheduleFocusMoveFallbacks = useCallback(() => {
        window.clearTimeout(focusMoveTimeoutRef.current);
        cancelAnimationFrame(focusMoveFrameRef.current);
        focusMoveTimeoutRef.current = window.setTimeout(finishFocusMove, FOCUS_MOVE_TIMEOUT_MS);
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            focusMoveFrameRef.current = requestAnimationFrame(finishFocusMove);
        }
    }, [finishFocusMove]);

    const previousFocusRef = useRef(focus);
    useLayoutEffect(() => {
        if (previousFocusRef.current === focus) return;
        previousFocusRef.current = focus;
        if (flip || focusMovingRef.current) return;

        focusMovingRef.current = true;
        setFocusMoving(true);
        scheduleFocusMoveFallbacks();
    }, [focus, flip, scheduleFocusMoveFallbacks]);

    useEffect(() => () => finishFocusMove(), [finishFocusMove]);

    const frontClosed = position === 0;
    const backClosed = position === backCoverPosition;

    const albumStageRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);

    // Safari ignores `touch-action` for page zoom, so the CSS rule on .album-stage
    // does nothing there. `gesturestart`/`gesturechange` are non-standard and
    // Safari-only — hence the gate and the casts; they are not in the DOM lib.
    // Delete this whole effect the day WebKit honours touch-action: nothing else
    // depends on it.

    useEffect(() => {
        const stageElement = albumStageRef.current;
        if (!isSafariAlbumEngine || !stageElement) return;
        const blockGesture = (event: Event) => event.preventDefault();
        stageElement.addEventListener('gesturestart', blockGesture as EventListener);
        stageElement.addEventListener('gesturechange', blockGesture as EventListener);
        return () => {
            stageElement.removeEventListener('gesturestart', blockGesture as EventListener);
            stageElement.removeEventListener('gesturechange', blockGesture as EventListener);
        };
    }, []);

    useLayoutEffect(() => {
        const stageElement = stageRef.current;
        if (!stageElement) return;

        const updateScale = () => {
            const stageRect = stageElement.getBoundingClientRect();

            const viewportWidth = window.innerWidth;
            const maxScale =
                viewportWidth >= 1536 ? 1.35 : viewportWidth >= 1280 ? 1.22 : viewportWidth >= 1024 ? 1.1 : 1;

            const widthDivisor = focus === 'off' ? ALBUM_PAGE_W * 2 : ALBUM_PAGE_W;
            const fittedScale = Math.min(
                maxScale,
                (stageRect.width - 24) / widthDivisor,
                (stageRect.height - 24) / ALBUM_PAGE_H,
            );

            const clampedScale = Math.max(0.2, fittedScale);
            const devicePixelRatio = window.devicePixelRatio || 1;
            const devicePixelGrid = ALBUM_SCALE_PIXEL_GRID * devicePixelRatio;
            setScale(Math.floor(clampedScale * devicePixelGrid) / devicePixelGrid);
        };

        updateScale();
        const resizeObserver = new ResizeObserver(updateScale);
        resizeObserver.observe(stageElement);
        return () => resizeObserver.disconnect();
        // `focus` is a dependency on purpose: without it the fit would only catch up
        // on the next stage resize, which makes entering the mode look broken.
    }, [focus]);

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
            setFlip({ direction, landed: false });
        },
        [flip, position, backCoverPosition],
    );

    // Focus mode moves a viewport across the spread before it turns a leaf.
    // Cover, back cover and blank pages need no special case: one of their sides is
    // null, so they fall through the "otherwise" rows on their own.
    // This is the single entry point for navigation — tap, keyboard and the chrome's
    // controlRef all go through it, so they can never disagree.

    const step = useCallback(
        (direction: 1 | -1) => {
            if (flip || focusMovingRef.current) return;
            if (focus === 'off') {
                go(direction);
                return;
            }

            if (direction > 0 && focus === 'left' && rightPageAt(position) != null) {
                onFocusChange?.('right');
                return;
            }
            if (direction < 0 && focus === 'right' && leftPageAt(position) != null) {
                onFocusChange?.('left');
                return;
            }

            const landing = position + direction;
            if (landing < 0 || landing > backCoverPosition) return;
            go(direction);
            // Set the landing spread's focus now, not when the leaf lands: the camera
            // has to cross the gutter in step with the leaf, not jump after it.
            onFocusChange?.(
                direction > 0
                    ? leftPageAt(landing) != null
                        ? 'left'
                        : 'right'
                    : rightPageAt(landing) != null
                      ? 'right'
                      : 'left',
            );
        },
        [focus, flip, position, backCoverPosition, leftPageAt, rightPageAt, go, onFocusChange],
    );

    /** Rotating right now — `flip` alone stays true through the landing frames. */
    const turning = flip !== null && !flip.landed;
    const navigationBusy = flip !== null || focusMoving;

    const leafRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (!turning) return;
        const leafElement = leafRef.current;
        if (!leafElement) return;
        void leafElement.offsetWidth;
        leafElement.style.transform = `rotateY(${flip.direction > 0 ? -180 : 180}deg)`;
    }, [turning, flip]);

    useEffect(() => {
        if (!turning) return;
        const flipTimeout = setTimeout(() => {
            setPosition((previousPosition) => previousPosition + flip.direction);
            setFlip((previousFlip) => (previousFlip ? { ...previousFlip, landed: true } : null));
        }, FLIP_DURATION_MS);
        return () => clearTimeout(flipTimeout);
    }, [turning, flip]);

    useEffect(() => {
        if (!flip?.landed) return;
        let innerFrame = 0;
        const outerFrame = requestAnimationFrame(() => {
            innerFrame = requestAnimationFrame(() => setFlip(null));
        });

        const floor = setTimeout(() => setFlip(null), FLIP_DURATION_MS + RAF_FLOOR_DELAY_MS);
        return () => {
            cancelAnimationFrame(outerFrame);
            cancelAnimationFrame(innerFrame);
            clearTimeout(floor);
        };
    }, [flip]);

    // The album page (collection_album.tsx) drives the book through
    // controlRef and mirrors its state via the two callbacks.
    const jumpTo = useCallback(
        (targetPosition: number) => {
            if (flip || focusMovingRef.current) return;
            setPosition(Math.min(Math.max(targetPosition, 0), backCoverPosition));
        },
        [flip, backCoverPosition],
    );
    useEffect(() => {
        if (!controlRef) return;
        // `step`, not `go`: the side arrows inherit the focus rule for free.
        controlRef.current = { go: step, jumpTo };
        return () => {
            controlRef.current = null;
        };
    }, [controlRef, step, jumpTo]);

    const bookInit = useMemo<AlbumBookInit>(
        () => ({ spreadCount, groupSpreads, spreads, frontCover, backCover }),
        [spreadCount, groupSpreads, spreads, frontCover, backCover],
    );
    useEffect(() => {
        onBookInit?.(bookInit);
    }, [onBookInit, bookInit]);

    const shownPosition = turning ? position + flip.direction : position;
    useEffect(() => {
        onPosChange?.(shownPosition, navigationBusy);
    }, [onPosChange, shownPosition, navigationBusy]);

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
            if (event.key === 'ArrowRight') step(1);
            if (event.key === 'ArrowLeft') step(-1);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [step, keysDisabled]);

    const leftPagePosition = turning ? (flip.direction > 0 ? position : position - 1) : position;
    const rightPagePosition = turning ? (flip.direction > 0 ? position + 1 : position) : position;
    const leftPage = leftPageAt(leftPagePosition);
    const rightPage = rightPageAt(rightPagePosition);

    // Which half the leaf hinges on is fixed for the whole turn, landing frames
    // included — it must not move out from under its own pixels.
    const flippingForward = flip !== null && flip.direction > 0;
    const leafSide: 'left' | 'right' = flippingForward ? 'right' : 'left';

    // Only while the rotation is live: once the spread has advanced, `position`
    // no longer describes the pages the leaf is carrying.
    const lastLeafContent = useRef<{ front: ReactNode; back: ReactNode }>({ front: null, back: null });
    if (turning) {
        lastLeafContent.current = {
            front: flippingForward ? rightPageAt(position) : leftPageAt(position),
            back: flippingForward ? leftPageAt(position + 1) : rightPageAt(position - 1),
        };
    }

    const leafFront = lastLeafContent.current.front;
    const leafBack = lastLeafContent.current.back;
    const bookShiftPx = Math.round(
        focus === 'left'
            ? (ALBUM_PAGE_W * scale) / 2
            : focus === 'right'
              ? (-ALBUM_PAGE_W * scale) / 2
              : frontClosed && !turning
                ? (-ALBUM_PAGE_W * scale) / 2
                : backClosed && !turning
                  ? (ALBUM_PAGE_W * scale) / 2
                  : 0,
    );

    const canTurn = useCallback(
        (direction: 1 | -1) => !navigationBusy && (direction > 0 ? position < backCoverPosition : position > 0),
        [navigationBusy, position, backCoverPosition],
    );

    const cardZoom = useMemo<AlbumCardZoomApi | null>(
        () => (navigationBusy || !onCardZoom ? null : { open: onCardZoom, flyingCardId }),
        [navigationBusy, onCardZoom, flyingCardId],
    );

    const onBookClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            const box = (focus === 'off' ? event.currentTarget : stageRef.current)?.getBoundingClientRect();
            if (!box) return;
            step(event.clientX < box.left + box.width / 2 ? -1 : 1);
        },
        [focus, step],
    );

    // The two buttons used to carry a per-half cursor; keep that affordance without
    // paying a React render per mouse move — write the property only when it flips.

    const onBookMouseMove = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            const box = event.currentTarget.getBoundingClientRect();
            const wanted = canTurn(event.clientX < box.left + box.width / 2 ? -1 : 1) ? 'pointer' : 'default';
            if (event.currentTarget.style.cursor !== wanted) event.currentTarget.style.cursor = wanted;
        },
        [canTurn],
    );

    const onBookTransitionEnd = useCallback((event: React.TransitionEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget && event.propertyName === 'transform') {
            finishFocusMove();
        }
    }, [finishFocusMove]);

    return (
        <AlbumCardZoomContext.Provider value={cardZoom}>
        <div
            ref={albumStageRef}
            data-browser={isSafariAlbumEngine ? 'safari' : undefined}
            className="album-stage flex h-full min-h-0 w-full flex-col items-center px-3 pt-3 pb-3 lg:pb-28"
        >
            <div ref={stageRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
                <div className="album-perspective album-zoom-in transform-gpu">
                    <div
                        className="album-book relative"
                        onTransitionEnd={onBookTransitionEnd}
                        style={{
                            width: ALBUM_PAGE_W * 2 * scale,
                            height: ALBUM_PAGE_H * scale,
                            transform: `translateX(${bookShiftPx}px)`,
                        }}
                    >
                        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})` }}>
                            <div
                                className="relative"
                                style={{ width: ALBUM_PAGE_W * 2, height: ALBUM_PAGE_H }}
                                onClick={onBookClick}
                                onMouseMove={onBookMouseMove}
                                onMouseDown={(event) => event.preventDefault()}
                            >
                                {leftPage != null && (
                                    <div className="absolute left-0 top-0 h-225 w-150 overflow-hidden">
                                        {leftPage}
                                    </div>
                                )}
                                {rightPage != null && (
                                    <div className="absolute left-150 top-0 h-225 w-150 overflow-hidden">
                                        {rightPage}
                                    </div>
                                )}

                                <div
                                    className="album-spine-shade pointer-events-none absolute top-0 left-148.25 z-70 h-225 w-3.5
                                    bg-[linear-gradient(90deg,transparent,rgba(20,12,22,0.45)_50%,transparent)] transform-gpu"
                                    style={{ opacity: leftPage != null && rightPage != null ? 1 : 0 }}
                                />
                                {flip && (
                                    <div
                                        ref={leafRef}
                                        className="album-leaf absolute top-0 z-60 h-225 w-150"
                                        style={{
                                            left: leafSide === 'right' ? ALBUM_PAGE_W : 0,
                                            transformOrigin: leafSide === 'right' ? 'left center' : 'right center',
                                            transform: 'rotateY(0deg)',
                                            visibility: flip ? 'visible' : 'hidden',
                                            pointerEvents: flip ? 'auto' : 'none',
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

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </AlbumCardZoomContext.Provider>
    );
}

export default memo(AlbumOfCol);
