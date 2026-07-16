// Album 1 Collection — unlocked member sticker card (members pages).
// Every card shares the same composition: accent border, name banner slabs, KPOPIT
// tag and LV badge. The accent color is exposed as --card-accent and will be driven
// by the card level later; for now every level uses the group's main page color.

import type { CSSProperties } from 'react';
import type { AlbumMember, AlbumRamp } from './albumTypes';
import { albumCoverUrl } from '../../utils/imageUrl';

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
            className="relative h-55 w-40 overflow-clip rounded-sm border-[3px] border-(--card-accent) bg-[rgba(217,217,217,0.32)]"
            style={accentVars}
        >
            <img
                src={albumCoverUrl(member.image_path)}
                alt={member.artist_name}
                loading="lazy"
                className="pointer-events-none absolute inset-0 size-full object-cover"
            />
            {/* name banner slabs */}
            <div className="absolute left-2 top-45 flex flex-col gap-px">
                <div className="h-5 w-21.5 rounded-br-xl rounded-tl-xl bg-(--card-accent)" />
                <div className="h-3.5 w-18.75 rounded-bl-xl rounded-tr-xl bg-(--card-accent)" />
            </div>
            <div className="font-major-mono-display absolute left-3.25 top-45.25 flex w-35 flex-col gap-0.75 text-white [text-shadow:2px_2px_2px_rgba(0,0,0,0.6)]">
                <p className={`whitespace-nowrap leading-[normal] ${member.artist_name.length > 9 ? 'text-[13px]' : 'text-[16px]'}`}>
                    {member.artist_name.toUpperCase()}
                </p>
                <p className="whitespace-nowrap text-[10px] leading-[normal]">{member.real_name.toUpperCase()}</p>
            </div>
            {/* KPOPIT tag */}
            <div className="absolute left-29.25 top-51 h-5 w-13">
                <div className="absolute left-2.25 top-1/2 h-2 w-8.25 -translate-y-1/2 rounded-br-[20px] rounded-tl-[20px] rounded-tr-[20px] bg-black shadow-[2px_2px_2px_0px_rgba(0,0,0,0.3)]" />
                <p className="font-major-mono-display absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[6px] leading-[normal] text-white [text-shadow:1px_1px_2px_rgba(0,0,0,0.5)]">
                    KPOPIT
                </p>
            </div>
            {/* LV badge */}
            <div className="absolute left-28.75 top-2.75 rotate-6">
                <div className="flex h-3 w-7.5 items-center justify-center rounded-sm bg-[#d9d9d9]">
                    <p className="font-major-mono-display whitespace-nowrap text-[8px] font-bold leading-[normal] text-black">
                        LV.{member.level ?? 1}
                    </p>
                </div>
            </div>
        </div>
    );
}
