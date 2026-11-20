// Decoding the InkIt files in the browser: each layer image into darkness, the photo into pixels,
// and (fallback only) the old in-browser layers built from the photo.
import { RENDER_SIDE, SHEET } from "./config.ts";
import { darknessFromPixels, type BuiltLayers } from "./layerLoader.ts";
import { buildLayers, seedFromPath } from "./layers.ts";

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("InkIt file failed to load"));
    image.src = url;
});

/** The image's centred square at render size, as RGBA. Throws on a canvas tainted by a missing CORS header. */
const sheetPixels = (image: HTMLImageElement): Uint8ClampedArray => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = RENDER_SIDE;

    const target = canvas.getContext("2d", { willReadFrequently: true });
    if (!target) throw new Error("No 2D canvas");

    const crop = Math.min(image.naturalWidth, image.naturalHeight);
    target.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, 0, 0, RENDER_SIDE, RENDER_SIDE);

    return target.getImageData(0, 0, RENDER_SIDE, RENDER_SIDE).data;
};

/** One precomputed layer (white = paper) as darkness at render size. A non-square file is the wrong one. */
export const loadLayer = async (url: string): Promise<Float32Array> => {
    const image = await loadImage(url);
    if (image.naturalWidth !== image.naturalHeight) throw new Error("InkIt layer is not square");

    return darknessFromPixels(sheetPixels(image));
};

export const loadPhotoPixels = async (url: string): Promise<Uint8ClampedArray> => sheetPixels(await loadImage(url));

/** A SHEET-sized darkness map at render size (bilinear), for the fallback layers. */
const toRenderSide = (darkness: Float32Array): Float32Array => {
    if (RENDER_SIDE === SHEET) return darkness;

    const out = new Float32Array(RENDER_SIDE * RENDER_SIDE);
    const scale = SHEET / RENDER_SIDE;
    for (let y = 0; y < RENDER_SIDE; y++) {
        const sy = Math.min(SHEET - 1, Math.max(0, (y + 0.5) * scale - 0.5));
        const y0 = Math.floor(sy);
        const y1 = Math.min(SHEET - 1, y0 + 1);
        const fy = sy - y0;
        for (let x = 0; x < RENDER_SIDE; x++) {
            const sx = Math.min(SHEET - 1, Math.max(0, (x + 0.5) * scale - 0.5));
            const x0 = Math.floor(sx);
            const x1 = Math.min(SHEET - 1, x0 + 1);
            const fx = sx - x0;
            const top = darkness[y0 * SHEET + x0] * (1 - fx) + darkness[y0 * SHEET + x1] * fx;
            const bottom = darkness[y1 * SHEET + x0] * (1 - fx) + darkness[y1 * SHEET + x1] * fx;
            out[y * RENDER_SIDE + x] = top * (1 - fy) + bottom * fy;
        }
    }
    return out;
};

/** Fallback: the old layers, built from the photo the way the game did before precomputed layers. */
export const buildLayersFromPhoto = async (url: string): Promise<BuiltLayers> => {
    const image = await loadImage(url);
    const built = buildLayers(image, seedFromPath(url));

    return { pencil: toRenderSide(built.pencil), pen: toRenderSide(built.pen), photo: sheetPixels(image) };
};
