// Album 1 Collection — shared shell for the cover-style pages (front/back cover,
// stats page, next-group pre-cover). Greige paper, tiled OFFICIAL COLLECTION
// watermark, giant vertical KPOPIT bleeding off the outer edge, coral waves at the
// base, vetor circle at the top corner. `mirrored` flips the whole decor field
// exactly like the Figma back-cover/stats frames (including the reversed lettering).

import type { ReactNode } from 'react';
import { COVER_RAMP } from '../albumPalette';
import { HorizontalWaves, VetorCircle } from './AlbumDecorShapes';
import { TextureLighting, GrainParticles, CoverInsetShadow } from '../AlbumOfCol/AlbumTextures';

const SPINE_GRADIENT_CLASS =
    'bg-[linear-gradient(180deg,#d9d9d9_0%,#d9d9d9_82.674%,#da685f_82.823%,#ba4a51_87.981%,#b84156_93.469%,#b23258_95.905%,#a61f58_99.377%)]';

export type AlbumSpine = 'hardcover-right' | 'hardcover-left' | 'fold-left' | 'fold-right';

interface AlbumCoverShellProps {
    mirrored?: boolean;
    spine: AlbumSpine;
    /** Pre-cover paints its card above the lighting pass; front/stats sit below it */
    cardAboveLighting?: boolean;
    children?: ReactNode;
}

function CoverDecor() {
    return (
        <>
            {/* tiled OFFICIAL COLLECTION watermark — wraps inside 422px to stagger like the frames */}
            <div aria-hidden className="font-major-mono-display absolute -top-2.75 left-44 flex w-105.5 flex-col gap-5 overflow-hidden 
            wrap-break-word text-[30px] leading-[normal] text-black/15 uppercase">
                {Array.from({ length: 18 }).map((_, i) => (
                    <p key={i}>Official Collection</p>
                ))}
            </div>
            {/* vetor circle, top corner */}
            <div aria-hidden className="absolute -top-53 left-54.75 h-120.75 w-120">
                <VetorCircle color={COVER_RAMP[2]} className="size-full rotate-90" />
            </div>
            {/* coral waves at the base */}
            <HorizontalWaves ramp={COVER_RAMP} className="absolute bottom-0 left-0 h-38.75 w-full" />
            {/* giant vertical KPOPIT reading upward, tops bleeding off the outer edge — above the waves */}
            <div aria-hidden className="absolute -left-0.5 -top-1.25 flex h-226.25 w-150 items-center justify-center">
                <div className="-rotate-90">
                    <div className="relative h-150 w-226.25">
                        <p className="font-major-mono-display absolute -top-3.5 left-1.5 whitespace-nowrap text-[200px] leading-[normal] text-black/50 uppercase">
                            KpopIt
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

function Spine({ spine }: { spine: AlbumSpine }) {
    if (spine === 'fold-left' || spine === 'fold-right') {
        return (
            <div
                aria-hidden
                className={`absolute -bottom-1.5 -top-1.5 w-1 bg-black ${spine === 'fold-left' ? 'left-0' : 'right-0'}`}
            />
        );
    }
    const right = spine === 'hardcover-right';
    const shadowClass = right
        ? 'shadow-[-18px_4px_4px_4px_rgba(0,0,0,0.5),2px_4px_6px_1px_rgba(0,0,0,0.4)]'
        : 'shadow-[18px_4px_4px_4px_rgba(0,0,0,0.5),-2px_4px_6px_1px_rgba(0,0,0,0.4)]';
    return (
        <>
            <div
                aria-hidden
                className={`absolute -bottom-1.5 -top-1.5 w-2.5 ${right ? 'right-0' : 'left-0'} ${SPINE_GRADIENT_CLASS} ${shadowClass}`}
            />
            <div
                aria-hidden
                className={`absolute -bottom-1.5 -top-1.5 w-0.5 ${right ? 'right-4.75' : 'left-4.75'} ${SPINE_GRADIENT_CLASS}`}
            />
        </>
    );
}

export default function AlbumCoverShell({ mirrored = false, spine, cardAboveLighting = false, children }: AlbumCoverShellProps) {
    return (
        <div className="relative h-225 w-150 overflow-hidden bg-[#d9d9d9]">
            <div className={`absolute inset-0 ${mirrored ? '-scale-x-100' : ''}`}>
                <CoverDecor />
            </div>
            <GrainParticles />
            {!cardAboveLighting && children}
            <TextureLighting />
            {cardAboveLighting && children}
            <Spine spine={spine} />
            <CoverInsetShadow />
        </div>
    );
}
