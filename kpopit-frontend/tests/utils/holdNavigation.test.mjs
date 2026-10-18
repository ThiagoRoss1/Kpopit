import test from 'node:test';
import assert from 'node:assert/strict';
import { holdForData, MIN_LOADER_MS, NAVIGATION_HOLD_MS } from '../../src/utils/holdNavigation.ts';

const after = (ms, value, fail = false) =>
    new Promise((resolve, reject) => setTimeout(() => (fail ? reject(new Error('down')) : resolve(value)), ms));

test('data within the hold comes back ready, after no more than the time it took', async () => {
    const t0 = Date.now();
    const held = await holdForData(after(30, 'profile'));
    assert.deepEqual(held, { ready: true, value: 'profile' });
    assert.ok(Date.now() - t0 < NAVIGATION_HOLD_MS);
});

test('late data switches the page at the hold and keeps the loader for the minimum time', async () => {
    const t0 = Date.now();
    const held = await holdForData(after(300, 'profile'));
    const switchedAt = Date.now() - t0;
    assert.equal(held.ready, false);
    assert.ok(switchedAt >= NAVIGATION_HOLD_MS - 5 && switchedAt < NAVIGATION_HOLD_MS + 80, `switched at ${switchedAt}ms`);
    assert.equal(await held.promise, 'profile');
    assert.ok(Date.now() - t0 - switchedAt >= MIN_LOADER_MS - 5, 'loader shown long enough');
});

test('an early error comes back as a rejected promise for the page, not a throw', async () => {
    const held = await holdForData(after(10, null, true));
    assert.equal(held.ready, false);
    await assert.rejects(held.promise, /down/);
});
