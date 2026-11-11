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

    const clearInkit = useCallback(() => {
        clearModeKeys(localStorage, "inkit");
    }, []);

    const clearAll = useCallback(() => {
        clearClassic();
        clearBlurry();
        clearPixelated();
        clearInkit();
    }, [clearClassic, clearBlurry, clearPixelated, clearInkit]);

    return { clearClassic, clearBlurry, clearPixelated, clearInkit, clearAll };
};
