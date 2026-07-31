import { useLayoutEffect, useRef, useState, type AnimationEvent, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';
import AlbumMemberCard from '../../../components/Albums/AlbumOfCol/cards/AlbumMemberCard';
import type { CardZoomTarget } from '../../../components/Albums/AlbumOfCol/albumCardZoom';
import { formatCardDate } from '../../../utils/formatCardDate';

interface CardZoomModalProps {
    target: CardZoomTarget;
    collectionName: string;
    night: boolean;
    onClose: () => void;
    closing: boolean;
    /** From useDisclosure's animationProps — it owns the unmount and the bubbling guard. */
    onAnimationEnd: (event: AnimationEvent<Element>) => void;
}

interface MetaCell {
    label: string;
    value: ReactNode;
}

const LEVEL_NAME: Record<number, string> = { 1: 'BASE', 2: 'GOLD', 3: 'HOLO' };
/** The sticker's authored width in the album grid — the scale divisor. */
const STICKER_GRID_W = 160;
/** Stays under the panel's 300ms fade-out, which owns the unmount. */
const FLIGHT_MS = 280;
const FLIGHT_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

const prefersReducedMotion = () =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Three ticks filled to the card's level. Always the accent ink/pink — never gold
    or holo: these read data, while the sticker itself shows the real material. */
function LevelPips({ level, night }: { level: number; night: boolean }) {
    return (
        <span className="inline-flex items-center gap-0.75 align-middle">
            {[1, 2, 3].map((tick) => (
                <span
                    key={tick}
                    className={`size-2.25 rounded-xs border-[1.5px] ${
                        tick <= level
                            ? night
                                ? 'border-neon-pink bg-neon-pink'
                                : 'border-[#C62368] bg-[#C62368]'
                            : night
                              ? 'border-white/20'
                              : 'border-[#3c2f38]/25'
                    }`}
                />
            ))}
        </span>
    );
}

/** One fact. Three across a row on a phone; on lg it becomes a dotted-leader line,
    the detail borrowed from design direction 04 — it needs stacked rows, which the
    phone layout has no height for. */
function MetaRow({ cell, align, night }: { cell: MetaCell; align: string; night: boolean }) {
    return (
        <div className={`flex min-w-0 flex-col gap-1 ${align} lg:flex-row lg:items-baseline lg:gap-2 lg:text-left`}>
            <span
                className={`font-mono text-[8.5px] font-bold uppercase tracking-[0.08em] ${
                    night ? 'text-white/62' : 'text-[#7a6b74]'
                }`}
            >
                {cell.label}
            </span>
            <span
                aria-hidden
                className={`hidden flex-1 -translate-y-0.75 border-b border-dotted lg:block ${
                    night ? 'border-white/20' : 'border-[#3c2f38]/25'
                }`}
            />
            <span className={`whitespace-nowrap text-[13.5px] font-bold ${night ? 'text-white' : 'text-[#3c2f38]'}`}>
                {cell.value}
            </span>
        </div>
    );
}

const MOBILE_ALIGN = ['text-left', 'text-center', 'text-right'];

export default function CardZoomModal(props: CardZoomModalProps) {
    const { target, collectionName, night, onClose, closing, onAnimationEnd } = props;
    const backdropMotion = closing ? 'collection-backdrop-out' : 'collection-backdrop-in';
    // Fade-only pair, not the scaling `collection-modal-*` the other modals use:
    // the sticker below does the moving, and a scaling ancestor would drag it off
    // the flight path measured at click time.
    const panelMotion = closing ? 'collection-card-zoom-out' : 'collection-card-zoom-in';

    const group = target.group;
    const isMember = target.kind === 'member';

    // The artwork box is sized by CSS against both axes, so the modal always fits
    // and nothing ever scrolls. JS only reports the resulting width, which is the
    // scale the authored 160px sticker needs to fill it.
    const artRef = useRef<HTMLDivElement>(null);
    const [stickerScale, setStickerScale] = useState(1);
    // The flight must not start before the scale settles: the panel is vertically
    // centred, so a scale change resizes it and moves the artwork's own top. Flying
    // against the placeholder layout launches the card from the wrong place.
    const [artSettled, setArtSettled] = useState(!isMember);

    useLayoutEffect(() => {
        const artElement = artRef.current;
        if (!artElement || !isMember) return;
        // `clientWidth`, never getBoundingClientRect: the latter reports the box
        // *after* transforms, so a measurement taken mid-flight would read the
        // inverted frame and feed its own shrunken width back into the scale.
        const measure = () => {
            const { clientWidth } = artElement;
            if (clientWidth === 0) return;
            setStickerScale(clientWidth / STICKER_GRID_W);
            setArtSettled(true);
        };
        measure();
        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(artElement);
        return () => resizeObserver.disconnect();
    }, [isMember]);

    // FLIP — the artwork starts at the exact box the sticker occupies in the album
    // and animates to its place here, so it reads as being peeled off the page.
    const didFly = useRef(false);
    useLayoutEffect(() => {
        const flying = artRef.current;
        if (didFly.current || !artSettled || !flying || prefersReducedMotion()) return;
        const landed = flying.getBoundingClientRect();
        if (landed.width === 0) return;
        didFly.current = true;

        flying.style.transition = 'none';
        flying.style.transform = invertTo(target.rect, landed);
        void flying.offsetWidth; // commit the inverted frame before playing it
        flying.style.transition = `transform ${FLIGHT_MS}ms ${FLIGHT_EASING}`;
        flying.style.transform = '';
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
    const identity = [group.group_name, group.hangul_name, `page ${group.set}`].filter(Boolean).join(' · ');

    const cells: MetaCell[] = isMember
        ? [
              {
                  label: 'level',
                  value: (
                      <span className="inline-flex items-center gap-1.75">
                          <LevelPips level={level} night={night} />
                          LV.{level} {LEVEL_NAME[level] ?? LEVEL_NAME[1]}
                      </span>
                  ),
              },
              { label: 'copies', value: `${target.member.times_won ?? 1}×` },
              { label: 'first won', value: formatCardDate(target.member.first_won_at) },
          ]
        : [
              { label: 'collection', value: collectionName.toUpperCase() },
              { label: 'page', value: group.set },
              { label: 'stickers', value: `${ownedCount}/${group.members.length}` },
          ];

    return (
        // `album-level-clock` is load-bearing: the gold and holo layers read two
        // `inherits: true` custom properties animated by this class on the album
        // stage. The modal lives outside that tree, so without it here the LV3 holo
        // freezes at frame 0 — dead exactly where it is looked at most closely.
        <div
            onClick={onClose}
            className={`album-level-clock fixed inset-0 z-260 flex items-center justify-center bg-[#1e141c]/55 px-7 py-10 backdrop-blur-xs ${backdropMotion}`}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                onAnimationEnd={onAnimationEnd}
                className={`relative flex w-full max-w-95 flex-col items-center rounded-[20px] border-2 p-4.5 transition-colors duration-300 lg:max-w-196 lg:flex-row lg:items-stretch lg:gap-7.5 lg:p-6.5 ${panelMotion} ${
                    night
                        ? 'border-neon-pink bg-[#16181e] shadow-[6px_6px_0px_rgba(255,51,153,1)]'
                        : 'border-ink bg-[#fffaf3] shadow-[6px_6px_0px_#0a0a0a]'
                }`}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className={`absolute -top-4 -right-4 flex size-9 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-300 hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 ${
                        night
                            ? 'border-neon-pink bg-[#16181e] text-neon-pink shadow-[2px_2px_0px_rgba(255,51,153,1)]'
                            : 'border-ink bg-[#fffaf3] text-ink shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                    }`}
                >
                    <X className="size-5" strokeWidth={3} />
                </button>

                {isMember ? (
                    // Height-first sizing: the box never outgrows the viewport, so the
                    // panel always fits and no ancestor ever needs to scroll.
                    <div
                        ref={artRef}
                        style={{ '--card-zoom-scale': stickerScale } as CSSProperties}
                        // Height drives the box so it never outgrows the viewport, and the
                        // three caps are the three things that can bound it: screen height,
                        // screen width, and the panel's own max width (which stops tracking
                        // the viewport once max-w-95 kicks in — a wide tablet has room the
                        // panel does not). 29.125rem = the panel's real 340px content box
                        // (380 max-w - 2x2 border - 2x18 padding) turned back into a height
                        // by the 8:11 ratio.
                        className="card-zoom-art aspect-8/11 h-[min(44svh,calc((100vw-6.5rem)*1.375),29.125rem)] flex-none lg:h-auto lg:w-90"
                    >
                        <AlbumMemberCard member={target.member} palette={group.palette} />
                    </div>
                ) : (
                    // The reward photo is never cropped: every member has to stay in
                    // frame, so it keeps its natural aspect and is bounded on both axes.
                    <div ref={artRef} className="flex max-w-full flex-none justify-center lg:w-90">
                        <img
                            src={group.group_photo?.src || undefined}
                            alt={group.group_name}
                            className="pointer-events-none max-h-[38svh] w-auto max-w-full rounded-br-[20px] rounded-tl-[20px] border-2 border-white object-contain shadow-[2px_4px_4px_0px_rgba(0,0,0,0.3)] lg:max-h-[52svh]"
                        />
                    </div>
                )}

                <div className="card-zoom-meta mt-4 flex w-full min-w-0 flex-1 flex-col lg:mt-0">
                    <p
                        className={`font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${
                            night ? 'text-neon-pink' : 'text-[#C62368]'
                        }`}
                    >
                        {isMember ? `${collectionName} · card #${target.member.card_id}` : 'group page · reward'}
                    </p>

                    {/* Flex row kept for a future hangul name — idols have no Korean
                        name in the schema yet, only groups do. */}
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                        <p
                            className={`font-major-mono-display text-[22px] leading-tight uppercase tracking-[0.01em] lg:text-[30px] ${
                                night ? 'text-white' : 'text-ink'
                            }`}
                        >
                            {isMember ? target.member.artist_name : group.group_name}
                        </p>
                    </div>

                    <p className={`mt-1 text-[12px] font-bold ${night ? 'text-white/62' : 'text-[#7a6b74]'}`}>
                        {isMember ? identity : 'Unlocked by completing every sticker on this page.'}
                    </p>

                    <div className={`my-3.5 h-px lg:my-5 ${night ? 'bg-white/16' : 'bg-[#3c2f38]/20'}`} />

                    <div className="flex justify-between gap-4 lg:flex-col lg:gap-3.5">
                        {cells.map((cell, index) => (
                            <MetaRow key={cell.label} cell={cell} align={MOBILE_ALIGN[index]} night={night} />
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
