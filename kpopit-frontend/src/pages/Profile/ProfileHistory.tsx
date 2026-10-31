import { Link } from "react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { PressButton } from "../../components/Puff/PressButton";
import { getProfileHistory } from "../../services/api";
import { resolveCdnUrl } from "../../utils/imageUrl";
import type { HistoryEntry } from "../../interfaces/playerInterfaces";
import { modeById, modeName, relativeDay, type ModeFilter } from "./profileData";

const ROW = "up-row grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3 items-center py-2 px-2.5 rounded-2xl border-2 border-(--ink) bg-(--chip) [box-shadow:2px_3px_0_var(--ctl-off),var(--in)]";
const THUMB = "w-11 h-11 box-border rounded-xl border-2 border-[#1A1418] overflow-hidden bg-[#FFE3F1] grid place-items-center font-bold text-lg text-[#1A1418]";
const RESULT = "py-1 px-2.5 rounded-full border-[1.5px] border-[#1A1418] text-[#1A1418] font-bold text-[11px] whitespace-nowrap [box-shadow:inset_0_2px_0_rgba(255,255,255,.6),2px_2.5px_0_#1A1418] no-underline";

export default function ProfileHistory({ username, viewerKey, filter, isOwner, hiddenFromVisitors, today }: {
    username: string;
    viewerKey: string;
    filter: ModeFilter;
    isOwner: boolean;
    hiddenFromVisitors: boolean;
    today: string;
}) {
    const mode = filter === "all" ? null : filter;
    const history = useInfiniteQuery({
        queryKey: ["profileHistory", username, mode, viewerKey],
        queryFn: ({ pageParam }) => getProfileHistory(username, mode, pageParam),
        initialPageParam: 0,
        getNextPageParam: (last, pages) => (last.has_more ? pages.reduce((n, p) => n + p.entries.length, 0) : undefined),
    });
    const entries = history.data?.pages.flatMap((p) => p.entries) ?? [];
    const note = isOwner
        ? hiddenFromVisitors
            ? "Only you can see this. It stays hidden on your public profile."
            : "Visitors only see the answers of days they finished themselves, so nobody gets spoiled."
        : "You only see the answers of days you finished. Locked days wait for you in the calendar.";

    return (
        <section className="up-pane bg-(--face) text-(--face-ink) border-2 border-(--ink) rounded-[23px] [box-shadow:var(--card-depth)] py-5 px-[22px] flex flex-col gap-3.5 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="m-0 font-bold text-lg leading-[1.2]">Game history</h2>
                <span className="ml-auto font-medium text-xs text-(--muted)">{modeName(filter)}</span>
            </div>
            <div className="flex items-center gap-2.5 py-2.5 px-3.5 rounded-[14px] border-2 border-dashed border-(--rule) font-medium text-[13px] leading-[1.4] text-(--muted)">
                <Lock size={16} strokeWidth={2.6} className="flex-none" />{note}
            </div>
            <div className="flex flex-col gap-2">
                {entries.map((entry) => <HistoryRow key={`${entry.date}-${entry.gamemode_id}`} entry={entry} today={today} />)}
            </div>
            {history.isPending && <span className="py-[18px] text-center font-medium text-sm text-(--muted)">Loading games...</span>}
            {history.isError && <span className="py-[18px] text-center font-medium text-sm text-(--muted)">Couldn't load the history.</span>}
            {history.isSuccess && !entries.length && <span className="py-[18px] text-center font-medium text-sm text-(--muted)">No games in this mode yet...</span>}
            {history.hasNextPage && (
                <PressButton className="self-center h-[46px] px-[22px] text-sm" disabled={history.isFetchingNextPage} onClick={() => history.fetchNextPage()}>
                    {history.isFetchingNextPage ? "Loading..." : "Show more"}
                </PressButton>
            )}
        </section>
    );
}

function HistoryRow({ entry, today }: { entry: HistoryEntry; today: string }) {
    const mode = modeById(entry.gamemode_id);
    const day = entry.day_number ? `Day ${entry.day_number}` : relativeDay(entry.date, today);
    if (entry.locked) {
        return (
            <div className={ROW}>
                <span className={THUMB}><Lock size={18} strokeWidth={2.6} /></span>
                <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-bold text-[15px] truncate">{mode.name} · {day}</span>
                    <span className="font-semibold text-xs text-(--muted) truncate">{relativeDay(entry.date, today)} · finish it to see the answer</span>
                </span>
                <Link to={`/calendar?mode=${mode.id}&date=${entry.date}`} className={`${RESULT} pp-focus bg-[#FFE3F1]`}>Play this day</Link>
            </div>
        );
    }
    const src = resolveCdnUrl(entry.answer?.image_path ?? null);
    // No answer: the owner hasn't found it yet (or an old day without a recorded pick).
    const name = entry.answer?.name ?? (entry.won ? mode.name : "Not found yet");
    const tries = `${entry.guesses} ${entry.guesses === 1 ? "try" : "tries"}`;
    return (
        <div className={ROW}>
            <span className={THUMB}>{src ? <img src={src} alt="" loading="lazy" className="w-full h-full object-cover block" /> : entry.answer ? name[0] : <Lock size={18} strokeWidth={2.6} />}</span>
            <span className="flex flex-col gap-0.5 min-w-0">
                <span className="font-bold text-[15px] truncate">{name}</span>
                <span className="font-semibold text-xs text-(--muted) truncate">
                    {relativeDay(entry.date, today)} · {mode.name} · {day}{entry.is_calendar ? " · calendar" : ""}
                </span>
            </span>
            <span className={RESULT} style={{ background: entry.won ? "#5EE8AA" : "#FF926B" }}>{entry.won ? tries : `${tries} so far`}</span>
        </div>
    );
}
