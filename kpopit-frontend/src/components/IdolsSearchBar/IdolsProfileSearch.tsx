import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import { cn } from "../../lib/utils";
import type { IdolsPageData } from "../../interfaces/gameInterfaces";
import { buildIdolSlug } from "../../utils/formatters";
import { groupLabel, prefetchIdolProfile } from "../../pages/Idols/idolsData";

// Like the old search: up to 20 matches, five rows visible and a scrollbar for the rest.
const MAX_RESULTS = 20;

interface IdolsProfileSearchProps {
    idols: IdolsPageData[];
    currentId: number;
}

const matchesFirst = (term: string) => (first: IdolsPageData, second: IdolsPageData) => {
    const firstStarts = first.artist_name.toLowerCase().startsWith(term);
    const secondStarts = second.artist_name.toLowerCase().startsWith(term);

    return Number(!firstStarts) - Number(!secondStarts) || first.artist_name.localeCompare(second.artist_name);
};

/** The skewed search bar on an idol's page: type to list idols by name, group or company and jump
 *  to one; "/" focuses it from anywhere on the page. */
const IdolsProfileSearch = ({ idols, currentId }: IdolsProfileSearchProps) => {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const handleSlash = (event: KeyboardEvent) => {
            const target = (event.target as HTMLElement | null)?.tagName ?? "";
            if (event.key !== "/" || /input|textarea|select/i.test(target)) return;

            event.preventDefault();
            inputRef.current?.focus();
        };

        document.addEventListener("keydown", handleSlash);

        return () => document.removeEventListener("keydown", handleSlash);
    }, []);

    // Keyboard navigation keeps the highlighted row inside the scrolled list.
    useEffect(() => {
        optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }, [activeIndex]);

    const term = query.trim().toLowerCase();

    const results = term
        ? idols
            .filter((idol) => `${idol.artist_name} ${idol.all_groups ?? ""} ${idol.company_name ?? ""}`.toLowerCase().includes(term))
            .sort(matchesFirst(term))
            .slice(0, MAX_RESULTS)
        : [];

    const isListOpen = isFocused && term !== "";

    const pickIdol = (idol: IdolsPageData) => {
        setQuery("");
        setIsFocused(false);
        inputRef.current?.blur();
        navigate(`/idols/${idol.id}/${buildIdolSlug(idol.artist_name, idol.group_name)}`);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();

            const step = event.key === "ArrowDown" ? 1 : -1;
            setActiveIndex((index) => (results.length ? (index + step + results.length) % results.length : 0));
        } else if (event.key === "Enter" && results[activeIndex]) {
            pickIdol(results[activeIndex]);
        } else if (event.key === "Escape") {
            inputRef.current?.blur();
        }
    };

    return (
        <div className="relative min-w-0 w-full">
            {/* Room around the bar for its shadow (the wrapper clips the skew) */}
            <div className="flex overflow-hidden pt-1 pr-2.5 pb-2.5 pl-2 -mt-1 -mr-2.5 -mb-2.5 -ml-2">
                <label
                    className={cn(
                        "flex items-center box-border h-12 ml-auto overflow-hidden -skew-x-6 backface-hidden",
                        "bg-(--chip) border-[2.5px] shadow-[4px_5px_0_#1A1418]",
                        "transition-[width,box-shadow,border-color] duration-450 ease-(--ease-settle)",
                        "focus-within:border-[#1A1418] focus-within:shadow-[4px_5px_0_#FF8AC4]",
                        isListOpen ? "w-full border-[#1A1418]" : "w-[min(100%,420px)] @max-[561px]:w-full border-[#FF8AC4]",
                    )}
                >
                    <span className="grid place-items-center w-12.5 self-stretch bg-[#1A1418]">
                        <Search aria-hidden className="size-4.75 text-[#FF8AC4] skew-x-6 -rotate-8" strokeWidth={3} />
                    </span>

                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActiveIndex(0);
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={handleKeyDown}
                        placeholder="Idol, group or company..."
                        aria-label="Search idols, groups or companies"
                        role="combobox"
                        aria-expanded={isListOpen}
                        aria-controls="idol-search-results"
                        aria-autocomplete="list"
                        className={cn(
                            "flex-1 min-w-0 h-full pr-3.5 pl-4 border-0 outline-0 bg-transparent skew-x-6",
                            "font-semibold text-[15px] text-(--chip-ink) text-ellipsis",
                        )}
                    />

                    <span
                        aria-hidden
                        className={cn(
                            "flex-none grid place-items-center min-w-6.5 h-6.5 px-1.5 mr-3 skew-x-6 -rotate-4 @max-[561px]:hidden",
                            "rounded-[7px] border-2 border-[#1A1418] bg-[#FFE3F1] shadow-[1.5px_2px_0_#1A1418]",
                            "font-bold text-[13px] leading-none text-[#1A1418]",
                        )}
                    >
                        /
                    </span>
                </label>
            </div>

            {isListOpen && (
                <div
                    id="idol-search-results"
                    role="listbox"
                    aria-label="Idols"
                    className={cn(
                        "pp-scroll absolute z-40 top-[calc(100%+14px)] left-0 @max-[561px]:-left-15.5 right-0",
                        "flex flex-col gap-0.5 max-h-72.5 overflow-y-auto overflow-x-hidden p-1.5",
                        "bg-(--menu-bg) border-2 border-[#1A1418] shadow-[5px_5px_0_#FF8AC4,0_18px_40px_rgba(26,20,24,.18)]",
                        "origin-top animate-[puffMenu_0.34s_cubic-bezier(.34,1.4,.64,1)_backwards]",
                    )}
                >
                    {results.map((idol, index) => {
                        const isActive = index === activeIndex;

                        return (
                            <button
                                key={idol.id}
                                ref={(element) => { optionRefs.current[index] = element; }}
                                type="button"
                                role="option"
                                aria-selected={isActive}
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    pickIdol(idol);
                                }}
                                onMouseEnter={() => {
                                    setActiveIndex(index);
                                    prefetchIdolProfile(idol.id);
                                }}
                                className={cn(
                                    "flex-none flex items-center gap-3 w-full py-1.75 pr-3 pl-2 border-0 text-left cursor-pointer",
                                    "transition-[translate,background-color] duration-300 ease-(--ease-settle) transform-gpu",
                                    isActive ? "translate-x-1 bg-(--chip-hover)" : "bg-transparent",
                                )}
                            >
                                <img
                                    draggable={false}
                                    src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${idol.image_path}?v=${idol.image_version}`}
                                    alt=""
                                    className="flex-none size-10 object-cover shadow-[2px_2px_0_#1A1418]"
                                />

                                <span className="flex-1 flex flex-col gap-1 min-w-0">
                                    <span className="font-bold text-[15px] leading-[1.1] text-(--text) truncate">{idol.artist_name}</span>
                                    <span className="font-semibold text-xs leading-[1.2] text-(--muted) truncate">{groupLabel(idol)}</span>
                                </span>

                                {idol.id === currentId && (
                                    <span aria-label="Current idol" className="flex-none size-2 rounded-full bg-neon-pink" />
                                )}
                            </button>
                        );
                    })}

                    {results.length === 0 && (
                        <div className="py-4 px-3 font-medium text-sm text-center text-(--muted)">No idols found...</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default IdolsProfileSearch;
