import { Search, X } from "lucide-react";
import { cn } from "../../lib/utils";
import "./catalogue.css";

/** Puff search input with a clear button. */
export default function SearchField({ value, onChange, placeholder, label, className }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
    className?: string;
}) {
    return (
        <label className={cn("cg-search relative flex items-center h-[50px] @max-[580px]:h-[46px] rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) shadow-[4px_5px_0_var(--ctl-off),var(--in)]", className)}>
            <Search aria-hidden className="absolute left-4 w-[18px] h-[18px] text-(--muted)" strokeWidth={2.8} />
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={label}
                className="w-full h-full bg-transparent pl-11 pr-11 font-semibold text-[15px] outline-none placeholder:text-(--muted) text-ellipsis"
            />
            {value && (
                <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="pp-focus absolute right-2.5 grid place-items-center w-7 h-7 rounded-full hover:bg-(--chip-hover) cursor-pointer">
                    <X className="w-4 h-4" strokeWidth={3} />
                </button>
            )}
        </label>
    );
}
