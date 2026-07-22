export interface AlbumPalette {
  /* Darkest stop — dark text, gradient dark end, GROUP FILE header */
  deep: string;
  /* Dark-mid supporting tone (wave layers) */
  secondary: string;
  /* The group's main color — card borders, circle decor, titles */
  main: string;
  /* Bright-mid pop tone (wave layers) */
  accent: string;
  /* Lightest stop — light decor tone: slab, lightest wave layer, gradient light ends */
  light: string;
}

/* -- API Payloads -- */

export interface CollectionAlbumMember {
  idol_id: number;
  artist_name: string;
  card_id: number;
  image_path: string;
  image_version: string | null;
  owned: boolean;
  level: number | null;
  first_won_at: string | null;
}

export interface CollectionGroupPhoto {
  card_id: number;
  owned: boolean;
  src: string | null;
}

/* One collection row from GET /api/collections/list */
export interface CollectionListItem {
  collection_id: number;
  name: string;
  album_label: string | null;
  description: string | null;
  total_cards: number;
  owned_cards: number;
  created_at: string;
}

/* One group page from GET /api/collections/album */
export interface CollectionAlbumGroup {
  group_id: number;
  group_name: string;
  hangul_name: string | null;
  debut_year: number | null;
  fandom_name: string | null;
  company: string | null;
  label: string | null;
  image_path: string | null;
  image_version: string | null;
  palette: AlbumPalette | null;
  members: CollectionAlbumMember[];
  group_photo: { card_id: number; owned: boolean } | null;
}

export type CardGranted = {
  card_id: number;
  is_new: boolean;
  level: number;
  times_won: number;
  group_photo: number[];
} | null;

/* -- (AlbumOfCol) -- */

export interface AlbumMember {
  idol_id: number;
  artist_name: string;
  card_id: number;
  src: string | null;
  owned: boolean;
  level: number | null;
  is_new?: boolean;
}

export interface AlbumGroup {
  group_id: number;
  group_name: string;
  hangul_name: string;
  debut_year: number | null;
  fandom_name: string;
  company: string;
  label: string;
  set: string;
  palette: AlbumPalette;
  members: AlbumMember[];
  group_photo: CollectionGroupPhoto | null;
}

export interface AlbumStats {
  owned: number;
  total: number;
  groups_complete: number;
  groups_total: number;
}
