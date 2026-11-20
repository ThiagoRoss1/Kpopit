// The precomputed InkIt layers, loaded as the server unlocks their URLs (pure: no DOM, no network of its own).
// Each URL downloads as soon as it is offered; a layer that keeps failing falls back to building the old
// layers from the emergency photo, so the game still plays.

export type LayerKind = "pencil" | "pen" | "photo";
export type LayerStatus = "idle" | "loading" | "ready" | "failed";
export type LayerUrls = Partial<Record<LayerKind, string>>;

/** What the in-browser build returns: both drawing layers, plus the photo's pixels it was built from. */
export interface BuiltLayers {
    pencil: Float32Array;
    pen: Float32Array;
    photo?: Uint8ClampedArray;
}

interface LayerLoaderOptions {
    /** Downloads and decodes one drawing layer into darkness (0 paper, 1 ink). */
    load: (url: string) => Promise<Float32Array>;
    /** Downloads and decodes the photo into RGBA pixels. */
    loadPhoto?: (url: string) => Promise<Uint8ClampedArray>;
    /** Extra tries after a failed download. */
    retries?: number;
    /** A download still pending after this long counts as failed (a stalled connection never errors). */
    timeoutMs?: number;
    /** The emergency photo URL, asked for once when a drawing layer can't be loaded. */
    fallbackPhoto: () => Promise<string>;
    /** The old layers, built in the browser from that photo. */
    buildFromPhoto: (url: string) => Promise<BuiltLayers>;
    /** Called whenever a status or a layer changes. */
    onChange?: () => void;
}

const KINDS: LayerKind[] = ["pencil", "pen", "photo"];

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("InkIt file timed out")), ms);
    promise.then(
        (value) => {
            clearTimeout(timer);
            resolve(value);
        },
        (error: unknown) => {
            clearTimeout(timer);
            reject(error);
        },
    );
});

export const createLayerLoader = ({
    load, loadPhoto, retries = 2, timeoutMs = 30_000, fallbackPhoto, buildFromPhoto, onChange,
}: LayerLoaderOptions) => {
    const urls: LayerUrls = {};
    const statuses: Record<LayerKind, LayerStatus> = { pencil: "idle", pen: "idle", photo: "idle" };
    const layers: { pencil: Float32Array | null; pen: Float32Array | null; photo: Uint8ClampedArray | null } = {
        pencil: null, pen: null, photo: null,
    };
    // Once the old look is in use it covers both drawing layers: later pencil/pen URLs are ignored.
    let fallback: Promise<void> | null = null;

    const changed = () => onChange?.();

    const startFallback = () => {
        fallback ??= (async () => {
            try {
                const built = await buildFromPhoto(await fallbackPhoto());
                layers.pencil = built.pencil;
                layers.pen = built.pen;
                statuses.pencil = statuses.pen = "ready";
                if (built.photo && statuses.photo !== "ready") {
                    layers.photo = built.photo;
                    statuses.photo = "ready";
                }
            } catch {
                for (const kind of ["pencil", "pen"] as const) {
                    if (statuses[kind] !== "ready") statuses[kind] = "failed";
                }
            }
            changed();
        })();
        return fallback;
    };

    const download = async (kind: LayerKind, url: string) => {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const value = await withTimeout<Float32Array | Uint8ClampedArray>(kind === "photo" ? loadPhoto!(url) : load(url), timeoutMs);
                // A newer URL for the same layer replaced this one while it downloaded.
                if (urls[kind] !== url) return;
                if (kind === "photo") layers.photo = value as Uint8ClampedArray;
                else layers[kind] = value as Float32Array;
                statuses[kind] = "ready";
                changed();
                return;
            } catch {
                if (urls[kind] !== url) return;
            }
        }

        if (kind === "photo") {
            statuses.photo = "failed";
            changed();
            return;
        }
        await startFallback();
    };

    return {
        /** Starts a download for every URL not already loading or loaded. */
        offer(files: LayerUrls) {
            for (const kind of KINDS) {
                const url = files[kind];
                if (!url || urls[kind] === url) continue;
                if (kind === "photo" && !loadPhoto) continue;
                if (kind !== "photo" && fallback) continue;

                urls[kind] = url;
                statuses[kind] = "loading";
                changed();
                void download(kind, url);
            }
        },
        status: (kind: LayerKind): LayerStatus => statuses[kind],
        layer: <K extends LayerKind>(kind: K): (K extends "photo" ? Uint8ClampedArray : Float32Array) | null =>
            layers[kind] as (K extends "photo" ? Uint8ClampedArray : Float32Array) | null,
    };
};

export type LayerLoader = ReturnType<typeof createLayerLoader>;

/** One call per key, shared by everyone who asks: the page mounts twice under React StrictMode
 *  (development) and can remount, but asks the emergency endpoint once per game day. A failed
 *  call is forgotten, so a later retry asks again. */
export const onceByKey = <T>(run: (key: string) => Promise<T>) => {
    const calls = new Map<string, Promise<T>>();

    return (key: string): Promise<T> => {
        let call = calls.get(key);
        if (!call) {
            call = run(key).catch((error: unknown) => {
                calls.delete(key);
                throw error;
            });
            calls.set(key, call);
        }
        return call;
    };
};

/** The URL of a stored InkIt path: the bucket with ?v=<version>, or the dev route in a dev build. */
export const fileUrl = (
    path: string, version: string, { bucket, devFileUrl = null }: { bucket: string; devFileUrl?: ((path: string) => string) | null },
): string => (devFileUrl ? `${devFileUrl(path)}&v=${version}` : `${bucket}${path}?v=${version}`);

/** A layer file's pixels as darkness: white is paper, so darkness = 1 − R / 255. */
export const darknessFromPixels = (data: Uint8ClampedArray): Float32Array => {
    const darkness = new Float32Array(data.length / 4);
    for (let index = 0; index < darkness.length; index++) darkness[index] = 1 - data[index * 4] / 255;
    return darkness;
};
