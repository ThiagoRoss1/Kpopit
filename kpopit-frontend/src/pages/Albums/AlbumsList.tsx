import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { cn } from "../../lib/utils";
import PageShell from "../../components/PageShell/PageShell";
import PuffTitle, { KoreanTag } from "../../components/PageShell/PuffTitle";
import PageLoader from "../../components/Loading/PageLoader";
import SearchField from "../../components/ListFilters/SearchField";
import FilterMenu from "../../components/ListFilters/FilterMenu";
import FiltersToggle from "../../components/ListFilters/FiltersToggle";
import AppliedFilters, { type AppliedFilter } from "../../components/ListFilters/AppliedFilters";
import ListEmptyState from "../../components/ListFilters/ListEmptyState";
import PageMeta from "../../components/Seo/PageMeta";
import { useHydrated } from "../../hooks/useHydrated";
import type { AlbumsPageItem } from "../../interfaces/gameInterfaces";
import {
    ALBUM_SORTS,
    albumsListQuery,
    filterAlbums,
    languageFlag,
    readAlbumFilters,
    shortType,
    type AlbumFilters,
} from "./albumsData";
import AlbumCard from "./AlbumCard";

const NO_FILTERS: AlbumFilters = { q: "", artist: "", type: "", lang: "", sort: "" };

const byName = (first: string, second: string) => first.localeCompare(second);

const Flag = ({ language, small }: { language: string; small?: boolean }) => {
    const src = languageFlag(language);
    if (!src) return null;

    return (
        <img
            src={src}
            alt=""
            className={cn(
                "flex-none rounded-sm border-[1.5px] border-[#1A1418] object-cover bg-[#1A1418]",
                small ? "w-5 h-3.5" : "w-5.5 h-3.75",
            )}
        />
    );
};

interface AlbumsListProps {
    /** None from the route (a preview build without its API): the page fetches the list itself. */
    initialAlbums?: AlbumsPageItem[];
}

const AlbumsList = ({ initialAlbums }: AlbumsListProps) => {
    const { data } = useQuery({ ...albumsListQuery, initialData: initialAlbums });

    if (!data) return <PageLoader message="Loading albums..." />;

    return <AlbumsCatalogue allAlbums={data} />;
};

