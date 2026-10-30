import test from 'node:test';
import assert from 'node:assert/strict';
import { THEME_INIT_SCRIPT, THEME_KEY } from '../../src/utils/theme.ts';

// Runs the inline <head> script against a fake document and storage.
function runInit(stored, { throws = false } = {}) {
    const html = { dataset: {} };
    const localStorage = { getItem: (key) => { if (throws) throw new Error('blocked'); return key === THEME_KEY ? stored : null; } };
    new Function('document', 'localStorage', THEME_INIT_SCRIPT)({ documentElement: html }, localStorage);
    return html.dataset.theme;
}

test('a saved night theme is applied before paint', () => {
    assert.equal(runInit('night'), 'night');
    assert.equal(runInit('day'), 'day');
});

test('nothing saved, an unknown value or blocked storage leaves the prerendered Day', () => {
    assert.equal(runInit(null), undefined);
    assert.equal(runInit('purple'), undefined);
    assert.equal(runInit('night', { throws: true }), undefined);
});
