import type { GfxSettings } from './collectionFx.ts';

/** Shared DOM contract for CSS-driven collection effects. */
export function getCollectionFxAttrs(settings: GfxSettings) {
    return {
        'data-cards': settings.cards,
        'data-fx-backdrop': settings.paper ? 'on' : 'off',
        'data-fx-sparkles': settings.sparkles ? 'on' : 'off',
        'data-fx-shadows': settings.shadows ? 'on' : 'off',
        'data-fx-blur': settings.blur ? 'on' : 'off',
        'data-fx-lv2': settings.goldShine ? 'on' : 'off',
        'data-fx-lv3': settings.holoShine ? 'on' : 'off',
    } as const;
}
