import test from 'node:test';
import assert from 'node:assert/strict';
import { INKIT_CONFIG, SHEET } from '../../src/features/inkit/config.ts';
import { InkItSheet, glowAt, isUnlocked, pixelAt, roundInk, speedCost, toSheet, unlockedTools } from '../../src/features/inkit/engine.ts';

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
            sheet.tick(1 / 60);
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

test('speed cost follows the reference formula', () => {
    assert.equal(speedCost(0), 1);
    near(speedCost(INKIT_CONFIG.idealSpeed * 2), 1.35, 1e-9);
    assert.equal(speedCost(100), 1.6);
});

test('glow: the v9 stops scaled by the peak, each clamped to 1, linear in between, 0 at the rim', () => {
    near(glowAt(0, 0.2), 0.2, 1e-9);
    near(glowAt(0.25, 0.2), 0.106, 1e-9);
    near(glowAt(0.125, 0.2), (0.2 + 0.106) / 2, 1e-9);
    near(glowAt(0.75, 0.2), 0.01, 1e-9);
    assert.equal(glowAt(1, 0.2), 0);
    assert.equal(glowAt(1.2, 0.2), 0);
    assert.equal(glowAt(0, 3), 1, 'clamped at the centre');
    near(glowAt(0.25, 3), 1, 1e-9, 'clamped stop');
    near(glowAt(0.5, 3), 0.66, 1e-9);
});

/** A straight 200-sheet-px pencil stroke at a steady pace, one event and one tick per 60 Hz frame. */
const straightStroke = (cssSide) => {
    const sheet = new InkItSheet();
    const rect = { left: 11, top: 23, width: cssSide, height: cssSide };
    const at = (x) => toSheet(rect.left + (x / SHEET) * cssSide, rect.top + (250 / SHEET) * cssSide, rect);
    let x = 150;
    let now = 0;

    sheet.pointerDown(at(x), now);
    while (x < 350) {
        x = Math.min(350, x + 4.75);
        now += 1000 / 60;
        sheet.pointerMove(at(x), now);
        sheet.tick(1 / 60);
    }
    sheet.pointerUp();

    return sheet;
};

test('fairness: a 200-sheet-px pencil stroke leaves the same ink (~374) at 1400 px and 380 px wide', () => {
    const large = straightStroke(1400);
    const small = straightStroke(380);

    near(small.inkLeft, large.inkLeft, large.inkLeft * 0.01, 'ink');
    near(large.inkLeft, 374.2, 1, 'reference ink left');
    near(small.coverage('pencil'), large.coverage('pencil'), large.coverage('pencil') * 0.01, 'coverage');
});

test('fairness: the same curved stroke costs and covers the same at 1400 px and 380 px wide (±1%)', () => {
    const large = drawStroke({ cssSide: 1400 });
    const small = drawStroke({ cssSide: 380 });

    near(small.spent, large.spent, large.spent * 0.01, 'ink');
    assert.ok(large.sheet.inkLeft > 0, 'the stroke ends with ink left');
    near(small.sheet.coverage('pencil'), large.sheet.coverage('pencil'), large.sheet.coverage('pencil') * 0.01, 'coverage');
    assert.ok(large.spent > 100);
});

