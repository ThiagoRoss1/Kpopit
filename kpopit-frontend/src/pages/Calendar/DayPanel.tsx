import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { cn } from "../../lib/utils";
import { getCalendarDay } from "../../services/api";
import type { CalendarDayData, CalendarMode } from "../../interfaces/gameInterfaces";
import { MODES, formatLong, formatShort, isDone, type CalendarDay } from "./calendarData";
import { imageUrl } from "./calendarLooks";

interface DayStory {
    status: string;
    note: string;
    streak: string;
    cta: { label: string; to: string; ground: string } | null;
}

/** What the panel says about a day: its status line, a note, the streak word and the play button. */
const storyOf = (day: CalendarDay, mode: CalendarMode): DayStory => {
    const modeInfo = MODES.find((option) => option.id === mode)!;
    const tries = day.entry?.guesses ?? 0;
    const triesLabel = `${tries} ${tries === 1 ? "try" : "tries"}`;
    const playLink = `/${mode}?date=${day.date}`;

    switch (day.kind) {
        case "won":
            return {
                status: `Guessed live on ${formatShort(day.date)} · ${triesLabel}`,
                note: "Finished days are view-only. Feedback is recalculated with the current idol data.",
                streak: "counted for your streak",
                cta: null,
            };
        case "cal":
            return { status: `Played from the calendar · ${triesLabel}`, note: "Finished days are view-only.", streak: "calendar games skip the streak", cta: null };
        case "started":
            return {
                status: `Started on ${formatShort(day.date)} · ${tries} ${tries === 1 ? "guess" : "guesses"}, not finished`,
                note: "You can finish it here. It counts as a calendar game: a win, no streak.",
                streak: "",
                cta: { label: "Keep going...", to: playLink, ground: "bg-(--side)" },
            };
        case "unplayed":
            return {
                status: "You didn't play this day",
                note: "Calendar games count as wins and never for your streak.",
                streak: "",
                cta: { label: `Play Day ${day.no}`, to: playLink, ground: "bg-(--face)" },
            };
        case "today":
            return {
                status: `Today's ${modeInfo.noun} is waiting...`,
                note: "Play today in the mode to keep your streak and get full XP.",
                streak: "",
                cta: { label: `Go to ${modeInfo.name}`, to: `/${mode}`, ground: "bg-neon-pink" },
            };
        case "future":
            return { status: "Locked", note: "New days open at midnight.", streak: "", cta: null };
        default:
            return { status: "No challenge this day", note: "", streak: "", cta: null };
    }
};

/** The selected day: a big sticky panel beside the grid on wide screens, a compact card below it
 *  on narrow ones. A finished day's guesses and XP come from its own endpoint. */
