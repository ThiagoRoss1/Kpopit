import { useCallback, useEffect, useRef } from "react";

interface PixelatedCanvasProps {
    imageUrl: string;
    blockSize: number;
    alt?: string;
    className?: string;
}

const PixelatedCanvas = ({ imageUrl, blockSize, alt, className }: PixelatedCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const loadedRef = useRef<boolean>(false);

    const blockSizeRef = useRef<number>(blockSize);
    blockSizeRef.current = blockSize;

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img || !loadedRef.current) return;

        const w = canvas.width;
        const h = canvas.height;
        if (w === 0 || h === 0) return;

        if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
        const off = offscreenRef.current;

        const bs = blockSizeRef.current;
        const sw = Math.max(1, Math.round(w / bs));
        const sh = Math.max(1, Math.round(h / bs));

        const octx = off.getContext("2d");
        const ctx = canvas.getContext("2d");
        if (!octx || !ctx) return;

        off.width = sw;
        off.height = sh;
        octx.imageSmoothingEnabled = false;
        octx.drawImage(img, 0, 0, sw, sh);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 0, 0, sw, sh, 0, 0, w, h);
    }, []);

    const sizeAndRender = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !loadedRef.current) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const nw = Math.max(1, Math.round(rect.width * dpr));
        const nh = Math.max(1, Math.round(rect.height * dpr));

        if (canvas.width !== nw || canvas.height !== nh) {
            canvas.width = nw;
            canvas.height = nh;
        }
        render();
    }, [render]);

    useEffect(() => {
        loadedRef.current = false;
        const img = new Image();
        imgRef.current = img;

        const handleLoad = () => {
            loadedRef.current = true;
            sizeAndRender();
        };

        img.addEventListener("load", handleLoad);
        img.src = imageUrl;
        if (img.complete && img.naturalWidth > 0) handleLoad(); // already cached

        return () => img.removeEventListener("load", handleLoad);
    }, [imageUrl, sizeAndRender]);

    // Keep the canvas crisp when its box resizes.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const observer = new ResizeObserver(() => sizeAndRender());
        observer.observe(canvas);
        return () => observer.disconnect();
    }, [sizeAndRender]);

    // Re-pixelate + crossfade whenever the level changes (no image refetch).
    useEffect(() => {
        render();
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.classList.remove("pixel-fade");
        void canvas.offsetWidth; // restart the keyframe
        canvas.classList.add("pixel-fade");
    }, [blockSize, render]);

    return (
        <canvas
            ref={canvasRef}
            role="img"
            aria-label={alt}
            className={className}
        />
    );
};

export default PixelatedCanvas;
