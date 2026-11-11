import test from 'node:test';
import assert from 'node:assert/strict';
import { INKIT_CONFIG, SHEET } from '../../src/features/inkit/config.ts';
import { InkItSheet, flow, isUnlocked, pixelAt, roundInk, speedCost, toSheet, unlockedTools } from '../../src/features/inkit/engine.ts';

const near = (actual, expected, tolerance, label) =>
    assert.ok(Math.abs(actual - expected) <= tolerance, `${label ?? 'value'}: ${actual} vs ${expected} (±${tolerance})`);

// A calm S-shaped stroke in sheet units, as a function of time (ms): the same timing per sheet px
// whatever the sheet's size on screen.
const pathAt = (ms) => ({ x: 60 + ms * 0.3, y: 250 + Math.sin(ms / 180) * 120 });

/** The stroke as pointer events every `interval` ms on a sheet shown `cssSide` px wide, with one
 *  tick per 60 Hz frame like the page. */
const drawStroke = ({ interval = 1000 / 60, cssSide = SHEET, tool = 'pencil', duration = 500, sheet = new InkItSheet() } = {}) => {
    const rect = { left: 37, top: 12, width: cssSide, height: cssSide };
    const event = (ms) => {
        const point = pathAt(ms);
        return toSheet(rect.left + (point.x / SHEET) * cssSide, rect.top + (point.y / SHEET) * cssSide, rect);
    };

    sheet.tool = tool;
    const before = sheet.inkLeft;
    sheet.pointerDown(event(0), 0);
    let nextFrame = 1000 / 60;

    for (let ms = interval; ms <= duration + 1e-6; ms += interval) {
        sheet.pointerMove(event(ms), ms);
        while (nextFrame <= ms) {
            sheet.tick(1 / 60, nextFrame);
            nextFrame += 1000 / 60;
        }
    }
    sheet.pointerUp();

    return { sheet, spent: before - sheet.inkLeft };
};

test('unlock table: pencil from round 1, pen from 3, paint from 5', () => {
    assert.deepEqual(unlockedTools(1), ['pencil']);
    assert.deepEqual(unlockedTools(2), ['pencil']);
    assert.deepEqual(unlockedTools(3), ['pencil', 'pen']);
    assert.deepEqual(unlockedTools(4), ['pencil', 'pen']);
    assert.deepEqual(unlockedTools(5), ['pencil', 'pen', 'paint']);
    assert.equal(isUnlocked('pen', 2), false);
});

test('locked tools cannot be selected; an arriving tool becomes the tool in hand', () => {
    const sheet = new InkItSheet();
    sheet.selectTool('pen');
    sheet.selectTool('paint');
    assert.equal(sheet.tool, 'pencil');

    sheet.setRound(2, false);
    assert.equal(sheet.tool, 'pencil');
    sheet.setRound(3, false);
    assert.equal(sheet.tool, 'pen');
    sheet.selectTool('paint');
    assert.equal(sheet.tool, 'pen');
    sheet.selectTool('pencil');
    sheet.setRound(4, false);
    assert.equal(sheet.tool, 'pencil', 'no tool arrives at round 4');
    sheet.setRound(5, false);
    assert.equal(sheet.tool, 'paint');
});

test('speed cost and flow follow the reference formulas', () => {
    assert.equal(speedCost(0), 1);
    near(speedCost(INKIT_CONFIG.idealSpeed * 2), 1.35, 1e-9);
    assert.equal(speedCost(100), 1.6);
    near(flow(0), 1.1, 1e-9);
    near(flow(INKIT_CONFIG.idealSpeed * 1.5), 0.95, 1e-9);
    assert.equal(flow(100), 0.75);
});

test('fairness: the same stroke costs and covers the same at 1400 px and 380 px wide (±1%)', () => {
    const large = drawStroke({ cssSide: 1400 });
    const small = drawStroke({ cssSide: 380 });

    near(small.spent, large.spent, large.spent * 0.01, 'ink');
    assert.ok(large.sheet.inkLeft > 0, 'the stroke ends with ink left');
    near(small.sheet.coverage('pencil'), large.sheet.coverage('pencil'), large.sheet.coverage('pencil') * 0.01, 'coverage');
    assert.ok(large.spent > 100);
});

// The reference smooths the speed once per pointer event, so 120 Hz input reads a slightly different
// speed: about 1.4% more coverage on this stroke, identical to the reference engine (kept 1:1).
test('fairness: 60 Hz and 120 Hz pointer events give the same coverage (±2%)', () => {
    const slow = drawStroke({ interval: 1000 / 60 });
    const fast = drawStroke({ interval: 1000 / 120 });

    near(fast.sheet.coverage('pencil'), slow.sheet.coverage('pencil'), slow.sheet.coverage('pencil') * 0.02, 'coverage');
    near(fast.spent, slow.spent, slow.spent * 0.04, 'ink');
});

test('ink: 550 a round, hint 1 from round 5 gives 770 now and on the next refill, refused at round 4 and twice', () => {
    const sheet = new InkItSheet();
    assert.equal(sheet.inkLeft, 550);

    drawStroke({ sheet });
    assert.ok(sheet.inkLeft < 550);
    sheet.setRound(2, false);
    assert.equal(sheet.inkLeft, 550, 'a new round refills (leftover lost)');

    sheet.setRound(4, false);
    assert.equal(sheet.canUseHint1(), false);
    assert.equal(sheet.useHint1(), false);

    sheet.setRound(5, false);
    assert.equal(sheet.useHint1(), true);
    assert.equal(sheet.inkLeft, 770);
    assert.equal(sheet.inkMax, 770);
    assert.equal(sheet.useHint1(), false, 'once');

    sheet.setRound(6, sheet.hint1Used);
    assert.equal(sheet.inkLeft, 770);
    assert.equal(roundInk(true), 770);
    assert.equal(roundInk(false), 550);
});

