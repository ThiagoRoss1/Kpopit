import { PEN_LINES, SHEET, SHEET_PIXELS } from "./config.ts";
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

/** One Gaussian pass along a row or a column of premultiplied RGBA; outside the sheet is transparent. */
const blurPass = (input: Float32Array, output: Float32Array, kernel: Float32Array, horizontal: boolean): void => {
    const reach = (kernel.length - 1) / 2;

    for (let line = 0; line < SHEET; line++) {
        for (let along = 0; along < SHEET; along++) {
            let red = 0;
            let green = 0;
            let blue = 0;
            let alpha = 0;

            for (let tap = -reach; tap <= reach; tap++) {
                const position = along + tap;
                if (position < 0 || position >= SHEET) continue;

                const weight = kernel[tap + reach];
                const offset = (horizontal ? line * SHEET + position : position * SHEET + line) * 4;
                red += input[offset] * weight;
                green += input[offset + 1] * weight;
                blue += input[offset + 2] * weight;
                alpha += input[offset + 3] * weight;
            }

            const target = (horizontal ? line * SHEET + along : along * SHEET + line) * 4;
            output[target] = red;
            output[target + 1] = green;
            output[target + 2] = blue;
            output[target + 3] = alpha;
        }
    }
};

/** The source blurred like the canvas filter `blur(radius px)` (a Gaussian with σ = radius, transparent
 *  outside). Computed in JS because Safari ignores `ctx.filter`, which left the line art blank there. */
const blurred = (source: CanvasImageSource, radius: number): HTMLCanvasElement => {
    const work = makeCanvas();
    const target = context(work);
    target.drawImage(source, 0, 0, SHEET, SHEET);

    const image = target.getImageData(0, 0, SHEET, SHEET);
    const premultiplied = new Float32Array(SHEET_PIXELS * 4);

    for (let index = 0; index < SHEET_PIXELS; index++) {
        const alpha = image.data[index * 4 + 3] / 255;
        premultiplied[index * 4] = image.data[index * 4] * alpha;
        premultiplied[index * 4 + 1] = image.data[index * 4 + 1] * alpha;
        premultiplied[index * 4 + 2] = image.data[index * 4 + 2] * alpha;
        premultiplied[index * 4 + 3] = alpha;
    }

    const reach = Math.ceil(radius * 3);
    const kernel = new Float32Array(reach * 2 + 1);
    let total = 0;

    for (let tap = -reach; tap <= reach; tap++) {
        const weight = Math.exp(-(tap * tap) / (2 * radius * radius));
        kernel[tap + reach] = weight;
        total += weight;
    }
    for (let tap = 0; tap < kernel.length; tap++) kernel[tap] /= total;

    const between = new Float32Array(SHEET_PIXELS * 4);
    blurPass(premultiplied, between, kernel, true);
    blurPass(between, premultiplied, kernel, false);

    for (let index = 0; index < SHEET_PIXELS; index++) {
        const alpha = premultiplied[index * 4 + 3];
        const offset = index * 4;
        image.data[offset] = alpha > 0 ? premultiplied[offset] / alpha : 0;
        image.data[offset + 1] = alpha > 0 ? premultiplied[offset + 1] / alpha : 0;
        image.data[offset + 2] = alpha > 0 ? premultiplied[offset + 2] / alpha : 0;
        image.data[offset + 3] = alpha * 255;
    }

    target.putImageData(image, 0, 0);

    return work;
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

/** v9 colour-dodge line art (grey divided by its own blurred negative, then deepened): the pencil's
 *  soft lines and the base of the pen's.
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

/** Removes line pieces smaller than `minSize` px (texture noise reads as dirt, not ink), as in the
 *  InkIt Lab's dropSpecks, with the same faint halo left around what was removed. */
const dropSpecks = (lines: Float32Array, minSize: number): Float32Array => {
    const seen = new Uint8Array(SHEET_PIXELS);
    const stack: number[] = [];
    const piece: number[] = [];

    for (let start = 0; start < SHEET_PIXELS; start++) {
        if (seen[start] || lines[start] < 0.25) continue;

        seen[start] = 1;
        stack.push(start);
        piece.length = 0;

        while (stack.length) {
            const index = stack.pop()!;
            piece.push(index);
            const x = index % SHEET;
            const y = (index / SHEET) | 0;

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nextX = x + dx;
                    const nextY = y + dy;
                    if (nextX < 0 || nextY < 0 || nextX >= SHEET || nextY >= SHEET) continue;

                    const next = nextY * SHEET + nextX;
                    if (!seen[next] && lines[next] >= 0.25) {
                        seen[next] = 1;
                        stack.push(next);
                    }
                }
            }
        }

        if (piece.length < minSize) for (const index of piece) lines[index] = 0;
    }

    for (let index = 0; index < SHEET_PIXELS; index++) if (lines[index] < 0.25 && !seen[index]) lines[index] *= 0.4;

    return lines;
};

/** PEN layer: crisp line art. The v9 line art through levels (faint shading drops to paper, real
 *  lines go solid ink) with the stray specks dropped, over a share of a softer line art's tone,
 *  so features drawn by shading rather than outlines (a nose, a cheek) survive the pen. */
export const inkLineArt = (full: CanvasImageSource, settings = PEN_LINES): Float32Array => {
    const raw = penLines(full, settings.dodge, settings.power);
    const lines = new Float32Array(SHEET_PIXELS);
    const span = settings.levelsHigh - settings.levelsLow;

    for (let index = 0; index < SHEET_PIXELS; index++) {
        const level = Math.min(1, Math.max(0, (raw[index] - settings.levelsLow) / span));
        lines[index] = level * level * (3 - 2 * level);
    }

    dropSpecks(lines, settings.minSpeck);

    // The pen rubs the pencil out, so without this tone it erased whatever wasn't an outline. The
    // softer line art (lower power) keeps mid-tones such as a nose.
    const soft = penLines(full, settings.dodge, settings.softPower);
    for (let index = 0; index < SHEET_PIXELS; index++) lines[index] = Math.max(lines[index], soft[index] * settings.softTone);

    return lines;
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
        pen: inkLineArt(full),
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
