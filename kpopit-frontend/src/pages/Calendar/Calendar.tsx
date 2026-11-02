import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, List } from "lucide-react";
import PageShell from "../../components/PageShell/PageShell";
import PuffTitle from "../../components/PageShell/PuffTitle";
import PageLoader from "../../components/Loading/PageLoader";
import PageMeta from "../../components/Seo/PageMeta";
import { useSharedGameData } from "../../hooks/useSharedGameData";
import { useHydrated } from "../../hooks/useHydrated";
import { getCalendarTimeline } from "../../services/api";
import { cn } from "../../lib/utils";
import type { CalendarMode, CalendarTimeline } from "../../interfaces/gameInterfaces";
import MonthPicker, { type MonthKey } from "./MonthPicker";
import { DayCell, DotCell, Legend } from "./CalendarCells";
import DayPanel from "./DayPanel";
import TimelineView, { type OpenPicker, type TimelineOrder } from "./TimelineView";
import { CALENDAR_BUTTON } from "./calendarLooks";
import { MODES, MONTHS, addDays, dayOf, formatLong, isDone, monthIndex, parseMode, toT } from "./calendarData";
import "./calendar.css";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const WEEKDAYS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];

const toMonthKey = (iso: string): MonthKey => ({ year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 });
const monthStart = (month: number) => `${Math.floor(month / 12)}-${String((month % 12) + 1).padStart(2, "0")}-01`;
const monthName = (month: number) => `${MONTHS[month % 12]} ${Math.floor(month / 12)}`;
const isWon = (status: string) => status === "won_live" || status === "won_calendar";

const MONTH_ARROW = cn(
    CALENDAR_BUTTON,
    "grid place-items-center flex-none size-10 p-0 rounded-full",
    "bg-(--chip) text-(--chip-ink) shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
    "enabled:active:shadow-[0_0_0_var(--ctl-off),var(--in)]",
    "disabled:opacity-35 disabled:cursor-default",
);

const Calendar = () => {
    const { isInitialized } = useSharedGameData();
    const timeline = useQuery<CalendarTimeline>({ queryKey: ["calendarTimeline"], queryFn: getCalendarTimeline, enabled: isInitialized });
    const hydrated = useHydrated();

    if (!hydrated || !timeline.data) return <PageLoader error={timeline.isError} onRetry={() => timeline.refetch()} />;

    return <CalendarView data={timeline.data} />;
};

