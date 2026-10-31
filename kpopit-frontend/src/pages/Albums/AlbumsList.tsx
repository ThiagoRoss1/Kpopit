import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageLoader from "../../components/Loading/PageLoader";
import { useSearchParams } from "react-router";
import { SlidersHorizontal } from "lucide-react";
import PageShell from "../../components/Puff/PageShell";
import SearchField from "../../components/Catalogue/SearchField";
import FilterMenu from "../../components/Catalogue/FilterMenu";
import AppliedChips from "../../components/Catalogue/AppliedChips";
import PageMeta from "../../components/Seo/PageMeta";
import { useHydrated } from "../../hooks/useHydrated";
import { cn } from "../../lib/utils";
import type { AlbumsPageItem } from "../../interfaces/gameInterfaces";
import { ALBUM_SORTS, albumsListQuery, filterAlbums, languageFlag, readAlbumFilters, shortType, type AlbumFilters } from "./albumsData";
import AlbumCard from "./AlbumCard";

// None from the route (a preview build without its API): the page fetches the list itself.
export default function AlbumsList({ initialAlbums }: { initialAlbums?: AlbumsPageItem[] }) {
    const { data } = useQuery({ ...albumsListQuery, initialData: initialAlbums });
    return data ? <AlbumsCatalogue albums={data} /> : <PageLoader message="Loading albums..." />;
}

