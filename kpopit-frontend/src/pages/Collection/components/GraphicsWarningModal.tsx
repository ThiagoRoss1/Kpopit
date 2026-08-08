import { TriangleAlert } from 'lucide-react';

interface GraphicsWarningModalProps {
    night: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function GraphicsWarningModal({ night, onConfirm, onCancel }: GraphicsWarningModalProps) {
    return (
        <div
            onClick={onCancel}
            className="flex h-screen collection-backdrop-in fixed inset-0 z-280 items-center justify-center bg-[#1e141c]/60 p-4.5 backdrop-blur-xs"
        >
            <div
                onClick={(event) => event.stopPropagation()}
                role="alertdialog"
                aria-labelledby="gfx-warn-title"
                aria-describedby="gfx-warn-body"
                className={`collection-modal-in w-[min(400px,100%)] rounded-[20px] border-2 p-6 transition-colors duration-300 ${
                    night ? 'border-neon-pink bg-[#16181e] shadow-[6px_6px_0px_rgba(255,51,153,1)]' : 'border-ink bg-[#fffaf3] shadow-[6px_6px_0px_#0a0a0a]'
                }`}
            >
                <div className="flex gap-3">
                    <div
                        className={`flex size-10 flex-none items-center justify-center rounded-xl ${
                            night ? 'bg-white/6 text-neon-pink' : 'bg-neon-pink/10 text-ink'
                        }`}
                    >
                        <TriangleAlert className="size-6" strokeWidth={3} />
                    </div>
                    <div className="min-w-0">
                        <p
                            className={`font-mono text-[9px] uppercase tracking-widest ${night ? 'text-neon-pink' : 'text-[#C62368]'}`}
                        >
                            Heads up
                        </p>
                        <p
                            id="gfx-warn-title"
                            className={`font-major-mono-display mt-0.75 text-[22px] uppercase leading-tight tracking-[0.02em] ${
                                night ? 'text-white' : 'text-ink'
                            }`}
                        >
                            High graphics
                        </p>
                    </div>
                </div>

                <p
                    id="gfx-warn-body"
                    className={`mt-4 font-sans text-[13px] leading-normal ${night ? 'text-white/70' : 'text-[#5a4b54]'}`}
                >
                    Some devices can struggle with the heaviest graphics. Full textures and
                    holographic effects can stutter or flicker here. You can lower graphics again any time
                    in this panel.
                </p>

                <div className="mt-5 flex flex-col gap-2.5">
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`collections-press h-10 cursor-pointer rounded-xl border-2 text-[13px] font-bold uppercase tracking-[0.04em] transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
                            night
                                ? 'border-neon-pink bg-neon-pink text-white shadow-[3px_3px_0px_rgba(255,51,153,0.5)] active:shadow-none'
                                : 'border-ink bg-neon-pink text-white shadow-[3px_3px_0px_#0a0a0a] active:shadow-none'
                        }`}
                    >
                        Turn it on anyway
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className={`h-10 cursor-pointer rounded-xl border-2 bg-transparent text-[13px] font-bold uppercase tracking-[0.04em] transition-all duration-150 ${
                            night ? 'border-white/30 text-white/80' : 'border-ink/40 text-ink'
                        }`}
                    >
                        Keep it light
                    </button>
                </div>
            </div>
        </div>
    );
}
