import test from 'node:test';
import assert from 'node:assert/strict';
import { isIsoDate } from '../../src/utils/isoDate.ts';

test('only real YYYY-MM-DD days pass', () => {
    for (const value of ['2026-11-15', '2024-02-29', '1999-12-31']) assert.equal(isIsoDate(value), true, value);
    for (const value of ['2026-11-0x', '2026-02-31', '2025-02-29', '2026-13-01', '2026-11-5', '', null, undefined]) {
        assert.equal(isIsoDate(value), false, String(value));
    }
});
