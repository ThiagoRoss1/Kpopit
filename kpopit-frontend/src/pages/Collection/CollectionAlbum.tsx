import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ChevronLeft, ChevronRight, Info, Menu, Moon, Sun } from 'lucide-react';
import AlbumOfCol, { type AlbumBookInit, type AlbumGroupSpread, type AlbumOfColControls } from '../../components/Albums/AlbumOfCol/AlbumOfCol';
import CollectionStatus from './components/CollectionStatus';
import AlbumPageIndex from './components/AlbumPageIndex';
import AlbumPageCarousel, { type AlbumOpening } from './components/AlbumPageCarousel';
import AlbumInfoModal from './components/AlbumInfoModal';
import { toAlbumGroups } from './albumMapper';
import { useCollectionNight } from './useCollectionNight';
import { getCollectionAlbum, getCollectionsList } from '../../services/api';
import type { AlbumGroup } from '../../interfaces/albumInterfaces';
import './collection.css';

function StageBackdropLayers({ night }: { night: boolean }) {
    return (
        <>
            <div
                className={`absolute inset-0 ${
                    night
                        ? 'bg-[radial-gradient(ellipse_120%_90%_at_50%_-10%,#14161c,#0b0c0f_70%)]'
                        : 'bg-[radial-gradient(ellipse_120%_90%_at_50%_-10%,#f6efe2,#e8dccb_70%)]'
                }`}
            />
            <div
                className={`absolute inset-0 bg-size-[19px_19px] ${
                    night
                        ? 'bg-[radial-gradient(rgba(255,255,255,0.05)_1.4px,transparent_1.4px)]'
                        : 'bg-[radial-gradient(rgba(60,47,56,0.05)_1.4px,transparent_1.4px)]'
                }`}
            />
            <div
                className={`absolute -left-[8%] -top-[14%] size-115 rounded-full blur-sm ${
                    night
                        ? 'bg-[radial-gradient(circle,rgba(255,51,153,0.14),transparent_70%)]'
                        : 'bg-[radial-gradient(circle,rgba(230,76,103,0.12),transparent_70%)]'
                }`}
            />
            <div
                className={`absolute -bottom-[16%] -right-[8%] size-120 rounded-full blur-sm ${
                    night
                        ? 'bg-[radial-gradient(circle,rgba(168,85,247,0.16),transparent_70%)]'
                        : 'bg-[radial-gradient(circle,rgba(255,51,153,0.1),transparent_70%)]'
                }`}
            />
        </>
    );
}

function StageBackdrop({ night }: { night: boolean }) {
    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className={`absolute inset-0 transition-opacity duration-300 ${night ? 'opacity-100' : 'opacity-0'}`}>
                <StageBackdropLayers night />
            </div>
            <div className={`absolute inset-0 transition-opacity duration-300 ${night ? 'opacity-0' : 'opacity-100'}`}>
                <StageBackdropLayers night={false} />
            </div>
        </div>
    );
}

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
            className={`absolute top-1/2 z-95 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border-2 transition-all duration-300 transform-gpu md:flex xl:size-14 ${
            direction < 0 ? 'left-[clamp(8px,2vw,26px)]' : 'right-[clamp(8px,2vw,26px)] hover:scale-105 active:shadow-[0px_0px_0px_rgba(255,51,153,1)] active:scale-100'
            } ${disabled ? `cursor-default bg-transparent opacity-45 ${disabledStyle}` : `cursor-pointer ${enabledStyle}`}`}
        >
            <Icon className="w-6 h-6 xl:w-8 xl:h-8" strokeWidth={3} />
        </button>
    );
}

const BtnClasses = (night: boolean) =>
    `border-[1.5px] transition-all duration-150 transform-gpu hover:brightness-110 active:translate-y-0.5 ${
        night
            ? 'border-neon-pink/60 bg-[#1c1f27] text-white shadow-[0_3px_0_rgba(255,51,153,0.6)] active:shadow-[0_1px_0_rgba(255,51,153,0.6)]'
            : 'border-ink bg-white text-ink shadow-[0_3px_0_var(--color-ink)] active:shadow-[0_1px_0_var(--color-ink)]'
    }`;

