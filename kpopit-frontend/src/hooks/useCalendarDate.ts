import { useSearchParams } from "react-router";
import { useFeatures } from "./useFeatures";
import { useHydrated } from "./useHydrated";
import { isIsoDate } from "../utils/isoDate";

/** The past day a game page should play (?date=YYYY-MM-DD), or null for today's live game. Only
 *  after hydration and while the calendar is on. The server checks the range. */
export function useCalendarDate(): string | null {
    const hydrated = useHydrated();
    const [params] = useSearchParams();
    const { features } = useFeatures();
    const date = params.get("date");
    return hydrated && features.calendar && isIsoDate(date) ? date : null;
}
