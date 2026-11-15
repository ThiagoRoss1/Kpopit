// Every InkIt number, from the InkIt reference engine (the v9 glow brush with the InkIt Lab's layers, ink,
// rounds and hints). Balance changes happen here only; the engine, the page and the backend follow it.

export type ToolId = "pencil" | "pen" | "paint";

export const TOOL_IDS: readonly ToolId[] = ["pencil", "pen", "paint"];

/** The logical sheet side: every position, radius, speed and saved mask is in these units. */
export const SHEET = 500;
export const SHEET_PIXELS = SHEET * SHEET;

export interface ToolConfig {
    /** The round (the guess about to be made = wrong guesses + 1) the tool unlocks at. */
    unlockRound: number;
    /** v9 brush radius in sheet px (7% of the sheet × tool size). */
    radius: number;
    /** Opacity of one dab's centre; dabs add up, so strokes build gradually and stay light. */
    peak: number;
    /** Ink multiplier. */
    cost: number;
}

export const INKIT_CONFIG = {
    tools: {
        pencil: { unlockRound: 1, radius: 45.5, peak: 0.2, cost: 1 },
        pen: { unlockRound: 3, radius: 35, peak: 0.28, cost: 1.25 },
        paint: { unlockRound: 5, radius: 42, peak: 0.2, cost: 1.5 },
    } satisfies Record<ToolId, ToolConfig>,

    /** Glow of one dab: [distance from the centre as a share of the radius, opacity at peak 1]. */
    glow: [[0, 1], [0.25, 0.53], [0.5, 0.22], [0.75, 0.05], [1, 0]] as [number, number][],
    /** A later tool rubs out the earlier ones with the same glow at 1.6× its peak: a gradual hand-over. */
    erases: { pen: { pencil: 1.6 }, paint: { pencil: 1.6, pen: 1.6 } } as Partial<Record<ToolId, Partial<Record<ToolId, number>>>>,
    /** Sheet px between dabs, every tool. */
    dabStep: 8.75,

    /** Full refill on every wrong guess; leftover is lost. */
    inkPerRound: 550,
    /** A spot this tool already covers past 92% costs nothing ("need"). */
    freshFull: 0.92,
    /** Comfortable pace, sheet px per ms. */
    idealSpeed: 0.8,
    /** speedCost = min(maxSpeedCost, 1 + speedWeight × max(0, v / idealSpeed − 1)). */
    speedWeight: 0.35,
    maxSpeedCost: 1.6,
    /** While the pointer is down, moving or not (× tool cost × need). */
    drainPerSecond: 60,
    /** Every frame the pointer is down adds a dab of peak dt × this under it. */
    holdBuildPerSecond: 1.4,

    /** Opt-in: +40% now, every later refill 40% bigger. */
    hint1: { fromRound: 5, bonus: 0.4 },
    /** The group. */
    hint2: { fromRound: 8 },
};

/** The pen's line art: the v9 colour dodge sharpened with levels (outlines as solid ink, no speckle)
 *  over a share of its soft tone, so it refines the pencil instead of erasing shaded features. */
export const PEN_LINES = {
    dodge: 5,
    power: 2.6,
    /** Darkness below levelsLow becomes paper, above levelsHigh solid ink. */
    levelsLow: 0.12,
    levelsHigh: 0.7,
    /** Line pieces smaller than this many px are dropped. */
    minSpeck: 18,
    /** Under the solid lines: a softer line art (this power) at this share, for noses, cheeks, jaws. */
    softPower: 2,
    softTone: 0.55,
};

/** The saved drawing: a version byte and three masks at half size, 4 bits per value, deflated. */
export const DRAFT = {
    version: 1,
    side: SHEET / 2,
    levels: 15,
    /** Inflated length: the version byte plus two values per byte. */
    length: 1 + (SHEET / 2) * (SHEET / 2) * 3 / 2,
};
