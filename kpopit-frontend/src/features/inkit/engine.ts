import {
    ERASES, FLOW, HOLD, INK, LAYERS, REVEAL, SHEET_PIXELS, SHEET_SIDE, SPEED_SMOOTHING, TINT, TOOL_IDS, TOOLS,
    type ToolId,
} from "./config.ts";

// The sheet is a fixed 500x500 grid of coverage values per tool (0-1). Positions, brush sizes,
// speed and ink are all in these sheet units, so every screen plays the same game.

export interface Point {
    x: number;
    y: number;
}

export type Masks = Record<ToolId, Float32Array>;

export interface Sheet {
    masks: Masks;
    /** The masks as they were when the current stroke started. */
    before: Masks;
    /** Coverage laid by the current stroke alone. */
    strokeCover: Float32Array;
}

const emptyMasks = (): Masks => ({
    pencil: new Float32Array(SHEET_PIXELS),
    pen: new Float32Array(SHEET_PIXELS),
    paint: new Float32Array(SHEET_PIXELS),
});

export const createSheet = (): Sheet => ({
    masks: emptyMasks(),
    before: emptyMasks(),
    strokeCover: new Float32Array(SHEET_PIXELS),
});

export const clearSheet = (sheet: Sheet): void => {
    for (const tool of TOOL_IDS) {
        sheet.masks[tool].fill(0);
        sheet.before[tool].fill(0);
    }

    sheet.strokeCover.fill(0);
};

export const loadMasks = (sheet: Sheet, masks: Masks): void => {
    for (const tool of TOOL_IDS) {
        sheet.masks[tool].set(masks[tool]);
        sheet.before[tool].set(masks[tool]);
    }

    sheet.strokeCover.fill(0);
};

const clampIndex = (value: number): number => Math.max(0, Math.min(SHEET_SIDE - 1, value | 0));

export const pixelAt = (x: number, y: number): number => clampIndex(y) * SHEET_SIDE + clampIndex(x);

/** Pointer position in CSS pixels → sheet units, whatever size the sheet is drawn at. */
export const toSheetPoint = (
    clientX: number,
    clientY: number,
    rect: { left: number; top: number; width: number; height: number },
): Point => ({
    x: ((clientX - rect.left) / rect.width) * SHEET_SIDE,
    y: ((clientY - rect.top) / rect.height) * SHEET_SIDE,
});

// Brush edge: fully strong inside `core`, then a cosine fade to nothing at the rim.
const profile = (distance: number, core: number): number =>
    distance <= core ? 1 : (1 + Math.cos((Math.PI * (distance - core)) / (1 - core))) / 2;

/** Snapshot the sheet: inside one stroke coverage is the max of its dabs, laid over this snapshot. */
export const beginStroke = (sheet: Sheet): void => {
    for (const tool of TOOL_IDS) sheet.before[tool].set(sheet.masks[tool]);

    sheet.strokeCover.fill(0);
};

/** One dab. `build` is the hold-still case: the spot keeps soaking up toward opaque. */
export const stamp = (
    sheet: Sheet,
    tool: ToolId,
    x: number,
    y: number,
    radius: number,
    strength: number,
    build = false,
): void => {
    const { core } = TOOLS[tool];
    const erased = Object.entries(ERASES[tool]) as [ToolId, number][];
    const { masks, before, strokeCover } = sheet;

    const left = Math.max(0, Math.floor(x - radius));
    const right = Math.min(SHEET_SIDE - 1, Math.ceil(x + radius));
    const top = Math.max(0, Math.floor(y - radius));
    const bottom = Math.min(SHEET_SIDE - 1, Math.ceil(y + radius));

    for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
            const distance = Math.hypot(px - x, py - y) / radius;
            if (distance >= 1) continue;

            const index = py * SHEET_SIDE + px;
            const amount = profile(distance, core) * strength;

            if (build) {
                strokeCover[index] += (1 - strokeCover[index]) * amount;
            } else if (amount > strokeCover[index]) {
                strokeCover[index] = amount;
            } else {
                continue;
            }

            const cover = strokeCover[index];
            masks[tool][index] = 1 - (1 - before[tool][index]) * (1 - cover);

            for (const [other, share] of erased) {
                masks[other][index] = before[other][index] * (1 - cover * share);
            }
        }
    }
};

