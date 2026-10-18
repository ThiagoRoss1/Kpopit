import test from 'node:test';
import assert from 'node:assert/strict';
import { persistingFetch, readPersistedList } from '../../src/utils/persistedList.ts';

const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
};

test('a fetched list is stored and read back on the next visit', async () => {
    store.clear();
    const fetchList = persistingFetch('k', async () => [{ id: 1 }]);
    assert.deepEqual(await fetchList(), [{ id: 1 }]);
    assert.deepEqual(readPersistedList('k'), [{ id: 1 }]);
});

test('copies older than 7 days, or in the old shape, are ignored', () => {
    store.clear();
    store.set('old', JSON.stringify({ savedAt: Date.now() - 8 * 24 * 3600 * 1000, list: [{ id: 1 }] }));
    store.set('v1', JSON.stringify([{ id: 1 }]));
    store.set('bad', '{not json');
    assert.equal(readPersistedList('old'), undefined);
    assert.equal(readPersistedList('v1'), undefined);
    assert.equal(readPersistedList('bad'), undefined);
    assert.equal(readPersistedList('missing'), undefined);
});
