import { CalendarDays, ChevronUp, Plus } from "lucide-react";
import { cn } from "../../lib/utils";
import type { CalendarMode } from "../../interfaces/gameInterfaces";
import MonthPicker, { type MonthKey } from "./MonthPicker";
import { MODES, MONTHS, formatShort, isDone, monthIndex, type CalendarDay } from "./calendarData";
import { DAY_FRAME, imageUrl } from "./calendarLooks";

export type TimelineOrder = "new" | "old";
export type OpenPicker = "month" | number | null;

type TimelineRowData =
    | { type: "month"; label: string }
    | { type: "gap"; size: number; index: number }
    | { type: "day"; day: CalendarDay };

interface TimelineViewProps {
    days: CalendarDay[];
    selected: string;
    mode: CalendarMode;
    order: TimelineOrder;
    setOrder: (order: TimelineOrder) => void;
    extra: number;
    setExtra: (extra: number) => void;
    openMonth: number | null;
    setOpenMonth: (month: number | null) => void;
    picker: OpenPicker;
    setPicker: (picker: OpenPicker) => void;
    first: string;
    today: string;
    monthNote: (month: MonthKey) => string;
    onPick: (date: string, mode: CalendarMode) => void;
}

const toMonthKey = (iso: string): MonthKey => ({ year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 });

const GAP_BUTTON = cn(
    "pp-focus flex items-center gap-1.5 py-1.75 px-3.5 rounded-full cursor-pointer",
    "border-2 border-dashed border-(--rule) bg-(--ground)",
    "font-semibold text-xs text-(--muted)",
    "transition-[translate,border-color,color] duration-450 ease-(--ease-settle) will-change-transform",
    "hover:-translate-y-0.5 hover:border-(--ink) hover:text-(--text)",
);

/** Builds the rows: the latest 9 days and the first 3 (more of either end with "Show 30 more"),
 *  plus a month opened in full, with a month heading on each change and a gap row between runs. */
const buildRows = (days: CalendarDay[], order: TimelineOrder, extra: number, openMonth: number | null) => {
    const shown = new Set<string>();
    const newestFirst = [...days].reverse();

    newestFirst.slice(0, 9 + (order === "new" ? extra : 0)).forEach((day) => shown.add(day.date));
    days.slice(0, 3 + (order === "old" ? extra : 0)).forEach((day) => shown.add(day.date));

    if (openMonth !== null) {
        days.filter((day) => monthIndex(day.date) === openMonth).forEach((day) => shown.add(day.date));
    }

    const list = days.filter((day) => shown.has(day.date));
    if (order === "new") list.reverse();

    const rows: TimelineRowData[] = [];
    let lastMonth = -1;
    let gapCount = 0;

    list.forEach((day, i) => {
        if (i > 0) {
            const previous = list[i - 1].date;
            const hidden = days.filter((other) => order === "new"
                ? other.date < previous && other.date > day.date
                : other.date > previous && other.date < day.date).length;

            if (hidden > 0) {
                rows.push({ type: "gap", size: hidden, index: gapCount++ });
                lastMonth = -1;
            }
        }

        const month = monthIndex(day.date);
        if (month !== lastMonth) {
            lastMonth = month;
            rows.push({ type: "month", label: `${MONTHS[month % 12].toUpperCase()} ${Math.floor(month / 12)}` });
        }

        rows.push({ type: "day", day });
    });

    return rows;
};

