import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

const VISIBLE_MS = 2200;
const OUT_MS = 320;

interface ToastState {
    message: string;
    leaving: boolean;
}

/** Bottom-centre notice pill: `show(message)` pops it in, it leaves after 2.2 s. */
export function useToast() {
    const [toast, setToast] = useState<ToastState | null>(null);
    const timers = useRef<number[]>([]);

    const clearTimers = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    };

    useEffect(() => clearTimers, []);

    const show = useCallback((message: string) => {
        clearTimers();
        setToast({ message, leaving: false });

        timers.current.push(
            window.setTimeout(() => setToast((current) => (current ? { ...current, leaving: true } : current)), VISIBLE_MS),
            window.setTimeout(() => setToast(null), VISIBLE_MS + OUT_MS),
        );
    }, []);

    const node = (
        <div className="fixed inset-x-0 bottom-6 z-200 flex justify-center px-4 pointer-events-none" aria-live="polite">
            {toast && (
                <div
                    role="status"
                    className={cn(
                        "px-5 py-3 rounded-full border-2 border-(--ink) bg-(--menu-bg) shadow-[3px_4px_0_var(--ctl-off),var(--in)]",
                        "font-semibold text-sm text-(--chip-ink)",
                        "transform-gpu",
                        toast.leaving
                            ? "animate-[toastOut_0.3s_cubic-bezier(.4,0,1,1)_forwards]"
                            : "animate-[puffIn_0.42s_var(--ease-settle)_both]",
                    )}
                >
                    {toast.message}
                </div>
            )}
        </div>
    );

    return { show, node };
}
