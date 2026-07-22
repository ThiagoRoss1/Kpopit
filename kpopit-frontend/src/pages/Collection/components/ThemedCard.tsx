import { Lock } from 'lucide-react';

export interface ThemedAlbumPreview {
    title: string;
    group?: string;
    description?: string;
    tag?: 'THEMED' | 'ARTIST';
    stickers?: number;
    hue?: number;
    cap?: string;
}

function Cap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <span className={`font-mono text-[9px] uppercase tracking-[0.22em] ${className}`}>{children}</span>;
}

function BookCover({ album }: { album: ThemedAlbumPreview }) {
    const background = `linear-gradient(150deg, oklch(0.64 0.16 ${album.hue ? album.hue : 0}), oklch(0.33 0.136 ${album.hue ? album.hue + 26 : 0} ))`;
    return (
        <div className="relative h-20.25 w-13.5 overflow-hidden rounded shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)]" style={{ background }}>
            <div className="absolute bottom-0 left-0 top-0 w-0.5 bg-linear-to-r from-white/28 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold -tracking-[0.03em] text-white/90">
                {album.cap}
            </div>
        </div>
    );
}

export function ThemedCard({ album, night }: { album: ThemedAlbumPreview; night: boolean }) {
    return (
        <div
            className={`relative rounded-2xl border-2 p-3 opacity-80 transition-colors duration-300 ${
                night
                    ? 'border-white/10 bg-[#16181e] shadow-[0_14px_34px_-14px_rgba(0,0,0,0.7)]'
                    : 'border-ink bg-white shadow-[4px_4px_0px_#0a0a0a]'
            }`}
        >
            <div className="flex gap-3">
                <div className="flex-none saturate-85">
                    <BookCover album={album} />
                </div>

                <div className="min-w-0 flex-1">
                    <Cap className="text-[8px] text-neon-pink">{album.tag}</Cap>
                    <p className={`mt-0.75 overflow-hidden text-ellipsis whitespace-nowrap text-lg font-bold leading-[1.05] ${night ? 'text-white' : 'text-ink'}`}>
                        {album.title}
                    </p>
                    {album.group && album.stickers !== undefined && (
                        <Cap className={`mt-1 block text-[8px] ${night ? 'text-white/40' : 'text-[#9a8e83]'}`}>
                            {album.group} · {album.stickers} stk
                        </Cap>
                    )}
                    <p className="mt-1 overflow-hidden text-sm font-bold">
                        {album.description}
                    </p>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] ${night ? 'text-white/40' : 'text-[#9a8e83]'} uppercase`}>
                    <Lock className={`w-3 h-3 ${night ? 'text-white/40' : 'text-[#9a8e83]'}`} />
                    Coming Soon
                </span>
            </div>
        </div>
    );
}
