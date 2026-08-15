import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ChevronLeft, ChevronRight, Fullscreen, BookOpen, GalleryVerticalEnd, Info, Menu, Moon, SlidersHorizontal, Sun } from 'lucide-react';
import AlbumOfCol, { type AlbumBookInit, type AlbumGroupSpread, type AlbumOfColControls } from '../../components/Albums/AlbumOfCol/AlbumOfCol';
import { ALBUM_CARDS_PER_PAGE } from '../../components/Albums/AlbumOfCol/albumConstants';
import type { AlbumFocus } from '../../components/Albums/AlbumOfCol/AlbumOfCol';
import type { CardZoomTarget } from '../../components/Albums/AlbumOfCol/albumCardZoom';
import CardZoomModal from './components/CardZoomModal';
import CollectionStatus from './components/CollectionStatus';
import AlbumPageIndex from './components/AlbumPageIndex';
import AlbumPageCarousel, { type AlbumOpening } from './components/AlbumPageCarousel';
import AlbumInfoModal from './components/AlbumInfoModal';
import FxPanel from './components/FxPanel';
import OnboardingTour from './components/OnboardingTour';
import CollectionsBackdrop from './components/CollectionsBackdrop';
import { hasSeenCollectionGuide } from './onboarding';
import { getAlbumMapping } from './albumMapper';
import { getCollectionFxAttrs } from './collectionFxAttrs';
import { useCollectionFx } from './useCollectionFx';
import { useCollectionNight } from './useCollectionNight';
import { useDisclosure } from '../../hooks/useDisclosure';
import { getCollectionAlbum, getCollectionsList } from '../../services/api';
import { useIsLg, isSafari } from '../../hooks/useIsDevice';
import type { AlbumGroup } from '../../interfaces/albumInterfaces';
import {
    COLLECTION_CARD_ZOOM_EXIT_MS,
    COLLECTION_EXIT_ANIMATIONS,
    COLLECTION_STANDARD_EXIT_MS,
    COLLECTION_SUMMARY_RAIL_EXIT_MS,
} from './collectionMotion';
import './collections.css';

function SideArrow({ direction, disabled, onClick, night }: { direction: -1 | 1; disabled: boolean; onClick: () => void; night: boolean }) {
    const Icon = direction < 0 ? ChevronLeft : ChevronRight;

    const enabledStyle = night
        ? 'border-neon-pink bg-[#16181e] text-neon-pink shadow-[1px_2px_0px_rgba(255,51,153,1)]'
        : 'border-neon-pink bg-[#fffaf3] text-neon-pink shadow-[1px_2px_0_rgba(255,51,153,1)]';
        
    const disabledStyle = night ? 'border-white/12 text-white/40' : 'border-[#3c2f38]/20 text-[#a596a0]';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={direction < 0 ? 'Previous page' : 'Next page'}
            className={`absolute top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border-2 transition-all duration-300
            transform-gpu md:size-12 xl:size-14 hover:scale-105 active:shadow-[0px_0px_0px_rgba(255,51,153,1)] active:scale-100 ${
            direction < 0 ? 'left-[clamp(12px,2.5vw,26px)]' : 'right-[clamp(12px,2.5vw,26px)]'
            } ${disabled ? `cursor-default bg-transparent opacity-45 ${disabledStyle}` : `cursor-pointer ${enabledStyle}`}`}
        >
            <Icon className="w-5 h-5 md:w-6 md:h-6 xl:w-8 xl:h-8" strokeWidth={3} />
        </button>
    );
}

const PILL_STRUCTURE = 'collections-press border-2 transition-all duration-150 transform-gpu hover:brightness-110 active:translate-y-0.5';

const PILL_TONE = {
    night: 'border-neon-pink/60 bg-[#1c1f27] text-white shadow-[0_3px_0_rgba(255,51,153,0.6)] active:shadow-[0_1px_0_rgba(255,51,153,0.6)]',
    day: 'border-ink bg-white text-ink shadow-[0_3px_0_var(--color-ink)] active:shadow-[0_1px_0_var(--color-ink)]',
    nightActive: 'border-neon-pink bg-ink text-white shadow-[0_3px_0_rgba(255,51,153,0.6)] active:shadow-[0_1px_0_rgba(255,51,153,0.6)]',
    dayActive: 'border-ink bg-neon-pink text-ink shadow-[0_3px_0_var(--color-ink)] active:shadow-[0_1px_0_var(--color-ink)]',
} as const;

