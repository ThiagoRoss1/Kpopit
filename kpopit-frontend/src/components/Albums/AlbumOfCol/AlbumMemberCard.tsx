// Album 1 Collection — unlocked member sticker card (members pages).
// Every card shares the same composition: 3px frame ring, photo, LV badge and name
// banner. The level drives the treatment (COLLECTION_UI_IMPLEMENTATION.md §19):
//   LV1 — frame + banner in the group's main color, gray badge (as before)
//   LV2 — frame, badge background and LV text in gold (gold.jpg material)
//   LV3 — full holo/chroma card: frame, badge and banner carry the animated holo
//         texture, plus a screen-blended holo pass over the photo; the drift/hue
//         animation runs continuously (keyframes in AlbumMemberCard.css)
// The frame is a padded wrapper (not a CSS border) so the textured levels can show
// an image through the ring — border-image can't be animated or blended.

import type { CSSProperties } from 'react';
import type { AlbumMember, AlbumPalette } from '../albumTypes';
import { albumCoverUrl } from '../../../utils/imageUrl';
import goldSrc from '../../../assets/materials/AlbumOfCol/gold.jpg';
import holoSrc from '../../../assets/materials/AlbumOfCol/holo (3).jpg';
import './AlbumMemberCard.css';

interface AlbumMemberCardProps {
    member: AlbumMember;
    palette: AlbumPalette;
}

type CardTreatment = 'base' | 'gold' | 'holo';

const treatmentFor = (level: number): CardTreatment =>
    level >= 3 ? 'holo' : level === 2 ? 'gold' : 'base';

/** Textured fill for the frame ring / badge / banner on gold+holo cards */
function TextureFill({ treatment }: { treatment: CardTreatment }) {
    if (treatment === 'base') return null;
    return (
        <img
            src={treatment === 'gold' ? goldSrc : holoSrc}
            alt=""
            aria-hidden
            className={`pointer-events-none absolute inset-0 size-full object-cover ${treatment === 'holo' ? 'album-holo-drift' : ''}`}
        />
    );
}

export default function AlbumMemberCard({ member, palette }: AlbumMemberCardProps) {
    const level = member.level ?? 1;
    const treatment = treatmentFor(level);
    const accentVars = { '--card-accent': palette.main } as CSSProperties;
    const lvTextClass =
        treatment === 'base'
            ? 'text-black [text-shadow:1px_1px_1px_rgba(0,0,0,0.2)]'
            : 'text-[#FFF6D8] [text-shadow:1px_1px_1px_rgba(110,74,0,0.85)]';
    return (
        <div
            className={`relative h-55 w-40 overflow-clip rounded-sm p-0.75 ${treatment === 'base' ? 'bg-(--card-accent)' : ''}`}
            style={accentVars}
        >
            {/* frame ring */}
            <TextureFill treatment={treatment} />
            <div className="relative flex size-full flex-col justify-between overflow-clip bg-[rgba(217,217,217,0.32)]">
                <img
                    src={albumCoverUrl(member.image_path)}
                    alt={member.artist_name}
                    loading="lazy"
                    className="pointer-events-none absolute inset-0 size-full object-cover"
                />
                {/* holo pass over the photo — whole card shines, not just the chrome */}
                {treatment === 'holo' && (
                    <img
                        src={holoSrc}
                        alt=""
                        aria-hidden
                        className="album-holo-hue pointer-events-none absolute inset-0 size-full object-cover opacity-40 mix-blend-screen"
                    />
                )}
                {/* LV badge */}
                <div className="relative mr-1.5 mt-3 rotate-6 self-end">
                    <div className={`relative flex h-5 w-11 items-center justify-center overflow-clip rounded-sm ${treatment === 'base' ? 'bg-[#d9d9d9]' : ''}`}>
                        <TextureFill treatment={treatment} />
                        <p className={`font-major-mono-display relative whitespace-nowrap text-[12px] font-bold leading-[normal] ${lvTextClass}`}>
                            LV.{level}
                        </p>
                    </div>
                </div>
                {/* name banner */}
                <div className={`relative mb-2 flex h-6.5 w-35 items-center justify-center self-center overflow-clip rounded-br-xl rounded-tl-xl ${treatment === 'holo' ? '' : 'bg-(--card-accent)'}`}>
                    {treatment === 'holo' && <TextureFill treatment={treatment} />}
                    <p
                        className={`font-major-mono-display relative font-bold whitespace-nowrap uppercase leading-[normal] text-white
                        [text-shadow:2px_2px_1px_rgba(0,0,0,1)] ${member.artist_name.length > 10 ? 'text-[14px]' : 'text-[18px]'}`}
                    >
                        {member.artist_name}
                    </p>
                </div>
            </div>
        </div>
    );
}
