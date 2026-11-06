import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface MonthKey {
    year: number;
    /** 0-based, like Date#getMonth. */
    month: number;
}

interface MonthPickerProps {
    min: MonthKey;
    max: MonthKey;
    value?: MonthKey;
    onPick: (month: MonthKey) => void;
    onClose: () => void;
    note?: (month: MonthKey) => string | undefined;
    title?: string;
}

const monthIndex = ({ year, month }: MonthKey) => year * 12 + month;

/** "Jump to a month": a 4-column grid per year between `min` and `max` (inclusive). `note` writes
 *  the small line under a month (e.g. "12 days"); months outside the range are disabled. */
const MonthPicker = ({ min, max, value, onPick, onClose, note, title = "Jump to a month..." }: MonthPickerProps) => {
    const years: number[] = [];

    for (let year = max.year; year >= min.year; year--) {
        years.push(year);
    }

    return (
        <div
            role="dialog"
            aria-label={title}
            className={cn(
                "pp-enter [--pp-anim:puffMenu] w-[min(360px,100%)] flex flex-col gap-3.5 p-4",
                "rounded-[20px] border-2 border-(--ink) bg-(--menu-bg) text-(--face-ink)",
                "shadow-[4px_5px_0_var(--ctl-off),var(--in)]",
            )}
        >
            <div className="flex items-center justify-between gap-2.5">
                <span className="font-bold text-base">{title}</span>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="pp-press pp-focus grid place-items-center size-8 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) cursor-pointer"
                >
                    <X className="size-3" strokeWidth={3.5} />
                </button>
            </div>

            {years.map((year) => (
                <div key={year} className="flex flex-col gap-2">
                    <span className="font-semibold text-[11px] tracking-[.14em] text-(--muted)">{year}</span>

                    <div className="grid grid-cols-4 gap-1.5">
                        {MONTH_LABELS.map((label, month) => {
                            const key = { year, month };
                            const outOfRange = monthIndex(key) < monthIndex(min) || monthIndex(key) > monthIndex(max);
                            const isCurrent = !!value && monthIndex(value) === monthIndex(key);
                            const subtitle = outOfRange ? undefined : note?.(key);

                            return (
                                <button
                                    key={label}
                                    type="button"
                                    disabled={outOfRange}
                                    aria-current={isCurrent ? "date" : undefined}
                                    onClick={() => onPick(key)}
                                    className={cn(
                                        "pp-focus flex flex-col items-center justify-center gap-0.5 h-11.5 rounded-[13px] border-2",
                                        "transition-colors duration-300",
                                        outOfRange && "opacity-40 cursor-default border-transparent",
                                        !outOfRange && !isCurrent && "border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off)] cursor-pointer hover:bg-(--chip-hover)",
                                        isCurrent && "border-(--ink) bg-[#FF8AC4] text-[#1A1418] cursor-pointer",
                                    )}
                                >
                                    <span className="font-bold text-[13px] leading-[1.1]">{label}</span>

                                    {subtitle && (
                                        <span className={cn("font-medium text-[10px] leading-[1.2]", isCurrent ? "text-[#1A1418]" : "text-(--muted)")}>
                                            {subtitle}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MonthPicker;
