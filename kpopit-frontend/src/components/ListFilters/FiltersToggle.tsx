import { SlidersHorizontal } from "lucide-react";
import { cn } from "../../lib/utils";

interface FiltersToggleProps {
    open: boolean;
    activeCount: number;
    onToggle: () => void;
}

/** Phones only: the button that shows or hides the filter menus, pink with a count badge while
 *  any filter is on. */
const FiltersToggle = ({ open, activeCount, onToggle }: FiltersToggleProps) => {
    const isActive = activeCount > 0;

    const label = open
        ? "Hide filters"
        : isActive ? `Show filters, ${activeCount} active` : "Show filters";

    return (
        <button
            type="button"
            aria-expanded={open}
            aria-label={label}
            onClick={onToggle}
            className={cn(
                "pp-focus hidden @max-[580px]:grid place-items-center relative flex-[0_0_46px] size-11.5 mb-0.5 p-0",
                "rounded-2xl border-2 border-(--ink) cursor-pointer",
                "transition-[translate,box-shadow,background-color,color] duration-450 ease-(--ease-settle) transform-gpu",
                "active:translate-x-0.5 active:translate-y-0.75 active:duration-180",
                open && "translate-x-0.5 translate-y-0.75 bg-(--chip-hover) text-(--chip-ink) shadow-[0_0_0_var(--ctl-off),var(--in)]",
                !open && "hover:-translate-y-0.5",
                !open && isActive && "bg-(--side) text-[#1A1418] shadow-[2px_3px_0_var(--ctl-off),var(--in-pink)] hover:bg-[#FF9BCC] active:shadow-[0_0_0_var(--ctl-off),var(--in-pink)]",
                !open && !isActive && "bg-(--chip) text-(--chip-ink) shadow-[2px_3px_0_var(--ctl-off),var(--in)] hover:bg-(--chip-hover) active:shadow-[0_0_0_var(--ctl-off),var(--in)]",
            )}
        >
            <SlidersHorizontal className="size-4.5" strokeWidth={2.6} aria-hidden />

            {isActive && (
                <span
                    aria-hidden
                    className={cn(
                        "absolute -top-2 -right-2 grid place-items-center min-w-5.5 h-5.5 px-1.5",
                        "rounded-full border-2 border-[#1A1418] bg-[#FF3399] text-[#1A1418] shadow-[1px_1.5px_0_#1A1418]",
                        "font-bold text-[11px] leading-none",
                        "animate-[puffMenu_0.35s_var(--ease-pop)_both]",
                    )}
                >
                    {activeCount}
                </span>
            )}
        </button>
    );
};

export default FiltersToggle;
