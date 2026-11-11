import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { DRAFT, SHEET, TOOL_IDS } from '../../src/features/inkit/config.ts';
import { exportDraft, importDraft, packDraft, unpackDraft } from '../../src/features/inkit/codec.ts';
import { InkItSheet } from '../../src/features/inkit/engine.ts';

// Node's CompressionStream doesn't keep the event loop alive on its own while it works.
const keepAlive = setInterval(() => {}, 1000);
after(() => clearInterval(keepAlive));

const drawnSheet = () => {
    const sheet = new InkItSheet();
    sheet.pointerDown({ x: 80, y: 120 }, 0);
    for (let step = 1; step <= 30; step++) sheet.pointerMove({ x: 80 + step * 11, y: 120 + Math.sin(step / 3) * 60 }, step * 20);
    sheet.pointerUp();
    return sheet;
};

test('the draft inflates to 93,751 bytes: version 1, then the masks high nibble first', async () => {
    const sheet = new InkItSheet();
    sheet.masks.pencil.fill(1);
    const inflated = inflateSync(Buffer.from(await exportDraft(sheet.masks), 'base64'));

    assert.equal(inflated.length, 93_751);
    assert.equal(DRAFT.length, 93_751);
    assert.equal(inflated[0], 1);
    assert.equal(inflated[1], 0xff, 'first two pencil cells at 15');
    assert.equal(inflated[1 + 31_250], 0, 'pen starts at the next third');
});

test('round trip: every value comes back within 1/15 (plus the soft upsample of an edge)', async () => {
    const sheet = drawnSheet();
    const restored = new InkItSheet();
    await importDraft(await exportDraft(sheet.masks), restored.masks);

    let worst = 0;
    let total = 0;
    for (const id of TOOL_IDS) {
        for (let index = 0; index < SHEET * SHEET; index++) {
            const error = Math.abs(restored.masks[id][index] - sheet.masks[id][index]);
            worst = Math.max(worst, error);
            total += error;
        }
    }

    assert.ok(worst <= 1 / 15 + 0.05, `worst ${worst}`);
    assert.ok(total / (3 * SHEET * SHEET) < 0.005);

    // Flat areas come back exactly at their 4-bit level.
    const flat = new InkItSheet();
    flat.masks.paint.fill(0.5);
    unpackDraft(packDraft(flat.masks), restored.masks);
    assert.ok(Math.abs(restored.masks.paint[1234] - 0.5) <= 0.5 / 15 + 1e-6);
});

test('a heavy sheet stays under the 32 KB cap', async () => {
    const sheet = new InkItSheet();
    sheet.setRound(5, false);
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let stroke = 0; stroke < 240; stroke++) {
        sheet.inkLeft = 100000;
        sheet.tool = TOOL_IDS[stroke % 3];
        let x = random() * SHEET;
        let y = random() * SHEET;
        sheet.pointerDown({ x, y }, 0);
        for (let ms = 16; ms < 500; ms += 16) {
            x += (random() - 0.5) * 60;
            y += (random() - 0.5) * 60;
            sheet.pointerMove({ x, y }, ms);
        }
        sheet.pointerUp();
    }

    const bytes = Buffer.from(await exportDraft(sheet.masks), 'base64').length;
    assert.ok(bytes <= 32 * 1024, `drawing is ${bytes} bytes`);
});

test('unknown versions and wrong lengths are refused', () => {
    const packed = packDraft(new InkItSheet().masks);
    packed[0] = 2;
    assert.throws(() => unpackDraft(packed, new InkItSheet().masks), /Unknown InkIt draft format/);
    assert.throws(() => unpackDraft(new Uint8Array(10).fill(1), new InkItSheet().masks), /Unknown InkIt draft format/);
});