/** The reveal's eraser: rubs every tool out where it passes. */
export const rub = (sheet: Sheet, x: number, y: number, radius: number): void => {
    const left = Math.max(0, Math.floor(x - radius));
    const right = Math.min(SHEET_SIDE - 1, Math.ceil(x + radius));
    const top = Math.max(0, Math.floor(y - radius));
    const bottom = Math.min(SHEET_SIDE - 1, Math.ceil(y + radius));

    for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
            const distance = Math.hypot(px - x, py - y) / radius;
            if (distance >= 1) continue;

            const keep = 1 - profile(distance, TOOLS.pencil.core);
            const index = py * SHEET_SIDE + px;

            for (const tool of TOOL_IDS) sheet.masks[tool][index] *= keep;
        }
    }
};

/** Mean coverage of one tool over the sheet (sampled every 4th pixel). */
export const coverage = (sheet: Sheet, tool: ToolId): number => {
    const mask = sheet.masks[tool];
    let sum = 0;
    let count = 0;

    for (let index = 0; index < SHEET_PIXELS; index += 4) {
        sum += mask[index];
        count++;
    }

    return sum / count;
};

export const isSheetEmpty = (sheet: Sheet): boolean => TOOL_IDS.every((tool) => coverage(sheet, tool) === 0);

/* ---------- Ink ---------- */

/** Speed above the comfortable pace costs more ink. */
export const speedCost = (speed: number): number =>
    Math.min(INK.maxSpeedCost, 1 + INK.speedCostSlope * Math.max(0, speed / INK.idealSpeed - 1));

/** Calm strokes lay down more; fast ones come out lighter. */
export const flow = (speed: number): number =>
    Math.max(FLOW.floor, FLOW.calm - FLOW.slope * Math.max(0, speed / INK.idealSpeed - FLOW.startShare));

/** Ink a refill gives: every refill is bigger once hint 1 is on. */
export const roundInk = (hintActive: boolean): number => INK.perRound * (hintActive ? 1 + INK.hintBoost : 1);

export const unlockedTools = (round: number): ToolId[] => TOOL_IDS.filter((tool) => round >= TOOLS[tool].fromRound);

/** The best tool the round offers (what the page selects when a new one arrives). */
export const newestTool = (round: number): ToolId => unlockedTools(round).at(-1) ?? "pencil";

export interface InkPen {
    ink: number;
    /** What a full pot holds now (the ring's 100%). */
    capacity: number;
    tool: ToolId;
    drawing: boolean;
    last: Point;
    lastMoveAt: number;
    lastTickAt: number;
    buildDebtMs: number;
    /** Smoothed speed in sheet units per ms. */
    speed: number;
    lastStrokeCost: number;
    spentByTool: Record<ToolId, number>;
}

export const createPen = (): InkPen => ({
    ink: INK.perRound,
    capacity: INK.perRound,
    tool: "pencil",
    drawing: false,
    last: { x: 0, y: 0 },
    lastMoveAt: 0,
    lastTickAt: 0,
    buildDebtMs: 0,
    speed: 0,
    lastStrokeCost: 0,
    spentByTool: { pencil: 0, pen: 0, paint: 0 },
});

/** A wrong guess: back to a full pot (what was left is lost). */
export const refill = (pen: InkPen, hintActive: boolean): void => {
    pen.ink = roundInk(hintActive);
    pen.capacity = pen.ink;
    pen.drawing = false;
};

/** Hint 1 used mid-round: the extra share right away, on top of what is left. */
export const addHintInk = (pen: InkPen): void => {
    pen.ink += INK.perRound * INK.hintBoost;
    pen.capacity = Math.max(pen.capacity, pen.ink);
};

const spend = (pen: InkPen, amount: number): void => {
    pen.ink -= amount;
    pen.lastStrokeCost += amount;
    pen.spentByTool[pen.tool] += amount;

    if (pen.ink <= 0) {
        pen.ink = 0;
        pen.drawing = false;
    }
};

// Ink pays only for what is new, measured against the sheet before this stroke, so the stroke's
// own overlapping dabs don't make the rest of it free.
const applyDab = (sheet: Sheet, pen: InkPen, x: number, y: number, speed: number): number => {
    const tool = TOOLS[pen.tool];
    const fresh = 1 - sheet.before[pen.tool][pixelAt(x, y)];
    if (fresh < INK.freshFloor) return 0;

    stamp(sheet, pen.tool, x, y, tool.radius, Math.min(1, tool.strength * flow(speed)));

    return tool.radius * INK.stepShare * tool.cost * speedCost(speed) * fresh;
};

