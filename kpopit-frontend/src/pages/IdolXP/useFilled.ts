import { useEffect, useState } from "react";

/** Turns on shortly after the page appears, so the XP bars and the jar grow in. */
export const useFilled = () => {
    const [filled, setFilled] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => setFilled(true), 500);
        return () => clearTimeout(timer);
    }, []);

    return filled;
};
