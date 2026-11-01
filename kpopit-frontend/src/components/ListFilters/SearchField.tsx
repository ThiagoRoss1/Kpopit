import { Search, X } from "lucide-react";
import { cn } from "../../lib/utils";
import "./listFilters.css";

/** Catalogue search: rounded field with an icon that tilts on focus and a clear button. */
export default function SearchField({ value, onChange, placeholder, label, className }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
    className?: string;
}) {
    return (
        <label className={cn("cg-search flex-[1_1_var(--cg-search-basis)] max-w-(--cg-search-max) min-w-[min(240px,100%)] mb-[var(--cg-search-mb,0px)] flex items-center gap-2.5 h-(--cg-search-h) pr-1.5 pl-4 rounded-[18px] bg-(--chip) text-(--chip-ink) border-2 border-(--ink) [box-shadow:4px_5px_0_var(--ctl-off),var(--in)]", className)}>
            <Search aria-hidden className="cg-sicon flex-none w-[18px] h-[18px]" strokeWidth={2.6} />
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={label}
                className="flex-1 min-w-0 h-full m-0 p-0 border-0 outline-none appearance-none bg-transparent text-inherit font-medium text-[15px] leading-[1.35] text-ellipsis placeholder:text-(--muted)"
            />
            <button
                type="button"
                onClick={() => onChange("")}
                aria-label="Clear search"
                tabIndex={value ? 0 : -1}
                className="cg-clear cg-focus flex-none grid place-items-center w-9 h-9 border-0 bg-transparent text-inherit rounded-[12px] cursor-pointer"
                style={{ opacity: value ? 1 : 0, pointerEvents: value ? "auto" : "none", rotate: value ? "0deg" : "-90deg", scale: value ? "1" : ".5" }}
            >
                <X className="w-4 h-4" strokeWidth={3} />
            </button>
        </label>
    );
}
