import { useCallback, useEffect, useRef } from "react";
import { blockSizeToGrid } from "../../utils/pixelLevels";

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

    // Read the latest blockSize inside render() without re-creating render().
    const blockSizeRef = useRef<number>(blockSize);
    blockSizeRef.current = blockSize;

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img || !loadedRef.current) return;

        const w = canvas.width;
        const h = canvas.height;
        if (!w || !h) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const bs = blockSizeRef.current;

        // Mosaic resolution comes from a FIXED reference (see pixelLevels.ts),
        // never the device backing store, so a given attempt looks the same on
        // every screen size and devicePixelRatio. Covers are square → one axis.
        const grid = blockSizeToGrid(bs);

        ctx.clearRect(0, 0, w, h);

        // Full reveal (or a grid finer than the display): draw the source image
        // straight to the canvas, smoothed, for a clean cover with no
        // nearest-neighbour noise.
        if (bs <= 1 || grid >= Math.min(w, h)) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, w, h);
            return;
        }

        // Pass 1 — downscale to grid×grid with smoothing ON, so each cell is the
        // AVERAGE of its source region (clean blocks, not a single sampled pixel).
        if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
        const off = offscreenRef.current;
        const octx = off.getContext("2d");
        if (!octx) return;

        off.width = grid;
        off.height = grid;
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = "high";
        octx.drawImage(img, 0, 0, grid, grid);

        // Pass 2 — upscale that tiny image to the full canvas with smoothing OFF
        // for crisp, square pixels (nearest-neighbour).
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 0, 0, grid, grid, 0, 0, w, h);
    }, []);

    const sizeAndRender = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !loadedRef.current) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const nw = Math.max(1, Math.round(rect.width * dpr));
        const nh = Math.max(1, Math.round(rect.height * dpr));

        // Backing store sized to the displayed size × dpr keeps the upscaled
        // block edges sharp on hi-dpi screens.
        if (canvas.width !== nw || canvas.height !== nh) {
            canvas.width = nw;
            canvas.height = nh;
        }
        render();
    }, [render]);

    // (Re)load the source image whenever the URL changes.
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
        if (img.complete && img.naturalWidth > 0) handleLoad();

        return () => img.removeEventListener("load", handleLoad);
    }, [imageUrl, sizeAndRender]);

    // Keep the backing store in sync with the element's rendered size.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const observer = new ResizeObserver(() => sizeAndRender());
        observer.observe(canvas);
        return () => observer.disconnect();
    }, [sizeAndRender]);

    // Re-render when the pixelation level changes.
    useEffect(() => {
        render();
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
