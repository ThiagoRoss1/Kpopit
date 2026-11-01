import { cn } from "../../lib/utils";
import HScrollRow from "../HScrollRow/HScrollRow";

export interface IndexItem {
    id: string;
    label: string;
}

interface IndexProps {
    items: IndexItem[];
    active: string;
    onPick: (id: string) => void;
}

const sectionNumber = (index: number) => String(index + 1).padStart(2, "0");

/** Sticky "On this page" list beside the content; above 900px only (pair it with IndexChips). */
export const SideIndex = ({ items, active, onPick }: IndexProps) => {
    return (
        <nav
            aria-label="On this page"
            className="pp-enter [--pp-anim:puffSide] [--pp-delay:160ms] sticky top-20 flex flex-col gap-1.5 @max-[900px]:hidden"
        >
            <span className="px-1 pb-1.5 font-semibold text-[10px] tracking-[.14em] text-(--muted)">ON THIS PAGE</span>

            {items.map((item, index) => {
                const isActive = item.id === active;

                return (
                    <a
                        key={item.id}
                        href={`#${item.id}`}
                        aria-current={isActive ? "location" : undefined}
                        onClick={(event) => {
                            event.preventDefault();
                            onPick(item.id);
                        }}
                        className={cn(
                            "pp-focus flex items-center gap-2.5 px-3 py-2 rounded-[14px] border-2",
                            "font-semibold text-sm text-(--text) no-underline",
                            "transition-[background-color,border-color,translate] duration-300 ease-(--ease-settle) transform-gpu",
                            "active:translate-x-0.5 active:translate-y-0.5",
                            isActive
                                ? "border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]"
                                : "border-transparent hover:bg-(--chip) hover:border-(--ink) hover:translate-x-1",
                        )}
                    >
                        <span className="font-bold text-[11px] text-(--group)">{sectionNumber(index)}</span>
                        {item.label}
                    </a>
                );
            })}
        </nav>
    );
};

/** The same index as a sideways chip row, at 900px and below. */
export const IndexChips = ({ items, active, onPick }: IndexProps) => {
    return (
        <HScrollRow
            aria-label="On this page"
            className="hidden @max-[900px]:flex gap-2 -mx-7 px-7 @max-[580px]:-mx-4 @max-[580px]:px-4 pt-0.5 pb-2"
        >
            {items.map((item, index) => {
                const isActive = item.id === active;

                return (
                    <button
                        key={item.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => onPick(item.id)}
                        data-hover="chip"
                        className={cn(
                            "pp-press pp-focus flex-none flex items-center gap-1.5 h-9.5 px-3.5",
                            "rounded-full border-2 border-(--ink) font-bold text-[13px] cursor-pointer",
                            isActive ? "bg-[#FF8AC4] text-[#1A1418] [--pp-in:var(--in-pink)]" : "bg-(--chip) text-(--chip-ink)",
                        )}
                    >
                        <span className={cn("font-bold text-[10px]", isActive ? "text-[#1A1418]" : "text-(--group)")}>
                            {sectionNumber(index)}
                        </span>
                        {item.label}
                    </button>
                );
            })}
        </HScrollRow>
    );
};
