import { useRef } from 'react';
import AlbumContentShell, { type AlbumPageSide } from '../shell/AlbumContentShell';
import { AlbumLockedGroupPhoto } from '../cards/AlbumLocked';
import { TextureFill } from '../cards/AlbumMemberCard';
import { treatmentForGroup } from '../cards/albumCardLevel';
import { useAlbumAnimationPhase } from '../cards/useAlbumAnimationPhase';
import { useSyncAlbumAnimations } from '../cards/useSyncAlbumAnimations';
import { useAlbumPreview } from '../albumPreview';
import { useCardZoom } from '../albumCardZoom';
import type { AlbumGroup } from '../../../../interfaces/albumInterfaces';
import { formatCompanyName } from '../../../../utils/formatters';
import { EAGER_ARTWORK_PROPS } from '../albumArtworkLoading';

interface AlbumGroupIntroPageProps {
    group: AlbumGroup;
    side?: AlbumPageSide;
}

export default function AlbumGroupIntroPage({ group, side = 'left' }: AlbumGroupIntroPageProps) {
    const total = group.members.length;
    const owned = group.members.filter((member) => member.owned).length;

    const progressPercentage = total > 0 ? Math.round((owned / total) * 100) : 0;
    const photoUnlocked = Boolean(group.group_photo?.owned && group.group_photo?.src);
    const photoFrame = treatmentForGroup(group.members);
    const preview = useAlbumPreview();
    const zoom = useCardZoom();
    const photoRef = useRef<HTMLDivElement>(null);
    const animationPhase = useAlbumAnimationPhase();

    useSyncAlbumAnimations(photoRef, photoFrame);

    const fileCells: Array<[string, string]> = [
        ['DEBUT', group.debut_year != null ? String(group.debut_year) : ''],
        ['LABEL', formatCompanyName(group.label)],
        ['FANDOM', group.fandom_name],
        ['MEMBERS', String(total)],
        ['COMPANY', formatCompanyName(group.company)],
        ['SET', group.set],
    ];

    return (
        <AlbumContentShell groupName={group.group_name} palette={group.palette} side={side}>
            <div className="relative flex h-full flex-col px-7.5 pt-7.5">
                {/* Header row: title block + SET box */}
                <div className="flex items-start justify-between">
                    <div className={`flex flex-col whitespace-nowrap uppercase [text-shadow:1px_1px_0px_rgba(0,0,0,1)]
                    ${group.palette.main.toUpperCase() === '#000000' ? 'text-white' : 'text-black'}`}>
                        <p className="font-major-mono-display text-[22px] leading-[normal]">We are</p>
                        <p className={`font-major-mono-display leading-[normal] 
                        ${group.group_name.length > 14 
                            ? 'text-[37px]' 
                            : group.group_name.length > 8
                                ? 'text-[44px]'
                            : 'text-[52px]'}`}>
                            {group.group_name.toUpperCase()}
                        </p>
                        <p className="font-korean text-[22px] font-bold leading-[normal]">{group.hangul_name}</p>
                    </div>
                    <div className="font-major-mono-display flex size-15 flex-col items-center justify-center gap-0.5 rounded-br-[20px] rounded-tl-[20px] 
                    border border-(--album-main) bg-white text-center drop-shadow-[2px_4px_2px_rgba(0,0,0,0.6)] 
                    [text-shadow:0.5px_0.5px_2px_rgba(0,0,0,0.35)] uppercase">
                        <p className="text-[30px] leading-none text-black">{group.set}</p>
                        <p className="text-[16px] leading-none text-black">Set</p>
                    </div>
                </div>

                {/* Central 3-in-1 block */}
                <div className="flex flex-1 flex-col justify-center items-center px-5 pb-22">
                    {preview ? (
                        <div
                            className="z-20 h-62.5 w-full rounded-br-[20px] rounded-tl-[20px] border-2 border-white"
                            style={{ background: group.palette.main }}
                        />
                    ) : photoUnlocked ? (
                        <div
                            ref={photoRef}
                            data-treatment={photoFrame}
                            className={`isolate relative z-20 h-62.5 w-full overflow-clip rounded-br-[20px] rounded-tl-[20px] bg-white shadow-[2px_4px_4px_0px_rgba(0,0,0,0.3)] ${
                            photoFrame === 'base' ? 'border-2 border-white' : 'p-1.5'
                            } ${zoom ? 'cursor-pointer transition-transform duration-200 hover:scale-[1.02]' : ''}`}
                            style={{
                                ...animationPhase,
                                visibility: zoom?.flyingCardId === group.group_photo?.card_id ? 'hidden' : undefined,
                            }}
                            onClick={(event) => {
                                if (!zoom) return;
                                event.stopPropagation();
                                zoom.open({ kind: 'groupPhoto', group, rect: event.currentTarget.getBoundingClientRect() });
                            }}
                        >
                            <TextureFill treatment={photoFrame} />
                            
                            <div className="relative size-full overflow-clip rounded-br-[14px] rounded-tl-[14px]">
                                <img 
                                    src={group.group_photo?.src || undefined} 
                                    alt={group.group_name}
                                    className="pointer-events-none absolute inset-0 size-full object-cover"
                                    draggable={false}
                                    {...EAGER_ARTWORK_PROPS}
                                />
                            </div>
                        </div>
                    ) : (
                        <AlbumLockedGroupPhoto groupName={group.group_name} className="z-20 h-62.5 w-full" pageLabel='groupIntro' />
                    )}

                    {/* Album progress */}
                    <div className="mt-3 w-full">
                        <div className="flex items-center justify-between uppercase">
                            <p className="font-major-mono-display text-[22px] leading-[normal] text-(--album-main) [text-shadow:1px_1px_1px_rgba(0,0,0,0.5)]">
                                Album Progress
                            </p>
                            <p className="font-major-mono-display font-bold text-[22px] leading-[normal] text-white [text-shadow:1px_1px_1px_rgba(0,0,0,0.5)]">
                                {owned}/{total}
                            </p>
                        </div>
                        <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-br-[20px] rounded-tl-[20px] border border-white bg-white/20 shadow-[2px_2px_4px_0px_rgba(0,0,0,0.3)]">
                            <div
                                className="h-full rounded-br-[20px] rounded-tl-[20px] bg-linear-to-r from-(--album-deep) to-(--album-light)"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                    
                    <div className="mt-18.5 w-full overflow-clip rounded-br-[20px] rounded-tl-[20px] bg-white shadow-[2px_4px_2px_rgba(0,0,0,0.4)] uppercase">
                        <div className="flex h-8.5 items-center justify-between bg-(--album-deep) px-5">
                            <p className="font-sans font-bold text-[22px] leading-[normal] text-white [text-shadow:0.5px_0.5px_2px_rgba(0,0,0,0.5)]">
                                Group File
                            </p>
                            <p className="text-[22px] leading-[normal] text-white [text-shadow:0.5px_0.5px_2px_rgba(0,0,0,0.5)]">
                                {owned}/{total}
                            </p>
                        </div>
                        <div className="grid grid-cols-2">
                            {fileCells.map(([label, value], cellIndex) => (
                                <div
                                    key={label}
                                    className={`flex items-center justify-between text-center gap-3 px-5 py-2 font-sans font-bold text-[16px] leading-[normal]
                                        text-black [text-shadow:0.5px_0.5px_2px_rgba(0,0,0,0.25)]
                                        ${cellIndex % 2 === 0 ? 'border-r border-[#cdcdcd]' : ''} ${cellIndex < 4 ? 'border-b border-[#cdcdcd]' : ''}`}
                                >
                                    <span className="flex-none">{label}</span>
                                    <span className={`${value.split(' ').some(word => word.length >= 10) 
                                        ? 'text-sm' 
                                        : value.length >= 13
                                            ? 'text-sm'
                                                : value.length >= 10
                                                ? 'text-base'
                                        : 'text-xl'} min-w-0 flex-1 text-right leading-[1.15] truncate`}>
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AlbumContentShell>
    );
}
