import type { ReactNode, Ref } from "react";
import { Link } from "react-router";
import { Lock, Share2 } from "lucide-react";
import { cn } from "../../lib/utils";
import type { InkItAnswer } from "../../interfaces/gameInterfaces";
import { resolveCdnUrl } from "../../utils/imageUrl";
import InkThumb from "./InkThumb";
import { PressButton } from "../buttons/PressButton";

export interface OtherMode {
    id: string;
    name: string;
    path: string;
    won: boolean;
    image: string | null;
    imageClass?: string;
}

export type ShareState = "idle" | "working" | "shared" | "copied" | "saved" | "failed";

export interface YesterdayInfo {
    name: string | null;
    group: string | null;
    href: string | null;
    imagePath: string | null;
    imageVersion: string | null;
    /** Set when the player didn't finish yesterday: the pill opens it in the calendar. */
    locked: { date: string; dayNumber: number | null } | null;
}

interface InkVictoryProps {
    cardRef: Ref<HTMLDivElement>;
    answer: InkItAnswer;
    answerHref: string;
    guessCount: number;
    /** Live games only: place among today's winners and the score. */
    position: number | null;
    score: number | null;
    yesterday: YesterdayInfo | null;
    countdown: string | null;
    otherModes: OtherMode[];
    shareState: ShareState;
    onShare: () => void;
    canShare: boolean;
    /** A past day played from the calendar: no ranking, no countdown. */
    isCalendarDay: boolean;
}

const SHARE_LABEL: Record<ShareState, string> = {
    idle: "Share my drawing",
    working: "Preparing...",
    shared: "Shared!",
    copied: "Copied!",
    saved: "Saved!",
    failed: "Couldn't share",
};

const ordinal = (value: number) => {
    const tens = value % 100;
    const suffix = tens >= 11 && tens <= 13 ? "th" : ["th", "st", "nd", "rd"][value % 10] ?? "th";

    return `${value.toLocaleString("en-US")}${suffix}`;
};

const TILE_TILT = ["rotate-[-.6deg]", "rotate-[.5deg]", "rotate-[-.4deg]"];

// Long values step down so they stay inside the tile.
const valueSize = (value: string) => (value.length <= 3 ? "text-[28px] max-[900px]:text-2xl" : value.length <= 5 ? "text-[22px] max-[900px]:text-lg" : "text-lg max-[900px]:text-[15px]");

/** An idol photo over its pink depth block, linking to her page. */
const DepthPhoto = ({ to, name, src, className }: { to: string; name: string; src: string | null; className: string }) => {
    return (
        <Link to={to} aria-label={`${name} profile`} className={cn("inkit-photo pp-focus relative block flex-none rounded-3xl", className)}>
            <span aria-hidden className="inkit-photo-depth absolute inset-0 translate-x-1 translate-y-1.25 rounded-3xl border-2 border-(--ink) bg-[#FF8AC4]" />
            <span className="relative block size-full overflow-hidden rounded-3xl border-2 border-(--ink) bg-(--ink) transform-gpu">
                <img src={src ?? undefined} alt={name} draggable={false} className="absolute inset-0 size-full object-cover object-center" />
            </span>
        </Link>
    );
};

const GroupPill = ({ children }: { children: ReactNode }) => {
    return (
        <span className="rounded-full border-2 border-(--ink) bg-[#FF8AC4] px-2.5 py-0.5 font-bold text-xs text-[#1A1418]">{children}</span>
    );
};

const PINK_DEPTH = "shadow-[0_6px_0_-2px_#FF8AC4,0_6px_0_0_var(--ink),var(--in)]";

