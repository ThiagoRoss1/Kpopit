import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ChevronLeft, ChevronRight, GalleryVerticalEnd, Info, Menu, Moon, SlidersHorizontal, Sun } from 'lucide-react';
import AlbumOfCol, { type AlbumBookInit, type AlbumGroupSpread, type AlbumOfColControls } from '../../components/Albums/AlbumOfCol/AlbumOfCol';
import CollectionStatus from './components/CollectionStatus';
import AlbumPageIndex from './components/AlbumPageIndex';
import AlbumPageCarousel, { type AlbumOpening } from './components/AlbumPageCarousel';
import AlbumInfoModal from './components/AlbumInfoModal';
import FxPanel from './components/FxPanel';
import CollectionsBackdrop from './components/CollectionsBackdrop';
import { getAlbumMapping } from './albumMapper';
import { useCollectionFx } from './useCollectionFx';
import { useCollectionNight } from './useCollectionNight';
import { useDisclosure } from '../../hooks/useDisclosure';
import { getCollectionAlbum, getCollectionsList } from '../../services/api';
import { useIsLg } from '../../hooks/useIsDevice';
import type { AlbumGroup } from '../../interfaces/albumInterfaces';
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
            className={`absolute top-1/2 z-20 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border-2 transition-all duration-300 
            transform-gpu md:flex xl:size-14 ${
            direction < 0 ? 'left-[clamp(8px,2vw,26px)]' : 'right-[clamp(8px,2vw,26px)] hover:scale-105 active:shadow-[0px_0px_0px_rgba(255,51,153,1)] active:scale-100'
            } ${disabled ? `cursor-default bg-transparent opacity-45 ${disabledStyle}` : `cursor-pointer ${enabledStyle}`}`}
        >
            <Icon className="w-6 h-6 xl:w-8 xl:h-8" strokeWidth={3} />
        </button>
    );
}

const BtnClasses = (night: boolean) =>
    `border-2 transition-all duration-150 transform-gpu hover:brightness-110 active:translate-y-0.5 ${
        night
            ? 'border-neon-pink/60 bg-[#1c1f27] text-white shadow-[0_3px_0_rgba(255,51,153,0.6)] active:shadow-[0_1px_0_rgba(255,51,153,0.6)]'
            : 'border-ink bg-white text-ink shadow-[0_3px_0_var(--color-ink)] active:shadow-[0_1px_0_var(--color-ink)]'
    }`;

