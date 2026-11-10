import test from 'node:test';
import assert from 'node:assert/strict';
import { HINTS, INK, SHEET_SIDE, TOOLS } from '../../src/features/inkit/config.ts';
import { encodeDraft } from '../../src/features/inkit/codec.ts';
import {
    REVEAL_DURATION_MS, addHintInk, composeFrame, coverage, createPen, createSheet, flow, isSheetEmpty, newestTool,
    penDown, penMove, penTick, penUp, pixelAt, refill, roundInk, seedFromPath, showPhoto, speedCost, startReveal,
    stepReveal, toSheetPoint, unlockedTools,
} from '../../src/features/inkit/engine.ts';

const near = (actual, expected, tolerance, label) =>
    assert.ok(Math.abs(actual - expected) <= tolerance, `${label ?? 'value'}: ${actual} vs ${expected} (±${tolerance})`);

// A calm S-shaped stroke in sheet units, as a function of time (ms).
const pathAt = (ms) => ({ x: 60 + ms * 0.3, y: 250 + Math.sin(ms / 180) * 120 });

/** Draw the same stroke with pointer events every `interval` ms on a sheet shown at `cssSide` px. */
const drawStroke = ({ interval = 1000 / 60, cssSide = SHEET_SIDE, tool = 'pencil', duration = 1200, sheet = createSheet(), pen = createPen() } = {}) => {
    const rect = { left: 37, top: 12, width: cssSide, height: cssSide };
    const css = (ms) => {
        const point = pathAt(ms);
        return [rect.left + (point.x / SHEET_SIDE) * cssSide, rect.top + (point.y / SHEET_SIDE) * cssSide];
    };

    pen.tool = tool;
    const inkBefore = pen.ink;
    penDown(sheet, pen, toSheetPoint(...css(0), rect), 0);
    for (let ms = interval; ms <= duration + 1e-6; ms += interval) {
        penMove(sheet, pen, toSheetPoint(...css(ms), rect), ms);
        penTick(sheet, pen, ms);
    }
    penUp(pen);

    return { sheet, pen, spent: inkBefore - pen.ink };
};

test('speed cost and flow follow the spec at their corner points', () => {
    assert.equal(speedCost(0), 1);
    assert.equal(speedCost(INK.idealSpeed), 1);
    near(speedCost(INK.idealSpeed * 2), 1.35, 1e-9);
    assert.equal(speedCost(INK.idealSpeed * 10), 1.6);

    near(flow(0), 1.1, 1e-9);
    near(flow(INK.idealSpeed * 0.5), 1.1, 1e-9);
    near(flow(INK.idealSpeed * 1.5), 0.95, 1e-9);
    assert.equal(flow(INK.idealSpeed * 10), 0.75);
});

test('tools unlock by round: pen at 3, paint at 5', () => {
    assert.deepEqual(unlockedTools(1), ['pencil']);
    assert.deepEqual(unlockedTools(2), ['pencil']);
    assert.deepEqual(unlockedTools(3), ['pencil', 'pen']);
    assert.deepEqual(unlockedTools(4), ['pencil', 'pen']);
    assert.deepEqual(unlockedTools(5), ['pencil', 'pen', 'paint']);
    assert.equal(newestTool(1), 'pencil');
    assert.equal(newestTool(3), 'pen');
    assert.equal(newestTool(9), 'paint');
    assert.equal(HINTS.inkRound, 5);
    assert.equal(HINTS.groupRound, 8);
});

test('the same stroke costs and covers the same at any size on screen', () => {
    const small = drawStroke({ cssSide: 300 });
    const large = drawStroke({ cssSide: 720 });

    near(small.spent, large.spent, 1e-6, 'ink');
    near(coverage(small.sheet, 'pencil'), coverage(large.sheet, 'pencil'), 1e-9, 'coverage');
    assert.ok(small.spent > 50, 'the stroke costs ink');
});

test('60 Hz and 120 Hz pointer events give the same stroke', () => {
    const slow = drawStroke({ interval: 1000 / 60 });
    const fast = drawStroke({ interval: 1000 / 120 });

    near(coverage(fast.sheet, 'pencil'), coverage(slow.sheet, 'pencil'), coverage(slow.sheet, 'pencil') * 0.02, 'coverage');
    near(fast.spent, slow.spent, slow.spent * 0.04, 'ink');
});

