import type { AlbumMember, AlbumPalette } from '../../../../interfaces/albumInterfaces';
import goldTextureSrc from '../../../../assets/materials/AlbumOfCol/gold.jpg';
// import holoTextureSrc from '../../../../assets/materials/AlbumOfCol/holo (4).jpg';
import './AlbumMemberCard.css';

interface AlbumMemberCardProps {
    member: AlbumMember;
    palette: AlbumPalette;
}

type CardTreatment = 'base' | 'gold' | 'holo';

const treatmentForLevel = (level: number): CardTreatment =>
    level >= 3 ? 'holo' : level === 2 ? 'gold' : 'base';

/** Textured fill behind the frame ring / badge / banner on gold and holo cards */
function TextureFill({ treatment }: { treatment: CardTreatment }) {
    if (treatment === 'base') return null;
    if (treatment === 'gold') {
        return (
            <>
                <img src={goldTextureSrc} alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full object-cover" />
                <span aria-hidden className="album-gold-tint pointer-events-none absolute inset-0" />
                <span aria-hidden className="album-gold-sheen pointer-events-none absolute inset-0" />
            </>
        );
    }
    return <span aria-hidden className="album-holo-fill pointer-events-none absolute inset-0" />;
}

/** Full-card holo laminate — rainbow bands, foil micro-lines and a drifting
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

export default function AlbumMemberCard({ member, palette }: AlbumMemberCardProps) {
    const level = member.level ?? 1;
    const treatment = treatmentForLevel(level);
    const isBaseLevel = treatment === 'base';
    const groupColorFill = { background: palette.main };
    const levelTextClass = isBaseLevel
        ? 'text-black [text-shadow:1px_1px_1px_rgba(0,0,0,0.2)]'
        : 'album-card-name text-[#FFF6D8]';

    return (
        <div
            className={`relative h-55 w-40 overflow-clip rounded-sm ${isBaseLevel ? 'p-0.75' : 'p-1.25'}`}
            style={isBaseLevel ? groupColorFill : undefined}
        >
            {/* frame ring */}
            <TextureFill treatment={treatment} />
            <div className="relative flex size-full flex-col justify-between overflow-clip bg-[rgba(217,217,217,0.32)]">
                <img
                    src={member.src || undefined}
                    alt={member.artist_name}
                    loading="lazy"
                    className="pointer-events-none absolute inset-0 size-full object-cover"
                />
                {/* LV badge */}
                <div className="relative mr-1.5 mt-3 rotate-6 self-end">
                    <div className={`relative flex h-5 w-11 items-center justify-center overflow-clip rounded-sm ${isBaseLevel ? 'bg-[#d9d9d9]' : ''}`}>
                        <TextureFill treatment={treatment} />
                        <p className={`font-major-mono-display relative whitespace-nowrap text-[12px] font-bold leading-[normal] ${levelTextClass}`}>
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
                            member.artist_name.length > 10 ? 'text-[14px]' : 'text-[18px]'
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