const DayPanel = ({ day, mode }: { day: CalendarDay; mode: CalendarMode }) => {
    const isGuessed = isDone(day.kind);
    const detail = useQuery<CalendarDayData>({
        queryKey: ["calendarDay", mode, day.date],
        queryFn: () => getCalendarDay(mode, day.date),
        enabled: isGuessed,
    });

    const { status, note, streak, cta } = storyOf(day, mode);
    const tries = day.entry?.guesses ?? 0;
    const triesLabel = `${tries} ${tries === 1 ? "try" : "tries"}`;
    const guesses = detail.data?.guesses ?? [];
    const name = day.entry?.answer_name ?? "";
    const group = mode === "pixelated" ? detail.data?.puzzle.group_name : detail.data?.puzzle.groups?.[0];
    const hiddenNote = day.kind === "started" ? "Almost there..." : "Still a secret...";
    const dayLabel = day.no ? `Day ${day.no}` : formatShort(day.date);
    const xp = detail.data?.xp ?? day.entry?.xp;
    const answerImage = isGuessed && day.entry?.image_path ? imageUrl(day.entry.image_path) : null;

    const playButton = cta && (
        <Link
            to={cta.to}
            className={cn(
                "pp-focus flex items-center justify-center h-12 rounded-full border-2 border-(--ink) shadow-[0_4px_0_var(--ink)]",
                "font-bold text-base text-[#1A1418] no-underline",
                "transition-[translate,box-shadow] duration-450 ease-(--ease-settle) will-change-transform",
                "hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_0_0_var(--ink)] active:duration-180",
                cta.ground,
            )}
        >
            {cta.label}
        </Link>
    );

    return (
        <>
            <aside
                aria-live="polite"
                aria-label={`${dayLabel}, ${formatLong(day.date)}`}
                className={cn(
                    "flex @max-[981px]:hidden flex-col sticky top-20 p-5 rounded-[23px]",
                    "border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[5px_5px_0_0_var(--side),5px_5px_0_2px_var(--ink)]",
                )}
            >
                <div className="calendar-panel-enter flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <span className="py-0.75 px-2.5 rounded-full border-2 border-(--ink) bg-(--tag) font-bold text-xs text-white text-shadow-(--tag-text)">
                            {dayLabel}
                        </span>
                        <span className="font-medium text-[13px] text-(--muted)">{formatLong(day.date)}</span>
                    </div>

                    <div
                        className={cn(
                            "relative grid place-items-center aspect-square overflow-hidden rounded-[18px] border-2 border-(--ink) -rotate-1",
                            isGuessed ? "bg-(--panel)" : "bg-(--chip-hover)",
                        )}
                    >
                        {answerImage ? (
                            <img src={answerImage} alt={name} className="absolute inset-0 size-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center gap-2 p-5 text-center">
                                <span className="font-bold text-[64px] leading-none text-white text-shadow-(--puff-title)">?</span>
                                <span className="font-semibold text-sm text-(--muted)">{hiddenNote}</span>
                            </div>
                        )}
                    </div>

                    {isGuessed && (
                        <div className="flex flex-col gap-0.5 -mt-1">
                            <span className="puff-ink pr-1.5 pb-1.5 pl-0.5 font-bold text-[30px] leading-[1.05] text-white text-shadow-(--puff-value)">{name}</span>
                            {group && <span className="font-semibold text-[13px] text-(--group)">{group}</span>}
                        </div>
                    )}

                    <div className="flex flex-col gap-0.75">
                        <span className="font-bold text-[15px] leading-[1.3]">{status}</span>
                        {note && <span className="font-medium text-[13px] leading-[1.45] text-(--muted) text-pretty">{note}</span>}
                    </div>

                    {guesses.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <span className="font-semibold text-[11px] tracking-[.12em] text-(--muted)">
                                {`YOUR ${guesses.length} ${guesses.length === 1 ? "GUESS" : "GUESSES"}`}
                            </span>

                            <div className="flex flex-wrap gap-2">
                                {guesses.map((guess, i) => (
                                    <div
                                        key={guess.id}
                                        className="calendar-guess-enter flex flex-col items-center gap-0.75 w-12"
                                        style={{ animationDelay: `${140 + i * 70}ms` }}
                                    >
                                        <div className={cn("size-11 overflow-hidden rounded-full border-2 border-(--ink)", guess.correct && "shadow-[0_0_0_3px_#22C55E]")}>
                                            <img
                                                src={imageUrl(guess.image_path)}
                                                alt={guess.name}
                                                className={cn("size-full object-cover", !guess.correct && "grayscale contrast-90")}
                                            />
                                        </div>

                                        <span className={cn("max-w-full font-semibold text-[10px] truncate", guess.correct ? "text-(--face-ink)" : "text-(--muted)")}>
                                            {guess.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(isGuessed || streak) && (
                        <div className="flex flex-wrap items-center gap-2.5">
                            {isGuessed && xp !== null && xp !== undefined && (
                                <span
                                    className={cn(
                                        "py-1 px-2.5 rounded-full border-2 border-(--ink) font-bold text-xs text-[#1A1418]",
                                        day.kind === "won" ? "bg-(--side)" : "bg-(--chip-hover)",
                                    )}
                                >
                                    {`+${xp} XP`}
                                </span>
                            )}
                            <span className="font-medium text-xs text-(--muted)">{streak}</span>
                        </div>
                    )}

                    {playButton}
                </div>
            </aside>

            <aside
                aria-live="polite"
                aria-label={`${dayLabel}, ${formatShort(day.date)}`}
                className="hidden @max-[981px]:flex flex-col p-3.5 rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[4px_5px_0_var(--ctl-off)]"
            >
                <div className="calendar-panel-enter flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div
                            className={cn(
                                "relative grid place-items-center flex-none size-21 overflow-hidden rounded-2xl border-2 border-(--ink)",
                                isGuessed ? "bg-(--panel)" : "bg-(--chip-hover)",
                            )}
                        >
                            {answerImage
                                ? <img src={answerImage} alt={name} className="absolute inset-0 size-full object-cover" />
                                : <span className="font-bold text-4xl leading-none text-white text-shadow-(--puff-empty)">?</span>}
                        </div>

                        <div className="flex flex-col flex-1 gap-0.75 min-w-0">
                            <span className="font-semibold text-xs text-(--group)">{`${dayLabel} · ${formatShort(day.date)}`}</span>
                            <span className="puff-ink pr-1.5 pb-1.5 pl-0.5 font-bold text-[22px] leading-[1.05] text-white text-shadow-(--puff-value) truncate">
                                {isGuessed ? name : hiddenNote}
                            </span>
                            <span className="font-medium text-xs leading-[1.35] text-(--muted)">{status}</span>
                        </div>
                    </div>

                    {guesses.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {guesses.map((guess, i) => (
                                <img
                                    key={guess.id}
                                    src={imageUrl(guess.image_path)}
                                    alt={guess.name}
                                    className={cn(
                                        "calendar-guess-enter size-8 rounded-full border-2 border-(--ink) object-cover",
                                        guess.correct ? "shadow-[0_0_0_3px_#22C55E]" : "grayscale contrast-90",
                                    )}
                                    style={{ animationDelay: `${140 + i * 70}ms` }}
                                />
                            ))}
                            <span className="font-medium text-xs text-(--muted)">{triesLabel}</span>
                        </div>
                    )}

                    {note && <span className="font-medium text-xs leading-[1.45] text-(--muted) text-pretty">{note}</span>}

                    {playButton}
                </div>
            </aside>
        </>
    );
};

export default DayPanel;
