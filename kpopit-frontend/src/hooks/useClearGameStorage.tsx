import { useCallback } from "react";
import { clearModeKeys } from "../utils/gameStorage";

export const useClearGameStorage = () => {
    const clearClassic = useCallback(() => {
        clearModeKeys(localStorage, "classic");
    }, []);

    const clearBlurry = useCallback(() => {
        clearModeKeys(localStorage, "blurry");
    }, []);

    const clearPixelated = useCallback(() => {
        clearModeKeys(localStorage, "pixelated");
    }, []);

    const clearAll = useCallback(() => {
        clearClassic();
        clearBlurry();
        clearPixelated();
    }, [clearClassic, clearBlurry, clearPixelated]);

    return { clearClassic, clearBlurry, clearPixelated, clearAll };
};
