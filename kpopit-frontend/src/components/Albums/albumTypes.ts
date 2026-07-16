// Album 1 Collection — data shapes for the sticker-album UI.
// Mirrors the backend CollectionService responses (GET /api/collection/overview and
// GET /api/collection/groups/<id>) plus the groups.csv metadata the pages render.
// The mock file (pages/Collection/mockAlbumData.ts) produces these shapes today;
// the real fetch swaps in later without touching the components.

export interface AlbumMember {
    idol_id: number;
    artist_name: string;
    real_name: string;
    card_id: number;
    image_path: string;
    owned: boolean;
    level: number | null;
    /** Freshly-won card — renders the accent-border "new sticker" variant */
    is_new?: boolean;
}

export interface AlbumGroupPhoto {
    card_id: number;
    image_path: string;
    owned: boolean;
}

export interface AlbumGroup {
    group_id: number;
    group_name: string;
    hangul_name: string;
    debut_year: number;
    fandom_name: string;
    company: string;
    label: string;
    /** Zero-padded set number inside the album, e.g. "01" */
    set: string;
    /** Group brand color the analogous page ramp is generated from */
    source_color: string;
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

/** 5-stop tonal ramp, deepest → lightest (index 0 → 4) */
export type AlbumRamp = [string, string, string, string, string];

export const ALBUM_PAGE_W = 600;
export const ALBUM_PAGE_H = 900;
export const ALBUM_CARDS_PER_PAGE = 6;
