import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import type { IdolsPageData } from "../../interfaces/gameInterfaces";
import { buildIdolSlug } from "../../utils/formatters";
import { groupLabel, prefetchIdolProfile } from "./idolsData";

const MAX_RESULTS = 5;

/** The skewed search bar: jumps to another idol's page; "/" focuses it from anywhere on the page. */
export default function IdolSearch({ idols, currentId }: { idols: IdolsPageData[]; currentId: number }) {
    const navigate = useNavigate();
    const input = useRef<HTMLInputElement>(null);
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);

    useEffect(() => {
        const onSlash = (e: KeyboardEvent) => {
            if (e.key !== "/" || /input|textarea|select/i.test((e.target as HTMLElement | null)?.tagName ?? "")) return;
            e.preventDefault();
            input.current?.focus();
        };
        document.addEventListener("keydown", onSlash);
        return () => document.removeEventListener("keydown", onSlash);
    }, []);

    const term = q.trim().toLowerCase();
    // Focus alone opens the list (the first idols); typing filters by name, group or company.
    const results = (term
        ? idols
            .filter((i) => `${i.artist_name} ${i.all_groups ?? ""} ${i.company_name ?? ""}`.toLowerCase().includes(term))
            .sort((a, b) => Number(!a.artist_name.toLowerCase().startsWith(term)) - Number(!b.artist_name.toLowerCase().startsWith(term)) || a.artist_name.localeCompare(b.artist_name))
        : idols
    ).slice(0, MAX_RESULTS);
    const show = open || term !== "";

    const pick = (idol: IdolsPageData) => {
        setQ("");
        setOpen(false);
        input.current?.blur();
        navigate(`/idols/${idol.id}/${buildIdolSlug(idol.artist_name, idol.group_name)}`);
    };

    return (
        <div className="relative min-w-0 w-full">
            <div className="overflow-hidden pt-1 pr-2.5 pb-2.5 pl-2 -mt-1 -mr-2.5 -mb-2.5 -ml-2 flex">
                <label
                    className="ip-sb flex items-center box-border h-12 ml-auto overflow-hidden bg-(--chip) border-[2.5px] border-[#FF8AC4] [box-shadow:4px_5px_0_#1A1418] -skew-x-6 [backface-visibility:hidden]"
                    style={{ width: show ? "100%" : "min(100%, 420px)" }}
                >
                    <span className="grid place-items-center w-[50px] self-stretch bg-[#1A1418]">
                        <Search aria-hidden className="w-[19px] h-[19px] text-[#FF8AC4] skew-x-6 -rotate-8" strokeWidth={3} />
                    </span>
                    <input
                        ref={input}
                        value={q}
                        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setOpen(false)}
                        onKeyDown={(e) => {
                            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                                e.preventDefault();
                                const step = e.key === "ArrowDown" ? 1 : -1;
                                setActive((a) => (results.length ? (a + step + results.length) % results.length : 0));
                            } else if (e.key === "Enter" && results[active]) {
                                pick(results[active]);
                            } else if (e.key === "Escape") {
                                setOpen(false);
                            }
                        }}
                        placeholder="Idol, group or company..."
                        aria-label="Search idols, groups or companies"
                        role="combobox"
                        aria-expanded={show}
                        aria-controls="ip-results"
                        aria-autocomplete="list"
                        className="ip-q flex-1 min-w-0 h-full border-0 outline-0 bg-transparent pr-3.5 pl-4 font-semibold text-[15px] text-(--chip-ink) skew-x-6"
                    />
                    <span aria-hidden className="ip-slash flex-none mr-3 skew-x-6 -rotate-4 grid place-items-center min-w-[26px] h-[26px] px-1.5 rounded-[7px] border-2 border-[#1A1418] bg-[#FFE3F1] text-[#1A1418] font-bold text-[13px] leading-none [box-shadow:1.5px_2px_0_#1A1418]">/</span>
                </label>
            </div>
            {show && (
                <div id="ip-results" role="listbox" aria-label="Idols"
                    className="ip-in-drop absolute z-40 top-[calc(100%+14px)] left-(--dd-l) right-0 flex flex-col gap-0.5 p-1.5 bg-(--menu-bg) border-2 border-[#1A1418] [box-shadow:5px_5px_0_#FF8AC4,0_18px_40px_rgba(26,20,24,.18)] overflow-hidden origin-top">
                    {results.map((idol, k) => (
                        <button
                            key={idol.id}
                            type="button"
                            role="option"
                            aria-selected={k === active}
                            data-active={k === active ? "1" : "0"}
                            onMouseDown={(e) => { e.preventDefault(); pick(idol); }}
                            onMouseEnter={() => { setActive(k); prefetchIdolProfile(idol.id); }}
                            className="ip-opt flex items-center gap-3 w-full py-[7px] pr-3 pl-2 border-0 bg-transparent text-left cursor-pointer"
                        >
                            <img src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${idol.image_path}?v=${idol.image_version}`} alt="" className="flex-none w-10 h-10 object-cover [box-shadow:2px_2px_0_#1A1418]" />
                            <span className="flex-1 flex flex-col gap-1 min-w-0">
                                <span className="font-bold text-[15px] leading-[1.1] text-(--text) whitespace-nowrap overflow-hidden text-ellipsis">{idol.artist_name}</span>
                                <span className="font-semibold text-xs leading-[1.2] text-(--muted) whitespace-nowrap overflow-hidden text-ellipsis">{groupLabel(idol)}</span>
                            </span>
                            {idol.id === currentId && <span aria-label="Current idol" className="flex-none w-2 h-2 rounded-full bg-[#FF3399]" />}
                        </button>
                    ))}
                    {results.length === 0 && <div className="py-4 px-3 font-medium text-sm text-(--muted) text-center">No idols found...</div>}
                </div>
            )}
        </div>
    );
}