test('going over what is already drawn costs almost nothing', () => {
    const first = drawStroke();
    const again = drawStroke({ sheet: first.sheet, pen: first.pen });

    assert.ok(again.spent < first.spent * 0.15, `second pass ${again.spent} vs first ${first.spent}`);
    near(coverage(again.sheet, 'pencil'), coverage(first.sheet, 'pencil'), 0.02, 'coverage barely grows');
});

test('holding still drains 60 ink a second times the tool cost, at any frame rate', () => {
    for (const [tool, expected] of [['pencil', 60], ['pen', 75], ['paint', 90]]) {
        for (const fps of [60, 120]) {
            const sheet = createSheet();
            const pen = createPen();
            pen.tool = tool;
            pen.ink = 1000;
            penDown(sheet, pen, { x: 250, y: 250 }, 0);
            const afterDab = pen.ink;
            for (let frame = 1; frame <= fps; frame++) penTick(sheet, pen, (frame * 1000) / fps);

            near(afterDab - pen.ink, expected, 0.01, `${tool} at ${fps} fps`);
        }
    }
});

test('holding still builds the spot toward opaque equally at 60 and 120 fps', () => {
    const probe = pixelAt(250 + TOOLS.pencil.radius * 0.7, 250);
    const build = (fps, seconds) => {
        const sheet = createSheet();
        const pen = createPen();
        pen.ink = 5000;
        penDown(sheet, pen, { x: 250, y: 250 }, 0);
        for (let frame = 1; frame <= fps * seconds; frame++) penTick(sheet, pen, (frame * 1000) / fps);
        return sheet.masks.pencil[probe];
    };

    near(build(120, 2), build(60, 2), 0.02, 'edge coverage');
    assert.ok(build(60, 2) > build(60, 0) + 0.1, 'the faded edge fills in');
    assert.ok(build(60, 6) > build(60, 2), 'and keeps filling');
});

test('ink: refill, hint boost and the out-of-ink lock', () => {
    assert.equal(roundInk(false), 550);
    near(roundInk(true), 770, 1e-9);

    const sheet = createSheet();
    const pen = createPen();
    assert.equal(pen.ink, 550);

    pen.ink = 100;
    addHintInk(pen);
    near(pen.ink, 320, 1e-9, 'hint adds 40% of a round right away');
    refill(pen, true);
    near(pen.ink, 770, 1e-9, 'every later refill is 40% bigger');
    near(pen.capacity, 770, 1e-9);
    refill(pen, false);
    assert.equal(pen.ink, 550);

    pen.ink = 5;
    penDown(sheet, pen, { x: 100, y: 100 }, 0);
    assert.equal(pen.ink, 0);
    assert.equal(pen.drawing, false);
    assert.equal(penDown(sheet, pen, { x: 300, y: 300 }, 10), false);
    assert.equal(sheet.masks.pencil[pixelAt(300, 300)], 0, 'a locked sheet takes no more strokes');

    refill(pen, false);
    assert.equal(penDown(sheet, pen, { x: 300, y: 300 }, 20), true);
});

test('a later tool replaces the earlier ones where it passes', () => {
    const sheet = createSheet();
    const pen = createPen();
    pen.ink = 100000;
    const middle = pixelAt(60 + 600 * 0.3, 250 + Math.sin(600 / 180) * 120);

    drawStroke({ sheet, pen, tool: 'pencil' });
    assert.ok(sheet.masks.pencil[middle] > 0.9);

    drawStroke({ sheet, pen, tool: 'pen' });
    near(sheet.masks.pencil[middle], 0, 0.02, 'pen rubs the pencil out');
    assert.ok(sheet.masks.pen[middle] > 0.95);

    drawStroke({ sheet, pen, tool: 'paint' });
    near(sheet.masks.pen[middle], 0.05, 0.03, 'paint leaves a trace of pen');
    near(sheet.masks.pencil[middle], 0, 0.02);
    assert.ok(sheet.masks.paint[middle] > 0.95);
});

test('pen and paint cost 1.25x and 1.5x the pencil for the same path', () => {
    const cost = (tool) => {
        const pen = createPen();
        pen.ink = 100000;
        return drawStroke({ tool, pen }).spent;
    };
    const pencil = cost('pencil');

    // The pen is narrower (radius 30 vs 40): more dabs of less ink each, about the same path cost.
    near(cost('paint') / pencil, 1.5, 0.05, 'paint');
    near(cost('pen') / pencil, 1.25, 0.12, 'pen');
});

