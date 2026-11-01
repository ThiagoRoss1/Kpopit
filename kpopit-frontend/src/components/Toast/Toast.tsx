import { useCallback, useEffect, useRef, useState } from "react";
import "../PageShell/puff.css";

const VISIBLE_MS = 2200;
const OUT_MS = 320;

/** Bottom-centre notice pill: `show(message)` pops it in, it leaves after 2.2 s. */
export function useToast() {
    const [toast, setToast] = useState<{ message: string; out: boolean } | null>(null);
    const timers = useRef<number[]>([]);

    const clear = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    };
    useEffect(() => clear, []);

    const show = useCallback((message: string) => {
        clear();
        setToast({ message, out: false });
        timers.current.push(
            window.setTimeout(() => setToast((t) => (t ? { ...t, out: true } : t)), VISIBLE_MS),
            window.setTimeout(() => setToast(null), VISIBLE_MS + OUT_MS),
        );
    }, []);

    const node = (
        <div className="fixed inset-x-0 bottom-6 z-200 flex justify-center pointer-events-none px-4" aria-live="polite">
            {toast && (
                <div
                    role="status"
                    data-out={toast.out ? "1" : "0"}
                    className="pp-toast rounded-full border-2 border-(--ink) bg-(--menu-bg) text-(--chip-ink) px-5 py-3 font-semibold text-sm [box-shadow:3px_4px_0_var(--ctl-off),var(--in)]"
                >
                    {toast.message}
                </div>
            )}
        </div>
    );
    return { show, node };
}
