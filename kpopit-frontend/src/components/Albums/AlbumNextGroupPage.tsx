// Album 1 Collection — next-group pre-cover (right page facing the stats page).
// Cover shell with the central card: group photo (or the locked placeholder when the
// group photo card isn't unlocked yet) and the group name in its own color gradient.
// The group gradient is exposed as CSS custom properties consumed by Tailwind var
// classes — no styling in style tags.

import type { CSSProperties } from 'react';
import AlbumCoverShell from './AlbumCoverShell';
import { AlbumLockedGroupPhoto } from './AlbumLocked';
import { generateAlbumRamp } from './albumPalette';
import type { AlbumGroup } from './albumTypes';

interface AlbumNextGroupPageProps {
    group: AlbumGroup;
}

export default function AlbumNextGroupPage({ group }: AlbumNextGroupPageProps) {
    const ramp = generateAlbumRamp(group.source_color);
    const gradientVars = { '--g-from': ramp[4], '--g-to': ramp[0] } as CSSProperties;
    const unlocked = Boolean(group.group_photo?.owned && group.group_photo_src);
    return (
        <AlbumCoverShell spine="fold-left" cardAboveLighting>
            <div className="absolute inset-0 flex items-center justify-center" style={gradientVars}>
                <div className="h-120 w-95 rounded-br-[80px] rounded-tl-[80px] bg-[#d9d9d9] shadow-[2px_-2px_6px_1px_rgba(0,0,0,0.3)]">
                    <div className="flex size-full flex-col items-start justify-start gap-20 px-6 py-6">
                        <p className="font-major-mono-display w-full text-center text-[14px] leading-[normal] text-[#2d2d2d] [text-shadow:2px_2px_2px_rgba(0,0,0,0.25)]">
                            OFFICIAL COLLECTION
                        </p>
                        <div className="flex w-full flex-col items-center gap-5">
                            {unlocked ? (
                                <div className="relative h-40 w-full overflow-clip rounded-br-[20px] rounded-tl-[20px] border border-white">
                                    <img
                                        src={group.group_photo_src!}
                                        alt={group.group_name}
                                        className="pointer-events-none absolute inset-0 size-full rounded-br-[20px] rounded-tl-[20px] object-cover"
                                    />
                                </div>
                            ) : (
                                <AlbumLockedGroupPhoto groupName={group.group_name} className="h-40 w-full" />
                            )}
                            <div className="flex w-full flex-col gap-1 text-center [text-shadow:2px_2px_2px_rgba(0,0,0,0.25)]">
                                <p className={`font-major-mono-display bg-linear-to-r from-(--g-from) to-(--g-to) bg-clip-text leading-[normal] text-transparent ${group.group_name.length > 8 ? 'text-[36px]' : 'text-[52px]'}`}>
                                    {group.group_name.toUpperCase()}
                                </p>
                                <p className="font-korean bg-linear-to-r from-(--g-from) to-(--g-to) bg-clip-text text-[28px] font-bold leading-[normal] text-transparent">
                                    {group.hangul_name}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AlbumCoverShell>
    );
}
