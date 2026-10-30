import test from 'node:test';
import assert from 'node:assert/strict';
import { NO_FEATURES, parseFeatures } from '../../src/utils/features.ts';

test('a full answer is read as is', () => {
    const all = { calendar: true, idol_xp: true, public_profile: true, collection: true };
    assert.deepEqual(parseFeatures(all), all);
});

test('no answer, a failed read or garbage means every feature is off', () => {
    for (const raw of [undefined, null, 'oops', 42, [], { error: 'Internal error' }]) {
        assert.deepEqual(parseFeatures(raw), NO_FEATURES);
    }
});

test('only a literal true turns a feature on; unknown keys are dropped', () => {
    assert.deepEqual(
        parseFeatures({ calendar: 'true', idol_xp: 1, public_profile: true, extra: true }),
        { calendar: false, idol_xp: false, public_profile: true, collection: false },
    );
});
