import type { ReactNode } from "react";
import { CalendarCheck, Lock } from "lucide-react";
import { cn } from "../../lib/utils";
import type { CalendarMode } from "../../interfaces/gameInterfaces";
import { formatShort, isDone, type CalendarDay } from "./calendarData";
import { DAY_FRAME, DAY_GROUND, DAY_TAG, KIND_WORD, SMALL_STRIPES, STRIPES, imageUrl } from "./calendarLooks";

interface CellProps {
    day: CalendarDay;
    selected: boolean;
    mode: CalendarMode;
    onPick: (date: string, mode: CalendarMode) => void;
}

/** A day in the month grid (wider screens): the date, the day number, the answer's photo once
 *  guessed, and a word for the day's state. The selected day lifts and tilts. */
export const DayCell = ({ day, index, selected, mode, onPick }: CellProps & { index: number }) => {
    const isOff = day.kind === "pre" || day.kind === "future";
    const isGuessed = isDone(day.kind);
    const dayOfMonth = Number(day.date.slice(8, 10));
    const isLive = !isOff && !selected;

    const label = isOff
        ? `${formatShort(day.date)}, ${day.kind === "future" ? "locked" : "no challenge"}`
        : `${formatShort(day.date)}, Day ${day.no}, ${KIND_WORD[day.kind]}${isGuessed && day.entry?.answer_name ? `, ${day.entry.answer_name}` : ""}`;

    return (
        <button
            type="button"
            data-date={day.date}
            disabled={isOff}
            tabIndex={selected ? 0 : -1}
            aria-pressed={selected}
            aria-label={label}
            onClick={() => onPick(day.date, mode)}
            className={cn(
                "calendar-enter pp-focus relative flex flex-col gap-1.25 aspect-[1/1.08] p-1.75 rounded-2xl text-(--face-ink)",
                "transition-[translate,rotate,box-shadow,background-color,border-color] duration-550 ease-(--ease-settle) transform-gpu",
                "cursor-pointer disabled:cursor-default",
                DAY_GROUND[day.kind],
                day.kind === "pre" && "opacity-35",
                selected
                    ? cn("-translate-y-1 border-[2.5px] border-(--ink) shadow-[3px_5px_0_var(--ctl-off)]", dayOfMonth % 2 ? "rotate-[-1.6deg]" : "rotate-[1.6deg]")
                    : DAY_FRAME[day.kind],
                isLive && "hover:-translate-y-0.75 hover:duration-450 active:translate-x-px active:translate-y-0.5 active:duration-200",
            )}
            style={{ animationDelay: `${Math.min(260 + index * 18, 900)}ms` }}
        >
            <div className="flex items-center justify-between">
                <span className="font-bold text-sm leading-none">{dayOfMonth}</span>
                <span className="font-semibold text-[10px] tracking-[.04em] text-(--muted)">{day.no ? `#${day.no}` : ""}</span>
            </div>

            <div
                className={cn(
                    "relative flex-1 grid place-items-center overflow-hidden rounded-[10px]",
                    isGuessed && "border-2 border-(--ink) bg-(--panel)",
                    day.kind === "today" && "bg-[rgba(255,51,153,.12)]",
                    day.kind === "started" && cn("bg-(--face)", STRIPES),
                    day.kind === "unplayed" && "bg-(--opt-hover)",
                )}
            >
                {isGuessed && day.entry?.image_path && (
                    <img
                        src={imageUrl(day.entry.image_path)}
                        alt=""
                        loading="lazy"
                        className="absolute -top-px -left-px block size-[calc(100%+2px)] max-w-none object-cover"
                    />
                )}

                {(day.kind === "unplayed" || day.kind === "started" || day.kind === "today") && (
                    <span className={cn("font-bold text-[22px] leading-none", day.kind === "today" ? "text-neon-pink" : "text-(--muted)")}>?</span>
                )}

                {day.kind === "future" && <Lock className="size-4 text-(--muted)" strokeWidth={2.6} aria-hidden />}

                {day.kind === "cal" && (
                    <span className="absolute right-0.75 bottom-0.75 grid place-items-center size-5 rounded-full border-2 border-[#1A1418] bg-[#FFFDFA]">
                        <CalendarCheck className="size-2.5 text-[#1A1418]" strokeWidth={3} aria-hidden />
                    </span>
                )}
            </div>

            <span
                className={cn(
                    "pb-px font-semibold text-[10px] leading-[1.35] text-center truncate",
                    day.kind === "today" ? "text-(--group)" : isGuessed ? "text-(--face-ink)" : "text-(--muted)",
                )}
            >
                {isGuessed ? day.entry?.answer_name ?? "" : DAY_TAG[day.kind]}
            </span>
        </button>
    );
};

