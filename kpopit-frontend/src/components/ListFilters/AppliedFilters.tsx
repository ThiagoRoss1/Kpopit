import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export interface AppliedFilter {
    key: string;
    label: string;
    onRemove: () => void;
}

interface AppliedFiltersProps {
    /** "All 209 idols", "12 albums"... */
    result: string;
    filters: AppliedFilter[];
    onClearAll: () => void;
    /** On phones the open filters panel hides the chips (they'd repeat it). */
    filtersOpen: boolean;
}

/** The line under the filters: the result count, a removable chip per filter in use, and
 *  "Clear all" when more than one is on. */
const AppliedFilters = ({ result, filters, onClearAll, filtersOpen }: AppliedFiltersProps) => {
    const hiddenOnPhones = filtersOpen && "@max-[580px]:hidden";

    return (
        <div
            className={cn(
                "pp-enter [--pp-delay:220ms] flex items-center flex-wrap gap-x-2.5 gap-y-2 min-h-16.5 @max-[580px]:min-h-12 py-1.5",
                "font-medium text-xs text-(--muted)",
            )}
        >
            <span aria-live="polite" className="mr-1">{result}</span>

            {filters.map((filter) => (
                <button
                    key={filter.key}
                    type="button"
                    onClick={filter.onRemove}
                    aria-label={`Remove ${filter.label}`}
                    className={cn(
                        "pp-focus inline-flex items-center gap-1.5 h-7.5 pr-2.25 pl-3",
                        "rounded-full border-[1.5px] border-(--ink) bg-(--chip) text-(--chip-ink)",
                        "font-semibold text-xs cursor-pointer",
                        "shadow-[1.5px_2px_0_var(--ctl-off),var(--in)] active:shadow-[0_0_0_var(--ctl-off),var(--in)]",
                        "animate-[puffMenu_0.35s_var(--ease-pop)_both]",
                        "transition-[translate,background-color,box-shadow] duration-380 ease-(--ease-settle) transform-gpu",
                        "hover:-translate-y-0.5 hover:bg-(--chip-hover) active:translate-0.5",
                        hiddenOnPhones,
                    )}
                >
                    <span>{filter.label}</span>
                    <X className="size-3" strokeWidth={3} aria-hidden />
                </button>
            ))}

            {filters.length > 1 && (
                <button
                    type="button"
                    onClick={onClearAll}
                    className={cn(
                        "pp-focus px-0.5 py-1.5 border-0 bg-transparent cursor-pointer",
                        "font-semibold text-xs text-(--text) underline decoration-(--side) decoration-2 underline-offset-4",
                        hiddenOnPhones,
                    )}
                >
                    Clear all
                </button>
            )}
        </div>
    );
};

export default AppliedFilters;
