// Every InkIt number, as approved in the InkIt Lab (docs: the InkIt reference engine). Balance changes
// happen here only; the engine, the page and the backend constants follow it.

export type ToolId = "pencil" | "pen" | "paint";

export const TOOL_IDS: readonly ToolId[] = ["pencil", "pen", "paint"];

/** The logical sheet side: every position, radius, speed and saved mask is in these units. */
export const SHEET = 500;
export const SHEET_PIXELS = SHEET * SHEET;

export interface ToolConfig {
    /** The round (the guess about to be made = wrong guesses + 1) the tool unlocks at. */
    unlockRound: number;
    /** Brush radius in sheet px. */
    radius: number;
    /** Opacity of the centre of one calm pass. */
    strength: number;
    /** Share of the radius that is fully strong before the cosine fade to the rim. */
    core: number;
    /** Ink multiplier. */
    cost: number;
}

export const INKIT_CONFIG = {
    tools: {
        pencil: { unlockRound: 1, radius: 40, strength: 0.95, core: 0.45, cost: 1 },
        pen: { unlockRound: 3, radius: 30, strength: 1, core: 0.55, cost: 1.25 },
        paint: { unlockRound: 5, radius: 40, strength: 1, core: 0.5, cost: 1.5 },
    } satisfies Record<ToolId, ToolConfig>,

    /** A later tool rubs out the earlier ones where it passes (share rubbed out at full coverage). */
    erases: { pen: { pencil: 1 }, paint: { pencil: 1, pen: 0.95 } } as Partial<Record<ToolId, Partial<Record<ToolId, number>>>>,

    /** Full refill on every wrong guess; leftover is lost. */
    inkPerRound: 550,
    /** Distance between dabs = radius × this (also the base cost of one dab). */
    dabSpacing: 0.35,
    /** A dab on an area already ≥92% covered by that tool is free. */
    freshMin: 0.08,
    /** Comfortable pace, sheet px per ms. */
    idealSpeed: 0.8,
    /** speedCost = min(maxSpeedCost, 1 + speedWeight × max(0, v / idealSpeed − 1)). */
    speedWeight: 0.35,
    maxSpeedCost: 1.6,
    /** While the pointer is down, moving or not (× tool cost × fresh). */
    drainPerSecond: 60,
    /** Holding still soaks the spot toward opaque. */
    holdBuild: { afterMs: 120, radius: 0.8, rate: 0.05 },

    /** Opt-in: +40% now, every later refill 40% bigger. */
    hint1: { fromRound: 5, bonus: 0.4 },
    /** The group. */
    hint2: { fromRound: 8 },
};

/** The saved drawing: a version byte and three masks at half size, 4 bits per value, deflated. */
export const DRAFT = {
    version: 1,
    side: SHEET / 2,
    levels: 15,
    /** Inflated length: the version byte plus two values per byte. */
    length: 1 + (SHEET / 2) * (SHEET / 2) * 3 / 2,
};
