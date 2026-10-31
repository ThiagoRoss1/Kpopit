import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { SlidersHorizontal } from "lucide-react";
import PageShell from "../../components/Puff/PageShell";
import PuffTitle from "../../components/Puff/PuffTitle";
import PageLoader from "../../components/Loading/PageLoader";
import SearchField from "../../components/Catalogue/SearchField";
import FilterMenu from "../../components/Catalogue/FilterMenu";
import AppliedChips, { type AppliedChip } from "../../components/Catalogue/AppliedChips";
import PageMeta from "../../components/Seo/PageMeta";
import { useHydrated } from "../../hooks/useHydrated";
import type { AlbumsPageItem } from "../../interfaces/gameInterfaces";
import { ALBUM_SORTS, albumsListQuery, filterAlbums, languageFlag, readAlbumFilters, shortType, type AlbumFilters } from "./albumsData";
import AlbumCard from "./AlbumCard";

const NO_FILTERS: AlbumFilters = { q: "", artist: "", type: "", lang: "", sort: "" };

const Flag = ({ language, small }: { language: string; small?: boolean }) => {
    const src = languageFlag(language);
    return src ? <img src={src} alt="" className={small ? "w-5 h-3.5 flex-none rounded-[4px] border-[1.5px] border-[#1A1418] object-cover bg-[#1A1418]" : "w-[22px] h-[15px] flex-none rounded-[4px] border-[1.5px] border-[#1A1418] object-cover bg-[#1A1418]"} /> : null;
};

// None from the route (a preview build without its API): the page fetches the list itself.
export default function AlbumsList({ initialAlbums }: { initialAlbums?: AlbumsPageItem[] }) {
    const { data } = useQuery({ ...albumsListQuery, initialData: initialAlbums });
    return data ? <AlbumsCatalogue all={data} /> : <PageLoader message="Loading albums..." />;
}