function IconBtn({ children, onClick, title, night, className = '' }: { children: React.ReactNode; onClick: () => void; title: string; night: boolean; className?: string }) {
    return (
        <button
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
    const groups = useMemo(() => (data ? toAlbumGroups(data) : null), [data]);
    const collectionName =
        collections?.find((collection) => collection.collection_id === parsedId)?.name ??
        `Album ${validId ? parsedId : ''}`.trim();

    const [night, setNight] = useCollectionNight();
    const [railOpen, setRailOpen] = useState(true);
    const [railClosing, setRailClosing] = useState(false);
    const [indexOpen, setIndexOpen] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
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

        const spreadOpenings = book.spreads.map(([leftPage, rightPage], spreadIndex) => {
            const position = spreadIndex + 1;
            const groupId = groupIdAt(position, book.spreadCount, book.groupSpreads);
            const group = groupId !== null ? groupsById.get(groupId) : undefined;

            return { pos: position, accent: group?.palette.main ?? accent, pages: [leftPage, rightPage] };
        });

        return [
            { pos: 0, accent, pages: [book.frontCover] },
            ...spreadOpenings,
            { pos: book.spreadCount + 1, accent, pages: [book.backCover] },
        ];
    }, [book, groups, accent]);

    const jumpToGroup = useCallback(
        (groupId: number) => {
            const groupSpread = book?.groupSpreads.find((spread) => spread.group_id === groupId);
            if (groupSpread) controls.current?.jumpTo(groupSpread.pos);
            setIndexOpen(false);
        },
        [book],
    );

    if (!validId || (isError && isAxiosError(error) && error.response?.status === 404)) {
        return <CollectionStatus message="Album not found." />;
    }
    if (isLoading) return <CollectionStatus message="Opening the album…" />;
    if (isError || !groups) return <CollectionStatus message="Couldn't load the album. Please try again later." />;

    const toggleSummary = () => {
        const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
        if (!isDesktop) {
            setIndexOpen(true);
            return;
        }
        if (railOpen && !railClosing) {
            setRailClosing(true);
        } else {
            setRailClosing(false);
            setRailOpen(true);
        }
    };
    const summaryActive = railOpen && !railClosing;
    const pillClasses = BtnClasses(night);

    return (
        <div className={`album-level-clock -mx-2 sm:-mx-4 flex h-[calc(100dvh-48px)] sm:h-[calc(100dvh-60px)] flex-col
        overflow-hidden transition-colors duration-300 ${night ? 'text-white' : 'text-[#3c2f38]'}`}>
            <StageBackdrop night={night} />

            {/* Top bar */}
            <header className="relative z-30 flex flex-none items-center justify-between gap-3 px-4.5 py-3">
                <div className="flex items-center gap-2">
                    <Link
                        to="/collections"
                        className={`inline-flex flex-row w-10 h-10 justify-center items-center gap-1 rounded-full border-[1.5px] px-1 py-1 font-sans 
                            text-[14px] font-bold ${pillClasses}`}
                    >
                        <ChevronLeft className="w-6 h-6" strokeWidth={3} />
                    </Link>

                    <button
                        type="button"
                        onClick={toggleSummary}
                        title={summaryActive ? 'Hide summary' : 'Show summary'}
                        className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3.25 py-2 font-sans text-[14px] font-bold ${pillClasses} ${
                            summaryActive 
                            ? night 
                                ? 'lg:border-neon-pink lg:bg-ink' 
                                : 'lg:border-ink lg:bg-neon-pink' 
                            : night
                                ? 'lg:text-white'
                                : 'lg:text-ink'
                        }`}
                    >
                        <Menu className="w-4 h-4" strokeWidth={3} /> Summary
                    </button>
                </div>
                
                {/* Info Button */}
                <div className="flex items-center gap-2">
                    <IconBtn onClick={() => setInfoOpen(true)} title="Info" night={night}>
                        <Info className="w-4.5 h-4.5" strokeWidth={3} />
                    </IconBtn>
                    <IconBtn
                        onClick={() => setNight((previousNight) => !previousNight)}
                        title="Light/night mode"
                        night={night}
                        className="collections-toggle-sweep relative overflow-hidden"
                    >
                        {night ? <Moon className="size-4.5" strokeWidth={2.25} /> : <Sun className="size-4.5" strokeWidth={2.25} />}
                    </IconBtn>
                </div>
            </header>

            {/* Body */}
            <div className="flex min-h-0 flex-1">
                {railOpen && (
                    <aside
                        onAnimationEnd={() => {
                            if (railClosing) {
                                setRailOpen(false);
                                setRailClosing(false);
                            }
                        }}
                        className={`z-10 mb-3 ml-3 mt-1 hidden w-64.5 flex-none flex-col rounded-2xl border-2 px-4.5 py-4.5 transform-gpu transition-colors duration-300 lg:flex ${
                            railClosing ? 'collection-rail-out' : 'collection-rail-in'
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
                    <SideArrow direction={-1} disabled={frontClosed || shown.flipping} onClick={() => controls.current?.go(-1)} night={night} />
                    <SideArrow direction={1} disabled={backClosed || shown.flipping} onClick={() => controls.current?.go(1)} night={night} />

                    {/* Side padding keeps the arrows outside the scaled book */}
                    <div className="relative z-2 min-h-0 flex-1 md:px-16 xl:px-20">
                        <AlbumOfCol
                            groups={groups}
                            controlRef={controls}
                            onPosChange={onPosChange}
                            onBookInit={onBookInit}
                            keysDisabled={infoOpen || indexOpen}
                        />
                    </div>

                    {/* Status + carousel */}
                    <div className="absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-3">
                        <p className={`font-major-mono-display whitespace-nowrap text-[12px] ${night ? '' : '[text-shadow:0_1px_0_rgba(255,255,255,0.5)]'}  uppercase`}>
                            {frontClosed
                                ? 'Cover — Tap to open'
                                : backClosed
                                  ? 'Back Cover'
                                  : `${currentGroup ? `${currentGroup.group_name.toUpperCase()} · ` : ''} Page ${Math.min(shown.pos, spreadCount)}/${spreadCount}`}
                        </p>

                        {openings.length > 0 && (
                            <AlbumPageCarousel
                                openings={openings}
                                shown={shown.pos}
                                onJump={(position) => controls.current?.jumpTo(position)}
                                onStep={(direction) => controls.current?.go(direction)}
                                canPrev={!frontClosed && !shown.flipping}
                                canNext={!backClosed && !shown.flipping}
                                night={night}
                            />
                        )}
                    </div>

                    {/* Mobile: rotate-phone hint */}
                    <div
                        className={`absolute left-1/2 top-3.5 z-12 hidden -translate-x-1/2 items-center gap-1.75 whitespace-nowrap rounded-full border-[1.5px] px-3.25 py-1.75 font-sans text-[11px] font-bold backdrop-blur-md transition-colors duration-300 max-md:portrait:flex ${
                            night ? 'border-white/12 bg-[#16181e]/72 text-white' : 'border-[#3c2f38]/20 bg-[#fffcf6]/88 text-[#3c2f38]'
                        }`}
                    >
                        <span className="text-[14px]">📱↻</span> Rotate your phone to see the whole album
                    </div>
                </div>
            </div>

            {/* Mobile index modal */}
            {indexOpen && (
                <div
                    onClick={() => setIndexOpen(false)}
                    className="fixed inset-0 z-200 flex items-center justify-center bg-[#1e141c]/50 px-4 py-8"
                >
                    <div
                        onClick={(event) => event.stopPropagation()}
                        className={`flex max-h-[85dvh] min-h-0 w-[min(420px,100%)] flex-col rounded-[18px] border-2 p-5 transition-colors duration-300 ${
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
            {infoOpen && <AlbumInfoModal onClose={() => setInfoOpen(false)} night={night} collectionName={collectionName} />}
        </div>
    );
}
