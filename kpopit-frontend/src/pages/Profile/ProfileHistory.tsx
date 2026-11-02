import { Link } from "react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { PressButton } from "../../components/buttons/PressButton";
import { getProfileHistory } from "../../services/api";
import { resolveCdnUrl } from "../../utils/imageUrl";
import type { HistoryEntry } from "../../interfaces/playerInterfaces";
import { cn } from "../../lib/utils";
import { modeById, modeName, relativeDay, type ModeFilter } from "./profileData";

// A history row nudges right on hover.
const ROW = cn(
    "grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 py-2 px-2.5 rounded-2xl",
    "border-2 border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
    "transition-[translate] duration-400 ease-(--ease-settle) transform-gpu hover:translate-x-1",
);

const THUMB = cn(
    "box-border grid place-items-center size-11 overflow-hidden rounded-xl",
    "border-2 border-[#1A1418] bg-[#FFE3F1] font-bold text-lg text-[#1A1418]",
);

const RESULT = cn(
    "py-1 px-2.5 rounded-full no-underline whitespace-nowrap",
    "border-[1.5px] border-[#1A1418] shadow-[inset_0_2px_0_rgba(255,255,255,.6),2px_2.5px_0_#1A1418]",
    "font-bold text-[11px] text-[#1A1418]",
);

const STATUS_LINE = "py-4.5 font-medium text-sm text-center text-(--muted)";

interface ProfileHistoryProps {
    username: string;
    viewerKey: string;
    filter: ModeFilter;
    isOwner: boolean;
    hiddenFromVisitors: boolean;
    today: string;
}

const ProfileHistory = ({ username, viewerKey, filter, isOwner, hiddenFromVisitors, today }: ProfileHistoryProps) => {
    const mode = filter === "all" ? null : filter;
    const history = useInfiniteQuery({
        queryKey: ["profileHistory", username, mode, viewerKey],
        queryFn: ({ pageParam }) => getProfileHistory(username, mode, pageParam),
        initialPageParam: 0,
        // The next page starts after every entry loaded so far.
        getNextPageParam: (lastPage, pages) => (lastPage.has_more ? pages.reduce((count, page) => count + page.entries.length, 0) : undefined),
    });

    const entries = history.data?.pages.flatMap((page) => page.entries) ?? [];
    const note = isOwner
        ? hiddenFromVisitors
            ? "Only you can see this. It stays hidden on your public profile."
            : "Visitors only see the answers of days they finished themselves, so nobody gets spoiled."
        : "You only see the answers of days you finished. Locked days wait for you in the calendar.";

    return (
        <section
            className={cn(
                "profile-pane-enter flex flex-col gap-3.5 min-w-0 py-5 px-5.5 rounded-[23px]",
                "border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-(--card-depth)",
            )}
        >
            <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="m-0 font-bold text-lg leading-[1.2]">Game history</h2>
                <span className="ml-auto font-medium text-xs text-(--muted)">{modeName(filter)}</span>
            </div>

            <div className="flex items-center gap-2.5 py-2.5 px-3.5 rounded-[14px] border-2 border-dashed border-(--rule) font-medium text-[13px] leading-[1.4] text-(--muted)">
                <Lock size={16} strokeWidth={2.6} className="flex-none" />
                {note}
            </div>

            <div className="flex flex-col gap-2">
                {entries.map((entry) => <HistoryRow key={`${entry.date}-${entry.gamemode_id}`} entry={entry} today={today} />)}
            </div>

            {history.isPending && <span className={STATUS_LINE}>Loading games...</span>}
            {history.isError && <span className={STATUS_LINE}>Couldn't load the history.</span>}
            {history.isSuccess && !entries.length && <span className={STATUS_LINE}>No games in this mode yet...</span>}

            {history.hasNextPage && (
                <PressButton className="self-center h-11.5 px-5.5 text-sm" disabled={history.isFetchingNextPage} onClick={() => history.fetchNextPage()}>
                    {history.isFetchingNextPage ? "Loading..." : "Show more"}
                </PressButton>
            )}
        </section>
    );
};

const HistoryRow = ({ entry, today }: { entry: HistoryEntry; today: string }) => {
    const mode = modeById(entry.gamemode_id);
    const day = entry.day_number ? `Day ${entry.day_number}` : relativeDay(entry.date, today);

    if (entry.locked) {
        return (
            <div className={ROW}>
                <span className={THUMB}>
                    <Lock size={18} strokeWidth={2.6} />
                </span>

                <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-bold text-[15px] truncate">{mode.name} · {day}</span>
                    <span className="font-semibold text-xs text-(--muted) truncate">{relativeDay(entry.date, today)} · finish it to see the answer</span>
                </span>

                <Link to={`/calendar?mode=${mode.id}&date=${entry.date}`} className={cn(RESULT, "pp-focus bg-[#FFE3F1]")}>Play this day</Link>
            </div>
        );
    }

    const imageSource = resolveCdnUrl(entry.answer?.image_path ?? null);

    // No answer: the owner hasn't found it yet (or an old day without a recorded pick).
    const name = entry.answer?.name ?? (entry.won ? mode.name : "Not found yet");
    const tries = `${entry.guesses} ${entry.guesses === 1 ? "try" : "tries"}`;

    return (
        <div className={ROW}>
            <span className={THUMB}>
                {imageSource
                    ? <img src={imageSource} alt="" loading="lazy" className="block size-full object-cover" />
                    : entry.answer ? name[0] : <Lock size={18} strokeWidth={2.6} />}
            </span>

            <span className="flex flex-col gap-0.5 min-w-0">
                <span className="font-bold text-[15px] truncate">{name}</span>
                <span className="font-semibold text-xs text-(--muted) truncate">
                    {relativeDay(entry.date, today)} · {mode.name} · {day}{entry.is_calendar ? " · calendar" : ""}
                </span>
            </span>

            <span className={cn(RESULT, entry.won ? "bg-[#5EE8AA]" : "bg-[#FF926B]")}>{entry.won ? tries : `${tries} so far`}</span>
        </div>
    );
};

export default ProfileHistory;