/** Pointer down at a sheet point. False when the sheet is locked (no ink left). */
export const penDown = (sheet: Sheet, pen: InkPen, point: Point, now: number): boolean => {
    if (pen.ink <= 0) return false;

    pen.drawing = true;
    pen.last = point;
    pen.lastMoveAt = now;
    pen.lastTickAt = now;
    pen.buildDebtMs = 0;
    pen.speed = 0;
    pen.lastStrokeCost = 0;

    beginStroke(sheet);
    spend(pen, applyDab(sheet, pen, point.x, point.y, 0));

    return true;
};

/** Pointer moved: dabs at a fixed step along the segment, however often the events arrive. */
export const penMove = (sheet: Sheet, pen: InkPen, point: Point, now: number): void => {
    if (!pen.drawing || pen.ink <= 0) return;

    const step = TOOLS[pen.tool].radius * INK.stepShare;
    const distance = Math.hypot(point.x - pen.last.x, point.y - pen.last.y);
    if (distance < step) return;

    const elapsed = Math.max(1, now - pen.lastMoveAt);
    pen.speed = pen.speed * (1 - SPEED_SMOOTHING) + (distance / elapsed) * SPEED_SMOOTHING;

    const count = Math.floor(distance / step);
    let placed = 0;

    while (placed < count && pen.ink > 0) {
        placed++;
        const along = (placed * step) / distance;

        spend(pen, applyDab(
            sheet, pen,
            pen.last.x + (point.x - pen.last.x) * along,
            pen.last.y + (point.y - pen.last.y) * along,
            pen.speed,
        ));
    }

    const reached = (placed * step) / distance;
    pen.last = {
        x: pen.last.x + (point.x - pen.last.x) * reached,
        y: pen.last.y + (point.y - pen.last.y) * reached,
    };
    // Only the time the reached part took: the rest of the segment keeps its own.
    pen.lastMoveAt += (now - pen.lastMoveAt) * reached;
};

/** Once per frame while the pointer is down: the continuous drain, and the hold-still build-up.
    Both go by elapsed time, so the frame rate doesn't change the game. */
export const penTick = (sheet: Sheet, pen: InkPen, now: number): void => {
    if (!pen.drawing) return;

    const elapsed = Math.max(0, now - pen.lastTickAt);
    pen.lastTickAt = now;

    const fresh = 1 - sheet.before[pen.tool][pixelAt(pen.last.x, pen.last.y)];
    spend(pen, (INK.holdPerSecond * elapsed / 1000) * TOOLS[pen.tool].cost * fresh);
    if (!pen.drawing) return;

    if (now - pen.lastMoveAt <= HOLD.idleMs) {
        pen.buildDebtMs = 0;
        return;
    }

    pen.buildDebtMs += elapsed;
    while (pen.buildDebtMs >= HOLD.intervalMs) {
        pen.buildDebtMs -= HOLD.intervalMs;
        stamp(sheet, pen.tool, pen.last.x, pen.last.y, TOOLS[pen.tool].radius * HOLD.radiusShare, HOLD.strength, true);
        pen.speed *= 0.9;
    }
};

export const penUp = (pen: InkPen): void => {
    pen.drawing = false;
    pen.speed = 0;
};

/* ---------- Layers (built once per photo) ---------- */

export interface CanvasLike {
    width: number;
    height: number;
    getContext(type: "2d", options?: { willReadFrequently?: boolean }): CanvasRenderingContext2D | null;
}

export type MakeCanvas = () => CanvasLike;

export interface Layers {
    /** The photo's RGBA pixels at sheet size. */
    photo: Uint8ClampedArray;
    /** Darkness (0 paper, 1 black) of the loose pencil sketch. */
    pencil: Float32Array;
    /** Darkness of the pen line art. */
    pen: Float32Array;
}

const context = (canvas: CanvasLike): CanvasRenderingContext2D => {
    const found = canvas.getContext("2d", { willReadFrequently: true });
    if (!found) throw new Error("Canvas is not available");

    return found;
};

const greyOf = (pixels: Uint8ClampedArray, index: number): number =>
    0.299 * pixels[index * 4] + 0.587 * pixels[index * 4 + 1] + 0.114 * pixels[index * 4 + 2];