function AlbumsCatalogue({ albums: initialAlbums }: { albums: AlbumsPageItem[] }) {
    const hydrated = useHydrated();
    const [params, setParams] = useSearchParams();
    const [filtersOpen, setFiltersOpen] = useState(false);
    // The prerendered list is unfiltered; URL filters apply once the page is live.
    const f: AlbumFilters = hydrated ? readAlbumFilters(params) : { q: "", artist: "", type: "", lang: "", sort: "" };
    const albums = filterAlbums(initialAlbums, f);

    const set = (patch: Partial<AlbumFilters>) =>
        setParams((p) => {
            for (const [k, v] of Object.entries(patch)) {
                if (v) p.set(k, v);
                else p.delete(k);
            }
            return p;
        }, { replace: true, preventScrollReset: true });

    const artists = [...new Set(initialAlbums.map((a) => a.artist_name))].sort((a, b) => a.localeCompare(b));
    const types = [...new Set(initialAlbums.map((a) => a.type))].sort();
    const languages = [...new Set(initialAlbums.map((a) => a.language).filter((l): l is string => !!l))].sort();
    const activeCount = [f.artist, f.type, f.lang, f.sort].filter(Boolean).length;

    const chips = [
        f.artist && { key: "artist", label: f.artist, onRemove: () => set({ artist: "" }) },
        f.type && { key: "type", label: shortType(f.type), onRemove: () => set({ type: "" }) },
        f.lang && { key: "lang", label: f.lang, onRemove: () => set({ lang: "" }) },
        f.sort && { key: "sort", label: `Sort: ${ALBUM_SORTS[f.sort]}`, onRemove: () => set({ sort: "" }) },
    ].filter((c): c is { key: string; label: string; onRemove: () => void } => !!c);

    return (
        <>
            <PageMeta
                title="K-pop albums in KpopIt: every cover from Pixelated"
                description={`Browse all ${initialAlbums.length} K-pop albums in KpopIt's Pixelated mode, by artist, type and language, with release years and discographies.`}
                path="/albums"
            />
            <PageShell header={{ title: "Albums", korean: "앨범", subtitle: "Every album you can meet in Pixelated...", align: "left" }} width="max-w-[1180px]">
                <div className="pp-enter [--pp-delay:160ms] relative z-30 mt-[34px] @max-[580px]:mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-3 @max-[580px]:gap-2">
                    <SearchField value={f.q} onChange={(q) => set({ q })} placeholder="Search an album or artist..." label="Search albums" className="flex-[1_1_0%] min-w-[220px] max-w-[400px] @max-[580px]:flex-[1_1_calc(100%-60px)] @max-[580px]:max-w-full @max-[580px]:min-w-0" />
                    <button
                        type="button"
                        aria-expanded={filtersOpen}
                        aria-label={filtersOpen ? "Hide filters" : activeCount ? `Show filters, ${activeCount} active` : "Show filters"}
                        onClick={() => setFiltersOpen(!filtersOpen)}
                        className={cn(
                            "pp-press pp-focus hidden @max-[580px]:grid relative flex-none place-items-center w-[46px] h-[46px] rounded-full border-2 border-(--ink) cursor-pointer",
                            activeCount && !filtersOpen ? "bg-[#FF8AC4] text-[#1A1418]" : filtersOpen ? "bg-(--chip-hover) text-(--chip-ink)" : "bg-(--chip) text-(--chip-ink)",
                        )}
                    >
                        <SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={2.8} />
                        {activeCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 grid place-items-center rounded-full border-2 border-[#1A1418] bg-[#FF3399] text-white font-bold text-[10px]">{activeCount}</span>}
                    </button>
                    <div className={cn("contents", !filtersOpen && "@max-[580px]:hidden", filtersOpen && "@max-[580px]:flex @max-[580px]:flex-wrap @max-[580px]:gap-2 @max-[580px]:w-full")}>
                        <FilterMenu title="ARTIST" label={f.artist || "Artist"} value={f.artist} onPick={(artist) => set({ artist })}
                            options={[{ value: "", label: "All artists" }, ...artists.map((a) => ({ value: a, label: a, count: initialAlbums.filter((x) => x.artist_name === a).length }))]} />
                        <FilterMenu title="TYPE" label={f.type ? shortType(f.type) : "Type"} value={f.type} onPick={(type) => set({ type })}
                            options={[{ value: "", label: "All types" }, ...types.map((t) => ({ value: t, label: t }))]} />
                        <FilterMenu title="LANGUAGE" label={f.lang || "Language"} value={f.lang} onPick={(lang) => set({ lang })}
                            options={[{ value: "", label: "Any language" }, ...languages.map((l) => ({ value: l, label: l, icon: languageFlag(l) ? <img src={languageFlag(l)!} alt="" className="w-[22px] h-[15px] rounded-[3px] border border-[#1A1418] object-cover" /> : undefined }))]} />
                        <FilterMenu title="SORT BY" label={f.sort ? `Sort: ${ALBUM_SORTS[f.sort]}` : "Sort"} value={f.sort} align="right" onPick={(sort) => set({ sort: sort as AlbumFilters["sort"] })}
                            options={Object.entries(ALBUM_SORTS).map(([value, label]) => ({ value, label }))} />
                    </div>
                </div>

                <div className="mt-4 mb-2 flex flex-wrap items-center justify-between gap-x-5 gap-y-1 min-h-[48px]">
                    <span aria-live="polite" className="font-semibold text-sm text-(--muted)">
                        {albums.length === initialAlbums.length ? `${albums.length} albums` : `${albums.length} of ${initialAlbums.length} albums`}
                    </span>
                    <div className={cn(filtersOpen && "@max-[580px]:hidden")}>
                        <AppliedChips chips={chips} onClearAll={() => set({ q: "", artist: "", type: "", lang: "", sort: "" })} />
                    </div>
                </div>

                {albums.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                        <span className="font-bold text-[34px] leading-none text-white [text-shadow:var(--puff-empty)]">No albums found...</span>
                        <span className="font-medium text-sm text-(--muted)">Try another word or clear the filters.</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-x-7 gap-y-9 pt-2.5 pr-2 pb-[22px] pl-0.5 @max-[580px]:grid-cols-2 @max-[580px]:gap-x-3.5 @max-[580px]:gap-y-[22px]">
                        {albums.map((album, i) => <AlbumCard key={album.id} album={album} index={i} />)}
                    </div>
                )}
            </PageShell>
        </>
    );
}
