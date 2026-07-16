// Album 1 Collection — shared shell for the group content pages ("We Are", members,
// blank). Warm white paper, tiled group-name watermark, and the mirrored decor rule
// from the plan: layered side waves at the spine (inner edge), vetor circle at the
// outer-top corner, vetor2 slab at the outer-bottom corner. `side` picks which page
// of the spread this is; left/right are mirrored copies of each other.
//
// Layering contract: page content renders BELOW the cesira lighting (z-10) so big
// titles get illuminated; anything that must stay crisp above the light (photos,
// sticker cards and their small texts) opts in with `z-20`. The paper grain (z-30)
// multiplies over everything, matching the Figma frames.
//
// The group ramp is exposed as CSS custom properties (--a0…--a4, deepest → lightest)
// so children color themselves with Tailwind var classes instead of style tags.

import type { CSSProperties, ReactNode } from 'react';
import type { AlbumRamp } from './albumTypes';
import { SideWaves, VetorCircle, Vetor2Slab } from './AlbumDecorShapes';
import { CesiraLighting, PaperGrain } from './AlbumTextures';

export type AlbumPageSide = 'left' | 'right';

interface AlbumContentShellProps {
    groupName: string;
    ramp: AlbumRamp;
    side: AlbumPageSide;
    children?: ReactNode;
}

function GroupWatermark({ groupName }: { groupName: string }) {
    const repeats = Math.max(4, Math.ceil(70 / (groupName.length + 1)));
    const row = `${groupName.toUpperCase()} `.repeat(repeats);
    return (
        <div aria-hidden className="font-major-mono-display absolute -left-28.5 -top-2.5 flex w-361 flex-col gap-1.5 overflow-hidden text-[30px] leading-[normal] text-black/5">
            {Array.from({ length: 27 }).map((_, i) => (
                <p key={i} className="whitespace-nowrap">{row}</p>
            ))}
        </div>
    );
}

/** Decor built for the RIGHT page (spine on the left); the left page mirrors the field */
function ContentDecor({ ramp }: { ramp: AlbumRamp }) {
    return (
        <>
            {/* layered side waves hugging the spine — flipped vertically so the band is widest at the top */}
            <div aria-hidden className="absolute -bottom-0.5 -left-10.25 -top-2 w-40.25">
                <SideWaves ramp={ramp} className="size-full rotate-180" />
            </div>
            {/* vetor circle at the outer-top corner (solid corner sits off-canvas top-right) */}
            <div aria-hidden className="absolute -top-53 left-54.75 h-120.75 w-120">
                <VetorCircle color={ramp[2]} className="size-full rotate-90" />
            </div>
            {/* vetor2 slab at the outer-bottom corner (rounded corner faces the page) */}
            <div aria-hidden className="absolute left-64.75 top-185.5 h-55.75 w-118.5">
                <Vetor2Slab color={ramp[4]} className="size-full -scale-x-100" />
            </div>
        </>
    );
}

export default function AlbumContentShell({ groupName, ramp, side, children }: AlbumContentShellProps) {
    const rampVars = {
        '--a0': ramp[0],
        '--a1': ramp[1],
        '--a2': ramp[2],
        '--a3': ramp[3],
        '--a4': ramp[4],
    } as CSSProperties;
    return (
        <div className="relative h-225 w-150 overflow-hidden bg-white" style={rampVars}>
            <GroupWatermark groupName={groupName} />
            <div className={`absolute inset-0 ${side === 'left' ? '-scale-x-100' : ''}`}>
                <ContentDecor ramp={ramp} />
            </div>
            {children}
            <CesiraLighting className="z-10" />
            <PaperGrain className="z-30" />
            <div
                aria-hidden
                className={`absolute -bottom-1.5 -top-1.5 z-40 w-1 bg-black ${side === 'right' ? 'left-0' : 'right-0'}`}
            />
        </div>
    );
}
