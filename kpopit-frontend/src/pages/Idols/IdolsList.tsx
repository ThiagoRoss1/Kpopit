import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { SlidersHorizontal } from "lucide-react";
import PageShell from "../../components/PageShell/PageShell";
import PuffTitle from "../../components/PageShell/PuffTitle";
import PageLoader from "../../components/Loading/PageLoader";
import SearchField from "../../components/ListFilters/SearchField";
import FilterMenu from "../../components/ListFilters/FilterMenu";
import AppliedFilters, { type AppliedFilter } from "../../components/ListFilters/AppliedFilters";
import PageMeta from "../../components/Seo/PageMeta";
import { useHydrated } from "../../hooks/useHydrated";
import { getNationalityFlag } from "../../utils/getFlags";
import type { IdolsPageData } from "../../interfaces/gameInterfaces";
import { IDOL_SORTS, SOLOIST, filterIdols, groupLabel, idolsListQuery, nationalities, readIdolFilters, type IdolFilters } from "./idolsData";
import IdolsCards from "../../components/IdolsPageCards/IdolsCards";

const NO_FILTERS: IdolFilters = { q: "", group: "", nat: "", company: "", sort: "" };

// The entrance plays once per visit: coming back to the list shows it as it was left.
let cardsIntroPlayed = false;

const Flag = ({ nationality, small }: { nationality: string; small?: boolean }) => {
    const src = getNationalityFlag(nationality);
    return src ? <img src={src} alt="" className={small ? "w-[21px] h-[15px] flex-none rounded-[3px] border-[1.5px] border-[#1A1418] object-cover bg-[#1A1418]" : "w-6 h-[17px] flex-none rounded-[3px] border-[1.5px] border-[#1A1418] object-cover bg-[#1A1418]"} /> : null;
};

// initialIdols: build-time data for the prerendered page; stale at once, so it refetches.
export default function IdolsList({ initialIdols }: { initialIdols?: IdolsPageData[] }) {
    const { data, isError, refetch } = useQuery({ ...idolsListQuery, initialData: initialIdols, initialDataUpdatedAt: 0, refetchOnWindowFocus: false });
    // The route hands the page its list; this only shows if the cache lost it.
    if (!data) return <PageLoader message="Loading Idols Data..." error={isError} errorMessage="Error fetching idols data." onRetry={() => refetch()} />;
    return <IdolsCatalogue all={data} />;
}

