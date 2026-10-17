import test from 'node:test';
import assert from 'node:assert/strict';
import {
    BLURRY_KEYS, CLASSIC_KEYS, GAME_DATE_KEY, MODE_KEYS, PIXELATED_KEYS, clearModeKeys, isNewGameDay,
} from '../../src/utils/gameStorage.ts';

const fakeStorage = (entries = {}) => {
    const map = new Map(Object.entries(entries));
    return {
        map,
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k),
    };
};

test('every mode lists its own date key', () => {
    for (const [mode, key] of Object.entries(GAME_DATE_KEY)) assert.ok(MODE_KEYS[mode].includes(key), mode);
});

test('mode key lists never overlap', () => {
    const all = [...CLASSIC_KEYS, ...BLURRY_KEYS, ...PIXELATED_KEYS];
    assert.equal(new Set(all).size, all.length);
});

test('clearing a mode removes only its keys', () => {
    const storage = fakeStorage({
        todayGuessesDetails: '[1]', gameDate: '2026-10-16',
        blurryGuessesDetails: '[2]', pixelatedGameDate: '2026-10-16',
        userToken: 'enc', kpopit_session: 'true', kpopit_was_authenticated: 'true',
    });
    clearModeKeys(storage, 'classic');
    assert.deepEqual([...storage.map.keys()].sort(), [
        'blurryGuessesDetails', 'kpopit_session', 'kpopit_was_authenticated', 'pixelatedGameDate', 'userToken',
    ]);
});

test('a new day is any server date different from the stored one, first visit included', () => {
    const storage = fakeStorage({ gameDate: '2026-10-16', blurryGameDate: '2026-10-15' });
    assert.equal(isNewGameDay(storage, 'classic', '2026-10-16'), false);
    assert.equal(isNewGameDay(storage, 'classic', '2026-10-17'), true);
    assert.equal(isNewGameDay(storage, 'blurry', '2026-10-16'), true);
    assert.equal(isNewGameDay(storage, 'pixelated', '2026-10-16'), true);
});
