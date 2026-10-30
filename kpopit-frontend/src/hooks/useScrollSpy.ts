import { useCallback, useEffect, useRef, useState } from "react";

/** The section under a reading line at 35% of the viewport. Over the last screen the line slides
 *  to the bottom, so short final sections still activate. `jumpTo` scrolls smoothly and keeps the
 *  clicked section highlighted until the scroll ends. */
export function useScrollSpy(ids: string[]) {
    const [active, setActive] = useState(ids[0]);
    const locked = useRef<string | null>(null);
    const key = ids.join("|");

    useEffect(() => {
        const sections = key.split("|");
        const update = () => {
            if (locked.current) return;
            const vh = window.innerHeight;
            const remaining = document.documentElement.scrollHeight - (window.scrollY + vh);
            const t = remaining < vh ? 1 - Math.max(0, remaining) / vh : 0;
            const line = vh * (0.35 + 0.65 * t);
            let current = sections[0];
            for (const id of sections) {
                const el = document.getElementById(id);
                if (el && el.getBoundingClientRect().top <= line) current = id;
            }
            setActive(current);
        };
        const unlock = () => {
            locked.current = null;
            update();
        };
        update();
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        window.addEventListener("scrollend", unlock);
        return () => {
            window.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
            window.removeEventListener("scrollend", unlock);
        };
    }, [key]);

    const jumpTo = useCallback((id: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        locked.current = id;
        setActive(id);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        history.replaceState(history.state, "", `#${id}`);
        // Browsers without scrollend: release the lock after the smooth scroll.
        window.setTimeout(() => { if (locked.current === id) locked.current = null; }, 1200);
    }, []);

    return { active, jumpTo };
}
