import { useLayoutEffect, useRef } from "react";
import { cn } from "../lib/utils";

interface FitTextProps {
    children: string;
    maxSize: string;
    className?: string;
}

/** Start every value at its shared ceiling; shrink only when its rendered text actually overflows. */
const FitText = ({ children, maxSize, className }: FitTextProps) => {
    const containerRef = useRef<HTMLSpanElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
        const container = containerRef.current;
        const text = textRef.current;
        if (!container || !text) return;

        let disposed = false;

        const fit = () => {
            if (disposed || !container.clientWidth) return;

            text.style.fontSize = maxSize;
            const maximum = Number.parseFloat(getComputedStyle(text).fontSize);
            const ratio = Math.min(1, (container.clientWidth - 2) / text.scrollWidth);

            if (ratio < 1) text.style.fontSize = `${Math.floor(maximum * ratio * 10) / 10}px`;
        };

        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(container);
        void document.fonts.ready.then(fit);

        return () => {
            disposed = true;
            observer.disconnect();
        };
    }, [children, maxSize]);

    return (
        <span ref={containerRef} className="flex min-w-0 w-full justify-center">
            <span ref={textRef} className={cn("inline-block shrink-0 whitespace-nowrap", className)} style={{ fontSize: maxSize }}>
                {children}
            </span>
        </span>
    );
};

export default FitText;
