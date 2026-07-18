// Album 1 Collection — hardcover front/back of the album. The two faces mirror each
// other (variant prop, single component per the plan): the back is the mirrored
// decor field with no card.

import AlbumCoverShell from './AlbumCoverShell';
import type { AlbumStats } from '../albumTypes';

// Fixed cover ramp gradient (COVER_RAMP deepest → mid → lightest), as a static class
const COVER_TEXT_GRADIENT_CLASS = 'bg-[linear-gradient(90deg,#C62368_0%,#E34C67_50.481%,#FA7268_100%)]';

interface AlbumCoverProps {
    variant: 'front' | 'back';
    stats?: AlbumStats;
}

function GradientRule({ widthClass }: { widthClass: string }) {
    return <div className={`h-0.5 ${COVER_TEXT_GRADIENT_CLASS} ${widthClass}`} />;
}

export default function AlbumCover({ variant }: AlbumCoverProps) {
    if (variant === 'back') {
        return <AlbumCoverShell mirrored spine="hardcover-right" />;
    }

    return (
        <AlbumCoverShell spine="hardcover-left">
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-120 w-95 flex-col items-center justify-center rounded-br-[80px] rounded-tl-[80px] bg-[#d9d9d9] px-10.25 drop-shadow-[2px_-2px_3px_rgba(0,0,0,0.3)]">
                    <div className="flex w-74.5 flex-col items-center gap-3.5">
                        <div className="flex w-57.75 flex-col items-center gap-3.5">
                            <p className="font-major-mono-display w-full text-center text-[14px] leading-[normal] text-[rgba(66,66,66,0.7)]">
                                OFFICIAL COLLECTION
                            </p>
                            <div className="flex w-full flex-col items-center drop-shadow-[1px_1px_1px_rgba(0,0,0,0.5)]">
                                <GradientRule widthClass="w-55.25" />
                                <div className="flex w-full flex-col items-center gap-2">
                                    <p className={`font-major-mono-display bg-clip-text text-center text-[52px] leading-[normal] text-transparent ${COVER_TEXT_GRADIENT_CLASS}`}>
                                        KPOPIT
                                    </p>
                                    <GradientRule widthClass="w-25" />
                                </div>
                            </div>
                        </div>
                        <div className="flex w-full flex-col items-center gap-3.5">
                            <div className="flex w-full flex-col items-center gap-3.5 drop-shadow-[1px_1px_1px_rgba(0,0,0,0.5)]">
                                <p className="font-major-mono-display whitespace-nowrap text-[22px] leading-[normal] text-[rgba(66,66,66,0.7)]">
                                    ALBUM 1
                                </p>
                                <div className="flex items-center justify-center gap-2">
                                    <p className="font-korean whitespace-nowrap text-[22px] leading-[normal] text-[rgba(66,66,66,0.7)]">케이팝잇</p>
                                    <div className="size-3.5 rounded-full bg-[rgba(66,66,66,0.7)]" />
                                    <p className="font-korean whitespace-nowrap text-[22px] leading-[normal] text-[rgba(66,66,66,0.7)]">앨범.1</p>
                                </div>
                            </div>
                            {/* <div className="flex items-center gap-3 drop-shadow-[0.5px_0.5px_1px_rgba(0,0,0,0.3)]">
                                <p className="font-major-mono-display whitespace-nowrap text-[18px] leading-[normal] text-[rgba(227,76,103,0.7)]">
                                    {stats ? stats.groups_total : 0} GROUPS
                                </p>
                                <div className="size-3 rounded-full bg-[rgba(227,76,103,0.7)]" />
                                <p className="font-major-mono-display whitespace-nowrap text-[18px] leading-[normal] text-[rgba(227,76,103,0.7)]">
                                    {stats ? stats.total : 0} STICKERS
                                </p>
                            </div> */}
                        </div>
                    </div>
                </div>
            </div>
        </AlbumCoverShell>
    );
}