function IdolsCatalogue({ all }: { all: IdolsPageData[] }) {
    const hydrated = useHydrated();
    const [params, setParams] = useSearchParams();
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [animate] = useState(() => !cardsIntroPlayed);
    useEffect(() => {
        cardsIntroPlayed = true;
    }, []);
    // The prerendered list is unfiltered; the URL's filters apply once the page is live.
    const f = hydrated ? readIdolFilters(params) : NO_FILTERS;
    const idols = filterIdols(all, f);

    const set = (patch: Partial<IdolFilters>) =>
        setParams((p) => {
            for (const [k, v] of Object.entries(patch)) {
                if (v) p.set(k, v);
                else p.delete(k);
            }
            return p;
        }, { replace: true, preventScrollReset: true });
    const reset = () => set(NO_FILTERS);

    const groups = [...new Set(all.map(groupLabel))].sort((a, b) => (a === SOLOIST ? 1 : b === SOLOIST ? -1 : a.localeCompare(b)));
    const nats = [...new Set(all.flatMap(nationalities))].sort((a, b) => a.localeCompare(b));
    const companies = [...new Set(all.map((i) => i.company_name).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b));
    // Counts as if that option were picked: the other filters and the search still apply.
    const countWith = (patch: Partial<IdolFilters>) => filterIdols(all, { ...f, ...patch, sort: "" }).length;
    const activeCount = [f.group, f.nat, f.company, f.sort].filter(Boolean).length;

    const chips: AppliedFilter[] = [];
    if (f.group) chips.push({ key: "group", label: f.group, onRemove: () => set({ group: "" }) });
    if (f.nat) chips.push({ key: "nat", label: f.nat, onRemove: () => set({ nat: "" }) });
    if (f.company) chips.push({ key: "company", label: f.company, onRemove: () => set({ company: "" }) });
    if (f.sort) chips.push({ key: "sort", label: `Sort: ${IDOL_SORTS[f.sort]}`, onRemove: () => set({ sort: "" }) });
    if (f.q) chips.push({ key: "q", label: `"${f.q}"`, onRemove: () => set({ q: "" }) });

    return (
        <>
            <PageMeta
                title="K-pop idols in KpopIt: every idol in the daily game"
                description={`Browse all ${all.length} K-pop idols in KpopIt's daily guessing game by group, nationality and company, with profiles and careers.`}
                path="/idols"
            />
            <PageShell width="max-w-[1180px]">
                <div className="cg-inner">
                    <header className="cg-head pp-enter [--pp-anim:puffSide] [--pp-delay:80ms] flex items-end justify-between flex-wrap gap-(--cg-hd-gap) pt-(--cg-head-pt)">
                        <div className="flex items-center gap-4">
                            <PuffTitle className="text-(length:--cg-title-fs) tracking-[-.01em]">Idols</PuffTitle>
                            <span lang="ko" className="cg-ko flex-none whitespace-nowrap font-korean font-bold text-sm leading-none text-(--chip-ink) bg-(--chip) border-2 border-(--ink) rounded-[10px] px-[9px] py-1.5 [box-shadow:2px_3px_0_var(--ctl-off)] rotate-3">아이돌</span>
                        </div>
                        <span className="font-medium text-[13px] text-(--muted) pb-(--cg-cnt-pb)">{`${all.length} idols · ${groups.filter((g) => g !== SOLOIST).length} groups + soloists`}</span>
                    </header>

                    <div className="cg-ctls pp-enter [--pp-delay:160ms] relative z-10 flex items-center flex-wrap gap-(--cg-ctl-gap) mt-(--cg-ctl-mt)" data-fopen={filtersOpen ? "1" : "0"}>
                        <SearchField value={f.q} onChange={(q) => set({ q })} placeholder="Search idols, groups..." label="Search idols, groups or companies" />
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
                            <FilterMenu title="GROUP" minWidth="104px" label={f.group || "Group"} value={f.group} onPick={(group) => set({ group })}
                                options={[{ value: "", label: "All groups", count: countWith({ group: "" }) }, ...groups.map((g) => ({ value: g, label: g, count: countWith({ group: g }) }))]} />
                            <FilterMenu title="NATIONALITY" minWidth="142px" label={f.nat || "Nationality"} value={f.nat} icon={f.nat ? <Flag nationality={f.nat} small /> : undefined} onPick={(nat) => set({ nat })}
                                options={[{ value: "", label: "Anywhere", count: countWith({ nat: "" }) }, ...nats.map((n) => ({ value: n, label: n, icon: <Flag nationality={n} />, count: countWith({ nat: n }) }))]} />
                            <FilterMenu title="COMPANY" minWidth="128px" label={f.company || "Company"} value={f.company} onPick={(company) => set({ company })}
                                options={[{ value: "", label: "All companies", count: countWith({ company: "" }) }, ...companies.map((c) => ({ value: c, label: c, count: countWith({ company: c }) }))]} />
                            <FilterMenu title="SORT BY" minWidth="92px" align="right" label={f.sort ? `Sort: ${IDOL_SORTS[f.sort]}` : "Sort"} value={f.sort} onPick={(sort) => set({ sort: sort as IdolFilters["sort"] })}
                                options={Object.entries(IDOL_SORTS).map(([value, label]) => ({ value, label }))} />
                        </div>
                    </div>

                    <AppliedFilters
                        filtersOpen={filtersOpen}
                        result={`${idols.length === all.length ? "All " : ""}${idols.length} ${idols.length === 1 ? "idol" : "idols"}`}
                        chips={chips}
                        onClearAll={reset}
                    />

                    {idols.length > 0 ? (
                        <section aria-label="Idols catalogue" className="grid grid-cols-[repeat(auto-fill,minmax(var(--cg-grid-min),1fr))] gap-(--cg-grid-gap) p-(--cg-grid-pad)">
                            {idols.map((idol, i) => <IdolsCards key={idol.id} idol={idol} index={i} animate={animate} />)}
                        </section>
                    ) : (
                        <div className="pp-enter min-h-[340px] grid place-content-center justify-items-center text-center gap-3.5">
                            <div className="font-bold text-[34px] leading-[1.15] text-white [text-shadow:var(--puff-empty)] -rotate-[1.5deg] puff-ink pr-1.5 pb-2 pl-1">No idols found...</div>
                            <div className="font-medium text-sm text-(--muted)">{f.q ? `No matches for "${f.q}" with these filters.` : "No matches with these filters."}</div>
                            <button type="button" onClick={reset} className="cg-press cg-focus mt-2 h-[46px] px-[22px] rounded-full border-2 border-(--ink) bg-(--tag) text-white [text-shadow:var(--tag-text)] font-bold text-sm cursor-pointer [box-shadow:3px_4px_0_var(--ink),var(--in-pink)]">
                                Clear search & filters
                            </button>
                        </div>
                    )}

                    <footer className="flex justify-between flex-wrap gap-x-5 gap-y-2 mt-2.5 pt-4 border-t-[1.5px] border-(--rule) font-medium text-[11px] text-(--muted)">
                        <span>KpopIt</span>
                        <span>{`${all.length} idols from the KpopIt catalogue`}</span>
                    </footer>
                </div>
            </PageShell>
        </>
    );
}
