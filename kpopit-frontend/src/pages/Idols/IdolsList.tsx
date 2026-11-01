import { useEffect, useState } from "react";
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
import IdolsCards from "../../components/IdolsPageCards/IdolsCards";
import PageMeta from "../../components/Seo/PageMeta";
import { useHydrated } from "../../hooks/useHydrated";
import { getNationalityFlag } from "../../utils/getFlags";
import type { IdolsPageData } from "../../interfaces/gameInterfaces";
import {
    IDOL_SORTS,
    SOLOIST,
    filterIdols,
    groupLabel,
    idolsListQuery,
    nationalities,
    readIdolFilters,
    type IdolFilters,
} from "./idolsData";

const NO_FILTERS: IdolFilters = { q: "", group: "", nat: "", company: "", sort: "" };

// The entrance plays once per visit: coming back to the list shows it as it was left.
let cardsIntroPlayed = false;

const byName = (first: string, second: string) => first.localeCompare(second);

const Flag = ({ nationality, small }: { nationality: string; small?: boolean }) => {
    const src = getNationalityFlag(nationality);
    if (!src) return null;

    return (
        <img
            src={src}
            alt=""
            className={cn(
                "flex-none rounded-[3px] border-[1.5px] border-[#1A1418] object-cover bg-[#1A1418]",
                small ? "w-5.25 h-3.75" : "w-6 h-4.25",
            )}
        />
    );
};

interface IdolsListProps {
    /** Build-time data for the prerendered page; stale at once, so it refetches. */
    initialIdols?: IdolsPageData[];
}

const IdolsList = ({ initialIdols }: IdolsListProps) => {
    const { data, isError, refetch } = useQuery({
        ...idolsListQuery,
        initialData: initialIdols,
        initialDataUpdatedAt: 0,
        refetchOnWindowFocus: false,
    });

    // The route hands the page its list; this only shows if the cache lost it.
    if (!data) {
        return (
            <PageLoader
                message="Loading Idols Data..."
                error={isError}
                errorMessage="Error fetching idols data."
                onRetry={() => refetch()}
            />
        );
    }

    return <IdolsCatalogue allIdols={data} />;
};

