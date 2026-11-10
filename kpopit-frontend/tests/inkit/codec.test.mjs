import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { DRAFT, SHEET_SIDE, TOOL_IDS } from '../../src/features/inkit/config.ts';
import { PACKED_LENGTH, decodeDraft, encodeDraft, packMasks, unpackMasks } from '../../src/features/inkit/codec.ts';
import { createPen, createSheet, penDown, penMove, penUp } from '../../src/features/inkit/engine.ts';

// Node's CompressionStream doesn't keep the event loop alive on its own while it works.
const keepAlive = setInterval(() => {}, 1000);
after(() => clearInterval(keepAlive));

const blankMasks = () => Object.fromEntries(TOOL_IDS.map((tool) => [tool, new Float32Array(SHEET_SIDE * SHEET_SIDE)]));

// Values that are constant inside each saved cell, so only the 4-bit rounding is measured.
const cellMasks = () => {
    const masks = blankMasks();
    TOOL_IDS.forEach((tool, offset) => {
        for (let y = 0; y < SHEET_SIDE; y++) {
            for (let x = 0; x < SHEET_SIDE; x++) {
                const cell = (y >> 1) * DRAFT.side + (x >> 1);
                masks[tool][y * SHEET_SIDE + x] = ((cell * 7 + offset * 13) % 1000) / 999;
            }
        }
    });
    return masks;
};

const drawnSheet = () => {
    const sheet = createSheet();
    const pen = createPen();
    penDown(sheet, pen, { x: 80, y: 120 }, 0);
    for (let step = 1; step <= 30; step++) penMove(sheet, pen, { x: 80 + step * 11, y: 120 + Math.sin(step / 3) * 60 }, step * 20);
    penUp(pen);
    return sheet;
};

test('packed masks have the length the server checks', () => {
    assert.equal(PACKED_LENGTH, 93750);
    assert.equal(packMasks(blankMasks()).length, PACKED_LENGTH);
});

test('round trip keeps every saved value within one 4-bit level', async () => {
    const masks = blankMasks();
    const values = { pencil: 0.37, pen: 0.5, paint: 0.93 };
    for (const tool of TOOL_IDS) masks[tool].fill(values[tool]);

    const restored = await decodeDraft(await encodeDraft(masks));

    for (const tool of TOOL_IDS) {
        for (let index = 0; index < SHEET_SIDE * SHEET_SIDE; index += 97) {
            assert.ok(Math.abs(restored[tool][index] - values[tool]) <= 0.5 / DRAFT.levels + 1e-6, `${tool} ${index}`);
        }
    }

    // Saving a restored sheet again changes nothing.
    assert.equal(Buffer.compare(packMasks(restored), packMasks(masks)), 0);
});

test('a drawn stroke comes back within 1/15 per saved value and looks the same', async () => {
    const sheet = drawnSheet();
    const restored = await decodeDraft(await encodeDraft(sheet.masks));

    let worst = 0;
    let total = 0;
    for (let index = 0; index < SHEET_SIDE * SHEET_SIDE; index++) {
        const error = Math.abs(restored.pencil[index] - sheet.masks.pencil[index]);
        worst = Math.max(worst, error);
        total += error;
    }

    // Soft brush edges: the smoothed restore stays close everywhere, and closer on average.
    assert.ok(worst <= 1 / DRAFT.levels, `worst ${worst}`);
    assert.ok(total / (SHEET_SIDE * SHEET_SIDE) < 0.01);

    const saved = packMasks(sheet.masks);
    const again = packMasks(restored);
    let drift = 0;
    for (let cursor = 0; cursor < saved.length; cursor++) {
        drift = Math.max(drift, Math.abs((saved[cursor] >> 4) - (again[cursor] >> 4)), Math.abs((saved[cursor] & 15) - (again[cursor] & 15)));
    }
    assert.ok(drift <= 1, `saving a restored sheet moves a value by ${drift} levels`);
});

test('a blank sheet is tiny and a busy one stays under the server cap', async () => {
    const blank = await encodeDraft(blankMasks());
    assert.ok(blank.length < 400);

    const busy = await encodeDraft(cellMasks());
    assert.ok(atob(busy).length <= 32 * 1024, `busy drawing is ${atob(busy).length} bytes`);
});

test('unknown versions and wrong lengths are refused', async () => {
    const good = await encodeDraft(blankMasks());
    const bytes = Uint8Array.from(atob(good), (char) => char.charCodeAt(0));
    bytes[0] = 2;

    await assert.rejects(decodeDraft(btoa(String.fromCharCode(...bytes))), /Invalid drawing/);
    assert.throws(() => unpackMasks(new Uint8Array(10)), /Invalid drawing/);
});