function IconBtn({ children, id, onClick, title, night, className = '' }: { children: React.ReactNode; onClick: () => void; id?: string; title: string; night: boolean; className?: string }) {
    return (
        <button
            id={id}
            type="button"
            onClick={onClick}
            title={title}
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
    });
    const { data: collections } = useQuery({
        queryKey: ['collectionsList'],
        queryFn: getCollectionsList,
        enabled: validId,
    });
    const groups = useMemo(() => (data ? getAlbumMapping(data) : null), [data]);
    const collectionName =
        collections?.find((collection) => collection.collection_id === parsedId)?.name ??
        `Album ${validId ? parsedId : ''}`.trim();

    const { fx } = useCollectionFx();

    const fxAttrs = {
        'data-fx-backdrop': fx.backdrop ? 'on' : 'off',
        'data-fx-sparkles': fx.sparkles ? 'on' : 'off',
        'data-fx-shadows': fx.shadows ? 'on' : 'off',
        'data-fx-blur': fx.blur ? 'on' : 'off',
        'data-fx-lv2': fx.lv2 ? 'on' : 'off',
        'data-fx-lv3': fx.lv3 ? 'on' : 'off',
    } as const;

    const [night, setNight] = useCollectionNight();
    const rail = useDisclosure(true);
    const carousel = useDisclosure(true);
    const index = useDisclosure();
    const info = useDisclosure();
    const fxPanel = useDisclosure();
    const pagesAttr = { 'data-pages': carousel.mounted ? 'on' : 'off' } as const;
    const [query, setQuery] = useState('');
    const [book, setBook] = useState<AlbumBookInit | null>(null);
    const [shown, setShown] = useState({ pos: 0, flipping: false });
    const controls = useRef<AlbumOfColControls | null>(null);

    const onBookInit = useCallback((next: AlbumBookInit) => setBook(next), []);
    const onPosChange = useCallback((pos: number, flipping: boolean) => setShown({ pos, flipping }), []);

    const spreadCount = book?.spreadCount ?? 0;
    const maxPos = spreadCount + 1;

    const frontClosed = shown.pos === 0;
    const backClosed = shown.pos >= maxPos;
    
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
            index.close();
        },
        [book, index],
    );

    if (!validId || (isError && isAxiosError(error) && error.response?.status === 404)) {
        return <CollectionStatus message="Album not found." />;
    }
    if (isLoading) return <CollectionStatus message="Opening the album…" />;
    if (isError || !groups) return <CollectionStatus message="Couldn't load the album. Please try again later." />;

    // Below lg: the summary is a modal instead of a rail, so the button opens that.
    const toggleSummary = () => (isLg ? rail.toggle() : index.open());
    const summaryActive = rail.active;
    const carouselActive = carousel.active;
    const pillClasses = BtnClasses(night);

    return (
        <div className="collections min-h-full w-full">
            <div className="collections__bg" aria-hidden="true" />

            <div
                className={`collections-root -mx-2 sm:-mx-4 flex flex-col lg:h-[calc(100svh-60px)]
            lg:overflow-hidden transition-colors duration-300 ${night ? 'text-white' : 'text-[#3c2f38]'}`}
                {...fxAttrs}
                {...pagesAttr}
            >
                <CollectionsBackdrop night={night} />

                {/* Top bar */}
                <header className="relative z-30 flex flex-none items-center justify-between gap-3 px-4.5 py-3">
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
                            title={summaryActive ? 'Hide summary' : 'Show summary'}
                            className={`inline-flex flex-row justify-center items-center max-lg:w-10 h-10 cursor-pointer gap-1.5 rounded-full 
                            border-2 lg:px-3.25 lg:py-2 font-sans text-[14px] font-bold ${pillClasses} ${
                                summaryActive 
                                ? night 
                                    ? 'lg:border-neon-pink lg:bg-ink' 
                                    : 'lg:border-ink lg:bg-neon-pink' 
                                : night
                                    ? 'lg:text-white'
                                    : 'lg:text-ink'
                            }`}
                        >
                            <Menu className="max-lg:w-4.5 max-lg:h-4.5 lg:w-4 lg:h-4" strokeWidth={3} /> 
                            <span className="max-lg:hidden">Summary</span>
                        </button>

                        <button
                            type="button"
                            onClick={carousel.toggle}
                            title={carouselActive ? 'Hide pages' : 'Show pages'}
                            aria-expanded={carouselActive}
                            className={`inline-flex flex-row justify-center items-center max-lg:w-10 h-10 cursor-pointer gap-1.5 rounded-full
                            border-2 lg:px-3.25 lg:py-2 font-sans text-[14px] font-bold ${pillClasses} ${
                                carouselActive
                                    ? night
                                        ? 'lg:border-neon-pink lg:bg-ink'
                                        : 'lg:border-ink lg:bg-neon-pink'
                                    : night
                                        ? 'lg:text-white'
                                        : 'lg:text-ink'
                            }`}
                        >
                            <GalleryVerticalEnd className="max-lg:w-4.5 max-lg:h-4.5 lg:w-4 lg:h-4" strokeWidth={3} />
                            <span className="max-lg:hidden">Pages</span>
                        </button>
                    </div>
                    
                    {/* Effects / Info / Night */}
                    <div className="relative flex items-center gap-2">
                        <IconBtn
                            id="fx-panel-toggle"
                            onClick={fxPanel.toggle}
                            title="Visual effects"
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

                        <IconBtn onClick={info.open} title="Info" night={night}>
                            <Info className="w-4.5 h-4.5" strokeWidth={3} />
                        </IconBtn>

                        <IconBtn
                            onClick={() => setNight((previousNight) => !previousNight)}
                            title="Light/night mode"
                            night={night}
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
                            className={`flex z-10 mb-3 ml-4.5 mt-1 w-64.5 flex-none flex-col rounded-2xl border-2 px-4.5 py-4.5 transform-gpu transition-colors duration-300 ${
                            rail.closing ? 'collection-rail-out' : 'collection-rail-in'
                            } ${
                                night
                                    ? 'border-neon-pink/40 bg-[#14161c]/85 shadow-[4px_4px_0px_rgba(255,51,153,0.8)]'
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
                            />
                        </aside>
                    )}

                    {/* Stage */}
                    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                        <div className="relative z-2 h-[clamp(300px,calc(100svh-260px),700px)] md:px-16 lg:h-auto lg:min-h-0 lg:flex-1 xl:px-20">
                            <SideArrow direction={-1} disabled={frontClosed || shown.flipping} onClick={() => controls.current?.go(-1)} night={night} />
                            <SideArrow direction={1} disabled={backClosed || shown.flipping} onClick={() => controls.current?.go(1)} night={night} />

                            <AlbumOfCol
                                groups={groups}
                                controlRef={controls}
                                onPosChange={onPosChange}
                                onBookInit={onBookInit}
                                keysDisabled={info.mounted || index.mounted || fxPanel.mounted}
                            />
                        </div>
                        
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
                                        canPrev={!frontClosed && !shown.flipping}
                                        canNext={!backClosed && !shown.flipping}
                                        night={night}
                                    />
                                </div>
                            )}
                        </div>
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
                        {...info.animationProps}
                    />
                )}
            </div>
        </div>
    );
}