export const blurred = (source: CanvasImageSource, radius: number, makeCanvas: MakeCanvas): CanvasLike => {
    const canvas = makeCanvas();
    const target = context(canvas);

    target.filter = `blur(${radius}px)`;
    target.drawImage(source, 0, 0, SHEET_SIDE, SHEET_SIDE);
    target.filter = "none";

    return canvas;
};

/** Pen line art: grey divided by its own blurred negative (colour dodge), then deepened. */
export const sketch = (source: CanvasImageSource, dodge: number, power: number, makeCanvas: MakeCanvas): CanvasLike => {
    const work = makeCanvas();
    const target = context(work);
    target.fillStyle = "#fff";
    target.fillRect(0, 0, SHEET_SIDE, SHEET_SIDE);
    target.drawImage(source, 0, 0, SHEET_SIDE, SHEET_SIDE);

    const pixels = target.getImageData(0, 0, SHEET_SIDE, SHEET_SIDE).data;
    const grey = new Float32Array(SHEET_PIXELS);
    const inverse = target.createImageData(SHEET_SIDE, SHEET_SIDE);

    for (let index = 0; index < SHEET_PIXELS; index++) {
        const value = greyOf(pixels, index);
        grey[index] = value;
        inverse.data[index * 4] = inverse.data[index * 4 + 1] = inverse.data[index * 4 + 2] = 255 - value;
        inverse.data[index * 4 + 3] = 255;
    }

    target.putImageData(inverse, 0, 0);

    const blur = context(blurred(work as unknown as CanvasImageSource, dodge, makeCanvas))
        .getImageData(0, 0, SHEET_SIDE, SHEET_SIDE).data;
    const out = makeCanvas();
    const outContext = context(out);
    const result = outContext.createImageData(SHEET_SIDE, SHEET_SIDE);

    for (let index = 0; index < SHEET_PIXELS; index++) {
        const negative = blur[index * 4 + 3] > 250 ? blur[index * 4] : 255 - grey[index];
        const value = Math.pow(Math.min(1, grey[index] / Math.max(1, 255 - negative)), power);

        result.data[index * 4] = result.data[index * 4 + 1] = result.data[index * 4 + 2] = 255 * value;
        result.data[index * 4 + 3] = 255;
    }

    outContext.putImageData(result, 0, 0);

    return out;
};

/** Seeded random (mulberry32): the same photo always gets the same sketch. */
export const seeded = (seed: number): (() => number) => {
    let state = seed >>> 0;

    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
};

/** Pencil: loose hatching for tone and short hairy strokes that chase the edges. Shapes read,
    features don't. */
export const scribble = (source: CanvasImageSource, seed: number, makeCanvas: MakeCanvas): CanvasLike => {
    const side = SHEET_SIDE;
    const work = makeCanvas();
    const target = context(work);
    target.fillStyle = "#fff";
    target.fillRect(0, 0, side, side);
    target.drawImage(blurred(source, LAYERS.scribbleBlur, makeCanvas) as unknown as CanvasImageSource, 0, 0);

    const pixels = target.getImageData(0, 0, side, side).data;
    const grey = new Float32Array(SHEET_PIXELS);
    const gradX = new Float32Array(SHEET_PIXELS);
    const gradY = new Float32Array(SHEET_PIXELS);
    const magnitude = new Float32Array(SHEET_PIXELS);

    for (let index = 0; index < SHEET_PIXELS; index++) grey[index] = greyOf(pixels, index);

    let sum = 0;
    for (let y = 1; y < side - 1; y++) {
        for (let x = 1; x < side - 1; x++) {
            const index = y * side + x;

            gradX[index] = -grey[index - side - 1] - 2 * grey[index - 1] - grey[index + side - 1]
                + grey[index - side + 1] + 2 * grey[index + 1] + grey[index + side + 1];
            gradY[index] = -grey[index - side - 1] - 2 * grey[index - side] - grey[index - side + 1]
                + grey[index + side - 1] + 2 * grey[index + side] + grey[index + side + 1];
            magnitude[index] = Math.hypot(gradX[index], gradY[index]);
            sum += magnitude[index];
        }
    }

    const mean = sum / SHEET_PIXELS;
    const random = seeded(seed * 7919 + 13);
    const out = makeCanvas();
    const pencil = context(out);
    pencil.fillStyle = "#fff";
    pencil.fillRect(0, 0, side, side);
    pencil.lineCap = "round";
    pencil.strokeStyle = "#3a3a44";

    // Hatching: more of it where the photo is dark.
    for (let count = 0; count < 11000; count++) {
        const x = random() * side;
        const y = random() * side;
        const dark = 1 - grey[(y | 0) * side + (x | 0)] / 255;
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
        const startX = 12 + random() * (side - 24);
        const startY = 12 + random() * (side - 24);
        const strength = magnitude[(startY | 0) * side + (startX | 0)];
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
                    const index = (y | 0) * side + (x | 0);
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
                    if (x < 2 || y < 2 || x > side - 3 || y > side - 3) break;

                    pencil.lineTo(x, y);
                }
            }

            pencil.stroke();
        }
    }

    pencil.globalAlpha = 1;

    return out;
};