const BtnClasses = (night: boolean) => `${PILL_STRUCTURE} ${night ? PILL_TONE.night : PILL_TONE.day}`;

const TogglePillClasses = (night: boolean, active: boolean) => {
    if (active) return `${PILL_STRUCTURE} ${night ? PILL_TONE.nightActive : PILL_TONE.dayActive}`;
    return `${PILL_STRUCTURE} ${night ? PILL_TONE.night : PILL_TONE.day}`;
};

function IconBtn({ children, id, onClick, title, night, className = '', dataTour }: { children: React.ReactNode; onClick: () => void; id?: string; title: string; night: boolean; className?: string; dataTour?: string }) {
    return (
        <button
            id={id}
            type="button"
            onClick={onClick}
            title={title}
            data-tour={dataTour}
            className={`flex size-10 flex-none cursor-pointer items-center justify-center rounded-full ${BtnClasses(night)} ${className}`}
        >
            {children}
        </button>
    );
}

function groupIdAt(pos: number, spreadCount: number, groupSpreads: AlbumGroupSpread[]): number | null {
    if (pos <= 0 || pos > spreadCount) return null;
    let current: number | null = null;
    for (const spread of groupSpreads) {
        if (spread.pos <= pos) current = spread.group_id;
    }
    return current;
}