test('fairness: 60 Hz and 120 Hz pointer events give the same coverage (±1%)', () => {
    const slow = drawStroke({ interval: 1000 / 60 });
    const fast = drawStroke({ interval: 1000 / 120 });

    near(fast.sheet.coverage('pencil'), slow.sheet.coverage('pencil'), slow.sheet.coverage('pencil') * 0.01, 'coverage');
    near(fast.spent, slow.spent, slow.spent * 0.01, 'ink');
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

    const spentFirst = new InkItSheet();
    spentFirst.setRound(5, false);
    spentFirst.inkLeft = 450;
    spentFirst.useHint1();
    assert.equal(spentFirst.inkLeft, 670);
    assert.equal(spentFirst.inkMax, 770, 'ink spent before the hint still shows on the meter');
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

test('need: a spot this tool covers past 92% costs nothing; less coverage costs 1 − coverage', () => {
    const sheet = new InkItSheet();
    const spot = pixelAt(250, 250);

    sheet.masks.pencil[spot] = 0.93;
    assert.equal(sheet.need(250, 250), 0);
    assert.equal(sheet.applyDab(250, 250, 0), 0, 'the dab is free');

    sheet.masks.pencil[spot] = 0.4;
    near(sheet.need(250, 250), 0.6, 1e-6);
    near(sheet.applyDab(250, 250, 0), INKIT_CONFIG.dabStep * 0.6, 1e-5);

    sheet.masks.pen[spot] = 0.99;
    near(sheet.need(250, 250), 1 - sheet.masks.pencil[spot], 1e-6, 'need reads the tool in hand only');
});

test('need: redrawing the same stroke costs less than the first pass', () => {
    const first = drawStroke();
    const again = drawStroke({ sheet: first.sheet });
    assert.ok(again.spent < first.spent, `second ${again.spent} vs first ${first.spent}`);
});

test('drain: 60 ink a second × tool cost × need while the pointer is down', () => {
    for (const [tool, perSecond] of [['pencil', 60], ['pen', 75], ['paint', 90]]) {
        const sheet = new InkItSheet();
        sheet.setRound(5, false);
        sheet.tool = tool;
        sheet.inkLeft = 5000;
        sheet.pointerDown({ x: 250, y: 250 }, 0);

        for (let frame = 1; frame <= 30; frame++) {
            const before = sheet.inkLeft;
            const need = sheet.need(250, 250);
            sheet.tick(1 / 60);
            near(before - sheet.inkLeft, (perSecond / 60) * need, 1e-6, `${tool} frame ${frame}`);
        }
    }
});

test('brush: one dab adds exactly glowAt(d, peak); two dabs give 1 − (1 − a)²', () => {
    const { radius, peak } = INKIT_CONFIG.tools.pencil;
    const sheet = new InkItSheet();

    sheet.stamp('pencil', 250, 250, radius, peak);
    for (const offset of [0, 5, 11, 20, 30, 40, 45]) {
        near(sheet.masks.pencil[pixelAt(250 + offset, 250)], glowAt(offset / radius, peak), 1e-6, `d = ${offset}`);
    }

    sheet.stamp('pencil', 250, 250, radius, peak);
    for (const offset of [0, 11, 30]) {
        const single = glowAt(offset / radius, peak);
        near(sheet.masks.pencil[pixelAt(250 + offset, 250)], 1 - (1 - single) ** 2, 1e-6, `two dabs, d = ${offset}`);
    }
});

test('brush: no hard edge, coverage falls smoothly to 0 at the radius', () => {
    const { radius, peak } = INKIT_CONFIG.tools.pen;
    const sheet = new InkItSheet();
    sheet.setRound(3, false);
    sheet.stamp('pen', 250, 250, radius, peak);

    let previous = sheet.masks.pen[pixelAt(250, 250)];
    let biggestDrop = 0;
    for (let offset = 1; offset <= radius + 2; offset++) {
        const value = sheet.masks.pen[pixelAt(250 + offset, 250)];
        assert.ok(value <= previous + 1e-9, 'never rises outward');
        biggestDrop = Math.max(biggestDrop, previous - value);
        previous = value;
    }

    assert.equal(previous, 0);
    assert.ok(biggestDrop < peak * 0.1, `largest step ${biggestDrop}`);
    assert.ok(sheet.masks.pen[pixelAt(250 + radius - 2, 250)] < 0.005, 'almost nothing near the rim');
});

test('hand-over: a pen dab multiplies pencil by 1 − glowAt(d, .28 × 1.6) and adds pen', () => {
    const { radius, peak } = INKIT_CONFIG.tools.pen;
    const sheet = new InkItSheet();
    sheet.setRound(3, false);
    sheet.masks.pencil.fill(0.8);

    sheet.stamp('pen', 250, 250, radius, peak);
    for (const offset of [0, 8, 17, 26]) {
        const index = pixelAt(250 + offset, 250);
        near(sheet.masks.pencil[index], 0.8 * (1 - glowAt(offset / radius, peak * 1.6)), 1e-6, `pencil, d = ${offset}`);
        near(sheet.masks.pen[index], glowAt(offset / radius, peak), 1e-6, `pen, d = ${offset}`);
    }
    assert.ok(sheet.masks.pencil[pixelAt(250, 250)] > 0.4, 'one pen dab refines the sketch, it does not erase it');
});

test('hand-over: repeated pen passes take pencil toward 0 gradually', () => {
    const { radius, peak } = INKIT_CONFIG.tools.pen;
    const sheet = new InkItSheet();
    sheet.setRound(3, false);
    sheet.masks.pencil.fill(1);

    const centre = pixelAt(250, 250);
    const values = [];
    for (let pass = 0; pass < 12; pass++) {
        sheet.stamp('pen', 250, 250, radius, peak);
        values.push(sheet.masks.pencil[centre]);
    }

    for (let pass = 1; pass < values.length; pass++) {
        assert.ok(values[pass] < values[pass - 1], 'goes down every pass');
        near(values[pass] / values[pass - 1], 1 - peak * 1.6, 1e-4, 'by the same share');
    }
    assert.ok(values[0] > 0.5);
    assert.ok(values.at(-1) < 0.01);
});

test('hand-over: paint rubs out pencil and pen with the same glow at 1.6×', () => {
    const { radius, peak } = INKIT_CONFIG.tools.paint;
    const sheet = new InkItSheet();
    sheet.setRound(5, false);
    sheet.masks.pencil.fill(1);
    sheet.masks.pen.fill(1);

    sheet.stamp('paint', 250, 250, radius, peak);
    const keep = 1 - glowAt(0, peak * 1.6);
    near(sheet.masks.pencil[pixelAt(250, 250)], keep, 1e-6);
    near(sheet.masks.pen[pixelAt(250, 250)], keep, 1e-6);
    near(sheet.masks.paint[pixelAt(250, 250)], peak, 1e-6);
});

test('hold still: every frame adds a dab of peak dt × 1.4 under the pointer', () => {
    const { radius } = INKIT_CONFIG.tools.pencil;
    const sheet = new InkItSheet();
    sheet.inkLeft = 5000;
    sheet.pointerDown({ x: 250, y: 250 }, 0);

    const edge = pixelAt(250 + radius * 0.5, 250);
    const before = sheet.masks.pencil[edge];
    sheet.tick(1 / 60);
    const added = glowAt(Math.hypot(Math.floor(250 + radius * 0.5) - 250, 0) / radius, (1 / 60) * 1.4);
    near(sheet.masks.pencil[edge], before + (1 - before) * added, 1e-6);

    for (let frame = 0; frame < 120; frame++) sheet.tick(1 / 60);
    assert.ok(sheet.masks.pencil[pixelAt(250, 250)] > 0.9, 'holding still sharpens the spot');
});

test('hold still: one second at 60, 120 and 144 Hz frame time spends and builds the same (±2%)', () => {
    const holdFor = (hz) => {
        const sheet = new InkItSheet();
        sheet.inkLeft = 5000;
        sheet.pointerDown({ x: 250, y: 250 }, 0);
        const before = sheet.inkLeft;
        for (let frame = 0; frame < hz; frame++) sheet.tick(1 / hz);

        const { radius } = INKIT_CONFIG.tools.pencil;
        return { spent: before - sheet.inkLeft, edge: sheet.masks.pencil[pixelAt(250 + radius * 0.6, 250)] };
    };

    const base = holdFor(60);
    for (const hz of [120, 144]) {
        const other = holdFor(hz);
        near(other.spent, base.spent, base.spent * 0.02, `${hz} Hz ink`);
        near(other.edge, base.edge, Math.max(0.02, base.edge * 0.02), `${hz} Hz coverage`);
    }
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

test('reveal: the photo eases in over the settle frames, never in one jump', () => {
    const { sheet } = drawStroke();
    const step = sheet.revealStepper();
    let result = { done: false, head: {} };
    let elapsed = 0;

    // Run the passes until the settle starts (no head, not done).
    while (result.head && elapsed < 10_000) {
        result = step(elapsed);
        elapsed += 16;
    }
    assert.equal(result.done, false, 'a settle follows the passes');

    let previous = Float32Array.from(sheet.masks.paint);
    let settleFrames = 0;
    let worstFrameChange = 0;

    while (!result.done && elapsed < 10_000) {
        result = step(elapsed);
        elapsed += 16;
        if (result.done) break;

        settleFrames++;
        for (let index = 0; index < SHEET * SHEET; index += 7) {
            worstFrameChange = Math.max(worstFrameChange, Math.abs(sheet.masks.paint[index] - previous[index]));
        }
        previous = Float32Array.from(sheet.masks.paint);
    }

    assert.ok(settleFrames >= 20, `settle frames ${settleFrames}`);
    assert.ok(worstFrameChange < 0.07, `largest change in one frame ${worstFrameChange}`);
    assert.equal(sheet.coverage('paint'), 1);
});

test('compositing: white paper, paint shows the photo, graphite and ink darken (reference factors)', () => {
    const pixels = SHEET * SHEET;
    const layers = { photo: new Uint8ClampedArray(pixels * 4).fill(100), pencil: new Float32Array(pixels).fill(1), pen: new Float32Array(pixels).fill(1) };
    const out = { data: new Uint8ClampedArray(pixels * 4) };
    const sheet = new InkItSheet();

    sheet.render(layers, out, SHEET);
    assert.deepEqual([...out.data.subarray(0, 4)], [255, 255, 255, 255]);

    sheet.masks.pencil.fill(1);
    sheet.render(layers, out, SHEET);
    assert.deepEqual([...out.data.subarray(0, 3)], [Math.round(255 * 0.14), Math.round(255 * 0.16), Math.round(255 * 0.24)]);

    sheet.masks.pencil.fill(0);
    sheet.masks.paint.fill(1);
    sheet.render(layers, out, SHEET);
    assert.deepEqual([...out.data.subarray(0, 4)], [100, 100, 100, 255]);
});

const layersAt = (side, { pencil = 0.5, pen = 0.5, photo = [200, 100, 50] } = {}) => {
    const photoPixels = new Uint8ClampedArray(side * side * 4);
    for (let index = 0; index < side * side; index++) photoPixels.set([...photo, 255], index * 4);
    return { photo: photoPixels, pencil: new Float32Array(side * side).fill(pencil), pen: new Float32Array(side * side).fill(pen) };
};

test('render at RENDER_SIDE 500 matches today', () => {
    const sheet = new InkItSheet();
    sheet.pointerDown({ x: 80, y: 120 }, 0);
    for (let step = 1; step <= 30; step++) sheet.pointerMove({ x: 80 + step * 11, y: 120 + Math.sin(step / 3) * 60 }, step * 20);
    sheet.pointerUp();
    sheet.masks.paint.fill(0.3, 0, SHEET * 40);
    sheet.masks.pen.fill(0.6, SHEET * 300, SHEET * 340);

    const layers = layersAt(SHEET, { pencil: 0.4, pen: 0.7 });
    const out = { data: new Uint8ClampedArray(SHEET * SHEET * 4) };
    sheet.render(layers, out, SHEET);

    // The formula as it stood before RENDER_SIDE: per pixel, paint over white, then graphite and ink.
    const expected = new Uint8ClampedArray(SHEET * SHEET * 4);
    for (let index = 0; index < SHEET * SHEET; index++) {
        const offset = index * 4;
        const paint = sheet.masks.paint[index];
        const [red, green, blue] = [0, 1, 2].map((channel) => 255 + (layers.photo[offset + channel] - 255) * paint);
        const graphite = sheet.masks.pencil[index] * 0.4;
        const ink = sheet.masks.pen[index] * 0.7;
        expected.set([red * (1 - graphite * 0.86) * (1 - ink), green * (1 - graphite * 0.84) * (1 - ink), blue * (1 - graphite * 0.76) * (1 - ink * 0.95), 255], offset);
    }
    assert.deepEqual(out.data, expected);
});

test('render upsamples masks at 1000', () => {
    const sheet = new InkItSheet();
    const [mx, my] = [200, 150];
    sheet.masks.pen[my * SHEET + mx] = 1;

    const side = 1000;
    const out = { data: new Uint8ClampedArray(side * side * 4) };
    sheet.render(layersAt(side, { pencil: 0, pen: 1 }), out, side);

    const red = (x, y) => out.data[(y * side + x) * 4];
    const block = [[2 * mx, 2 * my], [2 * mx + 1, 2 * my], [2 * mx, 2 * my + 1], [2 * mx + 1, 2 * my + 1]];
    const inBlock = block.map(([x, y]) => red(x, y));

    // The matching 2×2 block is lit evenly, darker than any pixel around it; far away stays paper.
    assert.ok(inBlock.every((value) => value === inBlock[0]), `block ${inBlock}`);
    assert.ok(inBlock[0] < 255);
    for (const [x, y] of [[2 * mx - 1, 2 * my], [2 * mx + 2, 2 * my], [2 * mx, 2 * my - 1], [2 * mx, 2 * my + 2]]) {
        assert.ok(red(x, y) > inBlock[0], `neighbour ${x},${y}: ${red(x, y)} vs ${inBlock[0]}`);
    }
    assert.equal(red(2 * mx + 10, 2 * my + 10), 255);
    assert.equal(red(0, 0), 255);
});