const CalendarView = ({ data }: { data: CalendarTimeline }) => {
    const [params, setParams] = useSearchParams();
    const mode = parseMode(params.get("mode"));
    const modeInfo = MODES.find((option) => option.id === mode)!;
    const days = data[mode];
    const byDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
    const first = days[0]?.date;
    const today = days.at(-1)?.date;

    const [view, setView] = useState<"month" | "timeline">("month");
    const [order, setOrder] = useState<TimelineOrder>("new");
    const [extra, setExtra] = useState(0);
    const [openMonth, setOpenMonth] = useState<number | null>(null);
    const [picker, setPicker] = useState<OpenPicker>(null);
    const [slide, setSlide] = useState<"left" | "right" | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    const askedDate = params.get("date");
    const selected = askedDate && first && today && askedDate >= first && askedDate <= today ? askedDate : today ?? "";
    const [shownMonth, setShownMonth] = useState<{ mode: CalendarMode; month: number } | null>(null);
    const month = shownMonth?.mode === mode ? shownMonth.month : monthIndex(selected || "1970-01-01");

    if (!first || !today) {
        return (
            <PageShell header={{ title: "Calendar", korean: "달력", subtitle: "No challenge days yet." }}>
                <div />
            </PageShell>
        );
    }

    const firstMonth = monthIndex(first);
    const lastMonth = monthIndex(today);
    const dayAt = (date: string) => dayOf(date, byDate, first, today);

    const select = (date: string, nextMode: CalendarMode = mode) => {
        setParams((current) => {
            current.set("mode", nextMode);
            current.set("date", date);
            return current;
        }, { replace: true, preventScrollReset: true });
    };

    const goToMonth = (next: number) => {
        const clamped = Math.max(firstMonth, Math.min(lastMonth, next));
        setSlide(clamped > month ? "right" : clamped < month ? "left" : null);
        setShownMonth({ mode, month: clamped });
    };

    const switchMode = (nextMode: CalendarMode) => {
        setShownMonth(null);
        setOpenMonth(null);
        setExtra(0);
        setPicker(null);
        setParams((current) => {
            current.set("mode", nextMode);
            current.delete("date");
            return current;
        }, { replace: true });
    };

    const guessedCount = days.filter((day) => isWon(day.status)).length;
    const percent = days.length ? Math.round((guessedCount / days.length) * 100) : 0;

    // Month grid: weeks start on Monday.
    const startIso = monthStart(month);
    const leadingBlanks = (new Date(toT(startIso)).getUTCDay() + 6) % 7;
    const monthLength = new Date(Date.UTC(Math.floor(month / 12), (month % 12) + 1, 0)).getUTCDate();
    const monthDays = Array.from({ length: monthLength }, (_, i) => dayAt(addDays(startIso, i)));
    const playedInMonth = monthDays.filter((day) => isDone(day.kind)).length;
    const openInMonth = monthDays.filter((day) => day.kind === "unplayed" || day.kind === "started").length;
    const slideClass = slide === "right" ? "calendar-from-right" : slide === "left" ? "calendar-from-left" : "";

    const onGridKey = (event: KeyboardEvent) => {
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
        if (step === undefined) return;

        event.preventDefault();
        let next = addDays(selected, step);
        if (next < first) next = first;
        if (next > today) next = today;

        select(next);
        if (monthIndex(next) !== month) goToMonth(monthIndex(next));

        // Both grids hold the day; focus the one that is showing.
        requestAnimationFrame(() => {
            const cells = gridRef.current?.parentElement?.querySelectorAll<HTMLElement>(`[data-date="${next}"]`) ?? [];
            [...cells].find((cell) => cell.offsetParent !== null)?.focus();
        });
    };

    const monthNote = (key: MonthKey) => {
        const index = key.year * 12 + key.month;
        const inMonth = days.filter((day) => monthIndex(day.date) === index);
        return `${inMonth.filter((day) => isWon(day.status)).length}/${inMonth.length}`;
    };

    return (
        <>
            <PageMeta
                title="KpopIt Calendar: play every daily K-pop puzzle you missed"
                description="Every past KpopIt day in Classic, Blurry and Pixelated: see the answers you found and play the days you missed."
                path="/calendar"
            />

            <PageShell width="max-w-295">
                <header className="pp-enter [--pp-anim:puffDrop] flex flex-col items-center gap-2.5 pt-7 pb-7.5 text-center">
                    <div className="flex items-center gap-3">
                        <PuffTitle className="pb-0 text-[60px] @max-[581px]:text-[42px] leading-none">Calendar</PuffTitle>

                        <span
                            lang="ko"
                            className={cn(
                                "@max-[360px]:hidden flex-none px-2.25 py-0.5 rounded-lg rotate-4 whitespace-nowrap",
                                "border-2 border-(--ink) bg-(--face) shadow-[2px_3px_0_var(--ctl-off)]",
                                "font-korean font-semibold text-xs text-(--face-ink)",
                            )}
                        >
                            달력
                        </span>
                    </div>

                    <span className="font-medium text-sm leading-[1.4] text-(--muted) text-pretty">
                        {`${guessedCount} of ${days.length} ${modeInfo.name.toLowerCase()} days guessed, back to Day 1 on ${formatLong(first)}`}
                    </span>

                    <div
                        role="progressbar"
                        aria-label="Days guessed"
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="relative w-[min(280px,100%)] h-3 overflow-hidden rounded-full border-2 border-(--ink) bg-(--panel) shadow-(--in)"
                    >
                        <div
                            className="calendar-fill-enter absolute inset-0 rounded-full bg-(--side) transition-[translate] duration-900 ease-(--ease-settle) transform-gpu"
                            style={{ translate: `${percent - 100}% 0` }}
                        />
                    </div>
                </header>

                <div className="pp-enter [--pp-anim:puffDrop] [--pp-delay:70ms] flex flex-wrap items-center gap-3 @max-[581px]:gap-2.5 mb-5.5">
                    <div role="tablist" aria-label="Game mode" className="flex flex-wrap flex-[1_1_auto] justify-start @max-[581px]:justify-center gap-2 @max-[581px]:gap-1.5">
                        {MODES.map((option) => {
                            const isOn = option.id === mode;

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isOn}
                                    onClick={() => switchMode(option.id)}
                                    className={cn(
                                        CALENDAR_BUTTON,
                                        "flex items-center h-10 @max-[581px]:h-8.5 px-4 @max-[581px]:px-3.25 rounded-full font-bold text-[13px]",
                                        isOn
                                            ? "bg-(--side) text-[#1A1418] shadow-[2px_3px_0_var(--ink),var(--in-pink)] active:shadow-[0_0_0_var(--ink),var(--in-pink)]"
                                            : "bg-(--chip) text-(--chip-ink) shadow-[2px_3px_0_var(--ctl-off),var(--in)] active:shadow-[0_0_0_var(--ctl-off),var(--in)]",
                                    )}
                                >
                                    {option.name}
                                </button>
                            );
                        })}
                    </div>

                    <div
                        role="tablist"
                        aria-label="View"
                        className={cn(
                            "relative grid grid-cols-2 flex-[0_0_260px] @max-[581px]:flex-[1_1_100%] p-1 @max-[581px]:p-0.75 rounded-full",
                            "border-2 border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
                        )}
                    >
                        <span
                            aria-hidden
                            className={cn(
                                "absolute inset-y-1 left-1 w-[calc(50%-4px)] @max-[581px]:inset-y-0.75 @max-[581px]:left-0.75 @max-[581px]:w-[calc(50%-3px)] rounded-full",
                                "border-2 border-(--ink) bg-(--side) shadow-(--in-pink)",
                                "transition-[translate] duration-500 ease-(--ease-settle) will-change-transform",
                                view === "timeline" && "translate-x-full",
                            )}
                        />

                        {([["month", "Month", CalendarDays], ["timeline", "Timeline", List]] as const).map(([value, label, Icon]) => (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                aria-selected={view === value}
                                onClick={() => { setView(value); setPicker(null); }}
                                className={cn(
                                    "pp-focus relative z-1 flex items-center justify-center gap-1.75 h-8.5 @max-[581px]:h-7.5 rounded-full cursor-pointer",
                                    "font-bold text-[13px] transition-colors duration-300",
                                    view === value ? "text-[#1A1418]" : "text-(--chip-ink)",
                                )}
                            >
                                <Icon className="size-3.5" strokeWidth={2.8} aria-hidden />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_340px] @max-[981px]:grid-cols-[minmax(0,1fr)] items-start gap-7">
                    <div className="relative flex flex-col gap-3.5 min-w-0">
                        {view === "month" ? (
                            <>
                                <div className="flex items-center gap-3">
                                    <button type="button" className={MONTH_ARROW} onClick={() => goToMonth(month - 1)} disabled={month <= firstMonth} aria-label="Previous month">
                                        <ChevronLeft className="size-4.5" strokeWidth={3} />
                                    </button>

                                    <button
                                        type="button"
                                        aria-haspopup="dialog"
                                        aria-expanded={picker === "month"}
                                        onClick={() => setPicker(picker === "month" ? null : "month")}
                                        className="pp-focus group/label flex flex-[1_1_auto] items-center gap-2 min-w-0 rounded-xl text-left cursor-pointer"
                                    >
                                        <span key={month} className={cn("font-bold text-2xl leading-none whitespace-nowrap", slideClass)}>{monthName(month)}</span>

                                        <ChevronDown
                                            className="size-4 transition-[translate] duration-400 ease-(--ease-pop) will-change-transform group-hover/label:translate-y-0.5"
                                            strokeWidth={3}
                                            aria-hidden
                                        />

                                        <span className="@max-[581px]:hidden ml-auto font-medium text-[13px] text-(--muted) whitespace-nowrap">
                                            {`${playedInMonth} guessed · ${openInMonth} open`}
                                        </span>
                                    </button>

                                    <button type="button" className={MONTH_ARROW} onClick={() => goToMonth(month + 1)} disabled={month >= lastMonth} aria-label="Next month">
                                        <ChevronRight className="size-4.5" strokeWidth={3} />
                                    </button>
                                </div>

                                {picker === "month" && (
                                    <div className="absolute z-20 top-13.5 left-0 flex w-full">
                                        <MonthPicker
                                            min={toMonthKey(first)}
                                            max={toMonthKey(today)}
                                            value={toMonthKey(startIso)}
                                            note={monthNote}
                                            onClose={() => setPicker(null)}
                                            onPick={(key) => { goToMonth(key.year * 12 + key.month); setPicker(null); }}
                                        />
                                    </div>
                                )}

                                <div
                                    ref={gridRef}
                                    key={`${mode}-${month}`}
                                    role="grid"
                                    aria-label={monthName(month)}
                                    onKeyDown={onGridKey}
                                    className={cn("grid @max-[581px]:hidden grid-cols-7 gap-3.5", slideClass)}
                                >
                                    {WEEKDAYS.map((weekday) => (
                                        <span key={weekday} className="font-semibold text-[11px] tracking-[.12em] text-center text-(--muted)">{weekday}</span>
                                    ))}

                                    {Array.from({ length: leadingBlanks }, (_, i) => <span key={`lead-${i}`} aria-hidden />)}

                                    {monthDays.map((day, i) => (
                                        <DayCell key={day.date} day={day} index={i} selected={day.date === selected} mode={mode} onPick={select} />
                                    ))}
                                </div>

                                <div
                                    role="grid"
                                    aria-label={monthName(month)}
                                    onKeyDown={onGridKey}
                                    className={cn(
                                        "hidden @max-[581px]:grid grid-cols-7 gap-1 py-3 px-2.5 rounded-[23px]",
                                        "border-2 border-(--ink) bg-(--face) shadow-[4px_4px_0_0_var(--side),4px_4px_0_2px_var(--ink)]",
                                    )}
                                >
                                    {WEEKDAYS_SHORT.map((weekday, i) => (
                                        <span key={i} className="pb-1 font-semibold text-[11px] text-center text-(--muted)">{weekday}</span>
                                    ))}

                                    {Array.from({ length: leadingBlanks }, (_, i) => <span key={`lead-${i}`} aria-hidden />)}

                                    {monthDays.map((day) => (
                                        <DotCell key={day.date} day={day} selected={day.date === selected} today={today} mode={mode} onPick={select} />
                                    ))}
                                </div>

                                <Legend />
                            </>
                        ) : (
                            <TimelineView
                                days={days.map((day) => dayAt(day.date))}
                                selected={selected}
                                mode={mode}
                                order={order}
                                setOrder={(next) => { setOrder(next); setExtra(0); setPicker(null); }}
                                extra={extra}
                                setExtra={setExtra}
                                openMonth={openMonth}
                                setOpenMonth={setOpenMonth}
                                picker={picker}
                                setPicker={setPicker}
                                first={first}
                                today={today}
                                monthNote={monthNote}
                                onPick={select}
                            />
                        )}
                    </div>

                    <DayPanel key={`${mode}-${selected}`} day={dayAt(selected)} mode={mode} />
                </div>
            </PageShell>
        </>
    );
};

export default Calendar;
