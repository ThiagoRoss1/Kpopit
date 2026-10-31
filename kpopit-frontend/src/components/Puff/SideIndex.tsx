import { cn } from "../../lib/utils";
import HScrollRow from "./HScrollRow";
import "./puff.css";

export interface IndexItem {
    id: string;
    label: string;
}

const number = (i: number) => String(i + 1).padStart(2, "0");

/** Sticky "On this page" list beside the content; above 900px only (pair with IndexChips). */
export function SideIndex({ items, active, onPick }: { items: IndexItem[]; active: string; onPick: (id: string) => void }) {
    return (
        <nav aria-label="On this page" className="pp-enter [--pp-anim:puffSide] [--pp-delay:160ms] sticky top-[80px] flex flex-col gap-1.5 @max-[900px]:hidden">
            <span className="font-semibold text-[10px] tracking-[.14em] text-(--muted) px-1 pb-1.5">ON THIS PAGE</span>
            {items.map((item, i) => {
                const on = item.id === active;
                return (
                    <a
                        key={item.id}
                        href={`#${item.id}`}
                        aria-current={on ? "location" : undefined}
                        onClick={(e) => { e.preventDefault(); onPick(item.id); }}
                        className={cn(
                            "pp-focus flex items-center gap-2.5 px-3 py-2 rounded-[14px] border-2 no-underline text-(--text) font-semibold text-sm transition-[background-color,border-color,transform] duration-300 active:translate-x-0.5 active:translate-y-0.5",
                            on ? "border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]" : "border-transparent hover:bg-(--chip) hover:border-(--ink) hover:translate-x-1",
                        )}
                    >
                        <span className="font-bold text-[11px] text-(--group)">{number(i)}</span>
                        {item.label}
                    </a>
                );
            })}
        </nav>
    );
}

/** The same index as a sideways chip row, at 900px and below. */
export function IndexChips({ items, active, onPick }: { items: IndexItem[]; active: string; onPick: (id: string) => void }) {
    return (
        <HScrollRow aria-label="On this page" className="hidden @max-[900px]:flex gap-2 -mx-7 px-7 @max-[580px]:-mx-4 @max-[580px]:px-4 pt-0.5 pb-2">
            {items.map((item, i) => {
                const on = item.id === active;
                return (
                    <button
                        key={item.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onPick(item.id)}
                        data-hover="chip"
                        className={cn(
                            "pp-press pp-focus flex-none h-[38px] px-3.5 flex items-center gap-1.5 rounded-full border-2 border-(--ink) font-bold text-[13px] cursor-pointer",
                            on ? "bg-[#FF8AC4] text-[#1A1418] [--pp-in:var(--in-pink)]" : "bg-(--chip) text-(--chip-ink)",
                        )}
                    >
                        <span className={cn("font-bold text-[10px]", on ? "text-[#1A1418]" : "text-(--group)")}>{number(i)}</span>
                        {item.label}
                    </button>
                );
            })}
        </HScrollRow>
    );
}
