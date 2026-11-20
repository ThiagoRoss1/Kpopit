import { INKIT_CONFIG, SHEET, SHEET_PIXELS, TOOL_IDS, type ToolId } from "./config.ts";

// The InkIt sheet, ported 1:1 from the reference engine (v9 glow brush, InkIt Lab ink and rounds).
// Everything is in sheet units (a fixed 500×500 sheet): convert pointer positions with toSheet first, so screen
// size never changes the game. "round" = the guess the player is about to make = wrong guesses + 1.

export interface Point {
    x: number;
    y: number;
}

export type Masks = Record<ToolId, Float32Array>;

/** What each tool reveals, built once per photo (see layers.ts). */
export interface Layers {
    /** The photo's RGBA pixels at sheet size. */
    photo: Uint8ClampedArray;
    /** Darkness (0 paper, 1 black) of the pencil sketch (line art + hatching). */
    pencil: Float32Array;
    /** Darkness of the pen line art. */
    pen: Float32Array;
}

export type RevealStage = ToolId | "eraser";

export interface RevealStep {
    done: boolean;
    /** Where the stage's tool is, for the sprite; null once done. */
    head: { x: number; y: number; stage: RevealStage } | null;
}

/* ---------- Pure helpers ---------- */

export const toSheet = (clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): Point => ({
    x: ((clientX - rect.left) / rect.width) * SHEET,
    y: ((clientY - rect.top) / rect.height) * SHEET,
});

export const isUnlocked = (tool: ToolId, round: number): boolean => round >= INKIT_CONFIG.tools[tool].unlockRound;

export const unlockedTools = (round: number): ToolId[] => TOOL_IDS.filter((tool) => isUnlocked(tool, round));

export const pixelAt = (x: number, y: number): number =>
    Math.max(0, Math.min(SHEET - 1, y | 0)) * SHEET + Math.max(0, Math.min(SHEET - 1, x | 0));

/** Opacity of one dab at `distance` (share of the radius), like the v9 canvas radial gradient: each
 *  stop is clamped to 1 first, then interpolated. */
export const glowAt = (distance: number, peak: number): number => {
    const stops = INKIT_CONFIG.glow;

    for (let index = 1; index < stops.length; index++) {
        if (distance > stops[index][0]) continue;

        const [fromDistance, fromAlpha] = stops[index - 1];
        const [toDistance, toAlpha] = stops[index];
        const from = Math.min(1, fromAlpha * peak);
        const to = Math.min(1, toAlpha * peak);

        return from + ((to - from) * (distance - fromDistance)) / (toDistance - fromDistance);
    }

    return 0;
};

export const speedCost = (speed: number): number =>
    Math.min(INKIT_CONFIG.maxSpeedCost, 1 + INKIT_CONFIG.speedWeight * Math.max(0, speed / INKIT_CONFIG.idealSpeed - 1));

export const roundInk = (hint1Used: boolean): number => INKIT_CONFIG.inkPerRound * (hint1Used ? 1 + INKIT_CONFIG.hint1.bonus : 1);

/** The reveal's last stage: the masks ease into the photo over this long. */
export const REVEAL_SETTLE_MS = 450;

const copyMasks = (masks: Masks): Masks => ({
    pencil: Float32Array.from(masks.pencil),
    pen: Float32Array.from(masks.pen),
    paint: Float32Array.from(masks.paint),
});

const emptyMasks = (): Masks => ({
    pencil: new Float32Array(SHEET_PIXELS),
    pen: new Float32Array(SHEET_PIXELS),
    paint: new Float32Array(SHEET_PIXELS),
});

/* ---------- The sheet ---------- */

export class InkItSheet {
    masks: Masks = emptyMasks();
    round = 1;
    tool: ToolId = "pencil";
    hint1Used = false;
    inkLeft = roundInk(false);
    inkMax = this.inkLeft;
    drawing = false;
    last: Point = { x: 0, y: 0 };
    lastTime = 0;
    speed = 0;
    spentByTool: Record<ToolId, number> = { pencil: 0, pen: 0, paint: 0 };

