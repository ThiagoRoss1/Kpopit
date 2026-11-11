// Every InkIt number lives here: balance changes never touch the engine or the page.

export type ToolId = "pencil" | "pen" | "paint";

export const TOOL_IDS: readonly ToolId[] = ["pencil", "pen", "paint"];

/** Logical sheet side. Brush sizes, speed, ink and saved masks are all in these units. */
export const SHEET_SIDE = 500;
export const SHEET_PIXELS = SHEET_SIDE * SHEET_SIDE;

export interface ToolConfig {
    /** Round (the Nth guess being made) the tool unlocks at. */
    fromRound: number;
    radius: number;
    /** Share of the radius that is fully strong before the cosine fade. */
    core: number;
    /** Coverage one calm stroke lays down. */
    strength: number;
    /** Ink cost multiplier. */
    cost: number;
}

export const TOOLS: Record<ToolId, ToolConfig> = {
    pencil: { fromRound: 1, radius: 40, core: 0.45, strength: 0.95, cost: 1 },
    pen: { fromRound: 3, radius: 30, core: 0.55, strength: 1, cost: 1.25 },
    paint: { fromRound: 5, radius: 40, core: 0.5, strength: 1, cost: 1.5 },
};

/** Where a later tool passes, the share of each earlier one it rubs out. */
export const ERASES: Record<ToolId, Partial<Record<ToolId, number>>> = {
    pencil: {},
    pen: { pencil: 1 },
    paint: { pencil: 1, pen: 0.95 },
};

export const INK = {
    perRound: 550,
    /** Dab spacing as a share of the brush radius (also the path cost of one dab). */
    stepShare: 0.35,
    /** Comfortable speed, in sheet units per ms. */
    idealSpeed: 0.8,
    speedCostSlope: 0.35,
    maxSpeedCost: 1.6,
    /** Ink per second while the pointer is down, moving or not. */
    holdPerSecond: 60,
    /** Below this share of uncovered sheet under the brush, a dab is free and lays nothing. */
    freshFloor: 0.08,
    /** Hint 1: the extra share added at once and to every later refill. */
    hintBoost: 0.4,
};

export const FLOW = {
    floor: 0.75,
    calm: 1.1,
    slope: 0.15,
    /** Share of the ideal speed where strokes start to come out lighter. */
    startShare: 0.5,
};

export const HOLD = {
    /** Pointer still for this long (ms) starts building the spot toward opaque. */
    idleMs: 120,
    radiusShare: 0.8,
    strength: 0.05,
    /** One build dab per this many ms, so 60 and 120 Hz screens build alike. */
    intervalMs: 1000 / 60,
};

/** New speed sample weight in the smoothed speed. */
export const SPEED_SMOOTHING = 0.45;

export const HINTS = {
    inkRound: 5,
    groupRound: 8,
};

/** How graphite and pen ink darken each channel of what is under them. */
export const TINT = {
    graphite: [0.86, 0.84, 0.76],
    pen: [1, 1, 0.95],
};

export const LAYERS = {
    lineArtDodge: 5,
    lineArtPower: 2.6,
    scribbleBlur: 3,
};

/** Saved drawing: three masks at this side, 4 bits per value, deflated, after a version byte. */
export const DRAFT = {
    version: 1,
    side: 250,
    levels: 15,
};

/** Win reveal: four passes sweep the sheet left to right in ragged bands (eraser, pencil, pen,
    paint), each tool replacing the one before it. */
export const REVEAL = {
    passMs: 700,
    bands: 18,
    /** How far (share of the sheet) a band may lag behind the leading edge. */
    bandLag: 0.14,
    /** The sweep overshoots so the laggiest band still reaches the far edge. */
    overshoot: 1.18,
    seed: 17,
    passes: [null, "pencil", "pen", "paint"] as (ToolId | null)[],
};
