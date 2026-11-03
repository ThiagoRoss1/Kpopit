import { Lock } from "lucide-react";
import type { CalendarMode, YesterdayLocked } from "../../interfaces/gameInterfaces";
import YesterdayLockedPill from "../YesterdayLockedPill";
import { cn } from "../../lib/utils";

interface YesterdayLockedCardProps {
    mode: CalendarMode;
    day: YesterdayLocked;
}

/** The victory card keeps yesterday's place without fetching or rendering its answer. */
const YesterdayLockedCard = ({ mode, day }: YesterdayLockedCardProps) => {
    const isAlbum = mode === "pixelated";

    return (
        <section
            aria-label={`Yesterday's ${isAlbum ? "album" : "idol"}`}
            className={cn(
                "flex flex-col items-center gap-3 rounded-[20px] border py-4 px-4 mb-5 text-center",
                isAlbum ? "border-ink bg-cream text-ink" : "mx-4 sm:mx-6 border-white/35 bg-linear-to-r from-gray-600 to-gray-900 text-white",
            )}
        >
            <h3 className="m-0 font-bold text-xl">Yesterday's {isAlbum ? "album" : "idol"}</h3>

            <span className="grid place-items-center size-20 rounded-2xl border-2 border-current bg-black/10" aria-hidden>
                <Lock className="size-8" />
            </span>

            <YesterdayLockedPill mode={mode} date={day.yesterdays_pick_date} dayNumber={day.day_number} />
        </section>
    );
};

export default YesterdayLockedCard;