export default function CollectionAlbum() {
    const { collectionId } = useParams();

    const isLg = useIsLg();

    const parsedId = Number(collectionId);
    const validId = Number.isInteger(parsedId) && parsedId > 0;

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['collectionAlbum', parsedId],
        queryFn: () => getCollectionAlbum(parsedId),
        enabled: validId,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });
    
    const { data: collections } = useQuery({
        queryKey: ['collectionsList'],
        queryFn: getCollectionsList,
        enabled: validId,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });

    const groups = useMemo(() => (data ? getAlbumMapping(data) : null), [data]);
    const currentCollection = collections?.find((collection) => collection.collection_id === parsedId);
    const collectionName = currentCollection?.name ?? `Album ${validId ? parsedId : ''}`.trim();

    const { settings } = useCollectionFx();

    const fxAttrs = getCollectionFxAttrs(settings);

    const [night, setNight] = useCollectionNight();
    const rail = useDisclosure({ initialOpen: true, exitDurationMs: COLLECTION_SUMMARY_RAIL_EXIT_MS, exitAnimationNames: COLLECTION_EXIT_ANIMATIONS.rail });
    const carousel = useDisclosure({ initialOpen: true, exitDurationMs: COLLECTION_STANDARD_EXIT_MS, exitAnimationNames: COLLECTION_EXIT_ANIMATIONS.chrome });
    const index = useDisclosure({ exitDurationMs: COLLECTION_STANDARD_EXIT_MS, exitAnimationNames: COLLECTION_EXIT_ANIMATIONS.modal });
    const { close: closeIndex } = index;
    const info = useDisclosure({ exitDurationMs: COLLECTION_STANDARD_EXIT_MS, exitAnimationNames: COLLECTION_EXIT_ANIMATIONS.modal });
    const fxPanel = useDisclosure({ exitDurationMs: COLLECTION_STANDARD_EXIT_MS, exitAnimationNames: COLLECTION_EXIT_ANIMATIONS.sheet });
    const pagesAttr = { 'data-pages': carousel.mounted ? 'on' : 'off' } as const;
    const [query, setQuery] = useState('');
    const [book, setBook] = useState<AlbumBookInit | null>(null);
    const [shown, setShown] = useState({ pos: 0, busy: false });
    const controls = useRef<AlbumOfColControls | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    // Safari ignores `touch-action` for pinch-zoom, so the .collections-root CSS rule
    // does nothing there (same story as AlbumOfCol's stage). Block its non-standard
    // gesture events across the whole album page; Chromium/Firefox are covered by CSS.

    useEffect(() => {
        const root = rootRef.current;
        if (!isSafari || !root) return;
        const blockGesture = (event: Event) => event.preventDefault();
        root.addEventListener('gesturestart', blockGesture as EventListener);
        root.addEventListener('gesturechange', blockGesture as EventListener);
        return () => {
            root.removeEventListener('gesturestart', blockGesture as EventListener);
            root.removeEventListener('gesturechange', blockGesture as EventListener);
        };
    }, []);

    const onBookInit = useCallback((next: AlbumBookInit) => setBook(next), []);
    const onPosChange = useCallback((pos: number, busy: boolean) => setShown({ pos, busy }), []);

    const [zoomTarget, setZoomTarget] = useState<CardZoomTarget | null>(null);
    const zoom = useDisclosure({ exitDurationMs: COLLECTION_CARD_ZOOM_EXIT_MS, exitAnimationNames: COLLECTION_EXIT_ANIMATIONS.cardZoom });
    const { open: openZoom, close: closeZoom, mounted: zoomMounted } = zoom;
    const zoomHistoryEntry = useRef(false);

    useEffect(() => {
        if (!zoomMounted) setZoomTarget(null);
    }, [zoomMounted]);

    const openCardZoom = useCallback(
        (target: CardZoomTarget) => {
            setZoomTarget(target);
            openZoom();
            if (zoomHistoryEntry.current) return;
            zoomHistoryEntry.current = true;
            history.pushState({ kpopitCardZoom: true }, '');
        },
        [openZoom],
    );

    const flyingCardId =
        zoomMounted && zoomTarget
            ? zoomTarget.kind === 'member'
                ? zoomTarget.member.card_id
                : (zoomTarget.group.group_photo?.card_id ?? null)
            : null;

    const closeCardZoom = useCallback(() => {
        closeZoom();
        if (!zoomHistoryEntry.current) return;
        zoomHistoryEntry.current = false;
        history.back();
    }, [closeZoom]);

    useEffect(() => {
        if (!zoomMounted) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeCardZoom();
        };
        const onPopState = () => {
            zoomHistoryEntry.current = false;
            closeZoom();
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('popstate', onPopState);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('popstate', onPopState);
        };
    }, [zoomMounted, closeCardZoom, closeZoom]);

    const spreadCount = book?.spreadCount ?? 0;
    const maxPos = spreadCount + 1;

    const frontClosed = shown.pos === 0;
    const backClosed = shown.pos >= maxPos;

    // Focus mode does not persist between visits: it changes what every tap on the
    // screen means, and restoring it silently on a fresh load reads as a broken app.
    const [focus, setFocus] = useState<AlbumFocus>('off');
    const focusActive = focus !== 'off';
    const focusAttr = { 'data-focus': focusActive ? 'on' : 'off' } as const;
    const focusHistoryEntry = useRef(false);

    const toggleFocus = useCallback(() => {
        if (focusActive) {
            setFocus('off');
            if (!focusHistoryEntry.current) return;
            focusHistoryEntry.current = false;
            history.back();
            return;
        }
        // Only the right page exists on the cover, only the left on the back cover.
        setFocus(frontClosed ? 'right' : 'left');
        focusHistoryEntry.current = true;
        history.pushState({ kpopitFocus: true }, '');
    }, [focusActive, frontClosed]);

    useEffect(() => {
        if (!focusActive) return;
        const onPopState = () => {
            if (zoomMounted) return;
            focusHistoryEntry.current = false;
            setFocus('off');
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [focusActive, zoomMounted]);
    
    // First-run onboarding tour: auto-start once the album has loaded, unless the
    // user has already seen it. `markCollectionGuideSeen` is written by the tour on
    // finish/skip; replay from the info modal just re-arms the state.

    const [tourActive, setTourActive] = useState(false);
    useEffect(() => {
        if (groups && !hasSeenCollectionGuide()) setTourActive(true);
    }, [groups]);

    const firstStickerSpread = useMemo(() => {
        if (!book || !groups) return null;
        for (const spread of book.groupSpreads) {
            const group = groups.find((candidate) => candidate.group_id === spread.group_id);
            const memberIndex = group?.members.findIndex((member) => member.owned) ?? -1;
            if (memberIndex >= 0) return spread.pos + 1 + Math.floor(memberIndex / ALBUM_CARDS_PER_PAGE);
        }
        return null;
    }, [book, groups]);

    const showFirstSticker = useCallback(() => {
        if (firstStickerSpread != null) controls.current?.jumpTo(firstStickerSpread);
    }, [firstStickerSpread]);

    const currentGroupId = book ? groupIdAt(shown.pos, spreadCount, book.groupSpreads) : null;
    const currentGroup: AlbumGroup | null = groups?.find((group) => group.group_id === currentGroupId) ?? null;

    const accent = night ? '#FF3399' : '#C62368';

    const openings = useMemo<AlbumOpening[]>(() => {
        if (!book || !groups) return [];
        const groupsById = new Map(groups.map((group) => [group.group_id, group]));

        const spreadOpenings = book.spreads.map(([, rightPage], spreadIndex) => {
            const position = spreadIndex + 1;
            const groupId = groupIdAt(position, book.spreadCount, book.groupSpreads);
            const group = groupId !== null ? groupsById.get(groupId) : undefined;

            return {
                pos: position,
                accent: group?.palette.main ?? accent,
                pageCount: rightPage != null ? 2 : 1,
                nodes: book.spreads[spreadIndex],
            };
        });

        return [
            { pos: 0, accent, pageCount: 1, nodes: [book.frontCover, null] },
            ...spreadOpenings,
            { pos: book.spreadCount + 1, accent, pageCount: 1, nodes: [book.backCover, null] },
        ];
    }, [book, groups, accent]);

    // Stable identities: the carousel's thumbnails are memoised, and an inline
    // arrow here would hand them a new function on every render and defeat it.
    const jumpToPos = useCallback((position: number) => controls.current?.jumpTo(position), []);
    const stepBy = useCallback((direction: 1 | -1) => controls.current?.go(direction), []);

    const jumpToGroup = useCallback(
        (groupId: number) => {
            const groupSpread = book?.groupSpreads.find((spread) => spread.group_id === groupId);

            if (groupSpread) controls.current?.jumpTo(groupSpread.pos);
            closeIndex();
        },
        [book, closeIndex],
    );

    if (!validId || (isError && isAxiosError(error) && error.response?.status === 404)) {
        return <CollectionStatus message="Album not found." />;
    }
    if (isLoading) return <CollectionStatus message="Opening the album…" />;
    if (isError || !groups) return <CollectionStatus message="Couldn't load the album. Please try again later." />;

    // Below lg: the summary is a modal instead of a rail, so the button opens that.
    const toggleSummary = () => (isLg ? rail.toggle() : index.open());
    const summaryActive = isLg ? rail.active : index.active;
    const carouselActive = carousel.active;
    const pillClasses = BtnClasses(night);

    return (
        <>
            <Helmet>
                <title>{`KpopIt - ${collectionName} Album`}</title>
                <meta name="description" content={`Explore ${collectionName} Album and collect all the stickers!`} />
                <link rel="canonical" href={`https://kpopit.net/collections/${collectionId}/${collectionName.replace(/\s+/g, '-').toLowerCase()}`} />
                <meta property="og:title" content={`KpopIt ${collectionName} Album - Explore, collect and complete the album.`} />
                <meta property="og:description" content={`Explore ${collectionName} Album and collect all the stickers!`} />
            </Helmet>

            <div className="collections min-h-full w-full">
                <div className="collections__bg" aria-hidden="true" />

                <div
                    ref={rootRef}
                    className={`collections-root -mx-2 sm:-mx-4 flex flex-col lg:h-[calc(100svh-60px)]
                lg:overflow-hidden transition-colors duration-300 ${night ? 'text-white' : 'text-[#3c2f38]'}`}
                    {...fxAttrs}
                    {...pagesAttr}
                    {...focusAttr}
                >
                    <CollectionsBackdrop night={night} />

                    {/* Top bar */}
                    
                    <header className="relative z-30 flex flex-none items-center justify-between gap-3 px-2 xxs:px-4.5 lg:px-8 py-3">
                        <div className="flex items-center gap-2">
                            <Link
                                to="/collections"
                                className={`inline-flex flex-row w-10 h-10 justify-center items-center gap-1 rounded-full px-1 py-1 font-sans
                                    text-[14px] font-bold ${pillClasses}`}
                            >
                                <ChevronLeft className="w-6 h-6" strokeWidth={3} />
                            </Link>

                            <button
                                type="button"
                                onClick={toggleSummary}
                                data-tour="summary"
                                title={summaryActive ? 'Hide summary' : 'Show summary'}
                                aria-expanded={summaryActive}
                                className={`inline-flex flex-row justify-center items-center max-lg:w-10 h-10 cursor-pointer gap-1.5 rounded-full
                                border-2 lg:px-3.25 lg:py-2 font-sans text-[14px] font-bold ${TogglePillClasses(night, summaryActive)}`}
                            >
                                <Menu className="max-lg:w-4.5 max-lg:h-4.5 lg:w-4 lg:h-4" strokeWidth={3} /> 
                                <span className="max-lg:hidden">Summary</span>
                            </button>

                            <button
                                type="button"
                                onClick={carousel.toggle}
                                data-tour="pages"
                                title={carouselActive ? 'Hide pages' : 'Show pages'}
                                aria-expanded={carouselActive}
                                className={`inline-flex flex-row justify-center items-center max-lg:w-10 h-10 cursor-pointer gap-1.5 rounded-full
                                border-2 lg:px-3.25 lg:py-2 font-sans text-[14px] font-bold ${TogglePillClasses(night, carouselActive)}`}
                            >
                                <GalleryVerticalEnd className="max-lg:w-4.5 max-lg:h-4.5 lg:w-4 lg:h-4" strokeWidth={3} />
                                <span className="max-lg:hidden">Pages</span>
                            </button>
                            
                            <button
                                type="button"
                                onClick={toggleFocus}
                                disabled={shown.busy}
                                data-tour="focus"
                                title={focusActive ? 'Show both pages' : 'Focus one page'}
                                aria-pressed={focusActive}
                                className={`inline-flex flex-row justify-center items-center w-10 h-10 cursor-pointer gap-1.5 rounded-full
                                border-2 font-sans text-[14px] font-bold lg:hidden ${shown.busy ? 'cursor-default opacity-45' : 'cursor-pointer'} ${pillClasses} ${
                                    focusActive
                                        ? night
                                            ? 'border-neon-pink bg-ink'
                                            : 'border-ink bg-neon-pink'
                                        : night
                                            ? 'lg:text-white'
                                            : 'lg:text-ink'
                                }`}
                            >
                                {focusActive
                                    ? <BookOpen className="w-4.5 h-4.5" strokeWidth={3} />
                                    : <Fullscreen className="w-4.5 h-4.5" strokeWidth={3} />
                                }
                            </button>
                        </div>
                        
                        {/* Effects / Info / Night */}
                        <div className="relative flex items-center gap-2">
                            <IconBtn
                                id="fx-panel-toggle"
                                onClick={fxPanel.toggle}
                                title="Settings"
                                night={night}
                            >
                                <SlidersHorizontal className="w-4.5 h-4.5" strokeWidth={3} />
                            </IconBtn>

                            {fxPanel.mounted && (
                                <FxPanel
                                    night={night}
                                    onClose={fxPanel.close}
                                    albumName={collectionName}
                                    closing={fxPanel.closing}
                                    {...fxPanel.animationProps}
                                />
                            )}

                            <IconBtn onClick={info.open} title="Info" night={night} dataTour="info">
                                <Info className="w-4.5 h-4.5" strokeWidth={3} />
                            </IconBtn>

                            <IconBtn
                                onClick={() => setNight((previousNight) => !previousNight)}
                                title="Light/night mode"
                                night={night}
                                dataTour="night"
                                className="collections-toggle-sweep relative overflow-hidden"
                            >
                                {night ? <Moon className="w-4.5 h-4.5" strokeWidth={2.25} /> : <Sun className="w-4.5 h-4.5" strokeWidth={2.25} />}
                            </IconBtn>
                        </div>
                        
                    </header>

                    {/* Body */}
                    <div className="flex min-h-0 flex-1">
                        {isLg && rail.mounted && (
                            <aside
                                {...rail.animationProps}
                                className={`flex z-10 mb-3 ml-4.5 lg:ml-8 mt-1 w-64.5 flex-none flex-col rounded-2xl border-2 px-4.5 py-4.5 transform-gpu transition-colors duration-300 ${
                                rail.closing ? 'collection-rail-out' : 'collection-rail-in'
                                } ${
                                    night
                                        ? 'border-neon-pink/40 bg-[#14161c] shadow-[4px_4px_0px_rgba(255,51,153,0.8)]'
                                        : 'border-ink bg-cream shadow-[4px_4px_0px_#0a0a0a]'
                                }`}
                            >
                                <AlbumPageIndex
                                    collectionName={collectionName}
                                    groups={groups}
                                    currentGroupId={currentGroupId}
                                    onJump={jumpToGroup}
                                    query={query}
                                    onQueryChange={setQuery}
                                    night={night}
                                    totalCards={currentCollection?.total_cards}
                                    ownedCards={currentCollection?.owned_cards}
                                />
                            </aside>
                        )}

                        {/* Stage */}
                        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                            <div 
                                data-tour="book" 
                                className="collections-album-stage relative z-2 h-[clamp(300px,calc(100svh-260px),700px)] md:px-16 lg:h-auto lg:min-h-0 lg:flex-1 xl:px-20"
                            >
                                {settings.arrows && (
                                    <>
                                        <SideArrow direction={-1} disabled={frontClosed || shown.busy} onClick={() => controls.current?.go(-1)} night={night} />
                                        <SideArrow direction={1} disabled={backClosed || shown.busy} onClick={() => controls.current?.go(1)} night={night} />
                                    </>
                                )}

                                <AlbumOfCol
                                    groups={groups}
                                    controlRef={controls}
                                    onPosChange={onPosChange}
                                    onBookInit={onBookInit}
                                    keysDisabled={info.mounted || index.mounted || fxPanel.mounted || zoomMounted || tourActive}
                                    onCardZoom={settings.tapZoom ? openCardZoom : undefined}
                                    flyingCardId={flyingCardId}
                                    focus={focus}
                                    onFocusChange={setFocus}
                                />
                            </div>
                            
                            {focus === 'off' && (
                                <div className="mt-5 mb-10 flex flex-col items-center gap-2 px-3 lg:absolute lg:inset-x-0 lg:bottom-3 lg:z-10 lg:mt-0 lg:mb-0">
                                    <p className={`font-major-mono-display whitespace-nowrap text-[12px] ${night ? '' : '[text-shadow:0_1px_0_rgba(255,255,255,0.5)]'}  uppercase`}>
                                        {frontClosed
                                            ? 'Cover — Tap to open'
                                            : backClosed
                                            ? 'Back Cover'
                                            : `${currentGroup ? `${currentGroup.group_name.toUpperCase()} · ` : ''} Page ${Math.min(shown.pos, spreadCount)}/${spreadCount}`}
                                    </p>

                                    {carousel.mounted && openings.length > 0 && (
                                        <div
                                            {...carousel.animationProps}
                                            className={carousel.closing ? 'collection-chrome-out' : 'collection-chrome-in'}
                                        >
                                            <AlbumPageCarousel
                                                openings={openings}
                                                shown={shown.pos}
                                                onJump={jumpToPos}
                                                onStep={stepBy}
                                                canPrev={!frontClosed && !shown.busy}
                                                canNext={!backClosed && !shown.busy}
                                                night={night}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile index modal */}
                    {index.mounted && (
                        <div
                            onClick={index.close}
                            className={`fixed inset-0 z-200 flex items-center justify-center bg-[#1e141c]/50 px-4 py-8 ${
                                index.closing ? 'collection-backdrop-out' : 'collection-backdrop-in'
                            }`}
                        >
                            <div
                                onClick={(event) => event.stopPropagation()}
                                {...index.animationProps}
                                className={`flex max-h-[85dvh] min-h-0 w-[min(420px,100%)] flex-col rounded-[18px] border-2 p-5 transition-colors duration-300 ${
                                    index.closing ? 'collection-modal-out' : 'collection-modal-in'
                                } ${
                                    night ? 'border-white/12 bg-[#16181e] shadow-[0_30px_80px_rgba(0,0,0,0.4)]' : 'border-ink bg-[#fffaf3] shadow-[6px_6px_0px_#0a0a0a]'
                                }`}
                            >
                                <AlbumPageIndex
                                    collectionName={collectionName}
                                    groups={groups}
                                    currentGroupId={currentGroupId}
                                    onJump={jumpToGroup}
                                    query={query}
                                    onQueryChange={setQuery}
                                    night={night}
                                    totalCards={currentCollection?.total_cards}
                                    ownedCards={currentCollection?.owned_cards}
                                />
                            </div>
                        </div>
                    )}

                    {/* Mobile info modal */}
                    {info.mounted && (
                        <AlbumInfoModal
                            onClose={info.close}
                            night={night}
                            collectionName={collectionName}
                            closing={info.closing}
                            onReplayTour={() => {
                                info.close();
                                setTourActive(true);
                            }}
                            {...info.animationProps}
                        />
                    )}

                    {tourActive && (
                        <OnboardingTour
                            night={night}
                            onClose={() => setTourActive(false)}
                            onShowSticker={showFirstSticker}
                        />
                    )}

                    {zoomMounted && zoomTarget && (
                        <CardZoomModal
                            target={zoomTarget}
                            collectionName={collectionName}
                            night={night}
                            onClose={closeCardZoom}
                            closing={zoom.closing}
                            {...zoom.animationProps}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
