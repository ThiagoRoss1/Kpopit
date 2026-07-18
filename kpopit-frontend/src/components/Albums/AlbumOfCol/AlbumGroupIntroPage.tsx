// Album 1 Collection — "We Are {Group}" intro page (left page of each group block).
// Header + SET box, central 3-in-1 block: group photo (white border or locked
// placeholder), ALBUM PROGRESS bar, GROUP FILE table (74px below the bar).
// Group colors come from the shell's --a0…--a4 vars; the photo sits above the
// lighting pass (z-20), everything else below it so it gets illuminated.

import type { CSSProperties } from 'react';
import AlbumContentShell, { type AlbumPageSide } from './AlbumContentShell';
import { AlbumLockedGroupPhoto } from './AlbumLocked';
import { generateAlbumRamp } from '../albumPalette';
import type { AlbumGroup } from '../albumTypes';

interface AlbumGroupIntroPageProps {
    group: AlbumGroup;
    side?: AlbumPageSide;
}

export default function AlbumGroupIntroPage({ group, side = 'left' }: AlbumGroupIntroPageProps) {
    const ramp = generateAlbumRamp(group.source_color);
    const total = group.members.length;
    const owned = group.members.filter((m) => m.owned).length;
    const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
    const photoUnlocked = Boolean(group.group_photo?.owned && group.group_photo_src);
    const fileCells: Array<[string, string]> = [
        ['DEBUT', String(group.debut_year)],
        ['LABEL', group.label],
        ['FANDOM', group.fandom_name],
        ['MEMBERS', String(total)],
        ['COMPANY', group.company],
        ['SET', group.set],
    ];
    return (
        <AlbumContentShell groupName={group.group_name} ramp={ramp} side={side}>
            <div className="relative flex h-full flex-col px-7.5 pt-7.5">
                {/* header row: title block + SET box */}
                <div className="flex items-start justify-between">
                    <div className="flex flex-col whitespace-nowrap text-black [text-shadow:0.5px_0.5px_2px_rgba(0,0,0,0.35)] uppercase">
                        <p className="font-major-mono-display text-[22px] leading-[normal]">We are</p>
                        <p className={`font-major-mono-display leading-[normal] ${group.group_name.length > 8 ? 'text-[44px]' : 'text-[52px]'}`}>
                            {group.group_name.toUpperCase()}
                        </p>
                        <p className="font-korean text-[22px] font-bold leading-[normal]">{group.hangul_name}</p>
                    </div>
                    <div className="font-major-mono-display flex size-15 flex-col items-center justify-center gap-0.5 rounded-br-[20px] rounded-tl-[20px] border border-white bg-[#d9d9d9] text-center drop-shadow-[2px_4px_2px_rgba(0,0,0,0.4)] [text-shadow:0.5px_0.5px_2px_rgba(0,0,0,0.35)]">
                        <p className="text-[30px] leading-none text-(--a4)">{group.set}</p>
                        <p className="text-[16px] leading-none text-(--a0)">SET</p>
                    </div>
                </div>
                {/* central 3-in-1 block */}
                <div className="flex flex-1 flex-col justify-center items-center px-5 pb-22">
                    {/* group photo — above the lighting pass */}
                    {photoUnlocked ? (
                        <div className="relative z-20 h-62.5 w-full overflow-clip rounded-br-[20px] rounded-tl-[20px] border-2 border-white bg-white shadow-[2px_4px_4px_0px_rgba(0,0,0,0.3)]">
                            <img src={group.group_photo_src!} alt={group.group_name} className="pointer-events-none absolute inset-0 size-full object-cover" />
                        </div>
                    ) : (
                        <AlbumLockedGroupPhoto groupName={group.group_name} className="z-20 h-62.5 w-full" pageLabel='groupIntro' />
                    )}
                    {/* album progress */}
                    <div className="mt-3 w-full">
                        <div className="flex items-center justify-between uppercase">
                            <p className="font-major-mono-display text-[22px] leading-[normal] text-(--a2) [text-shadow:1px_1px_1px_rgba(0,0,0,0.5)]">
                                Album Progress
                            </p>
                            <p className="font-major-mono-display font-bold text-[22px] leading-[normal] text-white [text-shadow:1px_1px_1px_rgba(0,0,0,0.5)]">
                                {owned}/{total}
                            </p>
                        </div>
                        <div
                            className="mt-1.5 h-2.5 w-full overflow-hidden rounded-br-[20px] rounded-tl-[20px] border border-white bg-white/20 shadow-[2px_2px_4px_0px_rgba(0,0,0,0.3)]"
                            style={{ '--progress': `${pct}%` } as CSSProperties}
                        >
                            <div className="h-full w-(--progress) rounded-br-[20px] rounded-tl-[20px] bg-linear-to-r from-(--a0) to-(--a4)" />
                        </div>
                    </div>
                    {/* group file table — 2 columns × 3 rows, symmetric */}
                    <div className="mt-18.5 w-full overflow-clip rounded-br-[20px] rounded-tl-[20px] bg-white drop-shadow-[2px_4px_2px_rgba(0,0,0,0.4)]">
                        <div className="flex h-8.5 items-center justify-between bg-(--a0) px-5">
                            <p className="font-sans font-bold text-[22px] leading-[normal] text-white [text-shadow:0.5px_0.5px_2px_rgba(0,0,0,0.5)]">
                                GROUP FILE
                            </p>
                            <p className="text-[22px] leading-[normal] text-white [text-shadow:0.5px_0.5px_2px_rgba(0,0,0,0.5)]">
                                {owned}/{total}
                            </p>
                        </div>
                        <div className="grid grid-cols-2">
                            {fileCells.map(([label, value], i) => (
                                <div
                                    key={label}
                                    className={`flex items-center justify-between px-5 py-2 font-sans font-bold text-[16px] leading-[normal] text-black [text-shadow:0.5px_0.5px_2px_rgba(0,0,0,0.25)] ${i % 2 === 0 ? 'border-r border-[#cdcdcd]' : ''} ${i < 4 ? 'border-b border-[#cdcdcd]' : ''}`}
                                >
                                    <span>{label}</span>
                                    <span>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AlbumContentShell>
    );
}