const AlbumsCatalogue = ({ allAlbums }: { allAlbums: AlbumsPageItem[] }) => {
    const hydrated = useHydrated();
    const [params, setParams] = useSearchParams();
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [animate, setAnimate] = useState(true);
    const [gridVersion, setGridVersion] = useState(0);

    // The prerendered list is unfiltered; the URL's filters apply once the page is live.
    const filters = hydrated ? readAlbumFilters(params) : NO_FILTERS;
    const albums = filterAlbums(allAlbums, filters);

    const setFilters = (patch: Partial<AlbumFilters>) => {
        const nextFilters = { ...filters, ...patch };
        const clearedSearch = !!filters.q && nextFilters.q === "";
        const clearedAll = Object.values(filters).some(Boolean) && !Object.values(nextFilters).some(Boolean);
        const recoveredResults = albums.length === 0 && filterAlbums(allAlbums, nextFilters).length > 0;
        const replayEntrance = clearedSearch || clearedAll || recoveredResults;

        setAnimate(replayEntrance);
        if (replayEntrance) setGridVersion((version) => version + 1);

        setParams((current) => {
            for (const [key, value] of Object.entries(patch)) {
                if (value) current.set(key, value);
                else current.delete(key);
            }

            return current;
        }, { replace: true, preventScrollReset: true });
    };

    const resetFilters = () => setFilters(NO_FILTERS);

    const artists = [...new Set(allAlbums.map((album) => album.artist_name))].sort(byName);
    const types = [...new Set(allAlbums.map((album) => album.type))].sort();
    const languages = [...new Set(allAlbums.map((album) => album.language).filter((language): language is string => !!language))].sort();

    // Counts as if that option were picked: the other filters and the search still apply.
    const countWith = (patch: Partial<AlbumFilters>) => filterAlbums(allAlbums, { ...filters, ...patch, sort: "" }).length;
    const activeCount = [filters.artist, filters.type, filters.lang, filters.sort].filter(Boolean).length;

    const applied: AppliedFilter[] = [];

    if (filters.artist) applied.push({ key: "artist", label: filters.artist, onRemove: () => setFilters({ artist: "" }) });
    if (filters.type) applied.push({ key: "type", label: shortType(filters.type), onRemove: () => setFilters({ type: "" }) });
    if (filters.lang) applied.push({ key: "lang", label: filters.lang, onRemove: () => setFilters({ lang: "" }) });
    if (filters.sort) applied.push({ key: "sort", label: ALBUM_SORTS[filters.sort], onRemove: () => setFilters({ sort: "" }) });
    if (filters.q) applied.push({ key: "q", label: `"${filters.q}"`, onRemove: () => setFilters({ q: "" }) });

    const result = `${albums.length === allAlbums.length ? "All " : ""}${albums.length} ${albums.length === 1 ? "album" : "albums"}`;

    return (
        <>
            <PageMeta
                title="K-pop albums in KpopIt: every cover from Pixelated"
                description={`Browse all ${allAlbums.length} K-pop albums in KpopIt's Pixelated mode by artist, type and language, with release years and discographies.`}
                path="/albums"
            />

            <PageShell width="max-w-295">
                {/* Title and totals */}
                <header
                    className={cn(
                        "pp-enter [--pp-anim:puffSide] [--pp-delay:80ms] flex items-end justify-between flex-wrap gap-x-5 gap-y-3 pt-8.5",
                        "@max-[580px]:flex-col @max-[580px]:items-start @max-[580px]:gap-x-3 @max-[580px]:gap-y-0.5 @max-[580px]:pt-4.5",
                    )}
                >
                    <div className="flex items-center gap-4">
                        <PuffTitle className="text-[64px] @max-[580px]:text-5xl tracking-[-.01em]">Albums</PuffTitle>
                        <KoreanTag>앨범</KoreanTag>
                    </div>

                    <span className="pb-2 @max-[580px]:pb-0 font-medium text-[13px] text-(--muted)">
                        {`${allAlbums.length} albums · ${artists.length} artists`}
                    </span>
                </header>

                {/* Search and filters */}
                <div className="pp-enter [--pp-delay:160ms] relative z-10 flex items-center flex-wrap gap-x-2.5 gap-y-3 @max-[580px]:gap-2 mt-8.5 @max-[580px]:mt-6">
                    <SearchField
                        value={filters.q}
                        onChange={(q) => setFilters({ q })}
                        placeholder="Search an album or artist..."
                        label="Search albums or artists"
                    />

                    <FiltersToggle open={filtersOpen} activeCount={activeCount} onToggle={() => setFiltersOpen(!filtersOpen)} />

                    <div
                        className={cn(
                            "contents @max-[580px]:flex @max-[580px]:flex-wrap @max-[580px]:gap-2 @max-[580px]:basis-full @max-[580px]:mt-0.5",
                            "@max-[580px]:origin-top-right @max-[580px]:animate-[puffMenu_0.4s_var(--ease-settle)_both]",
                            !filtersOpen && "@max-[580px]:hidden",
                        )}
                    >
                        <FilterMenu
                            title="ARTIST"
                            minWidth="104px"
                            label={filters.artist || "Artist"}
                            value={filters.artist}
                            onPick={(artist) => setFilters({ artist })}
                            options={[
                                { value: "", label: "All artists", count: countWith({ artist: "" }) },
                                ...artists.map((artist) => ({ value: artist, label: artist, count: countWith({ artist }) })),
                            ]}
                        />

                        <FilterMenu
                            title="TYPE"
                            minWidth="92px"
                            label={filters.type ? shortType(filters.type) : "Type"}
                            value={filters.type}
                            onPick={(type) => setFilters({ type })}
                            options={[
                                { value: "", label: "All types", count: countWith({ type: "" }) },
                                ...types.map((type) => ({ value: type, label: type, count: countWith({ type }) })),
                            ]}
                        />

                        <FilterMenu
                            title="LANGUAGE"
                            minWidth="128px"
                            label={filters.lang || "Language"}
                            value={filters.lang}
                            icon={filters.lang ? <Flag language={filters.lang} small /> : undefined}
                            onPick={(lang) => setFilters({ lang })}
                            options={[
                                { value: "", label: "Any language", count: countWith({ lang: "" }) },
                                ...languages.map((lang) => ({
                                    value: lang,
                                    label: lang,
                                    icon: <Flag language={lang} />,
                                    count: countWith({ lang }),
                                })),
                            ]}
                        />

                        <FilterMenu
                            title="SORT BY"
                            minWidth="96px"
                            align="right"
                            label={filters.sort ? `Sort: ${ALBUM_SORTS[filters.sort]}` : "Sort"}
                            value={filters.sort}
                            onPick={(sort) => setFilters({ sort: sort as AlbumFilters["sort"] })}
                            options={Object.entries(ALBUM_SORTS).map(([value, label]) => ({ value, label }))}
                        />
                    </div>
                </div>

                <AppliedFilters filtersOpen={filtersOpen} result={result} filters={applied} onClearAll={resetFilters} />

                {/* The cards */}
                {albums.length > 0 ? (
                    <section
                        key={`${hydrated}-${gridVersion}`}
                        aria-label="Albums catalogue"
                        className={cn(
                            "grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-x-7 gap-y-9 pt-2.5 pr-2 pb-5.5 pl-0.5",
                            "@max-[580px]:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] @max-[580px]:gap-x-3.5 @max-[580px]:gap-y-5.5",
                            "@max-[580px]:pt-1.5 @max-[580px]:pr-1.5 @max-[580px]:pb-4.5",
                            "@max-[359px]:grid-cols-[repeat(auto-fill,minmax(122px,1fr))] @max-[359px]:gap-x-2.5 @max-[359px]:gap-y-4.5",
                            !hydrated && "invisible",
                        )}
                    >
                        {albums.map((album, index) => (
                            <AlbumCard key={album.id} album={album} index={index} animate={animate} />
                        ))}
                    </section>
                ) : (
                    <ListEmptyState title="No albums found..." search={filters.q} onReset={resetFilters} />
                )}

                <footer className="flex justify-between flex-wrap gap-x-5 gap-y-2 mt-2.5 pt-4 border-t-[1.5px] border-(--rule) font-medium text-[11px] text-(--muted)">
                    <span>KpopIt</span>
                    <span>{`${allAlbums.length} albums from the KpopIt catalogue`}</span>
                </footer>
            </PageShell>
        </>
    );
};

export default AlbumsList;
