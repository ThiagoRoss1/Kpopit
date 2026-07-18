// Album 1 Collection — view-model shapes for the sticker-album UI.
// The API payload types (CollectionAlbumGroup et al.) live in
// interfaces/gameInterfaces.ts; pages/Collection/collection.tsx maps them into
// these view models (resolved photo URL, set number, guaranteed palette) so the
// components never deal with nullable presentation data.

import type { AlbumPalette } from '../../interfaces/gameInterfaces';

export type { AlbumPalette };

export interface AlbumMember {
    idol_id: number;
    artist_name: string;
    card_id: number;
    image_path: string;
    owned: boolean;
    level: number | null;
    /** Freshly-won card — renders the accent-border "new sticker" variant */
    is_new?: boolean;
}

export interface AlbumGroupPhoto {
    card_id: number;
    image_path: string | null;
    owned: boolean;
}

export interface AlbumGroup {
    group_id: number;
    group_name: string;
    hangul_name: string;
    debut_year: number | null;
    fandom_name: string;
    company: string;
    label: string;
    /** Zero-padded set number inside the album, e.g. "01" */
    set: string;
    /** 5-stop tonal palette for the group's pages (group_features.palette or generated) */
    palette: AlbumPalette;
    /** Resolved URL for the group photo (bundled asset or CDN) */
    group_photo_src: string | null;
    members: AlbumMember[];
    group_photo: AlbumGroupPhoto | null;
}

export interface AlbumStats {
    owned: number;
    total: number;
    groups_complete: number;
    groups_total: number;
}

export const ALBUM_PAGE_W = 600;
export const ALBUM_PAGE_H = 900;
export const ALBUM_CARDS_PER_PAGE = 6;
