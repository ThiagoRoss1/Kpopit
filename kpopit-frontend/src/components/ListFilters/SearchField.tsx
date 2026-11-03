import { Search, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface SearchFieldProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
    className?: string;
}

/** The list search: a rounded field that lifts while focused, an icon that tilts and a clear
 *  button that spins in once there is text. */
const SearchField = ({ value, onChange, placeholder, label, className }: SearchFieldProps) => {
    const hasText = value !== "";

    return (
        <label
            className={cn(
                "group flex items-center gap-2.5 h-12.5 pr-1.5 pl-4",
                "flex-[1_1_0%] max-w-100 min-w-[min(240px,100%)]",
                "@max-[580px]:flex-[1_1_calc(100%-60px)] @max-[580px]:min-w-0 @max-[580px]:max-w-full @max-[580px]:h-11.5 @max-[580px]:mb-0.5",
                "rounded-[18px] border-2 border-(--ink) bg-(--chip) text-(--chip-ink)",
                "shadow-[4px_5px_0_var(--ctl-off),var(--in)] focus-within:shadow-[6px_7px_0_var(--ctl-off),var(--in)]",
                "transition-[translate,box-shadow] duration-400 ease-(--ease-settle) transform-gpu",
                "focus-within:-translate-x-px focus-within:-translate-y-0.5",
                className,
            )}
        >
            <Search
                aria-hidden
                className="flex-none size-4.5 transition-transform duration-450 ease-(--ease-pop) group-focus-within:-rotate-12 group-focus-within:scale-110"
                strokeWidth={2.6}
            />

            <input
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                aria-label={label}
                className={cn(
                    "flex-1 min-w-0 h-full m-0 p-0 border-0 outline-none appearance-none bg-transparent text-inherit",
                    "font-medium text-[15px] leading-[1.35] text-ellipsis placeholder:text-(--muted)",
                    "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none",
                    "[&::-webkit-search-decoration]:hidden [&::-webkit-search-decoration]:appearance-none",
                )}
            />

            <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChange("")}
                aria-label="Clear search"
                tabIndex={hasText ? 0 : -1}
                className={cn(
                    "pp-focus flex-none grid place-items-center size-9 rounded-xl border-0 bg-transparent text-inherit cursor-pointer",
                    "transition-opacity duration-200 ease-out transform-gpu",
                    "hover:bg-(--chip-hover)",
                    hasText ? "opacity-100" : "opacity-0 pointer-events-none",
                )}
            >
                <X
                    className={cn(
                        "size-4 transition-[rotate,scale] duration-400 ease-(--ease-pop) transform-gpu",
                        hasText ? "rotate-0 scale-100" : "-rotate-90 scale-50",
                    )}
                    strokeWidth={3}
                />
            </button>
        </label>
    );
};

export default SearchField;
