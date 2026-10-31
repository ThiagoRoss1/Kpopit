import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import "../Puff/puff.css";
import "./catalogue.css";

export interface FilterOption {
    value: string;
    label: string;
    icon?: ReactNode;
    count?: number;
}

/** A pill that opens a list of options (one choice). Pink while a value is picked. */
export default function FilterMenu({ title, label, value, options, onPick, align = "left" }: {
    /** Small heading above the options (e.g. "TYPE"). */
    title: string;
    /** The button text (the picked value's label, or the filter's name). */
    label: string;
    value: string;
    options: FilterOption[];
    onPick: (value: string) => void;
    align?: "left" | "right";
}) {
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const active = value !== "";

    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("pointerdown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div ref={box} className="relative flex-none @max-[580px]:flex-[1_1_calc(50%-4px)]">
            <button
                type="button"
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={() => setOpen(!open)}
                data-hover={active ? undefined : "chip"}
                className={cn(
                    "pp-press pp-focus w-full h-10 pl-4 pr-3 inline-flex items-center justify-between gap-2 rounded-full border-2 border-(--ink) font-bold text-sm whitespace-nowrap cursor-pointer",
                    active ? "bg-[#FF8AC4] text-[#1A1418] [--pp-in:var(--in-pink)]" : "bg-(--chip) text-(--chip-ink)",
                )}
            >
                <span className="truncate">{label}</span>
                <ChevronDown className="cg-chev w-3.5 h-3.5 flex-none" strokeWidth={3} aria-hidden />
            </button>
            {open && (
                <div
                    role="listbox"
                    aria-label={title}
                    className={cn(
                        "pp-enter [--pp-anim:puffMenu] absolute z-40 top-[calc(100%+10px)] w-[240px] max-h-[320px] overflow-auto cg-scroll p-2 rounded-[20px] border-2 border-(--ink) bg-(--menu-bg) shadow-[3px_4px_0_var(--ctl-off),var(--in)] flex flex-col gap-1",
                        align === "right" ? "right-0" : "left-0",
                    )}
                >
                    <span className="px-2.5 pt-1 pb-1.5 font-semibold text-[10px] tracking-[.14em] text-(--muted)">{title}</span>
                    {options.map((o) => {
                        const on = o.value === value;
                        return (
                            <button
                                key={o.value || "all"}
                                type="button"
                                role="option"
                                aria-selected={on}
                                onClick={() => { onPick(o.value); setOpen(false); }}
                                className={cn(
                                    "cg-opt pp-focus flex items-center gap-2.5 h-10 px-2.5 rounded-[13px] border-2 text-left font-semibold text-sm cursor-pointer",
                                    on ? "border-(--ink) bg-[#FF8AC4] text-[#1A1418]" : "border-transparent text-(--chip-ink)",
                                )}
                            >
                                {o.icon}
                                <span className="flex-1 truncate">{o.label}</span>
                                {o.count !== undefined && <span className="font-bold text-[11px] text-(--muted)">{o.count}</span>}
                                {on && <Check className="w-4 h-4" strokeWidth={3} aria-hidden />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