    /* ---- Rounds and hints (driven by the server's guess count) ---- */

    /** The server's round (wrong guesses + 1). A new round refills to 100% (leftover lost). */
    setRound(round: number, hint1Used: boolean): void {
        const changed = round !== this.round;
        this.round = round;
        this.hint1Used = Boolean(hint1Used);

        if (changed) {
            this.inkLeft = roundInk(this.hint1Used);
            this.inkMax = this.inkLeft;
        }

        if (!isUnlocked(this.tool, round)) this.tool = "pencil";

        // When a tool arrives it becomes the selected tool (the newest one unlocked this round).
        const arrived = TOOL_IDS.filter((id) => INKIT_CONFIG.tools[id].unlockRound === round);
        if (changed && arrived.length) this.tool = arrived[arrived.length - 1];
    }

    canUseHint1(): boolean {
        return !this.hint1Used && this.round >= INKIT_CONFIG.hint1.fromRound;
    }

    /** Opt-in, once the server accepted it (round ≥ 5, once): tops up the current round. */
    useHint1(): boolean {
        if (!this.canUseHint1()) return false;

        this.hint1Used = true;
        this.inkLeft += INKIT_CONFIG.inkPerRound * INKIT_CONFIG.hint1.bonus;
        // The meter reads against the hint's full round (770): ink spent before the hint still shows as spent.
        this.inkMax = Math.max(roundInk(true), this.inkLeft);

        return true;
    }

    groupHintVisible(): boolean {
        return this.round >= INKIT_CONFIG.hint2.fromRound;
    }

    selectTool(tool: ToolId): void {
        if (isUnlocked(tool, this.round)) this.tool = tool;
    }

    get outOfInk(): boolean {
        return this.inkLeft <= 0;
    }

    /* ---- Input (positions already in sheet units, time in ms) ---- */

    pointerDown(point: Point, now: number): boolean {
        if (this.outOfInk) return false;

        this.drawing = true;
        this.last = point;
        this.lastTime = now;
        this.speed = 0;
        this.spend(this.applyDab(point.x, point.y, 0));

        return true;
    }

    pointerMove(point: Point, now: number): void {
        if (!this.drawing || this.outOfInk) return;

        const distance = Math.hypot(point.x - this.last.x, point.y - this.last.y);
        const elapsed = Math.max(1, now - this.lastTime);
        const step = INKIT_CONFIG.dabStep;

        // Fixed-step interpolation: the event rate (60/120 Hz) doesn't matter.
        if (distance < step) return;

        // Smoothed, in sheet px per ms.
        this.speed = this.speed * 0.55 + (distance / elapsed) * 0.45;

        const count = Math.floor(distance / step);
        let placed = 0;

        while (placed < count && !this.outOfInk) {
            placed++;
            const along = (placed * step) / distance;

            this.spend(this.applyDab(
                this.last.x + (point.x - this.last.x) * along,
                this.last.y + (point.y - this.last.y) * along,
                this.speed,
            ));
        }

        const reached = (placed * step) / distance;
        this.last = { x: this.last.x + (point.x - this.last.x) * reached, y: this.last.y + (point.y - this.last.y) * reached };
        this.lastTime = now;
    }

    pointerUp(): void {
        this.drawing = false;
        this.speed = 0;
    }

    /** Once per animation frame while drawing (dt in seconds), as in v9: time on the sheet costs ink,
     *  and the spot under the pointer keeps building up (holding still sharpens it, but costs). */
    tick(dt: number): void {
        if (!this.drawing) return;

        const tool = INKIT_CONFIG.tools[this.tool];
        this.spend(INKIT_CONFIG.drainPerSecond * dt * tool.cost * this.need(this.last.x, this.last.y));
        if (!this.drawing) return;

        this.stamp(this.tool, this.last.x, this.last.y, tool.radius, Math.min(1, dt * INKIT_CONFIG.holdBuildPerSecond));
    }

