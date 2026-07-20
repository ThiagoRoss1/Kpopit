import type { CSSProperties, ReactNode } from 'react';
import type { AlbumPalette } from '../../../../interfaces/albumInterfaces';
import { SideWaves, VectorCircle, VectorSlab } from './AlbumDecorShapes';
import { TextureLighting, PaperGrain } from './AlbumTextures';

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
        <div aria-hidden className="font-major-mono-display absolute -left-28.5 -top-2.5 flex w-361 flex-col gap-1.5 overflow-hidden 
        text-[30px] leading-[normal] text-black/10 uppercase">
            {Array.from({ length: 27 }).map((_, i) => (
                <p key={i} className="whitespace-nowrap">{row}</p>
            ))}
        </div>
    );
}

function ContentDecor({ palette }: { palette: AlbumPalette }) {
    return (
        <>
            {/* Layered side waves hugging the spine — flipped vertically so the band is widest at the top */}
            <div aria-hidden className="absolute -bottom-0.5 -left-10.25 -top-2 w-40.25">
                <SideWaves palette={palette} className="size-full rotate-180" />
            </div>
            {/* Vector circle at the outer-top corner (solid corner sits off-canvas top-right) */}
            <div aria-hidden className="absolute -top-53 left-54.75 h-120.75 w-120">
                <VectorCircle color={palette.main} className="size-full rotate-90" />
            </div>
            {/* Vector2 slab at the outer-bottom corner (rounded corner faces the page) */}
            <div aria-hidden className="absolute left-64.75 top-185.5 h-55.75 w-118.5">
                <VectorSlab color={palette.light} className="size-full -scale-x-100" />
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
        '--album-light': palette.light,
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
