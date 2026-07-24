import { Link } from 'react-router-dom';
import AlbumCover from '../../../components/Albums/AlbumOfCol/pages/AlbumCover';
import type { CollectionListItem } from '../../../interfaces/albumInterfaces';
import { ArrowRight } from 'lucide-react';

const albumSlug = (name: string) => name.trim().replace(/\s+/g, '-').toLowerCase();

const collectionPct = (collection: CollectionListItem) =>
    collection.total_cards > 0 ? Math.round((collection.owned_cards / collection.total_cards) * 100) : 0;

function Cap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <span className={`font-mono text-[9px] uppercase tracking-[0.22em] ${className}`}>{children}</span>;
}

function Pill({ children, night }: { children: React.ReactNode; night: boolean }) {
    return (
        <span
            className={`whitespace-nowrap rounded-full border-[1.5px] px-3.25 py-1.5 text-[11px] font-bold transition-colors duration-300 ${
                night ? 'border-white/10 bg-transparent text-white/60' : 'border-ink bg-[#fffaf3] text-ink'
            }`}
        >
            {children}
        </span>
    );
}

function ProgressCard({ collection, night }: { collection: CollectionListItem; night: boolean }) {
    const colPercentage = collectionPct(collection);
    return (
        <div
            className={`w-full min-w-0 rounded-[14px] border-2 px-4 py-3.5 transition-colors duration-300 md:w-auto md:min-w-50 ${
                night
                    ? 'border-white/10 bg-[#1c1f27] shadow-[0_14px_34px_-14px_rgba(0,0,0,0.7)]'
                    : 'border-ink bg-cream shadow-[4px_4px_0px_#0a0a0a]'
            }`}
        >
            <div className="flex items-baseline justify-center gap-3 md:justify-between md:gap-0">
                <span className="text-[30px] font-bold leading-none text-neon-pink">{colPercentage}%</span>
                <Cap className={night ? 'text-white/60' : 'text-[#6b5f55]'}>
                    {collection.owned_cards}/{collection.total_cards} stickers
                </Cap>
            </div>
            <div className={`mt-2.5 h-2.25 overflow-hidden rounded-full transition-colors duration-300 ${night ? 'bg-white/12' : 'bg-[#efe4d5]'}`}>
                <div className="h-full rounded-full bg-linear-to-r from-neon-pink to-[#ff70b8]" style={{ width: `${colPercentage}%` }} />
            </div>
            <div className="mt-2.5 flex gap-1">
                {[0, 1, 2, 3, 4].map((segmentIndex) => (
                    <div
                        key={segmentIndex}
                        className={`h-1 flex-1 rounded-sm transition-colors duration-300 
                        ${colPercentage >= (segmentIndex + 1) * 20 ? 'bg-neon-pink' : night ? 'bg-white/12' : 'bg-[#efe4d5]'}`}
                    />
                ))}
            </div>
        </div>
    );
}

function AlbumCoverThumb({ variant = 'front' }: { variant?: 'front' | 'back' }) {
    return (
        <div className="relative h-49.5 w-33 overflow-hidden rounded-md shadow-[0_12px_28px_-12px_rgba(40,26,36,0.55)]">
            <div className="pointer-events-none absolute left-0 top-0 origin-top-left scale-[0.22]">
                <AlbumCover variant={variant} />
            </div>
        </div>
    );
}

export function CollectionCard({ collection, night }: { collection: CollectionListItem; night: boolean }) {
    const koreanLabel = `케이팝잇 ● 앨범 ${collection.collection_id}`;
    const albumHref = `/collections/${collection.collection_id}/${albumSlug(collection.name)}`;

    const textMain = night ? 'text-white' : 'text-ink';
    const textMuted = night ? 'text-white/62' : 'text-[#6b5f55]';

    return (
        <section
            className={`mt-6 flex flex-col items-center gap-5 text-center rounded-[20px] border-[2.5px] p-5.5 transition-colors duration-300 
            md:flex-row md:items-stretch md:gap-6.5 md:text-left ${
                night
                    ? 'border-white/10 bg-[#16181e] shadow-[0_14px_34px_-14px_rgba(0,0,0,0.7)]'
                    : 'border-ink bg-white shadow-[6px_6px_0px_#0a0a0a]'
            }`}
        >
            <Link to={albumHref} className="relative flex-none transition-transform duration-150 active:scale-95">
                <AlbumCoverThumb />
            </Link>

            <div className="flex w-full min-w-0 flex-col items-center md:w-auto md:flex-1 md:basis-70 md:items-start">
                {collection.album_label && (
                    <p className={`font-sans uppercase font-black text-[12px] ${textMuted} [text-shadow:1px_1px_1px_rgba(255,255,255,0.2)]`}>
                        {collection.album_label}
                    </p>
                )}
                <h2 className={`font-major-mono-display mt-2 text-[clamp(22px,3.4vw,34px)] leading-[1.08] tracking-[0.02em] ${textMain}`}>
                    {collection.name.toUpperCase()}
                </h2>
                <p className={`font-korean mt-1.5 text-[13px] font-bold ${textMuted}`}>{koreanLabel}</p>
                <p className={`mt-3 max-w-115 font-sans text-[14px] leading-normal ${textMuted}`}>
                    {collection.description}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-4 md:mt-auto md:justify-start">
                    <Link
                        to={albumHref}
                        className={`flex justify-center items-center gap-1 rounded-full border-2 bg-neon-pink px-5.5 py-2.75 text-[14px] font-bold text-white 
                        transition-all duration-500 transform-gpu hover:brightness-110 hover:scale-105 active:translate-y-1 ${
                            night
                                ? 'border-transparent shadow-[0_4px_0_rgba(255,255,255,0.22),0_6px_18px_-6px_rgba(255,51,153,0.7)] active:shadow-[0_1px_0_rgba(255,255,255,0.22),0_6px_18px_-6px_rgba(255,51,153,0.7)]'
                                : 'border-ink shadow-[0_4px_0_var(--color-ink)] active:shadow-[0_1px_0_var(--color-ink)]'
                        }`}
                    >
                        Open album <ArrowRight className="inline-block w-4 h-4" />
                    </Link>

                    <div className="flex items-center justify-center gap-2.5 max-md:basis-full">
                        <Pill night={night}>{collection.total_cards} stickers</Pill>
                        <Pill night={night}>{collectionPct(collection)}% complete</Pill>
                    </div>
                </div>
            </div>
            <div className="w-full md:w-auto md:flex-none md:self-center">
                <ProgressCard collection={collection} night={night} />
            </div>
        </section>
    );
}