/** A day in the compact grid (phones): a round photo or date with a dot for today. */
export const DotCell = ({ day, selected, today, mode, onPick }: CellProps & { today: string }) => {
    const isOff = day.kind === "pre" || day.kind === "future";
    const isGuessed = isDone(day.kind);
    const isToday = day.date === today;
    const isLive = !isOff && !selected;

    return (
        <button
            type="button"
            data-date={day.date}
            disabled={isOff}
            tabIndex={selected ? 0 : -1}
            aria-pressed={selected}
            aria-label={isOff ? formatShort(day.date) : `${formatShort(day.date)}, Day ${day.no}, ${KIND_WORD[day.kind]}`}
            onClick={() => onPick(day.date, mode)}
            className={cn(
                "pp-focus flex flex-col items-center justify-center gap-0.75 h-12.5 rounded-xl border-2",
                "transition-[translate,box-shadow,background-color,border-color] duration-550 ease-(--ease-settle) transform-gpu",
                "cursor-pointer disabled:cursor-default",
                day.kind === "pre" && "opacity-35",
                selected && "-translate-y-0.5 border-(--ink) bg-(--chip-hover) shadow-[2px_3px_0_var(--ctl-off)]",
                !selected && (isToday ? "border-neon-pink bg-transparent" : "border-transparent bg-transparent"),
                isLive && "hover:-translate-y-0.75 hover:bg-(--chip-hover) active:translate-x-px active:translate-y-0.5 active:duration-200",
            )}
        >
            <div
                className={cn(
                    "relative grid place-items-center size-8 overflow-hidden rounded-full border-2",
                    (isGuessed || day.kind === "started") && "border-(--ink)",
                    (day.kind === "unplayed" || day.kind === "today") && "border-(--rule)",
                    isOff && "border-transparent",
                    isGuessed ? "bg-(--panel)" : day.kind === "today" ? "bg-[rgba(255,51,153,.12)]" : isOff ? "bg-transparent" : "bg-(--face)",
                    day.kind === "started" && SMALL_STRIPES,
                )}
            >
                {isGuessed && day.entry?.image_path && (
                    <img src={imageUrl(day.entry.image_path)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                )}

                <span
                    className={cn(
                        "relative font-bold text-xs leading-none",
                        isGuessed && "text-white text-shadow-[0_0_2px_#1A1418,0_1px_2px_#1A1418,1px_0_2px_#1A1418]",
                        !isGuessed && (day.kind === "future" ? "text-(--muted)" : "text-(--face-ink)"),
                    )}
                >
                    {Number(day.date.slice(8, 10))}
                </span>
            </div>

            {day.kind === "cal"
                ? <CalendarCheck className="size-2.5 text-(--face-ink)" strokeWidth={3} aria-hidden />
                : <span className={cn("size-1.5 rounded-full", isToday ? "bg-neon-pink" : "bg-transparent")} />}
        </button>
    );
};

const DEPTH_SQUARE = "border-2 border-(--ink) shadow-[0_2px_0_0_var(--side),0_2px_0_2px_var(--ink)]";

const LegendSquare = ({ frame, striped = false, badge = false }: { frame: string; striped?: boolean; badge?: boolean }) => {
    return (
        <span
            className={cn(
                "relative size-4 rounded-[5px] bg-(--face)",
                frame,
                striped && "bg-[repeating-linear-gradient(45deg,rgba(255,138,196,.6)_0_3px,transparent_3px_6px)]",
            )}
        >
            {badge && <span className="absolute -right-1 -bottom-1 size-2 rounded-full border-[1.5px] border-(--ink) bg-(--face)" />}
        </span>
    );
};

/** What the cells mean: squares on wider screens, dots on phones. */
export const Legend = () => {
    const squareItems: [string, ReactNode][] = [
        ["Guessed live", <LegendSquare frame={DEPTH_SQUARE} />],
        ["From the calendar", <LegendSquare frame={DEPTH_SQUARE} badge />],
        ["Started, not finished", <LegendSquare frame="border-2 border-(--ink)" striped />],
        ["Not played", <LegendSquare frame="border-2 border-(--rule)" />],
        ["Today", <LegendSquare frame="border-2 border-neon-pink shadow-[1.5px_2px_0_#FF3399]" />],
    ];

    const dotItems: [string, string][] = [
        ["Guessed live", "border-2 border-(--ink) bg-(--panel)"],
        ["Started", cn("border-2 border-(--ink) bg-(--face)", SMALL_STRIPES)],
        ["Not played", "border-2 border-(--rule) bg-(--face)"],
    ];

    return (
        <>
            <div className="flex @max-[581px]:hidden flex-wrap gap-x-4.5 gap-y-2.5 pt-1.5">
                {squareItems.map(([label, swatch]) => (
                    <span key={label} className="flex items-center gap-2 font-medium text-xs text-(--muted)">
                        {swatch}
                        {label}
                    </span>
                ))}
            </div>

            <div className="hidden @max-[581px]:flex flex-wrap justify-center gap-x-3.5 gap-y-2 pt-1.5">
                {dotItems.map(([label, look]) => (
                    <span key={label} className="flex items-center gap-1.5 font-medium text-xs text-(--muted)">
                        <span className={cn("size-3.5 rounded-full", look)} />
                        {label}
                    </span>
                ))}

                <span className="flex items-center gap-1.5 font-medium text-xs text-(--muted)">
                    <CalendarCheck className="size-3" strokeWidth={3} aria-hidden />
                    From the calendar
                </span>

                <span className="flex items-center gap-1.5 font-medium text-xs text-(--muted)">
                    <span className="size-2 rounded-full bg-neon-pink" />
                    Today
                </span>
            </div>
        </>
    );
};
