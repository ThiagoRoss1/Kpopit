import type { AnimationEvent } from 'react';
import { X, BookOpenText, Layers, Sticker, Smartphone, Settings, PlayCircle } from 'lucide-react';

interface AlbumInfoModalProps {
    collectionName?: string;
    onClose: () => void;
    night: boolean;
    closing: boolean;
    /** Restart the first-run onboarding tour. */
    onReplayTour?: () => void;
    /** From useDisclosure's animationProps — it owns the unmount and the bubbling guard. */
    onAnimationEnd: (event: AnimationEvent<Element>) => void;
}

const INFO_ROWS = (props: AlbumInfoModalProps) =>[
    {
        icon: <BookOpenText className="w-8 h-8" />,
        title: `${props.collectionName} Album`,
        body: `${props.collectionName} features every idol and group from KpopIt. Flip through it like a real book.`,
    },
    {
    icon: <Settings className="w-8 h-8" />,
    title: "Settings",
    body: "Adjust visual effects and controls from the settings button.",
    },
    {
        icon: <Layers className="w-8 h-8" />,
        title: "Flip and navigate",
        body: "Tap the page sides (or use the arrows / ← → keys) to turn pages. In Focus mode the same taps move across the spread first, then turn. The carousel below jumps straight to any opening, and the Summary jumps to a group.",
    },
    {
        icon: <Sticker className="w-8 h-8" />,
        title: "Stickers",
        body: "Win Classic or Blurry to collect that idol's sticker, win the same idol again to level it up: Base → Gold → Holo. Tap any sticker to see its level, copies and more. Complete a group (full bar ✓) to unlock its group photo.",
    },
    {
        icon: <Smartphone className="w-8 h-8" />,
        title: "On your phone",
        body: "Tap the focus button to zoom in and read one page at a time, easier to see on a small screen.",
    }
];

export default function AlbumInfoModal(props: AlbumInfoModalProps) {
    const { onClose, night, collectionName, closing, onAnimationEnd, onReplayTour } = props;
    const backdropMotion = closing ? 'collection-backdrop-out' : 'collection-backdrop-in';
    const modalMotion = closing ? 'collection-modal-out' : 'collection-modal-in';
    
    return (
        <div
            onClick={onClose}
            className={`fixed inset-0 z-260 flex items-center justify-center bg-[#1e141c]/55 p-4.5 backdrop-blur-xs ${backdropMotion}`}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                onAnimationEnd={onAnimationEnd}
                className={`flex max-h-[84vh] w-[min(440px,100%)] flex-col overflow-hidden rounded-[20px] border-2 p-6 transition-colors duration-300 ${modalMotion} ${
                    night ? 'border-neon-pink bg-[#16181e] shadow-[6px_6px_0px_rgba(255,51,153,1)]' : 'border-ink bg-[#fffaf3] shadow-[6px_6px_0px_#0a0a0a]'
                }`}
            >
                <div className="flex flex-none items-start justify-between gap-2.5">
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
                        className={`flex w-9 h-9 collections-press flex-none cursor-pointer items-center justify-center rounded-full border-2 bg-transparent
                            transition-all duration-300 hover:scale-105 transform-gpu active:translate-y-0.5 active:translate-x-0.5 ${
                            night ? 'border-neon-pink text-white shadow-[2px_2px_0px_rgba(255,51,153,1)] active:shadow-[0px_1px_0px_rgba(255,51,153,0)]' 
                            : 'border-ink text-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] active:shadow-[0px_1px_0px_rgba(0,0,0,0)]'
                        }`}
                    >
                        <X className="w-5 h-5" strokeWidth={3} />
                    </button>
                </div>
                <div className={`album-index-scroll ${night ? 'album-index-scroll--night' : ''} -mx-2 mt-4.5 flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-2 contain-[paint]`}>
                    {INFO_ROWS(props).map((row) => (
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

                {onReplayTour && (
                    <button
                        type="button"
                        onClick={onReplayTour}
                        className={`collections-press mt-4.5 flex flex-row h-10 w-full flex-none cursor-pointer items-center justify-center gap-2 rounded-xl border-2 
                        text-[12.5px] font-bold uppercase tracking-[0.04em] transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
                            night
                                ? 'border-neon-pink text-white shadow-[3px_3px_0px_rgba(255,51,153,0.5)] active:shadow-none'
                                : 'border-ink text-ink shadow-[3px_3px_0px_#0a0a0a] active:shadow-none'
                        }`}
                    >
                        <PlayCircle className="w-5 h-5" strokeWidth={3} />
                        <span className="font-major-mono-display">Replay tour</span>
                    </button>
                )}
            </div>
        </div>
    );
}
