import { useRef, type CSSProperties } from 'react';
import type { AlbumMember, AlbumPalette } from '../../../../interfaces/albumInterfaces';
import goldTextureSrc from '../../../../assets/materials/AlbumOfCol/gold.jpg';
// import holoTextureSrc from '../../../../assets/materials/AlbumOfCol/holo.jpg';
import { useAlbumPreview } from '../albumPreview';
import { EAGER_ARTWORK_PROPS } from '../albumArtworkLoading';
import { treatmentForLevel, type CardTreatment } from './albumCardLevel';
import { useAlbumAnimationPhase } from './useAlbumAnimationPhase';
import { useSyncAlbumAnimations } from './useSyncAlbumAnimations';
import './AlbumMemberCard.css';

interface AlbumMemberCardProps {
    member: AlbumMember;
    palette: AlbumPalette;
}

/** Textured fill behind the frame ring / badge / banner on gold and holo cards */
export function TextureFill({ treatment }: { treatment: CardTreatment }) {
    if (treatment === 'base') return null;
    if (treatment === 'gold') {
        return (
            <>
                <img src={goldTextureSrc} alt="" aria-hidden className="album-gold-base pointer-events-none absolute inset-0 size-full object-cover" />
                <span aria-hidden className="album-gold-tint pointer-events-none absolute inset-0" />
                <span aria-hidden className="album-gold-sheen pointer-events-none absolute inset-0" />
            </>
        );
    }
    return <span aria-hidden className="album-holo-fill pointer-events-none absolute inset-0" />;
}

/* Full-card holo laminate — rainbow bands, foil micro-lines and a drifting
    glare stacked over everything, so the sticker reads as laminated plastic */
function HoloLaminate() {
    return (
        <>
            {/* <img src={holoTextureSrc} alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full object-cover mix-blend-multiply opacity-60" /> */}
            <span aria-hidden className="album-holo-overlay pointer-events-none absolute inset-0" />
            <span aria-hidden className="album-holo-foil pointer-events-none absolute inset-0" />
            <span aria-hidden className="album-holo-glare pointer-events-none absolute inset-0" />
        </>
    );
}

/* Thumbnail stand-in: same footprint as the real card, no photo/gold/holo — just the owned fill. */
function AlbumMemberCardPreview({ palette }: { palette: AlbumPalette }) {
    return <div className="h-55 w-40 rounded-sm" style={{ background: palette.main }} />;
}

export default function AlbumMemberCard({ member, palette }: AlbumMemberCardProps) {
    const preview = useAlbumPreview();
    const cardRef = useRef<HTMLDivElement>(null);
    const level = member.level ?? 1;
    const treatment = treatmentForLevel(level);
    const animationPhase = useAlbumAnimationPhase();

    useSyncAlbumAnimations(cardRef, treatment);

    if (preview) return <AlbumMemberCardPreview palette={palette} />;

    const isBaseLevel = treatment === 'base';
    const groupColorFill = { background: palette.main };
    const cardStyle = {
        ...animationPhase,
        '--album-main': palette.main,
        ...(isBaseLevel ? groupColorFill : {}),
    } as CSSProperties;
    const levelTextClass = isBaseLevel
        ? 'text-black [text-shadow:1px_1px_1px_rgba(0,0,0,0.2)]'
        : 'album-card-name text-[#FFF6D8]';

    return (
        <div
            ref={cardRef}
            data-treatment={treatment}
            className={`album-card-isolate relative h-55 w-40 overflow-clip rounded-sm ${isBaseLevel ? 'p-0.75' : 'p-1.25'}`}
            style={cardStyle}
        >
            {/* frame ring */}
            <TextureFill treatment={treatment} />
            <div className="relative flex size-full flex-col justify-between overflow-clip bg-[rgba(217,217,217,0.32)]">
                <img
                    src={member.src || undefined}
                    alt={member.artist_name}
                    {...EAGER_ARTWORK_PROPS}
                    className="pointer-events-none absolute inset-0 size-full object-cover"
                />
                <div className="album-lv-badge relative mr-1.5 mt-3 rotate-6 self-end">
                    <div className={`relative flex h-6 w-13 items-center justify-center overflow-clip rounded-sm ${isBaseLevel ? 'bg-[#d9d9d9]' : ''}`}>
                        <TextureFill treatment={treatment} />
                        <p className={`font-major-mono-display relative whitespace-nowrap text-[14px] font-bold leading-[normal] ${levelTextClass}`}>
                            LV.{level}
                        </p>
                    </div>
                </div>
                
                {/* Name banner — carries the level fill on gold and holo */}
                <div
                    className="relative mb-2 flex h-6.5 w-35 items-center justify-center self-center overflow-clip rounded-br-xl rounded-tl-xl"
                    style={isBaseLevel ? groupColorFill : undefined}
                >
                    <TextureFill treatment={treatment} />
                    <p
                        className={`album-card-name font-major-mono-display relative font-bold whitespace-nowrap uppercase leading-[normal] text-white ${
                            member.artist_name.length > 14
                            ? 'text-[11px]'
                            : member.artist_name.length > 10
                                ? 'text-[14px]' 
                            : 'text-[18px]'
                        }`}
                    >
                        {member.artist_name}
                    </p>
                </div>
            </div>
            {/* laminate above everything — covers the whole card, corners clipped by the wrapper */}
            {treatment === 'holo' && <HoloLaminate />}
        </div>
    );
}
