// Decoding the InkIt files in the browser: each layer image into darkness, the photo into pixels,
// and (fallback only) the old in-browser layers built from the photo.
import { SHEET } from "./config.ts";
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

/** The image's centred square at sheet size, as RGBA. Throws on a canvas tainted by a missing CORS header. */
const sheetPixels = (image: HTMLImageElement): Uint8ClampedArray => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SHEET;

    const target = canvas.getContext("2d", { willReadFrequently: true });
    if (!target) throw new Error("No 2D canvas");

    const crop = Math.min(image.naturalWidth, image.naturalHeight);
    target.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, 0, 0, SHEET, SHEET);

    return target.getImageData(0, 0, SHEET, SHEET).data;
};

/** One precomputed layer (white = paper) as darkness at sheet size. A non-square file is the wrong one. */
export const loadLayer = async (url: string): Promise<Float32Array> => {
    const image = await loadImage(url);
    if (image.naturalWidth !== image.naturalHeight) throw new Error("InkIt layer is not square");

    return darknessFromPixels(sheetPixels(image));
};

export const loadPhotoPixels = async (url: string): Promise<Uint8ClampedArray> => sheetPixels(await loadImage(url));

/** Fallback: the old layers, built from the photo the way the game did before precomputed layers. */
export const buildLayersFromPhoto = async (url: string): Promise<BuiltLayers> => buildLayers(await loadImage(url), seedFromPath(url));
