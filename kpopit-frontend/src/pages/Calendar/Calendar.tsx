import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, List, Lock, Plus } from "lucide-react";
import PageShell from "../../components/Puff/PageShell";
import PuffTitle from "../../components/Puff/PuffTitle";
import MonthPicker, { type MonthKey } from "../../components/Puff/MonthPicker";
import PageLoader from "../../components/Loading/PageLoader";
import PageMeta from "../../components/Seo/PageMeta";
import { useSharedGameData } from "../../hooks/useSharedGameData";
import { useHydrated } from "../../hooks/useHydrated";
import { getCalendarDay, getCalendarTimeline } from "../../services/api";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { cn } from "../../lib/utils";
import type { CalendarDayData, CalendarMode, CalendarTimeline } from "../../interfaces/gameInterfaces";
import {
    MODES, MONTHS, addDays, dayOf, formatLong, formatShort, isDone, monthIndex, parseMode, toT,
    type CalendarDay,
} from "./calendarData";
import "./calendar.css";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const WEEKDAYS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];
const STRIPES = "repeating-linear-gradient(45deg,rgba(255,138,196,.5) 0 5px,transparent 5px 10px)";
const STRIPES_SMALL = "repeating-linear-gradient(45deg,rgba(255,138,196,.7) 0 3px,transparent 3px 6px)";
const SIDE_DEPTH = "0 4px 0 0 var(--side),0 4px 0 2px var(--ink)";
const img = (path: string | null | undefined) => resolveCdnUrl(path ?? null) ?? "";

const monthKey = (iso: string): MonthKey => ({ year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 });
const monthStart = (mi: number) => `${Math.floor(mi / 12)}-${String((mi % 12) + 1).padStart(2, "0")}-01`;

export default function Calendar() {
    const { isInitialized } = useSharedGameData();
    const timeline = useQuery<CalendarTimeline>({ queryKey: ["calendarTimeline"], queryFn: getCalendarTimeline, enabled: isInitialized });
    const hydrated = useHydrated();
    if (!hydrated || !timeline.data) return <PageLoader error={timeline.isError} onRetry={() => timeline.refetch()} />;
    return <CalendarView data={timeline.data} />;
}

