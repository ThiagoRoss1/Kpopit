import { SHEET, SHEET_PIXELS } from "./config.ts";
import type { Layers } from "./engine.ts";

// What each tool reveals, built once per photo (from the v9 prototype, as in the reference engine).
// Browser only: it draws on canvases and reads their pixels.

const makeCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SHEET;

    return canvas;
};

const context = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
    const found = canvas.getContext("2d", { willReadFrequently: true });
    if (!found) throw new Error("Canvas is not available");

    return found;
};

const blurred = (source: CanvasImageSource, radius: number): HTMLCanvasElement => {
    const canvas = makeCanvas();
    const target = context(canvas);

    target.filter = `blur(${radius}px)`;
    target.drawImage(source, 0, 0, SHEET, SHEET);
    target.filter = "none";

    return canvas;
};

/** Seeded random: the same seed always gives the same hatching. */
const seeded = (seed: number): (() => number) => {
    let state = seed >>> 0;

    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
};

const greyOf = (pixels: Uint8ClampedArray, index: number): number =>
    0.299 * pixels[index * 4] + 0.587 * pixels[index * 4 + 1] + 0.114 * pixels[index * 4 + 2];

/** PEN layer: v9 colour-dodge line art (grey divided by its own blurred negative, then deepened).
 *  Returns darkness: 0 = paper, 1 = black. */
export const penLines = (source: CanvasImageSource, dodge = 5, power = 2.6): Float32Array => {
    const work = makeCanvas();
    const target = context(work);
    target.fillStyle = "#fff";
    target.fillRect(0, 0, SHEET, SHEET);
    target.drawImage(source, 0, 0, SHEET, SHEET);

    const pixels = target.getImageData(0, 0, SHEET, SHEET).data;
    const grey = new Float32Array(SHEET_PIXELS);
    const inverse = target.createImageData(SHEET, SHEET);

    for (let index = 0; index < SHEET_PIXELS; index++) {
        const value = greyOf(pixels, index);
        grey[index] = value;
        inverse.data[index * 4] = inverse.data[index * 4 + 1] = inverse.data[index * 4 + 2] = 255 - value;
        inverse.data[index * 4 + 3] = 255;
    }

    target.putImageData(inverse, 0, 0);

    const blur = context(blurred(work, dodge)).getImageData(0, 0, SHEET, SHEET).data;
    const out = new Float32Array(SHEET_PIXELS);

    for (let index = 0; index < SHEET_PIXELS; index++) {
        const negative = blur[index * 4 + 3] > 250 ? blur[index * 4] : 255 - grey[index];
        out[index] = 1 - Math.pow(Math.min(1, grey[index] / Math.max(1, 255 - negative)), power);
    }

    return out;
};

/** v9 scribble: loose diagonal hatching for tone and short hairy strokes that chase the edges.
 *  Returns a canvas (white paper, grey strokes). */