function AlbumsCatalogue({ all }: { all: AlbumsPageItem[] }) {
    const hydrated = useHydrated();
    const [params, setParams] = useSearchParams();
    const [filtersOpen, setFiltersOpen] = useState(false);
    // The prerendered list is unfiltered; the URL's filters apply once the page is live.
    const f = hydrated ? readAlbumFilters(params) : NO_FILTERS;
    const albums = filterAlbums(all, f);

    const set = (patch: Partial<AlbumFilters>) =>
        setParams((p) => {
            for (const [k, v] of Object.entries(patch)) {
                if (v) p.set(k, v);
                else p.delete(k);
            }
            return p;
        }, { replace: true, preventScrollReset: true });
    const reset = () => set(NO_FILTERS);

    const artists = [...new Set(all.map((a) => a.artist_name))].sort((a, b) => a.localeCompare(b));
    const types = [...new Set(all.map((a) => a.type))].sort();
    const languages = [...new Set(all.map((a) => a.language).filter((l): l is string => !!l))].sort();
    // Counts as if that option were picked: the other filters and the search still apply.
    const countWith = (patch: Partial<AlbumFilters>) => filterAlbums(all, { ...f, ...patch, sort: "" }).length;
    const activeCount = [f.artist, f.type, f.lang, f.sort].filter(Boolean).length;

    const chips: AppliedChip[] = [];
    if (f.artist) chips.push({ key: "artist", label: f.artist, onRemove: () => set({ artist: "" }) });
    if (f.type) chips.push({ key: "type", label: shortType(f.type), onRemove: () => set({ type: "" }) });
    if (f.lang) chips.push({ key: "lang", label: f.lang, onRemove: () => set({ lang: "" }) });
    if (f.sort) chips.push({ key: "sort", label: ALBUM_SORTS[f.sort], onRemove: () => set({ sort: "" }) });
    if (f.q) chips.push({ key: "q", label: `"${f.q}"`, onRemove: () => set({ q: "" }) });

    return (
        <>
            <PageMeta
                title="K-pop albums in KpopIt: every cover from Pixelated"
                description={`Browse all ${all.length} K-pop albums in KpopIt's Pixelated mode by artist, type and language, with release years and discographies.`}
                path="/albums"
            />
            <PageShell width="max-w-[1180px]">
                <div className="cg-inner">
                    <header className="cg-head pp-enter [--pp-anim:puffSide] [--pp-delay:80ms] flex items-end justify-between flex-wrap gap-(--cg-hd-gap) pt-(--cg-head-pt)">
                        <div className="flex items-center gap-4">
                            <PuffTitle className="text-(length:--cg-title-fs) tracking-[-.01em]">Albums</PuffTitle>
                            <span lang="ko" className="cg-ko flex-none whitespace-nowrap font-korean font-bold text-sm leading-none text-(--chip-ink) bg-(--chip) border-2 border-(--ink) rounded-[10px] px-[9px] py-1.5 [box-shadow:2px_3px_0_var(--ctl-off)] rotate-3">앨범</span>
                        </div>
                        <span className="font-medium text-[13px] text-(--muted) pb-(--cg-cnt-pb)">{`${all.length} albums · ${artists.length} artists`}</span>
                    </header>

                    <div className="cg-ctls pp-enter [--pp-delay:160ms] relative z-10 flex items-center flex-wrap gap-(--cg-ctl-gap) mt-(--cg-ctl-mt)" data-fopen={filtersOpen ? "1" : "0"}>
                        <SearchField value={f.q} onChange={(q) => set({ q })} placeholder="Search an album or artist..." label="Search albums or artists" />
                        <button
                            type="button"
                            className="cg-ft cg-focus hidden place-items-center relative flex-[0_0_46px] w-[46px] h-(--cg-search-h) mb-[var(--cg-search-mb,0px)] p-0 rounded-[16px] border-2 border-(--ink) cursor-pointer"
                            data-open={filtersOpen ? "1" : "0"}
                            data-on={activeCount ? "1" : "0"}
                            aria-expanded={filtersOpen}
                            aria-label={filtersOpen ? "Hide filters" : activeCount ? `Show filters, ${activeCount} active` : "Show filters"}
                            onClick={() => setFiltersOpen(!filtersOpen)}
                            style={{
                                background: filtersOpen ? "var(--chip-hover)" : activeCount ? "var(--side)" : "var(--chip)",
                                color: activeCount && !filtersOpen ? "#1A1418" : "var(--chip-ink)",
                                boxShadow: `${filtersOpen ? "0 0 0 var(--ctl-off)" : "2px 3px 0 var(--ctl-off)"},${activeCount && !filtersOpen ? "var(--in-pink)" : "var(--in)"}`,
                            }}
                        >
                            <SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={2.6} aria-hidden />
                            {activeCount > 0 && (
                                <span aria-hidden className="cg-fbadge absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 grid place-items-center rounded-full bg-[#FF3399] text-[#1A1418] border-2 border-[#1A1418] [box-shadow:1px_1.5px_0_#1A1418] font-bold text-[11px] leading-none">{activeCount}</span>
                            )}
                        </button>
                        <div className="cg-fpanel">
                            <FilterMenu title="ARTIST" minWidth="104px" label={f.artist || "Artist"} value={f.artist} onPick={(artist) => set({ artist })}
                                options={[{ value: "", label: "All artists", count: countWith({ artist: "" }) }, ...artists.map((a) => ({ value: a, label: a, count: countWith({ artist: a }) }))]} />
                            <FilterMenu title="TYPE" minWidth="92px" label={f.type ? shortType(f.type) : "Type"} value={f.type} onPick={(type) => set({ type })}
                                options={[{ value: "", label: "All types", count: countWith({ type: "" }) }, ...types.map((t) => ({ value: t, label: t, count: countWith({ type: t }) }))]} />
                            <FilterMenu title="LANGUAGE" minWidth="128px" label={f.lang || "Language"} value={f.lang} icon={f.lang ? <Flag language={f.lang} small /> : undefined} onPick={(lang) => set({ lang })}
                                options={[{ value: "", label: "Any language", count: countWith({ lang: "" }) }, ...languages.map((l) => ({ value: l, label: l, icon: <Flag language={l} />, count: countWith({ lang: l }) }))]} />
                            <FilterMenu title="SORT BY" minWidth="96px" align="right" label={f.sort ? `Sort: ${ALBUM_SORTS[f.sort]}` : "Sort"} value={f.sort} onPick={(sort) => set({ sort: sort as AlbumFilters["sort"] })}
                                options={Object.entries(ALBUM_SORTS).map(([value, label]) => ({ value, label }))} />
                        </div>
                    </div>

                    <AppliedChips
                        filtersOpen={filtersOpen}
                        result={`${albums.length === all.length ? "All " : ""}${albums.length} ${albums.length === 1 ? "album" : "albums"}`}
                        chips={chips}
                        onClearAll={reset}
                    />

                    {albums.length > 0 ? (
                        <section aria-label="Albums catalogue" className="grid grid-cols-[repeat(auto-fill,minmax(var(--cg-grid-min),1fr))] gap-(--cg-grid-gap) p-(--cg-grid-pad)">
                            {albums.map((album, i) => <AlbumCard key={album.id} album={album} index={i} />)}
                        </section>
                    ) : (
                        <div className="pp-enter min-h-[340px] grid place-content-center justify-items-center text-center gap-3.5">
                            <div className="font-bold text-[34px] leading-[1.15] text-white [text-shadow:var(--puff-empty)] -rotate-[1.5deg] pt-0 pr-1.5 pb-2 pl-1">No albums found...</div>
                            <div className="font-medium text-sm text-(--muted)">{f.q ? `No matches for "${f.q}" with these filters.` : "No matches with these filters."}</div>
                            <button type="button" onClick={reset} className="cg-press cg-focus mt-2 h-[46px] px-[22px] rounded-full border-2 border-(--ink) bg-(--tag) text-white [text-shadow:var(--tag-text)] font-bold text-sm cursor-pointer [box-shadow:3px_4px_0_var(--ink),var(--in-pink)]">
                                Clear search & filters
                            </button>
                        </div>
                    )}

                    <footer className="flex justify-between flex-wrap gap-x-5 gap-y-2 mt-2.5 pt-4 border-t-[1.5px] border-(--rule) font-medium text-[11px] text-(--muted)">
                        <span>KpopIt</span>
                        <span>{`${all.length} albums from the KpopIt catalogue`}</span>
                    </footer>
                </div>
            </PageShell>
        </>
    );
}
