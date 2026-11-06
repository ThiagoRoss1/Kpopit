import { queryOptions } from "@tanstack/react-query";
import { getAlbumInfo, getAlbumsPage } from "../../services/api";
import { loadWithSnapshot } from "../Idols/idolsData";
import type { AlbumPageData, AlbumsPageItem } from "../../interfaces/gameInterfaces";

const STALE_MS = 1000 * 60 * 60 * 4;

// Same cache, snapshot and prefetch rules as the idol pages (idolsData.ts).
export const albumsListQuery = queryOptions<AlbumsPageItem[]>({
    queryKey: ["albumsPageData"],
    queryFn: getAlbumsPage,
    staleTime: STALE_MS,
});

export const albumQuery = (id: string) => queryOptions<AlbumPageData>({
    queryKey: ["albumPageData", id],
    queryFn: () => getAlbumInfo(Number(id)),
    staleTime: STALE_MS,
});

export const loadAlbumsList = (snapshot: () => Promise<AlbumsPageItem[]>) =>
    loadWithSnapshot<AlbumsPageItem[]>(albumsListQuery.queryKey, snapshot, getAlbumsPage);

export const loadAlbum = (id: string, snapshot: () => Promise<AlbumPageData>) =>
    loadWithSnapshot<AlbumPageData>(albumQuery(id).queryKey, snapshot, () => getAlbumInfo(Number(id)));

const SHORT_TYPES: Record<string, string> = { "Mini Album": "Mini", "Studio Album": "Studio", "Repackage Album": "Repackage", Single: "Single" };
export const shortType = (type: string) => SHORT_TYPES[type] ?? type;

import { getNationalityFlag } from "../../utils/getFlags";
import { buildAlbumSlug } from "../../utils/formatters";

const LANGUAGE_NATIONALITY: Record<string, string> = { Korean: "South Korean", Japanese: "Japanese", English: "American" };
/** The flag shown for a release language. */
export const languageFlag = (language: string | null) => (language ? getNationalityFlag(LANGUAGE_NATIONALITY[language] ?? "") : null);

export const albumPath = (album: { id: number; name: string }, artist: string) => `/albums/${album.id}/${buildAlbumSlug(album.name, artist)}`;

export type AlbumSort = "" | "newest" | "oldest" | "az" | "artist";
export const ALBUM_SORTS: Record<AlbumSort, string> = { "": "Catalogue order", newest: "Newest", oldest: "Oldest", az: "A–Z", artist: "Artist" };

export interface AlbumFilters {
    q: string;
    artist: string;
    type: string;
    lang: string;
    sort: AlbumSort;
}

export function readAlbumFilters(params: URLSearchParams): AlbumFilters {
    const sort = params.get("sort") ?? "";
    return {
        q: params.get("q") ?? "",
        artist: params.get("artist") ?? "",
        type: params.get("type") ?? "",
        lang: params.get("lang") ?? "",
        sort: (sort in ALBUM_SORTS ? sort : "") as AlbumSort,
    };
}

/** The albums matching the filters, in the chosen order. */
export function filterAlbums(albums: AlbumsPageItem[], f: AlbumFilters): AlbumsPageItem[] {
    const q = f.q.trim().toLowerCase();
    const list = albums.filter((a) =>
        (!q || `${a.name} ${a.artist_name}`.toLowerCase().includes(q))
        && (!f.artist || a.artist_name === f.artist)
        && (!f.type || a.type === f.type)
        && (!f.lang || a.language === f.lang));
    const byName = (a: AlbumsPageItem, b: AlbumsPageItem) => a.name.localeCompare(b.name);
    if (f.sort === "newest") return list.sort((a, b) => b.release_year - a.release_year || byName(a, b));
    if (f.sort === "oldest") return list.sort((a, b) => a.release_year - b.release_year || byName(a, b));
    if (f.sort === "az") return list.sort(byName);
    if (f.sort === "artist") return list.sort((a, b) => a.artist_name.localeCompare(b.artist_name) || a.release_year - b.release_year);
    return list.sort((first, second) => first.id - second.id);
}
