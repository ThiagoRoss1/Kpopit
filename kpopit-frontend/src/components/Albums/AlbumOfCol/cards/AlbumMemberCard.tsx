import type { CSSProperties } from 'react';
import type { AlbumMember, AlbumPalette } from '../../../../interfaces/albumInterfaces';
import { albumCoverUrl } from '../../../../utils/imageUrl';
import goldSrc from '../../../../assets/materials/AlbumOfCol/gold.jpg';
import './AlbumMemberCard.css';

interface AlbumMemberCardProps {
    member: AlbumMember;
    palette: AlbumPalette;
}

type CardDeco = 'base' | 'gold' | 'holo';

const treatmentFor = (level: number): CardDeco =>
    level >= 3 ? 'holo' : level === 2 ? 'gold' : 'base';

function TextureFill({ Deco }: { Deco: CardDeco }) {
    if (Deco === 'base') return null;
    if (Deco === 'gold') {
        return (
            <>
                <img src={goldSrc} alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full object-cover" />
                <span aria-hidden className="album-gold-tint pointer-events-none absolute inset-0" />
                <span aria-hidden className="album-gold-sheen pointer-events-none absolute inset-0" />
            </>
        );
    }
    return <span aria-hidden className="album-holo-fill pointer-events-none absolute inset-0" />;
}

export default function AlbumMemberCard({ member, palette }: AlbumMemberCardProps) {
    const level = member.level ?? 1;
    const treatment = treatmentFor(level);
    const accentVars = { '--card-accent': palette.main } as CSSProperties;
    const lvTextClass =
        treatment === 'base'
            ? 'text-black [text-shadow:1px_1px_1px_rgba(0,0,0,0.2)]'
            : 'album-card-name text-[#FFF6D8]';
    return (
        <div
            className={`relative h-55 w-40 overflow-clip rounded-sm ${
                treatment === 'base' ? 'bg-(--card-accent) p-0.75' : 'p-1.25'
            }`}
            style={accentVars}
        >
            <TextureFill Deco={treatment} />
            <div className="relative flex size-full flex-col justify-between overflow-clip bg-[rgba(217,217,217,0.32)]">
                <img
                    src={albumCoverUrl(member.image_path)}
                    alt={member.artist_name}
                    loading="lazy"
                    className="pointer-events-none absolute inset-0 size-full object-cover"
                />
                {treatment === 'holo' && (
                    <>
                        <span aria-hidden className="album-holo-overlay pointer-events-none absolute inset-0" />
                        <span aria-hidden className="album-holo-foil pointer-events-none absolute inset-0" />
                        <span aria-hidden className="album-holo-glare pointer-events-none absolute inset-0" />
                    </>
                )}
                {/* LV badge */}
                <div className="relative mr-1.5 mt-3 rotate-6 self-end">
                    <div className={`relative flex h-5 w-11 items-center justify-center overflow-clip rounded-sm ${treatment === 'base' ? 'bg-[#d9d9d9]' : ''}`}>
                        <TextureFill Deco={treatment} />
                        <p className={`font-major-mono-display relative whitespace-nowrap text-[12px] font-bold leading-[normal] ${lvTextClass}`}>
                            LV.{level}
                        </p>
                    </div>
                </div>
                {/* Name banner — carries the level fill on gold and holo */}
                <div className={`relative mb-2 flex h-6.5 w-35 items-center justify-center self-center overflow-clip rounded-br-xl rounded-tl-xl ${treatment === 'base' ? 'bg-(--card-accent)' : ''}`}>
                    <TextureFill Deco={treatment} />
                    <p
                        className={`album-card-name font-major-mono-display relative font-bold whitespace-nowrap uppercase leading-[normal] text-white ${
                            member.artist_name.length > 10 ? 'text-[14px]' : 'text-[18px]'
                        }`}
                    >
                        {member.artist_name}
                    </p>
                </div>
            </div>
        </div>
    );
}