    /* ---- Brush ---- */

    /** Ink pays only for what is new: a spot this tool already covers past 92% is free. */
    need(x: number, y: number): number {
        const covered = this.masks[this.tool][pixelAt(x, y)];

        return covered >= INKIT_CONFIG.freshFull ? 0 : 1 - covered;
    }

    applyDab(x: number, y: number, speed: number): number {
        const info = INKIT_CONFIG.tools[this.tool];
        const fresh = this.need(x, y);

        this.stamp(this.tool, x, y, info.radius, info.peak);

        return INKIT_CONFIG.dabStep * info.cost * speedCost(speed) * fresh;
    }

    spend(amount: number): void {
        this.inkLeft -= amount;
        this.spentByTool[this.tool] += amount;

        if (this.inkLeft <= 0) {
            this.inkLeft = 0;
            // The sheet locks until the next guess.
            this.drawing = false;
        }
    }

    /** One glow dab: adds to the tool's mask (source-over) and rubs the earlier tools out
     *  (destination-out) with the same glow at their erase factor. */
    stamp(id: ToolId, x: number, y: number, radius: number, peak: number): void {
        const erases = INKIT_CONFIG.erases[id] ?? {};
        const others = Object.keys(erases) as ToolId[];
        const left = Math.max(0, Math.floor(x - radius));
        const right = Math.min(SHEET - 1, Math.ceil(x + radius));
        const top = Math.max(0, Math.floor(y - radius));
        const bottom = Math.min(SHEET - 1, Math.ceil(y + radius));

        for (let py = top; py <= bottom; py++) {
            for (let px = left; px <= right; px++) {
                const distance = Math.hypot(px - x, py - y) / radius;
                if (distance >= 1) continue;

                const index = py * SHEET + px;
                this.masks[id][index] += (1 - this.masks[id][index]) * glowAt(distance, peak);

                for (const other of others) this.masks[other][index] *= 1 - glowAt(distance, peak * erases[other]!);
            }
        }
    }

    /** The ending's eraser: rubs every tool out where it passes. */
    rub(x: number, y: number, radius: number): void {
        const left = Math.max(0, Math.floor(x - radius));
        const right = Math.min(SHEET - 1, Math.ceil(x + radius));
        const top = Math.max(0, Math.floor(y - radius));
        const bottom = Math.min(SHEET - 1, Math.ceil(y + radius));

        for (let py = top; py <= bottom; py++) {
            for (let px = left; px <= right; px++) {
                const distance = Math.hypot(px - x, py - y) / radius;
                if (distance >= 1) continue;

                const keep = 1 - glowAt(distance, 1);
                const index = py * SHEET + px;

                for (const id of TOOL_IDS) this.masks[id][index] *= keep;
            }
        }
    }

    coverage(id: ToolId): number {
        let sum = 0;
        let count = 0;

        for (let index = 0; index < SHEET_PIXELS; index += 4) {
            sum += this.masks[id][index];
            count++;
        }

        return sum / count;
    }

    isEmpty(): boolean {
        return TOOL_IDS.every((id) => this.coverage(id) === 0);
    }

    clear(): void {
        for (const id of TOOL_IDS) this.masks[id].fill(0);
    }

    /** The finished sheet: the photo, fully painted. */
    showPhoto(): void {
        this.masks.paint.fill(1);
        this.masks.pencil.fill(0);
        this.masks.pen.fill(0);
    }

    /* ---- Compositing ---- */

