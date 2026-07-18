// Album 1 Collection — unlocked member sticker card (members pages).
// Every card shares the same composition: accent border, name banner slabs, KPOPIT
// tag and LV badge. The accent color is exposed as --card-accent and will be driven
// by the card level later; for now every level uses the group's main page color.

import type { CSSProperties } from 'react';
import type { AlbumMember, AlbumRamp } from '../albumTypes';
import { albumCoverUrl } from '../../../utils/imageUrl';

interface AlbumMemberCardProps {
    member: AlbumMember;
    ramp: AlbumRamp;
}

/** Level → accent mapping. Level tiers arrive later; today every level maps to the group main color. */
function cardAccent(ramp: AlbumRamp, level: number): string {
    void level;
    return ramp[2];
}

export default function AlbumMemberCard({ member, ramp }: AlbumMemberCardProps) {
    const accentVars = { '--card-accent': cardAccent(ramp, member.level ?? 1) } as CSSProperties;
    return (
        <div
            className="relative flex h-55 w-40 flex-col justify-between overflow-clip rounded-sm border-[3px] border-(--card-accent) bg-[rgba(217,217,217,0.32)]"
            style={accentVars}
        >
            <img
                src={albumCoverUrl(member.image_path)}
                alt={member.artist_name}
                loading="lazy"
                className="pointer-events-none absolute inset-0 size-full object-cover"
            />
            {/* LV badge */}
            <div className="relative mr-1.5 mt-3 rotate-6 self-end">
                <div className="flex h-5 w-11 items-center justify-center rounded-sm bg-[#d9d9d9]">
                    <p className="font-major-mono-display whitespace-nowrap text-[12px] font-bold
                    leading-[normal] text-black [text-shadow:1px_1px_1px_rgba(0,0,0,0.2)]">
                        LV.{member.level ?? 1}
                    </p>
                </div>
            </div>
            {/* name banner */}
            <div className="relative mb-2 flex h-6.5 w-35 items-center justify-center self-center rounded-br-xl rounded-tl-xl bg-(--card-accent)">
                <p
                    className={`font-major-mono-display font-bold whitespace-nowrap uppercase leading-[normal] text-white
                    [text-shadow:2px_2px_1px_rgba(0,0,0,1)] ${member.artist_name.length > 10 ? 'text-[14px]' : 'text-[18px]'}`}
                >
                    {member.artist_name}
                </p>
            </div>
        </div>
    );
}
