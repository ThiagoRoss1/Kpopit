import { useSyncExternalStore } from "react";
import { readTheme, setTheme, subscribeTheme, type Theme } from "../utils/theme";

// Day while prerendering and hydrating (the HTML ships Day); the saved theme right after.
export function useTheme(): [Theme, () => void] {
    const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "day" as const);
    return [theme, () => setTheme(theme === "night" ? "day" : "night")];
}
