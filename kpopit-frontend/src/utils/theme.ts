// Day/Night for the Puff Pop pages. The choice lives in localStorage; the inline script in
// app/root.tsx applies it to <html> before the first paint, so a prerendered (Day) page never flashes.
export type Theme = "day" | "night";

export const THEME_KEY = "kpopit-theme";
const CHANGE_EVENT = "kpopit:theme";

export const THEME_INIT_SCRIPT =
    `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="day"||t==="night")document.documentElement.dataset.theme=t}catch(e){}`;

export function readTheme(): Theme {
    return document.documentElement.dataset.theme === "night" ? "night" : "day";
}

export function setTheme(theme: Theme): void {
    document.documentElement.dataset.theme = theme;
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch {
        // Private mode or blocked storage: the choice still applies for this page view.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeTheme(onChange: () => void): () => void {
    // Another tab changed it: apply it here too, then notify.
    const onStorage = (e: StorageEvent) => {
        if (e.key !== THEME_KEY || (e.newValue !== "day" && e.newValue !== "night")) return;
        document.documentElement.dataset.theme = e.newValue;
        onChange();
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
        window.removeEventListener(CHANGE_EVENT, onChange);
        window.removeEventListener("storage", onStorage);
    };
}
