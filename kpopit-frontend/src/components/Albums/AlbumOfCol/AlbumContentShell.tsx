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
// The group palette is exposed as CSS custom properties (--album-deep … --album-text,
// named stops) so children color themselves with Tailwind var classes instead of style tags.

import type { CSSProperties, ReactNode } from 'react';
import type { AlbumPalette } from '../albumTypes';
import { SideWaves, VetorCircle, Vetor2Slab } from './AlbumDecorShapes';
import { TextureLighting, PaperGrain } from '../AlbumOfCol/AlbumTextures';

export type AlbumPageSide = 'left' | 'right';

interface AlbumContentShellProps {
    groupName: string;
    palette: AlbumPalette;
    side: AlbumPageSide;
    children?: ReactNode;
}

function GroupWatermark({ groupName }: { groupName: string }) {
    const repeats = Math.max(4, Math.ceil(70 / (groupName.length + 1)));
    const row = `${groupName.toUpperCase()} `.repeat(repeats);
    return (
        <div aria-hidden className="font-major-mono-display absolute -left-28.5 -top-2.5 flex w-361 flex-col gap-1.5 overflow-hidden text-[30px] leading-[normal] text-black/10 uppercase">
            {Array.from({ length: 27 }).map((_, i) => (
                <p key={i} className="whitespace-nowrap">{row}</p>
            ))}
        </div>
    );
}

/** Decor built for the RIGHT page (spine on the left); the left page mirrors the field */
function ContentDecor({ palette }: { palette: AlbumPalette }) {
    return (
        <>
            {/* layered side waves hugging the spine — flipped vertically so the band is widest at the top */}
            <div aria-hidden className="absolute -bottom-0.5 -left-10.25 -top-2 w-40.25">
                <SideWaves palette={palette} className="size-full rotate-180" />
            </div>
            {/* vetor circle at the outer-top corner (solid corner sits off-canvas top-right) */}
            <div aria-hidden className="absolute -top-53 left-54.75 h-120.75 w-120">
                <VetorCircle color={palette.main} className="size-full rotate-90" />
            </div>
            {/* vetor2 slab at the outer-bottom corner (rounded corner faces the page) */}
            <div aria-hidden className="absolute left-64.75 top-185.5 h-55.75 w-118.5">
                <Vetor2Slab color={palette.text} className="size-full -scale-x-100" />
            </div>
        </>
    );
}

export default function AlbumContentShell({ groupName, palette, side, children }: AlbumContentShellProps) {
    const paletteVars = {
        '--album-deep': palette.deep,
        '--album-secondary': palette.secondary,
        '--album-main': palette.main,
        '--album-accent': palette.accent,
        '--album-text': palette.text,
    } as CSSProperties;
    return (
        <div className="relative h-225 w-150 overflow-hidden bg-white" style={paletteVars}>
            <GroupWatermark groupName={groupName} />
            <div className={`absolute inset-0 ${side === 'left' ? '-scale-x-100' : ''}`}>
                <ContentDecor palette={palette} />
            </div>
            {children}
            <TextureLighting className="z-10" />
            <PaperGrain className="z-30" />
            <div
                aria-hidden
                className={`absolute -bottom-1.5 -top-1.5 z-40 w-1 bg-black ${side === 'right' ? 'left-0' : 'right-0'}`}
            />
        </div>
    );
}