test('a round of ink is a few calm strokes, not the whole sheet', () => {
    const sheet = createSheet();
    const pen = createPen();
    let strokes = 0;
    while (pen.ink > 0 && strokes < 50) {
        const top = 40 + strokes * 45;
        penDown(sheet, pen, { x: 40, y: top }, 0);
        for (let ms = 16; ms <= 700 && pen.drawing; ms += 16) {
            penMove(sheet, pen, { x: 40 + ms * 0.6, y: top }, ms);
            penTick(sheet, pen, ms);
        }
        penUp(pen);
        strokes++;
    }

    assert.ok(strokes >= 2 && strokes <= 8, `${strokes} strokes`);
    assert.ok(coverage(sheet, 'pencil') < 0.6, `covered ${coverage(sheet, 'pencil')}`);
});

test('composition: bare paper is white, paint shows the photo, pencil and pen darken', () => {
    const pixels = SHEET_SIDE * SHEET_SIDE;
    const layers = {
        photo: new Uint8ClampedArray(pixels * 4).fill(100),
        pencil: new Float32Array(pixels).fill(1),
        pen: new Float32Array(pixels).fill(1),
    };
    const out = new Uint8ClampedArray(pixels * 4);
    const sheet = createSheet();

    composeFrame(out, layers, sheet.masks);
    assert.deepEqual([...out.subarray(0, 4)], [255, 255, 255, 255]);

    sheet.masks.paint.fill(1);
    composeFrame(out, layers, sheet.masks);
    assert.deepEqual([...out.subarray(0, 4)], [100, 100, 100, 255]);

    sheet.masks.paint.fill(0);
    sheet.masks.pencil.fill(1);
    composeFrame(out, layers, sheet.masks);
    assert.ok(out[0] < 60 && out[2] > out[0], 'graphite is dark and slightly cool');

    sheet.masks.pen.fill(1);
    composeFrame(out, layers, sheet.masks);
    assert.equal(out[0], 0);

    const large = new Uint8ClampedArray(720 * 720 * 4);
    sheet.masks.pencil.fill(0);
    sheet.masks.pen.fill(0);
    composeFrame(large, layers, sheet.masks, 720);
    assert.deepEqual([...large.subarray(large.length - 4)], [255, 255, 255, 255]);
});

test('the win reveal rubs the attempt out and ends on the whole photo', () => {
    const { sheet } = drawStroke();
    const reveal = startReveal(sheet, 0);
    const tools = [];
    let frame = { done: false };
    let now = 0;

    while (!frame.done && now < REVEAL_DURATION_MS + 2000) {
        now += 16;
        frame = stepReveal(sheet, reveal, now);
        if (tools.at(-1) !== frame.tool) tools.push(frame.tool);
        assert.ok(frame.head.x >= 0 && frame.head.x <= SHEET_SIDE);
    }

    assert.equal(frame.done, true);
    assert.deepEqual(tools, [null, 'pencil', 'pen', 'paint']);
    assert.ok(now <= REVEAL_DURATION_MS + 200, `took ${now} ms`);
    assert.ok(coverage(sheet, 'paint') > 0.97);
    assert.ok(coverage(sheet, 'pencil') < 0.02);

    showPhoto(sheet);
    assert.equal(coverage(sheet, 'paint'), 1);
});

test('an empty sheet is detected, and the photo seed is stable', () => {
    const sheet = createSheet();
    assert.equal(isSheetEmpty(sheet), true);
    drawStroke({ sheet });
    assert.equal(isSheetEmpty(sheet), false);

    assert.equal(seedFromPath('/images/inkit/abc.webp'), seedFromPath('/images/inkit/abc.webp'));
    assert.notEqual(seedFromPath('/images/inkit/abc.webp'), seedFromPath('/images/inkit/abd.webp'));
});

test('a heavily drawn sheet still fits the saved drawing cap', async () => {
    const keepAlive = setInterval(() => {}, 1000);
    const sheet = createSheet();
    const pen = createPen();
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

    for (let stroke = 0; stroke < 240; stroke++) {
        pen.ink = 100000;
        pen.tool = ['pencil', 'pen', 'paint'][stroke % 3];
        let x = random() * SHEET_SIDE;
        let y = random() * SHEET_SIDE;
        penDown(sheet, pen, { x, y }, 0);
        for (let ms = 16; ms < 500; ms += 16) {
            x += (random() - 0.5) * 60;
            y += (random() - 0.5) * 60;
            penMove(sheet, pen, { x, y }, ms);
        }
        penUp(pen);
    }

    const bytes = atob(await encodeDraft(sheet.masks)).length;
    clearInterval(keepAlive);
    assert.ok(bytes <= 32 * 1024, `drawing is ${bytes} bytes`);
});
