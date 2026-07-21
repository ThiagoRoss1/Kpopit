import type { ReactNode } from 'react';
import AlbumContentShell, { type AlbumPageSide } from '../shell/AlbumContentShell';
import AlbumMemberCard from '../cards/AlbumMemberCard';
import { AlbumLockedSlot } from '../cards/AlbumLocked';
import type { AlbumGroup, AlbumMember } from '../../../../interfaces/albumInterfaces';

interface MembersFrameProps {
    group: AlbumGroup;
    pageLabel: string;
    children?: ReactNode;
}

export function AlbumMembersFrame({ group, pageLabel, children }: MembersFrameProps) {
    const owned = group.members.filter((m) => m.owned).length;
    return (
        <div className="relative flex h-full flex-col px-7.5 pb-2.5 pt-7.5">
            {/* Header row: title block + collected count box */}
            <div className="flex items-start justify-between">
                <div className="w-54.5 text-black">
                    <p className="font-major-mono-display text-[42px] leading-[0.85] uppercase">Members</p>
                    <div className="mt-2 flex items-end justify-between text-[14px] leading-[normal]">
                        <p className="font-major-mono-display uppercase">
                            Page <span className="font-sans">{pageLabel}</span>
                        </p>
                        <p className="font-major-mono-display uppercase">{group.group_name}</p>
                    </div>
                </div>
                <div className="mt-2.5 flex h-10 w-15 items-center justify-center rounded-br-[20px] rounded-tl-[20px] border border-[#737373] bg-white drop-shadow-[2px_4px_2px_rgba(0,0,0,0.4)]">
                    <p className="whitespace-nowrap font-sans text-[22px] leading-[normal] text-(--album-light) [text-shadow:0.5px_0.5px_2px_rgba(0,0,0,0.35)]">
                        {owned}/{group.members.length}
                    </p>
                </div>
            </div>
            {/* Top line */}
            <div className="mt-2 h-0.5 w-full bg-white shadow-[2px_2px_4px_0px_rgba(0,0,0,0.25)]" />
            {/* Middle area */}
            <div className="flex min-h-0 flex-1 flex-col justify-center">{children}</div>
            {/* Bottom line + Footer */}
            <div className="h-0.5 w-full bg-white shadow-[2px_2px_4px_0px_rgba(0,0,0,0.25)]" />
            <div className="mt-1 flex items-center justify-between uppercase">
                <div className="flex items-center gap-1">
                    <div className="size-2.5 rounded-full bg-white" />
                    <p className="font-major-mono-display whitespace-nowrap text-[10px] leading-[normal] text-white [text-shadow:1px_1px_1px_rgba(0,0,0,0.6)]">
                        KpopIt
                    </p>
                </div>
                <p className="font-major-mono-display font-bold whitespace-nowrap text-[10px] leading-[normal] text-black [text-shadow:1px_1px_1px_rgba(0,0,0,0.6)]">
                    Next Page →
                </p>
            </div>
        </div>
    );
}

interface AlbumMembersPageProps {
    group: AlbumGroup;
    slots: Array<AlbumMember | null>;
    startSlot: number;
    pageLabel: string;
    side: AlbumPageSide;
}

const SLOTS_PER_ROW = 2;

export default function AlbumMembersPage({ group, slots, startSlot, pageLabel, side }: AlbumMembersPageProps) {
    const slotRows = [slots.slice(0, 2), slots.slice(2, 4), slots.slice(4, 6)];

    return (
        <AlbumContentShell groupName={group.group_name} palette={group.palette} side={side}>
            <AlbumMembersFrame group={group} pageLabel={pageLabel}>
                {/* No z on the container so each slot picks its own layer against the
                    shell overlays: owned stickers sit ABOVE the paper grain (z-40 vs
                    z-30 — laminated plastic), locked slots stay under it (printed). */}
                <div className="flex flex-col justify-center gap-5">
                    {slotRows.map((rowMembers, rowIndex) => (
                        <div key={rowIndex} className="flex justify-center gap-27">
                            {rowMembers.map((member, columnIndex) => {
                                const slotNumber = startSlot + rowIndex * SLOTS_PER_ROW + columnIndex + 1;
                                const tiltClass = columnIndex === 0 ? '-rotate-2' : 'rotate-2';

                                if (!member) {
                                    return <div key={`empty-slot-${slotNumber}`} className="h-57.5 w-42.5" />;
                                }
                                return (
                                    <div
                                        key={member.card_id}
                                        className={`relative flex h-57.5 w-42.5 items-center justify-center ${member.owned ? 'z-40' : 'z-20'}`}
                                    >
                                        <div className={tiltClass}>
                                            {member.owned ? (
                                                <AlbumMemberCard member={member} palette={group.palette} />
                                            ) : (
                                                <AlbumLockedSlot slotNumber={slotNumber} name={member.artist_name} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </AlbumMembersFrame>
        </AlbumContentShell>
    );
}
