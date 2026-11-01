import { useCallback, useState, type ImgHTMLAttributes } from "react";

/** An <img> that fades in when it finishes loading after the page is interactive (lists, client
 *  navigations), instead of popping over its grey placeholder. Images already loaded, and the
 *  prerendered HTML before hydration, show at once. */
export default function FadeImg({ onLoad, onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
    const [fade, setFade] = useState<"wait" | "in" | undefined>();
    const ref = useCallback((img: HTMLImageElement | null) => {
        if (img && !img.complete) setFade("wait");
    }, []);
    const show = () => setFade((f) => (f === "wait" ? "in" : f));
    return (
        <img
            {...props}
            ref={ref}
            data-fade={fade}
            onLoad={(e) => { show(); onLoad?.(e); }}
            onError={(e) => { show(); onError?.(e); }}
        />
    );
}