test('out of ink: the stroke stops and the sheet takes no more until the next round', () => {
    const sheet = new InkItSheet();
    sheet.inkLeft = 3;
    sheet.pointerDown({ x: 100, y: 100 }, 0);
    assert.equal(sheet.inkLeft, 0);
    assert.equal(sheet.drawing, false);
    assert.equal(sheet.pointerDown({ x: 300, y: 300 }, 10), false);
    assert.equal(sheet.masks.pencil[pixelAt(300, 300)], 0);

    sheet.setRound(2, false);
    assert.equal(sheet.pointerDown({ x: 300, y: 300 }, 20), true);
});

test('fresh discount: redrawing the same stroke costs far less than the first pass', () => {
    const first = drawStroke();
    const again = drawStroke({ sheet: first.sheet });
    assert.ok(again.spent < first.spent * 0.15, `second ${again.spent} vs first ${first.spent}`);
});

test('drain: 60 ink a second × tool cost × fresh while the pointer is down', () => {
    for (const [tool, expected] of [['pencil', 60], ['pen', 75], ['paint', 90]]) {
        const sheet = new InkItSheet();
        sheet.setRound(5, false);
        sheet.tool = tool;
        sheet.inkLeft = 5000;
        sheet.pointerDown({ x: 250, y: 250 }, 0);
        const afterDab = sheet.inkLeft;
        for (let frame = 1; frame <= 60; frame++) sheet.tick(1 / 60, (frame * 1000) / 60);
        near(afterDab - sheet.inkLeft, expected, 0.01, tool);
    }
});

test('erase: pen rubs pencil out under its core; paint leaves at most 5% of the pen', () => {
    const sheet = new InkItSheet();
    sheet.setRound(5, false);
    sheet.masks.pencil.fill(1);
    sheet.masks.pen.fill(0);

    sheet.tool = 'pen';
    sheet.beginStroke();
    sheet.stamp('pen', 250, 250, INKIT_CONFIG.tools.pen.radius, 1);
    assert.ok(sheet.masks.pencil[pixelAt(250, 250)] < 1e-6);
    assert.ok(sheet.masks.pen[pixelAt(250, 250)] > 0.999);

    sheet.beginStroke();
    sheet.stamp('paint', 250, 250, INKIT_CONFIG.tools.paint.radius, 1);
    assert.ok(sheet.masks.pen[pixelAt(250, 250)] <= 0.05 + 1e-6);
    assert.ok(sheet.masks.paint[pixelAt(250, 250)] > 0.999);
});

test('hold still: the spot soaks toward opaque after 120 ms', () => {
    const sheet = new InkItSheet();
    sheet.inkLeft = 5000;
    const edge = pixelAt(250 + INKIT_CONFIG.tools.pencil.radius * 0.7, 250);
    sheet.pointerDown({ x: 250, y: 250 }, 0);
    const start = sheet.masks.pencil[edge];
    for (let frame = 1; frame <= 120; frame++) sheet.tick(1 / 60, (frame * 1000) / 60);
    assert.ok(sheet.masks.pencil[edge] > start + 0.1);
});

test('reveal stepper: eraser, pencil, pen, paint; ends with paint 1 and pencil/pen 0', () => {
    const { sheet } = drawStroke();
    const step = sheet.revealStepper();
    const stages = [];
    let result = { done: false };

    for (let elapsed = 0; !result.done && elapsed < 10_000; elapsed += 16) {
        result = step(elapsed);
        if (result.head && stages.at(-1) !== result.head.stage) stages.push(result.head.stage);
    }

    assert.equal(result.done, true);
    assert.deepEqual(stages, ['eraser', 'pencil', 'pen', 'paint']);
    assert.equal(sheet.coverage('paint'), 1);
    assert.equal(sheet.coverage('pencil'), 0);
    assert.equal(sheet.coverage('pen'), 0);
});

test('compositing: white paper, paint shows the photo, graphite and ink darken (reference factors)', () => {
    const pixels = SHEET * SHEET;
    const layers = { photo: new Uint8ClampedArray(pixels * 4).fill(100), pencil: new Float32Array(pixels).fill(1), pen: new Float32Array(pixels).fill(1) };
    const out = { data: new Uint8ClampedArray(pixels * 4) };
    const sheet = new InkItSheet();

    sheet.render(layers, out);
    assert.deepEqual([...out.data.subarray(0, 4)], [255, 255, 255, 255]);

    sheet.masks.pencil.fill(1);
    sheet.render(layers, out);
    assert.deepEqual([...out.data.subarray(0, 3)], [Math.round(255 * 0.14), Math.round(255 * 0.16), Math.round(255 * 0.24)]);

    sheet.masks.pencil.fill(0);
    sheet.masks.paint.fill(1);
    sheet.render(layers, out);
    assert.deepEqual([...out.data.subarray(0, 4)], [100, 100, 100, 255]);
});