// Grey layer → darkness per pixel (0 = paper, 1 = black).
const darkness = (source: CanvasLike): Float32Array => {
    const data = context(source).getImageData(0, 0, SHEET_SIDE, SHEET_SIDE).data;
    const out = new Float32Array(SHEET_PIXELS);

    for (let index = 0; index < SHEET_PIXELS; index++) out[index] = 1 - data[index * 4] / 255;

    return out;
};

/** Read the photo and build what each tool reveals. Throws if the image taints the canvas
    (loaded without CORS). */
export const buildLayers = (image: CanvasImageSource, seed: number, makeCanvas: MakeCanvas): Layers => {
    const full = makeCanvas();
    const target = context(full);

    // A non-square photo is cropped to its centred square, never stretched.
    const width = "naturalWidth" in image ? image.naturalWidth : SHEET_SIDE;
    const height = "naturalHeight" in image ? image.naturalHeight : SHEET_SIDE;
    const crop = Math.min(width, height);
    target.drawImage(image, (width - crop) / 2, (height - crop) / 2, crop, crop, 0, 0, SHEET_SIDE, SHEET_SIDE);

    const fullSource = full as unknown as CanvasImageSource;

    return {
        photo: target.getImageData(0, 0, SHEET_SIDE, SHEET_SIDE).data,
        pencil: darkness(scribble(fullSource, seed, makeCanvas)),
        pen: darkness(sketch(fullSource, LAYERS.lineArtDodge, LAYERS.lineArtPower, makeCanvas)),
    };
};

/** A stable seed from the photo path, so the pencil sketch is the same on every device. */
export const seedFromPath = (path: string): number => {
    let hash = 2166136261;

    for (let index = 0; index < path.length; index++) {
        hash ^= path.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0) % 100000;
};

/* ---------- Composition ---------- */

/** White → paint mixes the photo in → graphite and pen darken on top. The canvas multiplies
    over the CSS paper, so white here is bare paper. `out` is `side`x`side` RGBA. */
export const composeFrame = (out: Uint8ClampedArray, layers: Layers, masks: Masks, side: number = SHEET_SIDE): void => {
    const { photo, pencil, pen } = layers;
    const scale = SHEET_SIDE / side;
    const [graphiteR, graphiteG, graphiteB] = TINT.graphite;
    const [penR, penG, penB] = TINT.pen;

    for (let y = 0; y < side; y++) {
        const sourceRow = Math.min(SHEET_SIDE - 1, (y * scale) | 0) * SHEET_SIDE;

        for (let x = 0; x < side; x++) {
            const source = sourceRow + Math.min(SHEET_SIDE - 1, (x * scale) | 0);
            const target = (y * side + x) * 4;
            const paint = masks.paint[source];

            let red = 255;
            let green = 255;
            let blue = 255;

            if (paint > 0) {
                red += (photo[source * 4] - red) * paint;
                green += (photo[source * 4 + 1] - green) * paint;
                blue += (photo[source * 4 + 2] - blue) * paint;
            }

            const graphite = masks.pencil[source] * pencil[source];
            const ink = masks.pen[source] * pen[source];

            out[target] = red * (1 - graphite * graphiteR) * (1 - ink * penR);
            out[target + 1] = green * (1 - graphite * graphiteG) * (1 - ink * penG);
            out[target + 2] = blue * (1 - graphite * graphiteB) * (1 - ink * penB);
            out[target + 3] = 255;
        }
    }
};

/* ---------- Win reveal ---------- */

