import test from 'node:test';
import assert from 'node:assert/strict';
import { isSessionRejected } from '../../src/utils/authErrors.ts';

test('only a rejected session (401) ends the session', () => {
    assert.equal(isSessionRejected({ response: { status: 401 } }), true);
    assert.equal(isSessionRejected({ response: { status: 404 } }), false);
});

test('network errors, timeouts and 5xx are transient', () => {
    assert.equal(isSessionRejected({ code: 'ERR_NETWORK', response: undefined }), false);
    assert.equal(isSessionRejected({ code: 'ECONNABORTED' }), false);
    assert.equal(isSessionRejected({ response: { status: 500 } }), false);
    assert.equal(isSessionRejected({ response: { status: 503 } }), false);
    assert.equal(isSessionRejected({ response: { status: 429 } }), false);
    assert.equal(isSessionRejected(null), false);
    assert.equal(isSessionRejected(new Error('boom')), false);
});
