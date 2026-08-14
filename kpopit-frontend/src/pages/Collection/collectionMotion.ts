/* Shared timing contracts for collection disclosures and the card-zoom FLIP. */
export const COLLECTION_STANDARD_EXIT_MS = 300;
export const COLLECTION_SUMMARY_RAIL_EXIT_MS = 220;
export const COLLECTION_CARD_ZOOM_EXIT_MS = COLLECTION_STANDARD_EXIT_MS;

export const COLLECTION_EXIT_ANIMATIONS = {
    rail: ['collection-rail-out'],
    chrome: ['collection-chrome-out'],
    modal: ['collection-modal-out'],
    sheet: ['collection-sheet-out', 'collection-pop-out'],
    cardZoom: ['collection-card-zoom-out'],
} as const;
