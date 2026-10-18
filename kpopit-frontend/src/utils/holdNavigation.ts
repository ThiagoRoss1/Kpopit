// How long a navigation waits for its data before switching pages, and how long the loader then
// stays, so a late answer never flashes it for a frame.
export const NAVIGATION_HOLD_MS = 200;
export const MIN_LOADER_MS = 500;
// The loading screen paints a frame or two after the route loader returns; the minimum counts from the paint.
const PAINT_MARGIN_MS = 50;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// The data when it settled within the hold, or the promise for <Await> (wrapped: an async function
// would otherwise flatten it into a wait).
export type Held<T> = { ready: true; value: T } | { ready: false; promise: Promise<T> };

// For route clientLoaders. A late promise only resolves once the loader has shown MIN_LOADER_MS;
// an error, early or late, comes back as a rejected promise so the page shows it instead of crashing.
export async function holdForData<T>(promise: Promise<T>): Promise<Held<T>> {
    const outcome = promise.then((value) => ({ ok: true as const, value }), () => ({ ok: false as const }));
    const early = await Promise.race([outcome, sleep(NAVIGATION_HOLD_MS).then(() => null)]);
    if (early?.ok) return { ready: true, value: early.value };
    const late = early ? promise : Promise.all([promise, sleep(MIN_LOADER_MS + PAINT_MARGIN_MS)]).then(([value]) => value);
    late.catch(() => {}); // handled by <Await>; keeps the browser from reporting it before that
    return { ready: false, promise: late };
}