export const REVEAL_DURATION_MS = REVEAL.passMs * REVEAL.passes.length;

export interface RevealState {
    startedAt: number;
    /** The player's drawing as it was when the reveal started. */
    snapshot: Masks;
    /** Per band: how far it trails the leading edge. */
    lag: number[];
}

export interface RevealFrame {
    done: boolean;
    /** Index of the pass being drawn (0 eraser, then pencil, pen, paint). */
    pass: number;
    tool: ToolId | null;
    /** Eased progress of the pass, 0-1. */
    progress: number;
    /** Leading edge as a share of the sheet width, where the tool sprite rides. */
    edge: number;
}

// Small seeded generator: the bands are ragged the same way on every device.
const lagValues = (): number[] => {
    let state = (REVEAL.seed * 9301 + 49297) >>> 0 || 1;

    return Array.from({ length: REVEAL.bands }, () => {
        state = (state * 1664525 + 1013904223) >>> 0;

        return (state / 4294967296) * REVEAL.bandLag;
    });
};

export const startReveal = (sheet: Sheet, now: number): RevealState => ({
    startedAt: now,
    snapshot: {
        pencil: sheet.masks.pencil.slice(),
        pen: sheet.masks.pen.slice(),
        paint: sheet.masks.paint.slice(),
    },
    lag: lagValues(),
});

/** Per sheet row, how many pixels from the left the sweep has covered. */
const sweptWidths = (lag: number[], progress: number): Int32Array => {
    const widths = new Int32Array(SHEET_SIDE);

    for (let y = 0; y < SHEET_SIDE; y++) {
        const band = Math.min(REVEAL.bands - 1, Math.floor((y * REVEAL.bands) / SHEET_SIDE));
        const reached = (progress * REVEAL.overshoot - lag[band]) * SHEET_SIDE;

        widths[y] = Math.max(0, Math.min(SHEET_SIDE, Math.round(reached)));
    }

    return widths;
};

// Inside the swept part of each row the mask is `inside`; the rest is `outside` (a value, or
// the snapshot's own pixels).
const sweep = (mask: Float32Array, widths: Int32Array, inside: number, outside: number | Float32Array): void => {
    for (let y = 0; y < SHEET_SIDE; y++) {
        const start = y * SHEET_SIDE;
        const edge = start + widths[y];
        const end = start + SHEET_SIDE;

        mask.fill(inside, start, edge);

        if (typeof outside === "number") mask.fill(outside, edge, end);
        else mask.set(outside.subarray(edge, end), edge);
    }
};

/** Draw the reveal as it stands at `now`: rub the attempt out, then redraw the photo tool by tool. */
export const stepReveal = (sheet: Sheet, state: RevealState, now: number): RevealFrame => {
    const elapsed = Math.max(0, now - state.startedAt);
    const { masks } = sheet;

    if (elapsed >= REVEAL_DURATION_MS) {
        showPhoto(sheet);

        return { done: true, pass: REVEAL.passes.length - 1, tool: "paint", progress: 1, edge: 1 };
    }

    const pass = Math.floor(elapsed / REVEAL.passMs);
    const linear = (elapsed - pass * REVEAL.passMs) / REVEAL.passMs;
    const progress = 1 - Math.pow(1 - linear, 2);
    const widths = sweptWidths(state.lag, progress);

    if (pass === 0) {
        for (const tool of TOOL_IDS) sweep(masks[tool], widths, 0, state.snapshot[tool]);
    } else if (pass === 1) {
        sweep(masks.pencil, widths, 1, 0);
        masks.pen.fill(0);
        masks.paint.fill(0);
    } else if (pass === 2) {
        sweep(masks.pencil, widths, 0, 1);
        sweep(masks.pen, widths, 1, 0);
        masks.paint.fill(0);
    } else {
        masks.pencil.fill(0);
        sweep(masks.pen, widths, 0, 1);
        sweep(masks.paint, widths, 1, 0);
    }

    return { done: false, pass, tool: REVEAL.passes[pass], progress, edge: Math.min(1, progress * 1.1) };
};

/** The finished sheet (reduced motion, or a won game after a reload): the photo, fully painted. */
export const showPhoto = (sheet: Sheet): void => {
    sheet.masks.pencil.fill(0);
    sheet.masks.pen.fill(0);
    sheet.masks.paint.fill(1);
    beginStroke(sheet);
};