export const scribble = (full: CanvasImageSource, seed: number): HTMLCanvasElement => {
    const work = makeCanvas();
    const target = context(work);
    target.fillStyle = "#fff";
    target.fillRect(0, 0, SHEET, SHEET);
    target.drawImage(blurred(full, 3), 0, 0);

    const pixels = target.getImageData(0, 0, SHEET, SHEET).data;
    const grey = new Float32Array(SHEET_PIXELS);
    const gradX = new Float32Array(SHEET_PIXELS);
    const gradY = new Float32Array(SHEET_PIXELS);
    const magnitude = new Float32Array(SHEET_PIXELS);

    for (let index = 0; index < SHEET_PIXELS; index++) grey[index] = greyOf(pixels, index);

    let sum = 0;
    for (let y = 1; y < SHEET - 1; y++) {
        for (let x = 1; x < SHEET - 1; x++) {
            const index = y * SHEET + x;

            gradX[index] = -grey[index - SHEET - 1] - 2 * grey[index - 1] - grey[index + SHEET - 1]
                + grey[index - SHEET + 1] + 2 * grey[index + 1] + grey[index + SHEET + 1];
            gradY[index] = -grey[index - SHEET - 1] - 2 * grey[index - SHEET] - grey[index - SHEET + 1]
                + grey[index + SHEET - 1] + 2 * grey[index + SHEET] + grey[index + SHEET + 1];
            magnitude[index] = Math.hypot(gradX[index], gradY[index]);
            sum += magnitude[index];
        }
    }

    const mean = sum / SHEET_PIXELS;
    const random = seeded(seed * 7919 + 13);
    const canvas = makeCanvas();
    const pencil = context(canvas);
    pencil.fillStyle = "#fff";
    pencil.fillRect(0, 0, SHEET, SHEET);
    pencil.lineCap = "round";
    pencil.strokeStyle = "#3a3a44";

    // Hatching: more of it where the photo is dark.
    for (let count = 0; count < 11000; count++) {
        const x = random() * SHEET;
        const y = random() * SHEET;
        const dark = 1 - grey[(y | 0) * SHEET + (x | 0)] / 255;
        if (random() > Math.pow(Math.max(0, dark - 0.36), 1.5) * 1.7) continue;

        const angle = -Math.PI / 4 + (random() - 0.5) * 0.55 + (dark > 0.7 && random() < 0.35 ? Math.PI / 2 : 0);
        const length = 8 + random() * 22;
        const dx = (Math.cos(angle) * length) / 2;
        const dy = (Math.sin(angle) * length) / 2;
        const bend = (random() - 0.5) * 7;

        pencil.globalAlpha = 0.1 + random() * 0.22;
        pencil.lineWidth = 0.7 + random() * 0.9;
        pencil.beginPath();
        pencil.moveTo(x - dx, y - dy);
        pencil.quadraticCurveTo(x + bend, y - bend, x + dx, y + dy);
        pencil.stroke();
    }

    // Hairy contour strokes: follow the edge direction both ways from a strong-gradient point.
    for (let count = 0; count < 15000; count++) {
        const startX = 12 + random() * (SHEET - 24);
        const startY = 12 + random() * (SHEET - 24);
        const strength = magnitude[(startY | 0) * SHEET + (startX | 0)];
        if (random() > (strength - mean * 1.2) / (mean * 5)) continue;

        for (let repeat = random() < 0.4 ? 2 : 1; repeat > 0; repeat--) {
            pencil.globalAlpha = 0.14 + random() * 0.26;
            pencil.lineWidth = 0.6 + random() * 0.9;
            pencil.beginPath();

            const jitterX = (random() - 0.5) * 9;
            const jitterY = (random() - 0.5) * 9;

            for (const direction of [1, -1]) {
                let x = startX + jitterX;
                let y = startY + jitterY;
                let previousX = 0;
                let previousY = 0;
                pencil.moveTo(x, y);

                for (let steps = 6 + ((random() * 12) | 0); steps > 0; steps--) {
                    const index = (y | 0) * SHEET + (x | 0);
                    let tangentX = -gradY[index];
                    let tangentY = gradX[index];
                    const length = Math.hypot(tangentX, tangentY);
                    if (length < 1e-3) break;

                    tangentX /= length;
                    tangentY /= length;

                    if (tangentX * previousX + tangentY * previousY < 0) {
                        tangentX = -tangentX;
                        tangentY = -tangentY;
                    } else if (!previousX && !previousY) {
                        tangentX *= direction;
                        tangentY *= direction;
                    }

                    previousX = tangentX;
                    previousY = tangentY;
                    x += tangentX * 2.2 + (random() - 0.5) * 0.7;
                    y += tangentY * 2.2 + (random() - 0.5) * 0.7;
                    if (x < 2 || y < 2 || x > SHEET - 3 || y > SHEET - 3) break;

                    pencil.lineTo(x, y);
                }
            }

            pencil.stroke();
        }
    }

    pencil.globalAlpha = 1;

    return canvas;
};

/** PENCIL layer (the InkIt Lab's sharper pencil): soft line art (dodge 5, power 2), a faint second
 *  pass 1px off so the lines look gone over, and the v9 hatching on top. Returns darkness. */
export const pencilSketch = (full: CanvasImageSource, seed: number): Float32Array => {
    const lines = penLines(full, 5, 2);
    const lineCanvas = makeCanvas();
    const lineContext = context(lineCanvas);
    const lineImage = lineContext.createImageData(SHEET, SHEET);

    for (let index = 0; index < SHEET_PIXELS; index++) {
        const value = 255 * (1 - lines[index]);
        lineImage.data[index * 4] = lineImage.data[index * 4 + 1] = lineImage.data[index * 4 + 2] = value;
        lineImage.data[index * 4 + 3] = 255;
    }

    lineContext.putImageData(lineImage, 0, 0);

    const canvas = makeCanvas();
    const sketch = context(canvas);
    sketch.fillStyle = "#fff";
    sketch.fillRect(0, 0, SHEET, SHEET);

    sketch.globalCompositeOperation = "multiply";
    sketch.globalAlpha = 0.85;
    sketch.drawImage(lineCanvas, 0, 0);
    sketch.globalAlpha = 0.3;
    sketch.drawImage(lineCanvas, 1, 1);
    sketch.globalAlpha = 0.7;
    sketch.drawImage(scribble(full, seed), 0, 0);
    sketch.globalAlpha = 1;
    sketch.globalCompositeOperation = "source-over";

    const data = sketch.getImageData(0, 0, SHEET, SHEET).data;
    const out = new Float32Array(SHEET_PIXELS);

    for (let index = 0; index < SHEET_PIXELS; index++) out[index] = 1 - data[index * 4] / 255;

    return out;
};

/** The photo must load with crossOrigin="anonymous" from a CORS host, or reading it throws.
 *  `seed` is stable per photo, so the hatching is the same for everyone. */
export const buildLayers = (image: HTMLImageElement, seed: number): Layers => {
    const full = makeCanvas();
    const target = context(full);

    // A non-square photo is cropped to its centred square, never stretched.
    const crop = Math.min(image.naturalWidth, image.naturalHeight);
    target.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, 0, 0, SHEET, SHEET);

    return {
        photo: target.getImageData(0, 0, SHEET, SHEET).data,
        pencil: pencilSketch(full, seed),
        pen: penLines(full),
    };
};

/** A stable seed from the photo path, so the pencil hatching is the same on every device. */
export const seedFromPath = (path: string): number => {
    let hash = 2166136261;

    for (let index = 0; index < path.length; index++) {
        hash ^= path.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0) % 100000;
};
