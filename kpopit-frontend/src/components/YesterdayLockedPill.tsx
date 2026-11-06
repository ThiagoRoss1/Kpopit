import { Link } from "react-router";
import { Lock } from "lucide-react";

/** Yesterday's answer for a player who didn't finish that day: a small lock pill that opens the
 *  day in the calendar instead of the name (old game-page look). */
export default function YesterdayLockedPill({ mode, date, dayNumber }: { mode: "classic" | "blurry" | "pixelated"; date: string; dayNumber: number | null }) {
    return (
        <Link
            to={`/calendar?mode=${mode}&date=${date}`}
            aria-label="Play yesterday in the calendar"
            className="inline-flex items-center gap-1.5 align-middle px-2.5 py-0.5 rounded-full border border-[#b43777] bg-[#b43777]/20 text-[#ff70b8] text-[0.85em] font-bold no-underline hover:bg-[#b43777]/40 hover:brightness-125 transition-all duration-300"
        >
            <Lock className="size-[0.9em]" strokeWidth={3} aria-hidden />
            {dayNumber ? `Day ${dayNumber}` : "Locked"}
        </Link>
    );
}
