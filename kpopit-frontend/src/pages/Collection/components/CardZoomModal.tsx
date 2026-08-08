import { useLayoutEffect, useRef, useState, type AnimationEvent, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';
import AlbumMemberCard from '../../../components/Albums/AlbumOfCol/cards/AlbumMemberCard';
import type { CardZoomTarget } from '../../../components/Albums/AlbumOfCol/albumCardZoom';
import { formatCardDate } from '../../../utils/formatCardDate';
import { treatmentForGroup } from '../../../components/Albums/AlbumOfCol/cards/albumCardLevel';
import { TextureFill } from '../../../components/Albums/AlbumOfCol/cards/AlbumMemberCard';
import { useSyncAlbumAnimations } from '../../../components/Albums/AlbumOfCol/cards/useSyncAlbumAnimations';
import { useGfx } from '../useCollectionFx';

interface CardZoomModalProps {
    target: CardZoomTarget;
    collectionName: string;
    night: boolean;
    onClose: () => void;
    closing: boolean;
    onAnimationEnd: (event: AnimationEvent<Element>) => void;
}

interface MetaCell {
    label: string;
    value: ReactNode;
    align: string;
}

const LEVEL_NAME: Record<number, string> = { 1: 'BASE', 2: 'GOLD', 3: 'HOLO' };
const STICKER_GRID_W = 160;
const FLIGHT_MS = 800;
const FLIGHT_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

const prefersReducedMotion = () =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function LevelPips({ level, night }: { level: number; night: boolean }) {
    return (
        <span className="inline-flex items-center gap-0.75 align-middle">
            {[1, 2, 3].map((tick) => (
                <span
                    key={tick}
                    className={`w-2.5 h-2.5 rounded-xs border-[1.5px] ${
                        tick <= level
                            ? 'border-neon-pink bg-neon-pink'
                            : night
                              ? 'border-white/20'
                              : 'border-[#3c2f38]/25'
                    }`}
                />
            ))}
        </span>
    );
}

function MetaRow({ cell, align, night }: { cell: MetaCell; align: string; night: boolean }) {
    return (
        <div className={`flex min-w-0 flex-col gap-1 ${align} lg:flex-row lg:items-baseline lg:gap-2 lg:text-left`}>
            <span
                className={`text-[8.5px] lg:text-sm font-black uppercase tracking-[0.08em] lg:tracking-[0.02em] ${
                    night ? 'text-white/62' : 'text-[#7a6b74]'
                }`}
            >
                {cell.label}
            </span>
            
            <span
                aria-hidden
                className={`hidden flex-1 -translate-y-0.75 border-b border-dotted lg:block ${
                    night ? 'border-white/20' : 'border-ink/25'
                }`}
            />
            <span className={`whitespace-nowrap text-[13.5px] lg:text-base font-bold ${night ? 'text-white' : 'text-[#3c2f38]'}`}>
                {cell.value}
            </span>
        </div>
    );
}

export default function CardZoomModal(props: CardZoomModalProps) {
    const { target, collectionName, night, onClose, closing, onAnimationEnd } = props;

    const group = target.group;
    const isMember = target.kind === 'member';

    const groupPhotoFrame = treatmentForGroup(group.members);

    const [stickerScale, setStickerScale] = useState(1);
    const [artSettled, setArtSettled] = useState(!isMember);

    const artRef = useRef<HTMLDivElement>(null);
    
    useSyncAlbumAnimations(artRef, isMember ? null : groupPhotoFrame);

    const backdropMotion = closing ? 'collection-backdrop-out' : 'collection-backdrop-in';
    const panelMotion = closing ? 'collection-card-zoom-out' : 'collection-card-zoom-in';
    const blur = useGfx('blur');

    useLayoutEffect(() => {
        const artElement = artRef.current;

        if (!artElement || !isMember) return;

        let raf = 0;
        const measure = () => {
            const el = artRef.current;
            if (!el) return;
            const { clientWidth } = el;
            
            if (clientWidth === 0) {
                raf = requestAnimationFrame(measure);
                return;
            }
            setStickerScale(clientWidth / STICKER_GRID_W);
            setArtSettled(true);
        };

        measure();

        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(artElement);

        return () => {
            cancelAnimationFrame(raf);
            resizeObserver.disconnect();
        };
    }, [isMember]);

    const didFly = useRef(false);

    useLayoutEffect(() => {
        const flying = artRef.current;

        if (didFly.current || !artSettled || !flying || prefersReducedMotion()) return;

        const landed = flying.getBoundingClientRect();

        if (landed.width === 0) return;

        didFly.current = true;

        flying.style.transition = 'none';
        flying.style.transform = invertTo(target.rect, landed);

        void flying.offsetWidth;

        flying.style.willChange = 'transform';
        flying.style.transition = `transform ${FLIGHT_MS}ms ${FLIGHT_EASING}`;
        flying.style.transform = '';

        return () => {
            flying.style.willChange = 'auto';
        }
    }, [artSettled, target]);

    useLayoutEffect(() => {
        const flying = artRef.current;

        if (!closing || !flying || prefersReducedMotion()) return;

        const landed = flying.getBoundingClientRect();

        if (landed.width === 0) return;

        flying.style.transition = `transform ${FLIGHT_MS}ms ${FLIGHT_EASING}`;
        flying.style.transform = invertTo(target.rect, landed);
    }, [closing, target]);

    const level = isMember ? (target.member.level ?? 1) : 1;
    const ownedCount = group.members.filter((member) => member.owned).length;
    const identity = [group.group_name, group.hangul_name, `Page ${group.set}`].filter(Boolean).join(' · ');

    const cells: MetaCell[] = isMember
        ? [
              {
                  label: 'Level',
                  align: 'text-left',
                  value: (
                      <span className="inline-flex items-center gap-1.75">
                          <LevelPips level={level} night={night} />
                          LV.{level} {LEVEL_NAME[level] ?? LEVEL_NAME[1]}
                      </span>
                  ),
              },
              { label: 'Copies', align: 'text-center', value: `${target.member.times_won ?? 1}x` },
              { label: 'Obtained at', align: 'text-right', value: formatCardDate(target.member.first_won_at) },
          ]
        : [
              { label: 'Collection', align: 'text-left', value: collectionName.toUpperCase() },
              { label: 'Page', align: 'text-left', value: group.set },
              { label: 'Stickers', align: 'text-right', value: `${ownedCount}/${group.members.length}` },
          ];

    return (
        <div
            onClick={onClose}
            className={`fixed inset-0 z-260 flex items-center justify-center bg-[#1e141c]/55 px-7 py-10 ${backdropMotion} ${
                blur ? 'backdrop-blur-xs' : ''
            }`}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                onAnimationEnd={onAnimationEnd}
                className={`relative flex w-full max-w-95 flex-col items-center rounded-[20px] border-2 p-4.5 transition-colors duration-300 
                ${isMember ? 'lg:max-w-200' : 'lg:max-w-300'} lg:flex-row lg:items-stretch lg:gap-7.5 lg:p-6.5 ${panelMotion} ${
                    night
                        ? 'border-neon-pink bg-[#16181e] shadow-[6px_6px_0px_rgba(255,51,153,1)]'
                        : 'border-ink bg-[#fffaf3] shadow-[6px_6px_0px_rgba(0,0,0,1)]'
                }`}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className={`collections-press absolute -top-4 -right-4 flex w-9 h-9 cursor-pointer items-center justify-center rounded-full border-2
                    transition-all duration-300 transform-gpu hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 firefox:shadow-none ${
                        night
                            ? `border-neon-pink bg-[#16181e] text-neon-pink shadow-[3px_3px_0px_rgba(255,51,153,1)] active:shadow-[1px_1px_0px_rgba(255,51,153,1)]
                               firefox:drop-shadow-[3px_3px_0px_rgba(255,51,153,1)] firefox:active:drop-shadow-[1px_1px_0px_rgba(255,51,153,1)]`
                            : `border-ink bg-[#fffaf3] text-ink shadow-[3px_3px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_rgba(0,0,0,1)]
                               firefox:drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] firefox:active:drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]`
                    }`}
                >
                    <X className="w-5 h-5" strokeWidth={3} />
                </button>

                {isMember ? (
                    <div
                        ref={artRef}
                        style={{ '--card-zoom-scale': stickerScale } as CSSProperties}
                        className="card-zoom-art aspect-8/11 h-[min(44svh,calc((100vw-6.5rem)*1.375),29.125rem)] flex-none lg:h-auto lg:w-90"
                    >
                        <AlbumMemberCard member={target.member} palette={group.palette} />
                    </div>
                ) : (
                    <div 
                        ref={artRef} 
                        data-treatment={groupPhotoFrame}
                        style={{ '--album-main': group.palette.main } as CSSProperties}
                        className={`relative flex aspect-160/72 w-full flex-none origin-top-left self-start items-center justify-center rounded-br-[20px] rounded-tl-[20px]
                        overflow-clip lg:w-[clamp(35rem,42vw,40rem)] ${
                            groupPhotoFrame === 'base' ? `border-2 border-(--album-main)` : 'p-1.5 transform-gpu'
                        }`}
                    >
                        <TextureFill treatment={groupPhotoFrame} />

                        <div className="relative size-full overflow-clip rounded-br-[20px] rounded-tl-[20px]">
                            <img
                                src={group.group_photo?.src || undefined}
                                alt={group.group_name}
                                className="h-full w-full object-contain lg:object-cover"
                                draggable={false}
                            />
                        </div>
                    </div>
                )}

                <div className="card-zoom-meta mt-4 flex w-full min-w-0 flex-1 flex-col lg:mt-0">
                    <p
                        className="font-major-mono-display text-[12px] lg:text-[12px] text-neon-pink [text-shadow:1px_1px_0px_rgba(0,0,0,0.6)] 
                        font-bold uppercase tracking-[0.04em]"
                    >
                        {isMember ? `${collectionName} · Card #${target.member.card_number}` : 'Group Page · Reward'}
                    </p>

                    {/* Flex row kept for a future hangul name — idols have no Korean
                        name in the schema yet, only groups do. */}
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                        <p
                            className={`font-major-mono-display text-[22px] leading-tight uppercase lg:text-[32px] ${
                                night ? 'text-white' : 'text-ink'
                            }`}
                        >
                            {isMember ? target.member.artist_name : group.group_name}
                        </p>
                    </div>

                    <p className={`mt-1 text-[12px] font-bold ${night ? 'text-white/62' : 'text-[#7a6b74]'}`}>
                        {isMember ? identity : `Unlocked by obtaining all ${group.group_name.charAt(0).toUpperCase() + group.group_name.slice(1).toLowerCase()} stickers`}
                    </p>

                    <div className={`my-3.5 h-px lg:my-5 ${night ? 'bg-white/16' : 'bg-[#3c2f38]/20'}`} />

                    <div className="flex justify-between gap-4 lg:flex-col lg:gap-6">
                        {cells.map((cell) => (
                            <MetaRow key={cell.label} cell={cell} align={cell.align} night={night} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Transform that puts `landed` back on top of `origin` — the "invert" of a FLIP. */
function invertTo(origin: DOMRect, landed: DOMRect): string {
    const dx = origin.left - landed.left;
    const dy = origin.top - landed.top;
    return `translate(${dx}px, ${dy}px) scale(${origin.width / landed.width})`;
}