function CalendarView({ data }: { data: CalendarTimeline }) {
    const [params, setParams] = useSearchParams();
    const mode = parseMode(params.get("mode"));
    const modeInfo = MODES.find((m) => m.id === mode)!;
    const days = data[mode];
    const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
    const first = days[0]?.date;
    const today = days.at(-1)?.date;

    const [view, setView] = useState<"month" | "timeline">("month");
    const [order, setOrder] = useState<"new" | "old">("new");
    const [extra, setExtra] = useState(0);
    const [tlMonth, setTlMonth] = useState<number | null>(null);
    const [picker, setPicker] = useState<"month" | number | null>(null);
    const [slide, setSlide] = useState<"left" | "right" | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    const asked = params.get("date");
    const selected = asked && first && today && asked >= first && asked <= today ? asked : today ?? "";
    const [monthState, setMonth] = useState<{ mode: CalendarMode; mi: number } | null>(null);
    const mi = monthState?.mode === mode ? monthState.mi : monthIndex(selected || "1970-01-01");

    if (!first || !today) {
        return (
            <PageShell header={{ title: "Calendar", korean: "달력", subtitle: "No challenge days yet." }}>
                <div />
            </PageShell>
        );
    }

    const firstMi = monthIndex(first);
    const lastMi = monthIndex(today);
    const day = (date: string) => dayOf(date, byDate, first, today);
    const select = (date: string, nextMode: CalendarMode = mode) => {
        setParams((p) => {
            p.set("mode", nextMode);
            p.set("date", date);
            return p;
        }, { replace: true, preventScrollReset: true });
    };
    const goMonth = (next: number) => {
        const clamped = Math.max(firstMi, Math.min(lastMi, next));
        setSlide(clamped > mi ? "right" : clamped < mi ? "left" : null);
        setMonth({ mode, mi: clamped });
    };

    const doneCount = days.filter((d) => d.status === "won_live" || d.status === "won_calendar").length;
    const total = days.length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;

    // Month grid: weeks start on Monday.
    const startIso = monthStart(mi);
    const lead = (new Date(toT(startIso)).getUTCDay() + 6) % 7;
    const length = new Date(Date.UTC(Math.floor(mi / 12), (mi % 12) + 1, 0)).getUTCDate();
    const monthDays = Array.from({ length }, (_, i) => day(addDays(startIso, i)));
    const played = monthDays.filter((d) => isDone(d.kind)).length;
    const open = monthDays.filter((d) => d.kind === "unplayed" || d.kind === "started").length;

    const onGridKey = (e: KeyboardEvent) => {
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
        if (step === undefined) return;
        e.preventDefault();
        let next = addDays(selected, step);
        if (next < first) next = first;
        if (next > today) next = today;
        select(next);
        if (monthIndex(next) !== mi) goMonth(monthIndex(next));
        requestAnimationFrame(() => gridRef.current?.parentElement?.querySelector<HTMLElement>(`[data-date="${next}"]:not([hidden])`)?.focus());
    };

    const monthNote = (k: MonthKey) => {
        const index = k.year * 12 + k.month;
        const inMonth = days.filter((d) => monthIndex(d.date) === index);
        return `${inMonth.filter((d) => d.status === "won_live" || d.status === "won_calendar").length}/${inMonth.length}`;
    };

    return (
        <>
            <PageMeta
                title="KpopIt Calendar: play every daily K-pop puzzle you missed"
                description="Every past KpopIt day in Classic, Blurry and Pixelated: see the answers you found and play the days you missed."
                path="/calendar"
            />
            <PageShell width="max-w-[1180px]">
                <div className="cal-root">
                    <header className="pp-enter [--pp-anim:puffDrop] flex flex-col items-center gap-2.5 pt-1 pb-[30px] text-center">
                        <div className="flex items-center gap-3">
                            <PuffTitle className="text-(length:--title-fs) leading-none pb-0">Calendar</PuffTitle>
                            <span lang="ko" className="cal-ko flex-none whitespace-nowrap px-[9px] py-0.5 rounded-[8px] border-2 border-(--ink) bg-(--face) text-(--face-ink) font-korean font-semibold text-xs rotate-4 shadow-[2px_3px_0_var(--ctl-off)]">달력</span>
                        </div>
                        <span className="font-medium text-sm leading-[1.4] text-(--muted) [text-wrap:pretty]">
                            {`${doneCount} of ${total} ${modeInfo.name.toLowerCase()} days guessed, back to Day 1 on ${formatLong(first)}`}
                        </span>
                        <div role="progressbar" aria-label="Days guessed" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="relative w-[min(280px,100%)] h-3 rounded-full border-2 border-(--ink) bg-(--panel) overflow-hidden shadow-[var(--in)]">
                            <div className="cal-fill cal-fill-in absolute inset-0 rounded-full bg-(--side)" style={{ transform: `translate3d(${pct - 100}%,0,0)` }} />
                        </div>
                    </header>

                    <div className="pp-enter [--pp-anim:puffDrop] [--pp-delay:70ms] flex items-center flex-wrap gap-(--head-gap) mb-[22px]">
                        <div role="tablist" aria-label="Game mode" className="flex gap-(--mt-gap) flex-[1_1_auto] flex-wrap justify-(--mt-js)">
                            {MODES.map((m) => {
                                const on = m.id === mode;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={on}
                                        onClick={() => { setMonth(null); setTlMonth(null); setExtra(0); setPicker(null); setParams((p) => { p.set("mode", m.id); p.delete("date"); return p; }, { replace: true }); }}
                                        className="cal-btn cal-focus cursor-pointer h-(--mt-h) px-(--mt-px) flex items-center rounded-full border-2 border-(--ink) font-bold text-[13px]"
                                        style={{ background: on ? "var(--side)" : "var(--chip)", color: on ? "#1A1418" : "var(--chip-ink)", boxShadow: on ? "2px 3px 0 var(--ink),var(--in-pink)" : "2px 3px 0 var(--ctl-off),var(--in)" }}
                                    >
                                        {m.name}
                                    </button>
                                );
                            })}
                        </div>
                        <div role="tablist" aria-label="View" className="relative flex-(--sw-flex) grid grid-cols-2 p-(--sw-p) rounded-full border-2 border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]">
                            <span aria-hidden className="cal-slide cal-gpu absolute top-(--sw-p) bottom-(--sw-p) left-(--sw-p) w-[calc(50%-var(--sw-p))] rounded-full bg-(--side) border-2 border-(--ink) shadow-[var(--in-pink)]" style={{ transform: `translate3d(${view === "timeline" ? "100%" : "0%"},0,0)` }} />
                            {([["month", "Month", CalendarDays], ["timeline", "Timeline", List]] as const).map(([v, label, Icon]) => (
                                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => { setView(v); setPicker(null); }}
                                    className="cal-focus relative z-1 cursor-pointer h-(--sw-h) rounded-full flex items-center justify-center gap-[7px] font-bold text-[13px] transition-colors duration-300"
                                    style={{ color: view === v ? "#1A1418" : "var(--chip-ink)" }}>
                                    <Icon className="w-3.5 h-3.5" strokeWidth={2.8} aria-hidden />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-(--cols) gap-7 items-start">
                        <div className="relative min-w-0 flex flex-col gap-3.5">
                            {view === "month" ? (
                                <>
                                    <div className="flex items-center gap-3">
                                        <button type="button" className="cal-btn cal-focus flex-none grid place-items-center w-10 h-10 p-0 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) shadow-[2px_3px_0_var(--ctl-off),var(--in)] cursor-pointer disabled:opacity-35 disabled:cursor-default"
                                            onClick={() => goMonth(mi - 1)} disabled={mi <= firstMi} aria-label="Previous month">
                                            <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={3} />
                                        </button>
                                        <button type="button" className="cal-label cal-focus flex-[1_1_auto] min-w-0 flex items-center gap-2 rounded-[12px] cursor-pointer text-left"
                                            aria-haspopup="dialog" aria-expanded={picker === "month"} onClick={() => setPicker(picker === "month" ? null : "month")}>
                                            <span key={mi} className={cn("font-bold text-2xl leading-none whitespace-nowrap", slide === "right" ? "cal-from-right" : slide === "left" ? "cal-from-left" : "")}>{`${MONTHS[mi % 12]} ${Math.floor(mi / 12)}`}</span>
                                            <ChevronDown className="cal-chev w-4 h-4" strokeWidth={3} aria-hidden />
                                            <span className="[display:var(--mcount)] ml-auto font-medium text-[13px] text-(--muted) whitespace-nowrap">{`${played} guessed · ${open} open`}</span>
                                        </button>
                                        <button type="button" className="cal-btn cal-focus flex-none grid place-items-center w-10 h-10 p-0 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) shadow-[2px_3px_0_var(--ctl-off),var(--in)] cursor-pointer disabled:opacity-35 disabled:cursor-default"
                                            onClick={() => goMonth(mi + 1)} disabled={mi >= lastMi} aria-label="Next month">
                                            <ChevronRight className="w-[18px] h-[18px]" strokeWidth={3} />
                                        </button>
                                    </div>
                                    {picker === "month" && (
                                        <div className="absolute z-20 top-[54px] left-0 w-full flex">
                                            <MonthPicker min={monthKey(first)} max={monthKey(today)} value={monthKey(startIso)} note={monthNote} onClose={() => setPicker(null)}
                                                onPick={(k) => { goMonth(k.year * 12 + k.month); setPicker(null); }} />
                                        </div>
                                    )}

                                    <div ref={gridRef} role="grid" aria-label={`${MONTHS[mi % 12]} ${Math.floor(mi / 12)}`} onKeyDown={onGridKey} key={`${mode}-${mi}`}
                                        className={cn("[display:var(--tile)] grid-cols-[repeat(7,minmax(0,1fr))] gap-3.5", slide === "right" ? "cal-from-right" : slide === "left" ? "cal-from-left" : "")}>
                                        {WEEKDAYS.map((w) => <span key={w} className="text-center font-semibold text-[11px] tracking-[.12em] text-(--muted)">{w}</span>)}
                                        {Array.from({ length: lead }, (_, i) => <span key={`lead-${i}`} aria-hidden />)}
                                        {monthDays.map((d, i) => <DayCell key={d.date} d={d} index={i} selected={d.date === selected} mode={mode} onPick={select} />)}
                                    </div>
                                    <div role="grid" aria-label={`${MONTHS[mi % 12]} ${Math.floor(mi / 12)}`} onKeyDown={onGridKey}
                                        className="[display:var(--dotg)] grid-cols-[repeat(7,minmax(0,1fr))] gap-1 rounded-[23px] border-2 border-(--ink) bg-(--face) shadow-[4px_4px_0_0_var(--side),4px_4px_0_2px_var(--ink)] py-3 px-2.5">
                                        {WEEKDAYS_SHORT.map((w, i) => <span key={i} className="text-center font-semibold text-[11px] text-(--muted) pb-1">{w}</span>)}
                                        {Array.from({ length: lead }, (_, i) => <span key={`lead-${i}`} aria-hidden />)}
                                        {monthDays.map((d) => <DotCell key={d.date} d={d} selected={d.date === selected} today={today} mode={mode} onPick={select} />)}
                                    </div>
                                    <Legend />
                                </>
                            ) : (
                                <TimelineView days={days.map((d) => day(d.date))} selected={selected} mode={mode} order={order} setOrder={(o) => { setOrder(o); setExtra(0); setPicker(null); }}
                                    extra={extra} setExtra={setExtra} tlMonth={tlMonth} setTlMonth={setTlMonth} picker={picker} setPicker={setPicker}
                                    first={first} today={today} monthNote={monthNote} onPick={select} />
                            )}
                        </div>

                        <DayPanel key={`${mode}-${selected}`} d={day(selected)} mode={mode} />
                    </div>
                </div>
            </PageShell>
        </>
    );
}

function cellLook(kind: CalendarDay["kind"]) {
    return {
        won: { bd: "2px solid var(--ink)", bg: "var(--face)", sh: SIDE_DEPTH, tag: "" },
        cal: { bd: "2px solid var(--ink)", bg: "var(--face)", sh: SIDE_DEPTH, tag: "calendar" },
        started: { bd: "2px solid var(--ink)", bg: "var(--face)", sh: "none", tag: "keep going" },
        unplayed: { bd: "2px solid var(--rule)", bg: "var(--face)", sh: "none", tag: "play" },
        today: { bd: "2px solid #FF3399", bg: "var(--face)", sh: "2px 3px 0 #FF3399", tag: "today" },
        future: { bd: "2px dashed var(--rule)", bg: "transparent", sh: "none", tag: "" },
        pre: { bd: "2px solid transparent", bg: "transparent", sh: "none", tag: "" },
    }[kind];
}

const KIND_WORD: Record<CalendarDay["kind"], string> = {
    won: "guessed live", cal: "played from the calendar", started: "started, not finished", unplayed: "not played", today: "today", future: "locked", pre: "",
};

function DayCell({ d, index, selected, mode, onPick }: { d: CalendarDay; index: number; selected: boolean; mode: CalendarMode; onPick: (date: string, mode: CalendarMode) => void }) {
    const look = cellLook(d.kind);
    const off = d.kind === "pre" || d.kind === "future";
    const done = isDone(d.kind);
    const n = Number(d.date.slice(8, 10));
    return (
        <button
            type="button"
            data-date={d.date}
            data-sel={selected ? "1" : "0"}
            data-live={off ? "0" : "1"}
            disabled={off}
            tabIndex={selected ? 0 : -1}
            aria-pressed={selected}
            aria-label={off ? `${formatShort(d.date)}, ${d.kind === "future" ? "locked" : "no challenge"}` : `${formatShort(d.date)}, Day ${d.no}, ${KIND_WORD[d.kind]}${done && d.entry?.answer_name ? `, ${d.entry.answer_name}` : ""}`}
            onClick={() => onPick(d.date, mode)}
            className="cal-cell cal-focus cal-in cal-gpu relative aspect-[1/1.08] rounded-[16px] flex flex-col p-[7px] gap-[5px] text-(--face-ink) disabled:cursor-default cursor-pointer"
            style={{
                border: selected ? "2.5px solid var(--ink)" : look.bd,
                background: look.bg,
                boxShadow: selected ? "3px 5px 0 var(--ctl-off)" : look.sh,
                opacity: d.kind === "pre" ? 0.35 : 1,
                transform: selected ? `translate3d(0,-4px,0) rotate(${n % 2 ? "-" : ""}1.6deg)` : undefined,
                animationDelay: `${Math.min(260 + index * 18, 900)}ms`,
            }}
        >
            <div className="flex items-center justify-between">
                <span className="font-bold text-sm leading-none">{n}</span>
                <span className="font-semibold text-[10px] tracking-[.04em] text-(--muted)">{d.no ? `#${d.no}` : ""}</span>
            </div>
            <div
                className="relative flex-1 rounded-[10px] overflow-hidden grid place-items-center"
                style={{
                    border: done ? "2px solid var(--ink)" : 0,
                    background: done ? "var(--panel)" : d.kind === "today" ? "rgba(255,51,153,.12)" : d.kind === "started" ? "var(--face)" : off ? "transparent" : "var(--opt-hover)",
                    backgroundImage: d.kind === "started" ? STRIPES : "none",
                }}
            >
                {done && d.entry?.image_path && <img src={img(d.entry.image_path)} alt="" loading="lazy" className="absolute -top-px -left-px w-[calc(100%+2px)] h-[calc(100%+2px)] max-w-none block object-cover" />}
                {(d.kind === "unplayed" || d.kind === "started" || d.kind === "today") && (
                    <span className="font-bold text-[22px] leading-none" style={{ color: d.kind === "today" ? "#FF3399" : "var(--muted)" }}>?</span>
                )}
                {d.kind === "future" && <Lock className="w-4 h-4 text-(--muted)" strokeWidth={2.6} aria-hidden />}
                {d.kind === "cal" && (
                    <span className="absolute right-[3px] bottom-[3px] w-5 h-5 rounded-full bg-[#FFFDFA] border-2 border-[#1A1418] grid place-items-center">
                        <CalendarCheck className="w-2.5 h-2.5 text-[#1A1418]" strokeWidth={3} aria-hidden />
                    </span>
                )}
            </div>
            <span className="font-semibold text-[10px] leading-[1.35] text-center whitespace-nowrap overflow-hidden text-ellipsis pb-px"
                style={{ color: d.kind === "today" ? "var(--group)" : done ? "var(--face-ink)" : "var(--muted)" }}>
                {done ? d.entry?.answer_name ?? "" : look.tag}
            </span>
        </button>
    );
}

function DotCell({ d, selected, today, mode, onPick }: { d: CalendarDay; selected: boolean; today: string; mode: CalendarMode; onPick: (date: string, mode: CalendarMode) => void }) {
    const off = d.kind === "pre" || d.kind === "future";
    const done = isDone(d.kind);
    const isToday = d.date === today;
    return (
        <button
            type="button"
            data-date={d.date}
            data-sel={selected ? "1" : "0"}
            data-live={off ? "0" : "1"}
            disabled={off}
            tabIndex={selected ? 0 : -1}
            aria-pressed={selected}
            aria-label={off ? formatShort(d.date) : `${formatShort(d.date)}, Day ${d.no}, ${KIND_WORD[d.kind]}`}
            onClick={() => onPick(d.date, mode)}
            className="cal-cell cal-dot cal-focus h-[50px] flex flex-col items-center justify-center gap-[3px] rounded-[12px] disabled:cursor-default cursor-pointer"
            style={{
                opacity: d.kind === "pre" ? 0.35 : 1,
                background: selected ? "var(--chip-hover)" : "transparent",
                border: selected ? "2px solid var(--ink)" : isToday ? "2px solid #FF3399" : "2px solid transparent",
                boxShadow: selected ? "2px 3px 0 var(--ctl-off)" : "none",
                transform: selected ? "translate3d(0,-2px,0)" : undefined,
            }}
        >
            <div className="relative w-8 h-8 rounded-full overflow-hidden grid place-items-center"
                style={{
                    border: done || d.kind === "started" ? "2px solid var(--ink)" : d.kind === "unplayed" || d.kind === "today" ? "2px solid var(--rule)" : "2px solid transparent",
                    background: done ? "var(--panel)" : d.kind === "today" ? "rgba(255,51,153,.12)" : off ? "transparent" : "var(--face)",
                    backgroundImage: d.kind === "started" ? STRIPES_SMALL : "none",
                }}>
                {done && d.entry?.image_path && <img src={img(d.entry.image_path)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
                <span className="relative font-bold text-xs leading-none" style={{ color: done ? "#fff" : d.kind === "future" ? "var(--muted)" : "var(--face-ink)", textShadow: done ? "0 0 2px #1A1418,0 1px 2px #1A1418,1px 0 2px #1A1418" : "none" }}>
                    {Number(d.date.slice(8, 10))}
                </span>
            </div>
            {d.kind === "cal" ? <CalendarCheck className="w-2.5 h-2.5 text-(--face-ink)" strokeWidth={3} aria-hidden /> : <span className="w-1.5 h-1.5 rounded-full" style={{ background: isToday ? "#FF3399" : "transparent" }} />}
        </button>
    );
}

function Legend() {
    const square = (bd: string, sh: string, bi = "none", badge = false) => (
        <span className="relative w-4 h-4 rounded-[5px] bg-(--face)" style={{ border: bd, boxShadow: sh, backgroundImage: bi }}>
            {badge && <span className="absolute -right-1 -bottom-1 w-2 h-2 rounded-full border-[1.5px] border-(--ink) bg-(--face)" />}
        </span>
    );
    const items: [string, ReturnType<typeof square>][] = [
        ["Guessed live", square("2px solid var(--ink)", "0 2px 0 0 var(--side),0 2px 0 2px var(--ink)")],
        ["From the calendar", square("2px solid var(--ink)", "0 2px 0 0 var(--side),0 2px 0 2px var(--ink)", "none", true)],
        ["Started, not finished", square("2px solid var(--ink)", "none", "repeating-linear-gradient(45deg,rgba(255,138,196,.6) 0 3px,transparent 3px 6px)")],
        ["Not played", square("2px solid var(--rule)", "none")],
        ["Today", square("2px solid #FF3399", "1.5px 2px 0 #FF3399")],
    ];
    return (
        <>
            <div className="[display:var(--lgd)] flex-wrap gap-x-[18px] gap-y-2.5 pt-1.5">
                {items.map(([k, swatch]) => <span key={k} className="flex items-center gap-2 font-medium text-xs text-(--muted)">{swatch}{k}</span>)}
            </div>
            <div className="[display:var(--lgm)] flex-wrap justify-center gap-x-3.5 gap-y-2 pt-1.5">
                {[["Guessed live", "2px solid var(--ink)", "var(--panel)", "none"], ["Started", "2px solid var(--ink)", "var(--face)", STRIPES_SMALL], ["Not played", "2px solid var(--rule)", "var(--face)", "none"]].map(([k, ring, bg, bi]) => (
                    <span key={k} className="flex items-center gap-1.5 font-medium text-xs text-(--muted)"><span className="w-3.5 h-3.5 rounded-full" style={{ border: ring, background: bg, backgroundImage: bi }} />{k}</span>
                ))}
                <span className="flex items-center gap-1.5 font-medium text-xs text-(--muted)"><CalendarCheck className="w-3 h-3" strokeWidth={3} aria-hidden />From the calendar</span>
                <span className="flex items-center gap-1.5 font-medium text-xs text-(--muted)"><span className="w-2 h-2 rounded-full bg-[#FF3399]" />Today</span>
            </div>
        </>
    );
}

type Row = { type: "month"; label: string } | { type: "gap"; size: number; index: number } | { type: "day"; d: CalendarDay };

function TimelineView({ days, selected, mode, order, setOrder, extra, setExtra, tlMonth, setTlMonth, picker, setPicker, first, today, monthNote, onPick }: {
    days: CalendarDay[]; selected: string; mode: CalendarMode; order: "new" | "old"; setOrder: (o: "new" | "old") => void;
    extra: number; setExtra: (n: number) => void; tlMonth: number | null; setTlMonth: (m: number | null) => void;
    picker: "month" | number | null; setPicker: (p: "month" | number | null) => void; first: string; today: string;
    monthNote: (k: MonthKey) => string; onPick: (date: string, mode: CalendarMode) => void;
}) {
    // The latest 9 days and the first 3 (more of either end with "Show 30 more"), plus a month opened in full.
    const shown = new Set<string>();
    const desc = [...days].reverse();
    desc.slice(0, 9 + (order === "new" ? extra : 0)).forEach((d) => shown.add(d.date));
    days.slice(0, 3 + (order === "old" ? extra : 0)).forEach((d) => shown.add(d.date));
    if (tlMonth !== null) days.filter((d) => monthIndex(d.date) === tlMonth).forEach((d) => shown.add(d.date));
    const list = days.filter((d) => shown.has(d.date));
    if (order === "new") list.reverse();

    const rows: Row[] = [];
    let lastMonth = -1;
    let gaps = 0;
    list.forEach((d, i) => {
        if (i > 0) {
            const prev = list[i - 1].date;
            const between = days.filter((x) => (order === "new" ? x.date < prev && x.date > d.date : x.date > prev && x.date < d.date)).length;
            if (between > 0) {
                rows.push({ type: "gap", size: between, index: gaps++ });
                lastMonth = -1;
            }
        }
        const m = monthIndex(d.date);
        if (m !== lastMonth) {
            lastMonth = m;
            rows.push({ type: "month", label: `${MONTHS[m % 12].toUpperCase()} ${Math.floor(m / 12)}` });
        }
        rows.push({ type: "day", d });
    });

    const expanded = extra > 0 || tlMonth !== null;
    const note = extra > 0 && tlMonth === null
        ? (order === "old" ? `Showing the first ${3 + extra} days` : `Showing the latest ${9 + extra} days`)
        : tlMonth !== null ? `Showing ${MONTHS[tlMonth % 12]} ${Math.floor(tlMonth / 12)} in full` : `Latest days and the first days of ${MODES.find((m) => m.id === mode)!.name}`;
    const gapButton = "cal-gap cal-focus flex items-center gap-1.5 py-[7px] px-3.5 rounded-full border-2 border-dashed border-(--rule) font-semibold text-xs text-(--muted) bg-(--ground) cursor-pointer";

    return (
        <>
            <div className="flex [flex-direction:var(--tlh-dir)] items-center justify-(--tlh-js) gap-x-3 gap-y-2.5 flex-wrap">
                <div className="flex items-center justify-(--tlh-js) gap-2.5 flex-wrap text-center">
                    <span className="font-medium text-[13px] text-(--muted)">{note}</span>
                    {expanded && (
                        <button type="button" className={gapButton} onClick={() => { setExtra(0); setTlMonth(null); setPicker(null); }}>
                            <ChevronUp className="w-3 h-3" strokeWidth={3} aria-hidden />Show less
                        </button>
                    )}
                </div>
                <div className="relative w-(--ord-w) grid grid-cols-2 p-[3px] rounded-full border-2 border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]">
                    <span aria-hidden className="cal-slide cal-gpu absolute top-[3px] bottom-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-(--side) border-2 border-(--ink) shadow-[var(--in-pink)]" style={{ transform: `translate3d(${order === "old" ? "100%" : "0%"},0,0)` }} />
                    {([["new", "Newest first"], ["old", "From Day 1"]] as const).map(([k, label]) => (
                        <button key={k} type="button" aria-pressed={order === k} onClick={() => setOrder(k)}
                            className="cal-focus relative z-1 cursor-pointer h-(--ord-h) px-3.5 rounded-full flex items-center justify-center whitespace-nowrap font-bold text-xs transition-colors duration-300"
                            style={{ color: order === k ? "#1A1418" : "var(--chip-ink)" }}>{label}</button>
                    ))}
                </div>
            </div>
            <div className="relative flex flex-col gap-3">
                <div aria-hidden className="[display:var(--tl-side)] absolute left-[111px] top-2 bottom-2 w-0.5 bg-(--rule)" />
                {rows.map((r, i) => {
                    if (r.type === "month") {
                        return (
                            <div key={`m-${r.label}-${i}`} className="cal-in relative flex items-center gap-3 pt-2 pb-0.5 pl-(--tl-indent)">
                                <span className="font-mono-display text-[17px] leading-none tracking-[.02em]">{r.label}</span>
                                <span className="flex-1 h-0.5 bg-(--text) opacity-55" />
                            </div>
                        );
                    }
                    if (r.type === "gap") {
                        return (
                            <div key={`g-${r.index}`} className="cal-in relative flex flex-col gap-2.5 pl-(--tl-indent)">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-xs text-(--muted) px-1 bg-(--ground)">{`${r.size} more days`}</span>
                                    <button type="button" className={gapButton} onClick={() => { setExtra(extra + 30); setPicker(null); }}>
                                        <Plus className="w-3 h-3" strokeWidth={3} aria-hidden />{`Show ${Math.min(30, r.size)} more`}
                                    </button>
                                    <button type="button" className={gapButton} aria-expanded={picker === r.index} onClick={() => setPicker(picker === r.index ? null : r.index)}>
                                        <CalendarDays className="w-3 h-3" strokeWidth={3} aria-hidden />Jump to a month
                                    </button>
                                </div>
                                {picker === r.index && (
                                    <MonthPicker min={monthKey(first)} max={monthKey(today)} value={tlMonth !== null ? { year: Math.floor(tlMonth / 12), month: tlMonth % 12 } : undefined} note={monthNote}
                                        onClose={() => setPicker(null)} onPick={(k) => { setTlMonth(k.year * 12 + k.month); setPicker(null); }} />
                                )}
                            </div>
                        );
                    }
                    return <TimelineRow key={r.d.date} d={r.d} selected={r.d.date === selected} mode={mode} onPick={onPick} />;
                })}
            </div>
        </>
    );
}

function TimelineRow({ d, selected, mode, onPick }: { d: CalendarDay; selected: boolean; mode: CalendarMode; onPick: (date: string, mode: CalendarMode) => void }) {
    const done = isDone(d.kind);
    const look = cellLook(d.kind);
    const noun = MODES.find((m) => m.id === mode)!.noun;
    const tries = d.entry?.guesses ?? 0;
    const triesLabel = `${tries} ${tries === 1 ? "try" : "tries"}`;
    const title = done ? d.entry?.answer_name ?? "" : d.kind === "today" ? `Today's ${noun}...` : "Still a secret...";
    const sub = done ? `${triesLabel}${d.kind === "cal" ? " · from the calendar" : ""}` : d.kind === "started" ? `${tries} so far, not finished` : d.kind === "today" ? "counts for your streak" : "not played";
    const chip = done ? (d.entry?.xp !== null && d.entry?.xp !== undefined ? `+${d.entry.xp} XP` : "Done") : d.kind === "started" ? "Keep going" : d.kind === "today" ? "Play today" : "Play";
    const chipBg = d.kind === "cal" ? "var(--chip-hover)" : d.kind === "started" ? "var(--side)" : d.kind === "today" ? "#FF3399" : "var(--face)";
    return (
        <div
            role="button"
            tabIndex={0}
            data-sel={selected ? "1" : "0"}
            aria-pressed={selected}
            aria-label={`Day ${d.no}, ${formatShort(d.date)}`}
            onClick={() => onPick(d.date, mode)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(d.date, mode); } }}
            className="cal-row cal-focus cal-in relative grid grid-cols-(--tl-cols) items-center cursor-pointer rounded-[18px]"
        >
            <div className="[display:var(--tl-side)] justify-items-end pr-3.5">
                <span className="font-bold text-xl leading-none">{`Day ${d.no}`}</span>
                <span className="font-medium text-[11px] text-(--muted)">{formatShort(d.date)}</span>
            </div>
            <span className="[display:var(--tl-side)] justify-self-center w-4 h-4 rounded-full border-2 border-(--ink)"
                style={{ background: done ? "var(--side)" : d.kind === "today" ? "#FF3399" : d.kind === "started" ? "var(--chip-hover)" : "var(--face)", boxShadow: d.kind === "today" ? "2px 2px 0 #FF3399" : "none" }} />
            <div className="cal-rowcard ml-(--tl-ml) min-w-0 flex items-center gap-3 py-2.5 pr-3.5 pl-2.5 rounded-[18px] bg-(--face) text-(--face-ink)"
                style={{ border: selected ? "2.5px solid var(--ink)" : look.bd, boxShadow: selected ? "4px 5px 0 var(--ctl-off)" : done ? SIDE_DEPTH : look.sh, transform: selected ? "translate3d(4px,0,0)" : undefined }}>
                <div className="relative w-[52px] h-[52px] flex-none rounded-[12px] border-2 border-(--ink) overflow-hidden grid place-items-center"
                    style={{ background: done ? "var(--panel)" : d.kind === "today" ? "#FF3399" : "var(--chip-hover)" }}>
                    {done && d.entry?.image_path ? <img src={img(d.entry.image_path)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" /> : <span className="font-bold text-[22px] leading-none text-white [text-shadow:var(--puff-empty)]">?</span>}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="font-bold text-base leading-[1.15] whitespace-nowrap overflow-hidden text-ellipsis">{title}</span>
                    <span className="font-medium text-xs leading-[1.3] text-(--muted) whitespace-nowrap overflow-hidden text-ellipsis">
                        <span className="[display:var(--tl-mdate)]">{`Day ${d.no} · `}</span>{sub}
                    </span>
                </div>
                <span className="flex-none py-[5px] px-3 rounded-full border-2 border-(--ink) font-bold text-xs whitespace-nowrap" style={{ background: chipBg, color: d.kind === "today" || d.kind === "started" ? "#1A1418" : "var(--face-ink)" }}>{chip}</span>
            </div>
        </div>
    );
}

function DayPanel({ d, mode }: { d: CalendarDay; mode: CalendarMode }) {
    const modeInfo = MODES.find((m) => m.id === mode)!;
    const done = isDone(d.kind);
    // A finished day's details (guesses, XP) come from its own endpoint; the answer only once it's finished.
    const detail = useQuery<CalendarDayData>({ queryKey: ["calendarDay", mode, d.date], queryFn: () => getCalendarDay(mode, d.date), enabled: done });
    const tries = d.entry?.guesses ?? 0;
    const triesLabel = `${tries} ${tries === 1 ? "try" : "tries"}`;
    const guesses = detail.data?.guesses ?? [];
    const name = d.entry?.answer_name ?? "";
    const group = mode === "pixelated" ? detail.data?.puzzle.group_name : detail.data?.puzzle.groups?.[0];

    let status = "";
    let note = "";
    let streak = "";
    let cta: { label: string; to: string; bg: string } | null = null;
    if (d.kind === "won") { status = `Guessed live on ${formatShort(d.date)} · ${triesLabel}`; note = "Finished days are view-only. Feedback is recalculated with the current idol data."; streak = "counted for your streak"; }
    if (d.kind === "cal") { status = `Played from the calendar · ${triesLabel}`; note = "Finished days are view-only."; streak = "calendar games skip the streak"; }
    if (d.kind === "started") { status = `Started on ${formatShort(d.date)} · ${tries} ${tries === 1 ? "guess" : "guesses"}, not finished`; note = "You can finish it here. It counts as a calendar game: a win, no streak."; cta = { label: "Keep going...", to: `/${mode}?date=${d.date}`, bg: "var(--side)" }; }
    if (d.kind === "unplayed") { status = "You didn't play this day"; note = "Calendar games count as wins and never for your streak."; cta = { label: `Play Day ${d.no}`, to: `/${mode}?date=${d.date}`, bg: "var(--face)" }; }
    if (d.kind === "today") { status = `Today's ${modeInfo.noun} is waiting...`; note = "Play today in the mode to keep your streak and get full XP."; cta = { label: `Go to ${modeInfo.name}`, to: `/${mode}`, bg: "#FF3399" }; }
    if (d.kind === "future") { status = "Locked"; note = "New days open at midnight."; }
    if (d.kind === "pre") { status = "No challenge this day"; }
    const hiddenNote = d.kind === "started" ? "Almost there..." : "Still a secret...";
    const dayLabel = d.no ? `Day ${d.no}` : formatShort(d.date);
    const xp = detail.data?.xp ?? d.entry?.xp;

    const guessAvatars = (size: string) => guesses.map((g, i) => (
        <img key={g.id} src={img(g.image_path)} alt={g.name} className={cn("cal-guess rounded-full border-2 border-(--ink) object-cover", size)}
            style={{ filter: g.correct ? "none" : "grayscale(1) contrast(.9)", boxShadow: g.correct ? "0 0 0 3px #22C55E" : "none", animationDelay: `${140 + i * 70}ms` }} />
    ));
    const ctaButton = cta && (
        <Link to={cta.to} className="cal-cta cal-focus h-12 rounded-full border-2 border-(--ink) shadow-[0_4px_0_var(--ink)] flex items-center justify-center font-bold text-base text-[#1A1418] no-underline" style={{ background: cta.bg }}>
            {cta.label}
        </Link>
    );

    return (
        <>
            <aside aria-live="polite" aria-label={`${dayLabel}, ${formatLong(d.date)}`} className="[display:var(--big)] flex-col sticky top-[80px] rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[5px_5px_0_0_var(--side),5px_5px_0_2px_var(--ink)] p-5">
                <div className="cal-pbody flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <span className="py-[3px] px-2.5 rounded-full bg-(--tag) border-2 border-(--ink) font-bold text-xs text-white [text-shadow:var(--tag-text)]">{dayLabel}</span>
                        <span className="font-medium text-[13px] text-(--muted)">{formatLong(d.date)}</span>
                    </div>
                    <div className="relative aspect-square rounded-[18px] border-2 border-(--ink) overflow-hidden grid place-items-center -rotate-1" style={{ background: done ? "var(--panel)" : "var(--chip-hover)" }}>
                        {done && d.entry?.image_path ? (
                            <img src={img(d.entry.image_path)} alt={name} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-center p-5">
                                <span className="font-bold text-[64px] leading-none text-white [text-shadow:var(--puff-title)]">?</span>
                                <span className="font-semibold text-sm text-(--muted)">{hiddenNote}</span>
                            </div>
                        )}
                    </div>
                    {done && (
                        <div className="flex flex-col gap-0.5 -mt-1">
                            <span className="font-bold text-[30px] leading-[1.05] text-white [text-shadow:var(--puff-value)] pt-0.5 pr-1.5 pb-1.5 pl-0.5">{name}</span>
                            {group && <span className="font-semibold text-[13px] text-(--group)">{group}</span>}
                        </div>
                    )}
                    <div className="flex flex-col gap-[3px]">
                        <span className="font-bold text-[15px] leading-[1.3]">{status}</span>
                        {note && <span className="font-medium text-[13px] leading-[1.45] text-(--muted) [text-wrap:pretty]">{note}</span>}
                    </div>
                    {guesses.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <span className="font-semibold text-[11px] tracking-[.12em] text-(--muted)">{`YOUR ${guesses.length} ${guesses.length === 1 ? "GUESS" : "GUESSES"}`}</span>
                            <div className="flex flex-wrap gap-2">
                                {guesses.map((g, i) => (
                                    <div key={g.id} className="cal-guess flex flex-col items-center gap-[3px] w-12" style={{ animationDelay: `${140 + i * 70}ms` }}>
                                        <div className="w-11 h-11 rounded-full border-2 border-(--ink) overflow-hidden" style={{ boxShadow: g.correct ? "0 0 0 3px #22C55E" : "none" }}>
                                            <img src={img(g.image_path)} alt={g.name} className="w-full h-full object-cover" style={{ filter: g.correct ? "none" : "grayscale(1) contrast(.9)" }} />
                                        </div>
                                        <span className="font-semibold text-[10px] max-w-full overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: g.correct ? "var(--face-ink)" : "var(--muted)" }}>{g.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {(done || streak) && (
                        <div className="flex items-center gap-2.5 flex-wrap">
                            {done && xp !== null && xp !== undefined && (
                                <span className="py-1 px-2.5 rounded-full border-2 border-(--ink) font-bold text-xs text-[#1A1418]" style={{ background: d.kind === "won" ? "var(--side)" : "var(--chip-hover)" }}>{`+${xp} XP`}</span>
                            )}
                            <span className="font-medium text-xs text-(--muted)">{streak}</span>
                        </div>
                    )}
                    {ctaButton}
                </div>
            </aside>

            <aside aria-live="polite" aria-label={`${dayLabel}, ${formatShort(d.date)}`} className="[display:var(--compact)] flex-col rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[4px_5px_0_var(--ctl-off)] p-3.5">
                <div className="cal-pbody flex flex-col gap-3">
                    <div className="flex gap-3 items-center">
                        <div className="relative w-[84px] h-[84px] flex-none rounded-[16px] border-2 border-(--ink) overflow-hidden grid place-items-center" style={{ background: done ? "var(--panel)" : "var(--chip-hover)" }}>
                            {done && d.entry?.image_path ? <img src={img(d.entry.image_path)} alt={name} className="absolute inset-0 w-full h-full object-cover" /> : <span className="font-bold text-4xl leading-none text-white [text-shadow:var(--puff-empty)]">?</span>}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                            <span className="font-semibold text-xs text-(--group)">{`${dayLabel} · ${formatShort(d.date)}`}</span>
                            <span className="font-bold text-[22px] leading-[1.05] text-white [text-shadow:var(--puff-value)] whitespace-nowrap overflow-hidden text-ellipsis pt-[3px] pr-1.5 pb-1.5 pl-0.5">{done ? name : hiddenNote}</span>
                            <span className="font-medium text-xs leading-[1.35] text-(--muted)">{status}</span>
                        </div>
                    </div>
                    {guesses.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {guessAvatars("w-8 h-8")}
                            <span className="font-medium text-xs text-(--muted)">{triesLabel}</span>
                        </div>
                    )}
                    {note && <span className="font-medium text-xs leading-[1.45] text-(--muted) [text-wrap:pretty]">{note}</span>}
                    {ctaButton}
                </div>
            </aside>
        </>
    );
}
