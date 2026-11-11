import { useFeatures } from "./useFeatures";

const MODES = [
    { id: "classic", name: "Classic", path: "/classic", photoSpecs: "" },
    { id: "blurry", name: "Blurry", path: "/blurry", photoSpecs: "blur-[2px]" },
    { id: "pixelated", name: "Pixelated", path: "/pixelated", photoSpecs: "" },
    { id: "inkit", name: "InkIt", path: "/inkit", photoSpecs: "grayscale contrast-[1.3]" },
];

const dateKeyOf = (modeId: string) => (modeId === "classic" ? "gameDate" : `${modeId}GameDate`);

/** Every mode with whether it was won today, and the ones other than `currentMode` (InkIt only
 *  while its flag is on). */
export const useAllGameModes = (currentMode: string) => {
    const { features } = useFeatures();

    const isWonToday = (modeId: string): boolean => {
        const won = localStorage.getItem(modeId === "classic" ? "gameWon" : `${modeId}GameWon`) === "true";
        const savedDate = localStorage.getItem(dateKeyOf(modeId));

        if (!won || !savedDate) return false;

        return localStorage.getItem(dateKeyOf(currentMode)) === savedDate;
    };

    const allModes = MODES
        .filter((mode) => mode.id !== "inkit" || features.inkit)
        .map((mode) => ({ ...mode, won: isWonToday(mode.id) }));

    const otherModes = allModes.filter((mode) => mode.id !== currentMode);

    return { allModes, otherModes };
};
