import './collection.css';
import { useQuery } from '@tanstack/react-query';
import { getCollectionsList } from '../../services/api';
import CollectionsBackdrop from './components/CollectionsBackdrop';
import { CollectionCard } from './components/CollectionCard';
import { ThemedCard } from './components/ThemedCard';
import { useCollectionNight } from './useCollectionNight';
import { Moon, Sun } from 'lucide-react';

export default function Collection() {
    const [night, setNight] = useCollectionNight();

    const { data: collections, isLoading } = useQuery({
        queryKey: ['collectionsList'],
        queryFn: getCollectionsList,
    });
    const totalStickers = collections?.reduce((sum, collection) => sum + collection.total_cards, 0);

    const textMain = night ? 'text-white' : 'text-ink';
    const textMuted = night ? 'text-white/62' : 'text-[#6b5f55]';
    const rule = night ? 'border-white/22' : 'border-ink';

    return (
        <div className={`relative min-h-full w-full transition-colors duration-300 ${textMain}`}>
            <CollectionsBackdrop night={night} />
            <div className="relative mx-auto max-w-300 px-6 pb-18">
                {/* Header */}
                <header className="pt-6.5">
                    <div className={`flex flex-wrap items-baseline justify-between gap-2 border-b-[1.5px] pb-2 font-mono text-[9.5px] uppercase tracking-[0.2em] transition-colors duration-300 ${rule} ${textMuted}`}>
                        <span>Kpopit Collections</span>
                        <span className="text-neon-pink">Vol. I · Est. 2026</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                        <h1 className={`font-serif text-[clamp(48px,9vw,88px)] leading-[0.82] -tracking-[0.02em] ${textMain}`}>
                            Collections<span className="text-neon-pink">.</span>
                        </h1>
                        <div className="flex flex-wrap items-center gap-2.5 pb-2">
                            <span className={`font-sans font-semibold text-[16px] italic ${textMuted}`}>{totalStickers ?? '…'} stickers to collect</span>

                            <button
                                type="button"
                                onClick={() => setNight((previousNight) => !previousNight)}
                                title="Light/night mode"
                                className={`collections-toggle-sweep relative flex size-9 flex-none cursor-pointer items-center justify-center overflow-hidden rounded-full border-[1.5px] text-[15px] transition-colors duration-300 active:scale-95 ${
                                    night ? 'border-white/10 bg-[#16181e] text-white' : 'border-ink bg-white text-ink'
                                }`}
                            >
                                {night ? <Moon className="w-5 h-5 text-white/60" /> : <Sun className="w-5 h-5 text-[#6b5f55]" />}
                            </button>
                        </div>
                    </div>
                    <div className={`mt-2.5 border-b-4 border-double transition-colors duration-300 ${rule}`} />
                </header>

                {/* Albums — one card per collection row */}
                {isLoading && (
                    <section
                        className={`mt-6 rounded-[20px] border-[2.5px] p-5.5 transition-colors duration-300 ${
                            night
                                ? 'border-white/10 bg-[#16181e] shadow-[0_14px_34px_-14px_rgba(0,0,0,0.7)]'
                                : 'border-ink bg-white shadow-[6px_6px_0px_#0a0a0a]'
                        }`}
                    >
                        <div className="collections-skeleton h-49.5 w-full rounded-[14px]" />
                    </section>
                )}

                {collections?.map((collection) => (
                    <CollectionCard
                        key={collection.collection_id}
                        collection={collection}
                        night={night}
                    />
                ))}

                {/* Future albums */}
                <div className="flex flex-col gap-2 w-full h-fit mt-6 rounded-[20px] bg-transparent py-4 px-0">
                    <div className="flex flex-row justify-start items-start">
                        <span className={`font-bold text-3xl opacity-80 ${textMain} [text-shadow:1px_1px_1px_rgba(0,0,0,0.4)]`}>
                            Coming Soon!
                        </span>
                    </div>

                    <ThemedCard
                        album={{
                            title: 'KpopIt Seasonal',
                            tag: 'THEMED',
                            description: 'Seasonal album will be a seasonal themed collection of stickers, featuring special seasonal designs and limited edition cards. Obtain them by opening packs, combining cards, playing games and doing activities across KpopIt!',
                            hue: 0,
                            cap: 'Seasonal',
                        }}
                        night={night}
                    />
                </div>
            </div>
        </div>
    );
}
