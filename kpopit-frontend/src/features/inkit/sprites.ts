import type { ToolId } from "./config.ts";

// Pixel tool sprites, drawn in code (no image files): each tool is a profile along the 45° axis,
// tip at the bottom left. Puff Pop palette, ink outline and a pink side.

export type SpriteId = ToolId | "eraser";

type Tone = -1 | 0 | 1;
type PaletteKey = "graphite" | "wood" | "body" | "metal" | "eraser" | "grip" | "paint" | "sleeve";

/** [from, to, half width at from, half width at to, palette key, ringed]. */
type Segment = [number, number, number, number, PaletteKey, boolean?];

const SEGMENTS: Record<SpriteId, Segment[]> = {
    pencil: [[0, 0.07, 0, 0.7, "graphite"], [0.07, 0.26, 0.7, 1.9, "wood"], [0.26, 0.76, 1.9, 1.9, "body"], [0.76, 0.86, 2, 2, "metal", true], [0.86, 1, 1.9, 1.6, "eraser"]],
    pen: [[0, 0.05, 0.3, 0.35, "graphite"], [0.05, 0.17, 0.4, 1.5, "metal"], [0.17, 0.36, 1.7, 1.7, "grip", true], [0.36, 0.86, 1.5, 1.5, "body"], [0.86, 1, 1.3, 1.1, "metal"]],
    paint: [[0, 0.1, 2.5, 2.6, "paint"], [0.1, 0.23, 2.6, 2.4, "wood"], [0.23, 0.37, 2.3, 1.6, "metal", true], [0.37, 0.95, 1.5, 1.15, "body"], [0.95, 1, 1.1, 0.6, "body"]],
    eraser: [[0.16, 0.5, 2.9, 2.9, "eraser"], [0.5, 0.84, 3, 3, "sleeve"]],
};

/** Light, base and shade of each part. */
const PALETTE: Record<PaletteKey, [string, string, string]> = {
    graphite: ["#4A4450", "#1A1418", "#1A1418"],
    wood: ["#FFFFFF", "#FFF4E8", "#F6D9C6"],
    body: ["#FFFFFF", "#FFFDFA", "#FFD9EC"],
    metal: ["#FFFFFF", "#F3EDF1", "#D9CAD3"],
    eraser: ["#FFC2DF", "#FF8AC4", "#FF5FAE"],
    grip: ["#FFA5D0", "#FF70B8", "#E04B97"],
    paint: ["#FF7DBD", "#FF3399", "#D21C78"],
    sleeve: ["#FFA5D0", "#FF70B8", "#E04B97"],
};

const GRID = 16;
const INK = "#1A1418";
const SIDE = "#FF8AC4";
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

type Cells = (string | null)[][];

const rasterTool = (sprite: SpriteId): Cells => {
    const pad = 1.2;
    const originX = pad;
    const originY = GRID - pad;
    const length = (GRID - 2 * pad) * Math.SQRT2;
    const cells: Cells = [];

    for (let y = 0; y < GRID; y++) {
        cells.push([]);

        for (let x = 0; x < GRID; x++) {
            const offsetX = x + 0.5 - originX;
            const offsetY = y + 0.5 - originY;
            const along = (offsetX - offsetY) / Math.SQRT2 / length;
            const across = (offsetX + offsetY) / Math.SQRT2;
            const segment = SEGMENTS[sprite].find(([from, to]) => along >= from && along < to);
            let color: string | null = null;

            if (segment) {
                const [from, to, startWidth, endWidth, key, ringed] = segment;
                const halfWidth = startWidth + (endWidth - startWidth) * ((along - from) / (to - from));

                if (Math.abs(across) <= halfWidth + 0.05) {
                    let tone: Tone = across > halfWidth * 0.3 ? 1 : across < -halfWidth * 0.35 ? -1 : 0;
                    if (ringed && Math.floor((along * length) / 1.4) % 2) tone = Math.min(1, tone + 1) as Tone;

                    color = PALETTE[key][tone + 1];
                }
            }

            cells[y].push(color);
        }
    }

    return cells;
};

// Fills every empty cell that touches a filled one.
const outline = (cells: Cells, color: string): Cells =>
    cells.map((row, y) => row.map((cell, x) => {
        if (cell) return cell;

        return NEIGHBOURS.some(([dx, dy]) => cells[y + dy]?.[x + dx]) ? color : null;
    }));

const spriteGrid = (sprite: SpriteId): Cells => {
    const raster = rasterTool(sprite);
    const size = GRID + 3;
    const padded: Cells = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => raster[y]?.[x] ?? null));
    const inked = outline(padded, INK);
    // The pink side: one cell down-right of everything, then outlined again.
    const sided = inked.map((row, y) => row.map((cell, x) => cell ?? (x >= 1 && inked[y - 1]?.[x - 1] ? SIDE : null)));

    return outline(sided, INK);
};

const toGrey = (color: string): string => {
    const red = parseInt(color.slice(1, 3), 16);
    const green = parseInt(color.slice(3, 5), 16);
    const blue = parseInt(color.slice(5, 7), 16);
    const light = Math.round((red * 0.3 + green * 0.59 + blue * 0.11) * 0.55 + 70);

    return `#${[light, light, light + 6].map((value) => Math.min(255, value).toString(16).padStart(2, "0")).join("")}`;
};

const toDataUrl = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const gridSvg = (cells: Cells, scale: number): string => {
    const size = cells.length;
    let rects = "";

    for (let y = 0; y < size; y++) {
        let x = 0;

        while (x < size) {
            const color = cells[y][x];
            if (!color) {
                x++;
                continue;
            }

            let end = x;
            while (end + 1 < size && cells[y][end + 1] === color) end++;

            rects += `<rect x="${x}" y="${y}" width="${end - x + 1}" height="1" fill="${color}"/>`;
            x = end + 1;
        }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size * scale}" height="${size * scale}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${rects}</svg>`;
};

const SCALE = 2;
const cache = new Map<string, string>();

const cached = (key: string, build: () => string): string => {
    let url = cache.get(key);

    if (!url) {
        url = build();
        cache.set(key, url);
    }

    return url;
};

/** The tool's sprite as an image URL. */
export const spriteUrl = (sprite: SpriteId): string =>
    cached(sprite, () => toDataUrl(gridSvg(spriteGrid(sprite), SCALE)));

/** The greyed-out sprite (locked tool, out of ink). */
export const greySpriteUrl = (sprite: SpriteId): string =>
    cached(`${sprite}:grey`, () => toDataUrl(gridSvg(spriteGrid(sprite).map((row) => row.map((cell) => cell && toGrey(cell))), SCALE)));

/** CSS cursor: the tool's sprite with the hotspot on its tip. */
export const toolCursor = (tool: ToolId): string => {
    const hotspotX = Math.round(1.6 * SCALE);
    const hotspotY = Math.round((GRID - 1.6) * SCALE);

    return `url("${spriteUrl(tool)}") ${hotspotX} ${hotspotY}, crosshair`;
};

/** Soft paper grain as a tiling SVG; `strength` is its opacity factor. */
export const grainUrl = (strength: number): string =>
    cached(`grain:${strength}`, () => toDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="f"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .3 0 0 0 0 .25 0 0 0 0 .2 0 0 0 ${strength * 6} -${strength * 2.4}"/></filter><rect width="160" height="160" filter="url(#f)"/></svg>`,
    ));
