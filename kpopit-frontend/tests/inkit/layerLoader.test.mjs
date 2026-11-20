import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createLayerLoader, darknessFromPixels, fileUrl, onceByKey } from '../../src/features/inkit/layerLoader.ts';

/** A promise the test settles by hand. */
const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

/** Lets every pending promise callback run. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

/** A fake `load` whose calls stay pending until the test settles them. */
const controllableLoad = () => {
    const calls = [];
    const load = (url) => {
        const call = { url, ...deferred() };
        calls.push(call);
        return call.promise;
    };
    return { load, calls };
};

const layer = (value) => new Float32Array([value, value]);

const noFallback = {
    fallbackPhoto: () => Promise.reject(new Error('fallback must not be called')),
    buildFromPhoto: () => Promise.reject(new Error('fallback must not be called')),
};

test('layer that arrives late: status loading, then ready', async () => {
    const { load, calls } = controllableLoad();
    const loader = createLayerLoader({ load, ...noFallback });

    assert.equal(loader.status('pencil'), 'idle');
    loader.offer({ pencil: 'https://cdn.test/pencil.webp?v=1' });
    assert.equal(loader.status('pencil'), 'loading');
    assert.equal(loader.layer('pencil'), null);

    calls[0].resolve(layer(0.3));
    await flush();
    assert.equal(loader.status('pencil'), 'ready');
    assert.deepEqual(loader.layer('pencil'), layer(0.3));
});

test('pen offered at round 3 starts downloading immediately', async () => {
    const { load, calls } = controllableLoad();
    const loader = createLayerLoader({ load, ...noFallback });

    loader.offer({ pencil: 'pencil-url' });
    assert.deepEqual(calls.map((call) => call.url), ['pencil-url']);

    loader.offer({ pencil: 'pencil-url', pen: 'pen-url' });
    assert.deepEqual(calls.map((call) => call.url), ['pencil-url', 'pen-url']);
    assert.equal(loader.status('pen'), 'loading');
});

test('layer fails once, retry succeeds', async () => {
    const { load, calls } = controllableLoad();
    let fallbacks = 0;
    const loader = createLayerLoader({
        load,
        fallbackPhoto: async () => {
            fallbacks += 1;
            return 'photo-url';
        },
        buildFromPhoto: async () => ({ pencil: layer(1), pen: layer(1) }),
    });

    loader.offer({ pencil: 'pencil-url' });
    calls[0].reject(new Error('network'));
    await flush();
    assert.equal(calls.length, 2);

    calls[1].resolve(layer(0.2));
    await flush();
    assert.equal(loader.status('pencil'), 'ready');
    assert.deepEqual(loader.layer('pencil'), layer(0.2));
    assert.equal(fallbacks, 0);
});

test('retries exhausted: emergency photo, then old layers', async () => {
    const { load, calls } = controllableLoad();
    const fallbackCalls = [];
    const built = { pencil: layer(0.7), pen: layer(0.8), photo: new Uint8ClampedArray([1, 2, 3, 4]) };
    const loader = createLayerLoader({
        load,
        fallbackPhoto: async () => {
            fallbackCalls.push('fallback');
            return 'emergency-photo-url';
        },
        buildFromPhoto: async (url) => {
            fallbackCalls.push(url);
            return built;
        },
    });

    loader.offer({ pencil: 'pencil-url' });
    for (let attempt = 0; attempt < 3; attempt++) {
        assert.equal(calls.length, attempt + 1);
        calls[attempt].reject(new Error('404'));
        await flush();
    }
    await flush();

    assert.equal(calls.length, 3);
    assert.deepEqual(fallbackCalls, ['fallback', 'emergency-photo-url']);
    assert.equal(loader.status('pencil'), 'ready');
    assert.equal(loader.status('pen'), 'ready');
    assert.equal(loader.layer('pencil'), built.pencil);
    assert.equal(loader.layer('pen'), built.pen);

    // The old look covers both layers: a later pen URL is not downloaded over it.
    loader.offer({ pencil: 'pencil-url', pen: 'pen-url' });
    assert.equal(calls.length, 3);
});

test('same URL offered twice is loaded once', async () => {
    const { load, calls } = controllableLoad();
    const loader = createLayerLoader({ load, ...noFallback });

    loader.offer({ pencil: 'pencil-url' });
    loader.offer({ pencil: 'pencil-url' });
    assert.equal(calls.length, 1);

    calls[0].resolve(layer(0.1));
    await flush();
    loader.offer({ pencil: 'pencil-url' });
    assert.equal(calls.length, 1);
});

test('fileUrl carries the version', () => {
    assert.equal(
        fileUrl('/images/inkit/pen/abc.webp', '3', { bucket: 'https://cdn.test' }),
        'https://cdn.test/images/inkit/pen/abc.webp?v=3',
    );
    const devFileUrl = (path) => `http://api.test/game/inkit/dev/file?path=${encodeURIComponent(path)}`;
    assert.equal(
        fileUrl('/images/inkit/pen/abc.webp', '3', { bucket: 'https://cdn.test', devFileUrl }),
        'http://api.test/game/inkit/dev/file?path=%2Fimages%2Finkit%2Fpen%2Fabc.webp&v=3',
    );
});

test('darknessFromPixels: white is paper, black is ink', () => {
    const pixels = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 128, 128, 128, 255]);
    const darkness = darknessFromPixels(pixels);

    assert.equal(darkness.length, 3);
    assert.equal(darkness[0], 0);
    assert.equal(darkness[1], 1);
    assert.ok(Math.abs(darkness[2] - 0.498) < 0.001, `128 → ${darkness[2]}`);
});

test('a download that stalls times out and is retried', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
        const { load, calls } = controllableLoad();
        const loader = createLayerLoader({ load, timeoutMs: 30_000, ...noFallback });

        loader.offer({ pencil: 'pencil-url' });
        assert.equal(calls.length, 1);

        mock.timers.tick(29_999);
        await flush();
        assert.equal(calls.length, 1);

        mock.timers.tick(1);
        await flush();
        assert.equal(calls.length, 2);

        calls[1].resolve(layer(0.4));
        await flush();
        assert.equal(loader.status('pencil'), 'ready');
    } finally {
        mock.timers.reset();
    }
});

test('onceByKey: one emergency call per day, however many loaders ask', async () => {
    const asked = [];
    const photoFor = onceByKey(async (day) => {
        asked.push(day);
        return `photo-${day}`;
    });

    // React StrictMode mounts the page twice in development: two loaders, one call.
    const [first, second] = await Promise.all([photoFor('2026-11-17'), photoFor('2026-11-17')]);
    assert.equal(first, 'photo-2026-11-17');
    assert.equal(second, 'photo-2026-11-17');
    assert.equal(await photoFor('2026-11-18'), 'photo-2026-11-18');
    assert.deepEqual(asked, ['2026-11-17', '2026-11-18']);
});

test('onceByKey: a failed call is forgotten, so a retry asks again', async () => {
    let calls = 0;
    const photoFor = onceByKey(async () => {
        calls += 1;
        if (calls === 1) throw new Error('429');
        return 'photo';
    });

    await assert.rejects(photoFor('2026-11-17'));
    assert.equal(await photoFor('2026-11-17'), 'photo');
    assert.equal(calls, 2);
});