const IdolsCatalogue = ({ allIdols }: { allIdols: IdolsPageData[] }) => {
    const hydrated = useHydrated();
    const [params, setParams] = useSearchParams();
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [animate] = useState(() => !cardsIntroPlayed);

    useEffect(() => {
        cardsIntroPlayed = true;
    }, []);

    // The prerendered list is unfiltered; the URL's filters apply once the page is live.
    const filters = hydrated ? readIdolFilters(params) : NO_FILTERS;
    const idols = filterIdols(allIdols, filters);

    const setFilters = (patch: Partial<IdolFilters>) => {
        setParams((current) => {
            for (const [key, value] of Object.entries(patch)) {
                if (value) current.set(key, value);
                else current.delete(key);
            }

            return current;
        }, { replace: true, preventScrollReset: true });
    };

    const resetFilters = () => setFilters(NO_FILTERS);

    const groups = [...new Set(allIdols.map(groupLabel))].sort((first, second) => {
        if (first === SOLOIST) return 1;
        if (second === SOLOIST) return -1;

        return byName(first, second);
    });
    const allNationalities = [...new Set(allIdols.flatMap(nationalities))].sort(byName);
    const companies = [...new Set(allIdols.map((idol) => idol.company_name).filter((name): name is string => !!name))].sort(byName);

    // Counts as if that option were picked: the other filters and the search still apply.
    const countWith = (patch: Partial<IdolFilters>) => filterIdols(allIdols, { ...filters, ...patch, sort: "" }).length;
    const activeCount = [filters.group, filters.nat, filters.company, filters.sort].filter(Boolean).length;

    const applied: AppliedFilter[] = [];

    if (filters.group) applied.push({ key: "group", label: filters.group, onRemove: () => setFilters({ group: "" }) });
    if (filters.nat) applied.push({ key: "nat", label: filters.nat, onRemove: () => setFilters({ nat: "" }) });
    if (filters.company) applied.push({ key: "company", label: filters.company, onRemove: () => setFilters({ company: "" }) });
    if (filters.sort) applied.push({ key: "sort", label: `Sort: ${IDOL_SORTS[filters.sort]}`, onRemove: () => setFilters({ sort: "" }) });
    if (filters.q) applied.push({ key: "q", label: `"${filters.q}"`, onRemove: () => setFilters({ q: "" }) });

    const groupCount = groups.filter((group) => group !== SOLOIST).length;
    const result = `${idols.length === allIdols.length ? "All " : ""}${idols.length} ${idols.length === 1 ? "idol" : "idols"}`;

    return (
        <>
            <PageMeta
                title="K-pop idols in KpopIt: every idol in the daily game"
                description={`Browse all ${allIdols.length} K-pop idols in KpopIt's daily guessing game by group, nationality and company, with profiles and careers.`}
                path="/idols"
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
                        <PuffTitle className="text-[64px] @max-[580px]:text-5xl tracking-[-.01em]">Idols</PuffTitle>
                        <KoreanTag>아이돌</KoreanTag>
                    </div>

                    <span className="pb-2 @max-[580px]:pb-0 font-medium text-[13px] text-(--muted)">
                        {`${allIdols.length} idols · ${groupCount} groups + soloists`}
                    </span>
                </header>

                {/* Search and filters */}
                <div className="pp-enter [--pp-delay:160ms] relative z-10 flex items-center flex-wrap gap-x-2.5 gap-y-3 @max-[580px]:gap-2 mt-8.5 @max-[580px]:mt-6">
                    <SearchField
                        value={filters.q}
                        onChange={(q) => setFilters({ q })}
                        placeholder="Search idols, groups..."
                        label="Search idols, groups or companies"
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
                            title="GROUP"
                            minWidth="104px"
                            label={filters.group || "Group"}
                            value={filters.group}
                            onPick={(group) => setFilters({ group })}
                            options={[
                                { value: "", label: "All groups", count: countWith({ group: "" }) },
                                ...groups.map((group) => ({ value: group, label: group, count: countWith({ group }) })),
                            ]}
                        />

                        <FilterMenu
                            title="NATIONALITY"
                            minWidth="142px"
                            label={filters.nat || "Nationality"}
                            value={filters.nat}
                            icon={filters.nat ? <Flag nationality={filters.nat} small /> : undefined}
                            onPick={(nat) => setFilters({ nat })}
                            options={[
                                { value: "", label: "Anywhere", count: countWith({ nat: "" }) },
                                ...allNationalities.map((nat) => ({
                                    value: nat,
                                    label: nat,
                                    icon: <Flag nationality={nat} />,
                                    count: countWith({ nat }),
                                })),
                            ]}
                        />

                        <FilterMenu
                            title="COMPANY"
                            minWidth="128px"
                            label={filters.company || "Company"}
                            value={filters.company}
                            onPick={(company) => setFilters({ company })}
                            options={[
                                { value: "", label: "All companies", count: countWith({ company: "" }) },
                                ...companies.map((company) => ({ value: company, label: company, count: countWith({ company }) })),
                            ]}
                        />

                        <FilterMenu
                            title="SORT BY"
                            minWidth="92px"
                            align="right"
                            label={filters.sort ? `Sort: ${IDOL_SORTS[filters.sort]}` : "Sort"}
                            value={filters.sort}
                            onPick={(sort) => setFilters({ sort: sort as IdolFilters["sort"] })}
                            options={Object.entries(IDOL_SORTS).map(([value, label]) => ({ value, label }))}
                        />
                    </div>
                </div>

                <AppliedFilters filtersOpen={filtersOpen} result={result} filters={applied} onClearAll={resetFilters} />

                {/* The cards */}
                {idols.length > 0 ? (
                    <section
                        aria-label="Idols catalogue"
                        className={cn(
                            "grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-x-7 gap-y-9 pt-2.5 pr-2 pb-5.5 pl-0.5",
                            "@max-[580px]:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] @max-[580px]:gap-x-3.5 @max-[580px]:gap-y-5.5",
                            "@max-[580px]:pt-1.5 @max-[580px]:pr-1.5 @max-[580px]:pb-4.5",
                            "@max-[359px]:grid-cols-[repeat(auto-fill,minmax(122px,1fr))] @max-[359px]:gap-x-2.5 @max-[359px]:gap-y-4.5",
                        )}
                    >
                        {idols.map((idol, index) => (
                            <IdolsCards key={idol.id} idol={idol} index={index} animate={animate} />
                        ))}
                    </section>
                ) : (
                    <ListEmptyState title="No idols found..." search={filters.q} onReset={resetFilters} />
                )}

                <footer className="flex justify-between flex-wrap gap-x-5 gap-y-2 mt-2.5 pt-4 border-t-[1.5px] border-(--rule) font-medium text-[11px] text-(--muted)">
                    <span>KpopIt</span>
                    <span>{`${allIdols.length} idols from the KpopIt catalogue`}</span>
                </footer>
            </PageShell>
        </>
    );
};

export default IdolsList;
