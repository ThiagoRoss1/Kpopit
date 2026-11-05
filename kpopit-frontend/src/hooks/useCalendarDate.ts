import { useSearchParams } from "react-router";
import { useFeatures } from "./useFeatures";
import { useHydrated } from "./useHydrated";

/** The past day a game page should play (?date=YYYY-MM-DD), or null for today's live game. Only
 *  after hydration and while the calendar is on. The server checks the range. */
export function useCalendarDate(): string | null {
    const hydrated = useHydrated();
    const [params] = useSearchParams();
    const { features } = useFeatures();
    const date = params.get("date");
    return hydrated && features.calendar && date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}
