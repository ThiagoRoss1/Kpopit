import { createContext, useContext } from 'react';
import type { AlbumGroup, AlbumMember } from '../../../interfaces/albumInterfaces';

export type CardZoomTarget =
    | { kind: 'member'; member: AlbumMember; group: AlbumGroup; rect: DOMRect }
    | { kind: 'groupPhoto'; group: AlbumGroup; rect: DOMRect };

export interface AlbumCardZoomApi {
    open: (target: CardZoomTarget) => void;
    /** card_id currently flying into (or out of) the modal — its slot renders
        empty, which is what makes the sticker look like it peeled off the page. */
    flyingCardId: number | null;
}

export const AlbumCardZoomContext = createContext<AlbumCardZoomApi | null>(null);

/** Null in the carousel thumbnails, while a leaf is turning, and whenever the
    reader has switched tap-to-zoom off. Callers must handle null. */
export function useCardZoom(): AlbumCardZoomApi | null {
    return useContext(AlbumCardZoomContext);
}