/** The win: today's idol, the numbers, yesterday's idol, share, countdown and the other modes. */
const InkVictory = ({
    cardRef, answer, answerHref, guessCount, position, score, yesterday, countdown, otherModes, shareState, onShare, canShare, isCalendarDay,
}: InkVictoryProps) => {
    const stats = [
        { label: "GUESSES", value: String(guessCount) },
        ...(isCalendarDay ? [] : [
            { label: "POSITION", value: position ? `#${position}` : "-" },
            { label: "SCORE", value: score != null ? String(Number(score.toFixed(2))) : "-" },
        ]),
    ];

    return (
        <div
            ref={cardRef}
            data-testid="inkit-victory"
            className="mt-5 w-full max-w-160 justify-self-center pr-1.75 pb-1.75 [grid-area:win] animate-[ikIn_.55s_var(--ease-settle)_.15s_backwards]"
        >
            <section
                aria-label="You found the idol"
                className={cn(
                    "relative flex flex-col items-center gap-5.5 rounded-[23px] border-2 border-(--ink) bg-(--face) text-center",
                    "px-8 pt-7.5 pb-7 max-[900px]:px-4 max-[900px]:pt-6 max-[900px]:pb-5.5",
                    "shadow-[7px_8px_0_-2px_#FF8AC4,7px_8px_0_0_var(--ink),var(--in)]",
                )}
            >
                <div className="flex flex-col items-center gap-3.5">
                    <div className="flex items-center gap-2.5">
                        <InkThumb className="size-11 rotate-[-4deg] rounded-[13px] shadow-[2px_3px_0_var(--ctl-off)]" />
                        <span className="font-bold text-[22px] leading-none text-white text-shadow-(--puff-value)">
                            Ink<span className="text-[#FF8AC4]">It</span>
                        </span>
                    </div>

                    <h2 className="m-0 inline-block rotate-[-1.5deg] font-bold text-[42px] leading-[1.05] text-balance text-white text-shadow-(--puff-empty) max-[900px]:text-[32px]">
                        Congratulations! 🎨
                    </h2>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4">
                    <DepthPhoto to={answerHref} name={answer.artist_name} src={resolveCdnUrl(answer.image_path, answer.image_version)} className="size-26" />

                    <div className="flex flex-col items-start gap-1.75">
                        <span className="font-medium text-sm text-(--muted)">{isCalendarDay ? "This day's idol was" : "Today's idol was"}</span>
                        <span data-testid="inkit-answer-name" className="font-bold text-[34px] leading-none text-white text-shadow-(--puff-value)">
                            {answer.artist_name}
                        </span>
                        {answer.groups.length > 0 && <GroupPill>{answer.groups.join(", ")}</GroupPill>}
                    </div>
                </div>

                {!isCalendarDay && position && (
                    <span className="font-medium text-[15px] leading-[1.4] text-(--muted)">
                        You were the <b className="font-bold text-(--ik-num)">{ordinal(position)}</b> fan to find her!
                    </span>
                )}

                <div className={cn("grid w-full max-w-125 gap-3.5 max-[900px]:gap-2.5", stats.length === 3 ? "grid-cols-3" : "grid-cols-1 max-w-42")}>
                    {stats.map((stat, index) => (
                        <div
                            key={stat.label}
                            data-testid={`inkit-stat-${stat.label.toLowerCase()}`}
                            className={cn(
                                "mb-1 flex h-31 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-(--ink) bg-(--face) max-[900px]:h-25",
                                PINK_DEPTH, TILE_TILT[index],
                            )}
                        >
                            <div className={cn("font-bold leading-none text-white text-shadow-(--puff-value)", valueSize(stat.value))}>{stat.value}</div>
                            <div className="font-semibold text-[10px] tracking-[.12em] text-(--muted)">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {yesterday && (
                    <div className={cn("relative isolate mb-1 flex w-full flex-col items-center gap-4.5 overflow-hidden rounded-[20px] border-2 border-(--ink) bg-(--face) px-4.5 pt-5.5 pb-6.5 text-center", PINK_DEPTH)}>
                        <span aria-hidden className="inkit-hatch-card pointer-events-none absolute inset-0 -z-1" />
                        <span className="font-caveat font-semibold text-3xl leading-none text-(--group)">Yesterday's idol was...</span>

                        {yesterday.locked ? (
                            <Link
                                to={`/calendar?mode=inkit&date=${yesterday.locked.date}`}
                                aria-label="Play yesterday in the calendar"
                                data-testid="inkit-yesterday-locked"
                                className="inkit-btn pp-focus inline-flex h-10 items-center gap-2 rounded-full border-2 border-(--ink) bg-(--face) px-4 font-bold text-sm text-(--face-ink) no-underline"
                            >
                                <Lock className="size-3.5" strokeWidth={3} aria-hidden />
                                {yesterday.locked.dayNumber ? `Day ${yesterday.locked.dayNumber}` : "Locked"}
                            </Link>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <DepthPhoto
                                    to={yesterday.href ?? "/idols"}
                                    name={yesterday.name ?? ""}
                                    src={resolveCdnUrl(yesterday.imagePath, yesterday.imageVersion)}
                                    className="size-30 max-[900px]:size-26"
                                />

                                <div className="flex min-w-0 flex-col items-center gap-2">
                                    <span className="font-bold text-[28px] leading-none text-white text-shadow-(--puff-value)">{yesterday.name}</span>
                                    {yesterday.group && <GroupPill>{yesterday.group}</GroupPill>}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex w-full flex-col gap-3">
                    {canShare && (
                        <PressButton
                            variant="cta"
                            size="lg"
                            onClick={onShare}
                            disabled={shareState === "working"}
                            data-testid="inkit-share"
                            className="w-full"
                        >
                            <Share2 className="size-4.5" strokeWidth={2.6} aria-hidden />
                            {SHARE_LABEL[shareState]}
                        </PressButton>
                    )}

                    {isCalendarDay ? (
                        <Link to="/calendar?mode=inkit" className="font-bold text-sm text-(--group) hover:text-[#FF3399]">Back to the calendar</Link>
                    ) : countdown && (
                        <div className="flex items-baseline justify-center gap-2">
                            <span className="font-medium text-[13px] text-(--muted)">Next idol in</span>
                            <span className="font-bold text-[15px] tabular-nums">{countdown}</span>
                        </div>
                    )}
                </div>

                {otherModes.length > 0 && (
                    <div className="flex w-full flex-col gap-3.5 border-t-2 border-dashed border-(--rule) pt-5">
                        <span className="font-semibold text-[11px] tracking-[.14em] text-(--muted)">PLAY OTHER MODES</span>

                        <div className="flex flex-wrap justify-center gap-4.5">
                            {otherModes.map((mode) => (
                                <Link
                                    key={mode.id}
                                    to={mode.path}
                                    data-testid={`inkit-other-${mode.id}`}
                                    className={cn(
                                        "inkit-btn pp-focus flex flex-col items-center gap-1.75 rounded-[20px] border-2 border-(--ink) bg-(--face) px-1.5 pt-1.5 pb-2 text-(--face-ink) no-underline",
                                        mode.won && "opacity-60",
                                    )}
                                >
                                    <span className="block size-21 overflow-hidden rounded-[14px] border-2 border-(--ink) max-[900px]:size-18">
                                        <img
                                            src={resolveCdnUrl(mode.image) ?? undefined}
                                            alt=""
                                            draggable={false}
                                            className={cn("block size-full scale-[1.06] object-cover object-center", mode.imageClass)}
                                        />
                                    </span>
                                    <span className="font-bold text-[13px]">{mode.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};

export default InkVictory;
