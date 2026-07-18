// Album 1 Collection — shared locked-state pieces, reused across the pre-cover,
// "We Are" and members pages (single implementation per the plan's constraints).
import { LockKeyhole } from "lucide-react";

interface AlbumLockedSlotProps {
    slotNumber: number;
    name: string;
}

/** Dashed empty sticker slot on the members pages */
export function AlbumLockedSlot({ slotNumber, name }: AlbumLockedSlotProps) {
    return (
        <div className="relative h-56 w-40.5 rounded-sm border border-dashed border-black">
            <div className="font-major-mono-display absolute left-0 top-px h-55 w-40 overflow-clip rounded-sm border border-white bg-[rgba(217,217,217,0.32)] text-center font-bold uppercase text-black">
                <p className="absolute top-2 -z-5 w-full font-sans text-[52px] font-bold leading-[normal]">{slotNumber}</p>
                <div className="flex size-full flex-col items-center justify-center gap-1">
                    <p className="text-2xl leading-[normal]">{name}</p>
                    <p className="text-sm leading-[normal]">Locked</p>
                </div>
                <div className="absolute bottom-2.5 left-2.25 flex w-35.25 flex-col gap-0.5 text-[10px] leading-[normal]">
                    <p>Keep Playing KpopIt</p>
                    <p>To Unlock</p>
                </div>
            </div>
        </div>
    );
}

interface AlbumLockedGroupPhotoProps {
    groupName: string;
    className?: string;
    pageLabel?: string;
}

/** Dotted group-photo placeholder shown until every sticker in the group is unlocked */
export function AlbumLockedGroupPhoto({ groupName, className = '', pageLabel }: AlbumLockedGroupPhotoProps) {
    return (
        <div className={`font-major-mono-display relative flex flex-col items-center justify-center gap-4 rounded-br-[20px] rounded-tl-[20px] border-2 border-dashed border-black/60 bg-[rgba(217,217,217,0.32)] text-center font-bold uppercase text-black ${className}`}>
            <span className="flex flex-col items-center justify-center w-full gap-4 z-50">
                <p className={`leading-[normal] ${groupName.length > 8 ? `${pageLabel == 'groupIntro' ? 'text-3xl' : 'text-[20px]'}` : `${pageLabel == 'groupIntro' ? 'text-4xl' : 'text-[26px]'}`}`}>{groupName}</p>
                <p className={`flex ${pageLabel == 'groupIntro' ? 'text-2xl' : 'text-lg'} leading-[normal] tracking-[0.2em]`}>Locked</p>
            </span>

            <div className="absolute inset-0 z-0">
                <LockKeyhole className="w-full h-full object-cover text-black opacity-10" />
            </div>
        </div>
    );
}
