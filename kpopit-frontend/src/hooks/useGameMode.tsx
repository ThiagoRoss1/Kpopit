import { useMemo } from "react";
import { useLocation } from "react-router-dom";

export type GameMode = "classic" | "blurry" | "pixelated";

const MODES: GameMode[] = ["classic", "blurry", "pixelated"];

export const useGameMode = (): GameMode => {
    const location = useLocation();

    const gamemode = useMemo(() => {
        const mode = MODES.find(m => location.pathname.includes(m)) || "classic";

        localStorage.setItem("kpopit_gamemode", mode);

        return mode;

    }, [location.pathname])

    return gamemode;
}