    /** White paper → paint mixes the photo in → graphite and ink darken on top. The page's CSS paper
     *  shows through because the canvas multiplies over it (white = transparent). `out` is SHEET×SHEET. */
    render(layers: Layers, out: { data: Uint8ClampedArray }): void {
        const data = out.data;
        const { photo, pencil, pen } = layers;
        const { masks } = this;

        for (let index = 0; index < SHEET_PIXELS; index++) {
            const offset = index * 4;
            const paint = masks.paint[index];
            let red = 255;
            let green = 255;
            let blue = 255;

            if (paint > 0) {
                red += (photo[offset] - red) * paint;
                green += (photo[offset + 1] - green) * paint;
                blue += (photo[offset + 2] - blue) * paint;
            }

            const graphite = masks.pencil[index] * pencil[index];
            const ink = masks.pen[index] * pen[index];

            data[offset] = red * (1 - graphite * 0.86) * (1 - ink);
            data[offset + 1] = green * (1 - graphite * 0.84) * (1 - ink);
            data[offset + 2] = blue * (1 - graphite * 0.76) * (1 - ink * 0.95);
            data[offset + 3] = 255;
        }
    }

    /* ---- Ending (the look of the sprite comes from the design) ---- */

    /** One frame of the reveal's settle: paint eases to 1, pencil and pen to 0 (smooth step). */
    private settleStep(settle: { start: number; from: Masks }, elapsed: number): RevealStep {
        const progress = Math.min(1, (elapsed - settle.start) / REVEAL_SETTLE_MS);

        if (progress >= 1) {
            this.showPhoto();

            return { done: true, head: null };
        }

        const eased = progress * progress * (3 - 2 * progress);
        const { from } = settle;

        for (let index = 0; index < SHEET_PIXELS; index++) {
            this.masks.paint[index] = from.paint[index] + (1 - from.paint[index]) * eased;
            this.masks.pencil[index] = from.pencil[index] * (1 - eased);
            this.masks.pen[index] = from.pen[index] * (1 - eased);
        }

        return { done: false, head: null };
    }

    /** A stepper: call it with the elapsed ms each frame. Eraser, then pencil, pen and paint along a
     *  7-row zigzag, then a short settle that eases whatever the passes left into the photo (the
     *  reference snapped to it in one frame, a visible jump). */
    revealStepper(): (elapsed: number) => RevealStep {
        const radius = SHEET * 0.16;
        const path: [number, number][] = [];

        for (let row = 0; row < 7; row++) {
            for (let step = 0; step <= 22; step++) {
                const across = row % 2 ? 1 - step / 22 : step / 22;
                path.push([across * SHEET, ((row + 0.5) / 7) * SHEET + Math.sin(step * 1.3 + row) * SHEET * 0.03]);
            }
        }

        const stages: { id: ToolId | null; duration: number }[] = [
            { id: null, duration: 550 },
            { id: "pencil", duration: 750 },
            { id: "pen", duration: 750 },
            { id: "paint", duration: 900 },
        ];
        let stageIndex = 0;
        let position = 0;
        let stageStart = 0;
        let settle: { start: number; from: Masks } | null = null;

        return (elapsed) => {
            if (settle) return this.settleStep(settle, elapsed);

            const stage = stages[stageIndex];
            const upto = Math.min(path.length, Math.floor(((elapsed - stageStart) / stage.duration) * path.length));

            for (; position < upto; position++) {
                const [x, y] = path[position];

                if (stage.id) this.stamp(stage.id, x, y, radius, 1);
                else this.rub(x, y, radius * 1.15);
            }

            const head = path[Math.max(0, position - 1)];

            if (position >= path.length) {
                stageIndex++;

                if (stageIndex === stages.length) {
                    settle = { start: elapsed, from: copyMasks(this.masks) };

                    return { done: false, head: null };
                }

                position = 0;
                stageStart = elapsed;
            }

            return { done: false, head: { x: head[0], y: head[1], stage: stages[stageIndex].id ?? "eraser" } };
        };
    }
}

/** Total length of the reveal, in ms. */
export const REVEAL_DURATION_MS = 550 + 750 + 750 + 900 + REVEAL_SETTLE_MS;
