import test from 'node:test';
import assert from 'node:assert/strict';
import { EAGER_ARTWORK_PROPS } from '../../src/components/Albums/AlbumOfCol/albumArtworkLoading.ts';

test('active album artwork stays eager and asynchronously decoded', () => {
    assert.deepEqual(EAGER_ARTWORK_PROPS, { loading: 'eager', decoding: 'async' });
});
