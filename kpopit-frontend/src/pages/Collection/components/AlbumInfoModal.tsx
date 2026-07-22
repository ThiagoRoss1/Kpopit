import { X, BookOpenText, Layers, Sticker, Smartphone } from 'lucide-react';

interface AlbumInfoModalProps {
    collectionName?: string;
    onClose: () => void;
    night: boolean;
}

const INFO_ROWS = [
    {
        icon: <BookOpenText className="w-8 h-8" />,
        title: "One continuous album",
        body: "The collection gathers every idol from the featured groups in a single sticker album. Flip through it like a real book.",
    },
    {
        icon: <Layers className="w-8 h-8" />,
        title: "Flip and navigate",
        body: "Tap the page sides (or use the arrows / ← → keys) to turn pages. The carousel below jumps straight to any opening, and the Summary jumps to a group.",
    },
    {
        icon: <Sticker className="w-8 h-8" />,
        title: "Sticker levels",
        body: "Win Classic or Blurry to collect that idol's sticker; winning the same idol again levels it up — LV2 gold, LV3 holo. Complete a group (full bar ✓) to unlock its group photo.",
    },
    {
        icon: <Smartphone className="w-8 h-8" />,
        title: "On your phone",
        body: "Rotate your phone to landscape to see the whole album bigger.",
    }
];

export default function AlbumInfoModal(props: AlbumInfoModalProps) {
    const { onClose, night, collectionName } = props;
    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-260 flex items-center justify-center bg-[#1e141c]/55 p-4.5 backdrop-blur-xs"
        >
            <div
                onClick={(event) => event.stopPropagation()}
                className={`max-h-[84vh] w-[min(440px,100%)] overflow-y-auto rounded-[20px] border-2 p-6 transition-colors duration-300 ${
                    night ? 'border-neon-pink bg-[#16181e] shadow-[6px_6px_0px_rgba(255,51,153,1)]' : 'border-ink bg-[#fffaf3] shadow-[6px_6px_0px_#0a0a0a]'
                }`}
            >
                <div className="flex items-start justify-between gap-2.5">
                    <div>
                        <p className={`font-mono text-[9px] uppercase tracking-[0.22em] transition-colors duration-300 ${night ? 'text-neon-pink' : 'text-[#C62368]'}`}>
                            How it works
                        </p>
                        <p className={`font-major-mono-display mt-0.75 text-[22px] tracking-[0.02em] transition-colors duration-300 
                        ${night ? 'text-white' : 'text-ink'} uppercase`}>
                            {collectionName ? `${collectionName}` : 'Album'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className={`flex w-9 h-9 flex-none cursor-pointer items-center justify-center rounded-full border-2 bg-transparent
                            transition-all duration-300 hover:scale-105 transform-gpu active:translate-y-0.5 active:translate-x-0.5 ${
                            night ? 'border-neon-pink text-white shadow-[2px_2px_0px_rgba(255,51,153,1)] active:shadow-[0px_1px_0px_rgba(255,51,153,0)]' 
                            : 'border-ink text-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] active:shadow-[0px_1px_0px_rgba(0,0,0,0)]'
                        }`}
                    >
                        <X className="w-5 h-5" strokeWidth={3} />
                    </button>
                </div>
                <div className="mt-4.5 flex flex-col gap-3.5">
                    {INFO_ROWS.map((row) => (
                        <div key={row.title} className="flex gap-3">
                            <div
                                className={`flex w-10 h-10 flex-none items-center justify-center rounded-xl text-[18px] transition-colors duration-300 ${
                                    night ? 'bg-white/6 text-neon-pink' : 'bg-neon-pink/10 text-ink'
                                }`}
                            >
                                {row.icon}
                            </div>
                            <div>
                                <p className={`font-sans text-[13.5px] font-bold transition-colors duration-300 ${night ? 'text-white' : 'text-[#3c2f38]'}`}>{row.title}</p>
                                <p className={`mt-0.5 font-sans text-[12px] leading-[1.45] transition-colors duration-300 ${night ? 'text-white/62' : 'text-[#7a6b74]'}`}>
                                    {row.body}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