/** The timeline view: a list of days with a rail on wider screens, an order switch and the gaps. */
const TimelineView = ({
    days, selected, mode, order, setOrder, extra, setExtra, openMonth, setOpenMonth, picker, setPicker, first, today, monthNote, onPick,
}: TimelineViewProps) => {
    const rows = buildRows(days, order, extra, openMonth);
    const isExpanded = extra > 0 || openMonth !== null;

    let note = `Latest days and the first days of ${MODES.find((option) => option.id === mode)!.name}`;
    if (openMonth !== null) note = `Showing ${MONTHS[openMonth % 12]} ${Math.floor(openMonth / 12)} in full`;
    else if (extra > 0) note = order === "old" ? `Showing the first ${3 + extra} days` : `Showing the latest ${9 + extra} days`;

    return (
        <>
            <div className="flex @max-[581px]:flex-col-reverse flex-wrap items-center justify-between @max-[581px]:justify-center gap-x-3 gap-y-2.5">
                <div className="flex flex-wrap items-center justify-between @max-[581px]:justify-center gap-2.5 text-center">
                    <span className="font-medium text-[13px] text-(--muted)">{note}</span>

                    {isExpanded && (
                        <button type="button" className={GAP_BUTTON} onClick={() => { setExtra(0); setOpenMonth(null); setPicker(null); }}>
                            <ChevronUp className="size-3" strokeWidth={3} aria-hidden />
                            Show less
                        </button>
                    )}
                </div>

                <div
                    className={cn(
                        "relative grid grid-cols-2 p-0.75 @max-[581px]:w-full rounded-full",
                        "border-2 border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
                    )}
                >
                    <span
                        aria-hidden
                        className={cn(
                            "absolute top-0.75 bottom-0.75 left-0.75 w-[calc(50%-3px)] rounded-full",
                            "border-2 border-(--ink) bg-(--side) shadow-(--in-pink)",
                            "transition-[translate] duration-500 ease-(--ease-settle) will-change-transform",
                            order === "old" && "translate-x-full",
                        )}
                    />

                    {([["new", "Newest first"], ["old", "From Day 1"]] as const).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={order === value}
                            onClick={() => setOrder(value)}
                            className={cn(
                                "pp-focus relative z-1 flex items-center justify-center h-7.5 @max-[581px]:h-7 px-3.5 rounded-full cursor-pointer",
                                "font-bold text-xs whitespace-nowrap transition-colors duration-300",
                                order === value ? "text-[#1A1418]" : "text-(--chip-ink)",
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative flex flex-col gap-3">
                <div aria-hidden className="@max-[581px]:hidden absolute left-27.75 top-2 bottom-2 w-0.5 bg-(--rule)" />

                {rows.map((row, i) => {
                    if (row.type === "month") {
                        return (
                            <div key={`month-${row.label}-${i}`} className="calendar-enter relative flex items-center gap-3 pt-2 pb-0.5 pl-35 @max-[581px]:pl-0">
                                <span className="font-mono-display text-[17px] leading-none tracking-[.02em]">{row.label}</span>
                                <span className="flex-1 h-0.5 bg-(--text) opacity-55" />
                            </div>
                        );
                    }

                    if (row.type === "gap") {
                        return (
                            <div key={`gap-${row.index}`} className="calendar-enter relative flex flex-col gap-2.5 pl-35 @max-[581px]:pl-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-1 bg-(--ground) font-semibold text-xs text-(--muted)">{`${row.size} more days`}</span>

                                    <button type="button" className={GAP_BUTTON} onClick={() => { setExtra(extra + 30); setPicker(null); }}>
                                        <Plus className="size-3" strokeWidth={3} aria-hidden />
                                        {`Show ${Math.min(30, row.size)} more`}
                                    </button>

                                    <button
                                        type="button"
                                        className={GAP_BUTTON}
                                        aria-expanded={picker === row.index}
                                        onClick={() => setPicker(picker === row.index ? null : row.index)}
                                    >
                                        <CalendarDays className="size-3" strokeWidth={3} aria-hidden />
                                        Jump to a month
                                    </button>
                                </div>

                                {picker === row.index && (
                                    <MonthPicker
                                        min={toMonthKey(first)}
                                        max={toMonthKey(today)}
                                        value={openMonth !== null ? { year: Math.floor(openMonth / 12), month: openMonth % 12 } : undefined}
                                        note={monthNote}
                                        onClose={() => setPicker(null)}
                                        onPick={(month) => { setOpenMonth(month.year * 12 + month.month); setPicker(null); }}
                                    />
                                )}
                            </div>
                        );
                    }

                    return <TimelineRow key={row.day.date} day={row.day} selected={row.day.date === selected} mode={mode} onPick={onPick} />;
                })}
            </div>
        </>
    );
};

const ROW_CHIP_GROUND: Partial<Record<CalendarDay["kind"], string>> = {
    cal: "bg-(--chip-hover) text-(--face-ink)",
    started: "bg-(--side) text-[#1A1418]",
    today: "bg-neon-pink text-[#1A1418]",
};

const RAIL_DOT: Partial<Record<CalendarDay["kind"], string>> = {
    won: "bg-(--side)",
    cal: "bg-(--side)",
    today: "bg-neon-pink shadow-[2px_2px_0_#FF3399]",
    started: "bg-(--chip-hover)",
};

interface TimelineRowProps {
    day: CalendarDay;
    selected: boolean;
    mode: CalendarMode;
    onPick: (date: string, mode: CalendarMode) => void;
}

/** One day on the timeline: the day and date by the rail, then a card with the answer and a chip. */
const TimelineRow = ({ day, selected, mode, onPick }: TimelineRowProps) => {
    const isGuessed = isDone(day.kind);
    const noun = MODES.find((option) => option.id === mode)!.noun;
    const tries = day.entry?.guesses ?? 0;
    const triesLabel = `${tries} ${tries === 1 ? "try" : "tries"}`;

    let title = "Still a secret...";
    let subtitle = "not played";
    let chip = "Play";

    if (isGuessed) {
        title = day.entry?.answer_name ?? "";
        subtitle = `${triesLabel}${day.kind === "cal" ? " · from the calendar" : ""}`;
        chip = day.entry?.xp !== null && day.entry?.xp !== undefined ? `+${day.entry.xp} XP` : "Done";
    } else if (day.kind === "started") {
        subtitle = `${tries} so far, not finished`;
        chip = "Keep going";
    } else if (day.kind === "today") {
        title = `Today's ${noun}...`;
        subtitle = "counts for your streak";
        chip = "Play today";
    }

    return (
        <div
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={`Day ${day.no}, ${formatShort(day.date)}`}
            onClick={() => onPick(day.date, mode)}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onPick(day.date, mode);
                }
            }}
            className="calendar-enter pp-focus group/row relative grid grid-cols-[96px_32px_minmax(0,1fr)] @max-[581px]:grid-cols-[minmax(0,1fr)] items-center rounded-[18px] cursor-pointer"
        >
            <div className="grid @max-[581px]:hidden justify-items-end pr-3.5">
                <span className="font-bold text-xl leading-none">{`Day ${day.no}`}</span>
                <span className="font-medium text-[11px] text-(--muted)">{formatShort(day.date)}</span>
            </div>

            <span className={cn("@max-[581px]:hidden justify-self-center size-4 rounded-full border-2 border-(--ink) bg-(--face)", RAIL_DOT[day.kind])} />

            <div
                className={cn(
                    "flex items-center gap-3 min-w-0 ml-3 @max-[581px]:ml-0 py-2.5 pr-3.5 pl-2.5 rounded-[18px] bg-(--face) text-(--face-ink)",
                    "transition-[translate,box-shadow,border-color] duration-500 ease-(--ease-settle) transform-gpu",
                    selected
                        ? "translate-x-1 border-[2.5px] border-(--ink) shadow-[4px_5px_0_var(--ctl-off)]"
                        : cn(
                            DAY_FRAME[day.kind],
                            "group-hover/row:translate-x-1 group-active/row:translate-x-1.5 group-active/row:translate-y-0.5 group-active/row:duration-180",
                        ),
                )}
            >
                <div
                    className={cn(
                        "relative grid place-items-center flex-none size-13 overflow-hidden rounded-xl border-2 border-(--ink)",
                        isGuessed ? "bg-(--panel)" : day.kind === "today" ? "bg-neon-pink" : "bg-(--chip-hover)",
                    )}
                >
                    {isGuessed && day.entry?.image_path
                        ? <img draggable={false} src={imageUrl(day.entry.image_path)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                        : <span className="font-bold text-[22px] leading-none text-white text-shadow-(--puff-empty)">?</span>}
                </div>

                <div className="flex flex-col flex-1 gap-0.5 min-w-0">
                    <span className="font-bold text-base leading-[1.15] truncate">{title}</span>

                    <span className="font-medium text-xs leading-[1.3] text-(--muted) truncate">
                        <span className="hidden @max-[581px]:inline">{`Day ${day.no} · `}</span>
                        {subtitle}
                    </span>
                </div>

                <span
                    className={cn(
                        "flex-none py-1.25 px-3 rounded-full border-2 border-(--ink) font-bold text-xs whitespace-nowrap",
                        ROW_CHIP_GROUND[day.kind] ?? "bg-(--face) text-(--face-ink)",
                    )}
                >
                    {chip}
                </span>
            </div>
        </div>
    );
};

export default TimelineView;
