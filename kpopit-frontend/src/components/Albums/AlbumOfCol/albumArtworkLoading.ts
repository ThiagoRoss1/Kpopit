/**
 * Artwork mounted in the active spread is interactive content, not a long
 * off-screen feed. Keep the loading policy in one place so page and zoom paths
 * cannot drift back to lazy loading or synchronous decoding independently.
 */
export const EAGER_ARTWORK_PROPS = {
    loading: 'eager',
    decoding: 'async',
} as const;
