import { X } from "lucide-react";
import { useEffect, type ReactNode, useRef } from "react";

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: ReactNode;
}

const EditProfileModal = ({ isOpen, onClose, title, subtitle, children }: EditProfileModalProps) => {
    const mouseDownTarget = useRef<EventTarget | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKey);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKey);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="ep-overlay fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm mt-10"
        >
            <div 
                className="flex items-start justify-center min-h-full w-full px-3 sxs:px-4 py-12 sxs:py-16"       
                onMouseDown={(e) => { 
                    mouseDownTarget.current = e.target;
                }}
                onClick={(e) => {
                    if (mouseDownTarget.current === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                <div
                    className="relative w-full max-w-130"
                >
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 z-0 bg-[#0a0a0a] border border-solid border-neon-pink/15
                            rounded-4xl translate-x-0.75 translate-y-0.75 rotate-1 transform-gpu
                            shadow-[12px_12px_0px_rgba(0,0,0,0.4)]"
                    />
                    <div
                        className="ep-panel relative z-10 flex flex-col bg-[#111111] border-4 border-neon-pink
                            rounded-4xl shadow-[4px_4px_0px_rgba(255,51,153,0.4)] overflow-hidden"
                    >
                        <header className="flex items-center justify-between gap-2 sxs:gap-3 px-4 sxs:px-6 pt-5 pb-3 border-b border-white/20">
                            <div className="flex flex-col flex-1 min-w-0">
                                <h2 className="block text-xl sxs:text-2xl font-sans italic font-black uppercase text-white tracking-wide">
                                    {title}
                                </h2>
                                {subtitle && (
                                    <span className="block truncate font-sans italic text-[10px] text-white/40 font-black uppercase tracking-[0.25em] sxs:tracking-[0.4em]">
                                        {subtitle}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                aria-label="Close"
                                onClick={onClose}
                                className="shrink-0 grid place-items-center w-10 h-10 rounded-2xl border-2 border-white/15
                                    text-white/70 hover:text-white hover:bg-white/5 hover:border-neon-pink
                                    hover:cursor-pointer transition-colors duration-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
