import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import "./puff.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface MonthKey {
    year: number;
    /** 0-based, like Date#getMonth. */
    month: number;
}

const index = ({ year, month }: MonthKey) => year * 12 + month;

/** "Jump to a month": a 4-column grid per year between `min` and `max` (inclusive). `note`
 *  writes the small line under a month (e.g. "12 days"); months outside the range are disabled. */
export default function MonthPicker({ min, max, value, onPick, onClose, note, title = "Jump to a month..." }: {
    min: MonthKey;
    max: MonthKey;
    value?: MonthKey;
    onPick: (month: MonthKey) => void;
    onClose: () => void;
    note?: (month: MonthKey) => string | undefined;
    title?: string;
}) {
    const years: number[] = [];
    for (let y = max.year; y >= min.year; y--) years.push(y);

    return (
        <div
            role="dialog"
            aria-label={title}
            className="pp-enter [--pp-anim:puffMenu] w-[min(360px,100%)] rounded-[20px] border-2 border-(--ink) bg-(--menu-bg) text-(--face-ink) shadow-[4px_5px_0_var(--ctl-off),var(--in)] p-4 flex flex-col gap-3.5"
        >
            <div className="flex items-center justify-between gap-2.5">
                <span className="font-bold text-base">{title}</span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="pp-press pp-focus grid place-items-center w-8 h-8 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) cursor-pointer"
                >
                    <X className="w-3 h-3" strokeWidth={3.5} />
                </button>
            </div>
            {years.map((year) => (
                <div key={year} className="flex flex-col gap-2">
                    <span className="font-semibold text-[11px] tracking-[.14em] text-(--muted)">{year}</span>
                    <div className="grid grid-cols-4 gap-1.5">
                        {MONTHS.map((label, month) => {
                            const key = { year, month };
                            const off = index(key) < index(min) || index(key) > index(max);
                            const current = !!value && index(value) === index(key);
                            const sub = off ? undefined : note?.(key);
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    disabled={off}
                                    aria-current={current ? "date" : undefined}
                                    onClick={() => onPick(key)}
                                    className={cn(
                                        "pp-focus h-[46px] rounded-[13px] border-2 flex flex-col items-center justify-center gap-0.5 transition-colors duration-300",
                                        off && "opacity-40 cursor-default border-transparent",
                                        !off && !current && "border-(--ink) bg-(--chip) cursor-pointer shadow-[2px_3px_0_var(--ctl-off)] hover:bg-(--chip-hover)",
                                        current && "border-(--ink) bg-[#FF8AC4] text-[#1A1418] cursor-pointer",
                                    )}
                                >
                                    <span className="font-bold text-[13px] leading-[1.1]">{label}</span>
                                    {sub && <span className={cn("font-medium text-[10px] leading-[1.2]", current ? "text-[#1A1418]" : "text-(--muted)")}>{sub}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
