import { useSearchParams } from "react-router";
import { useFeatures } from "./useFeatures";

/** The past day a game page should play (?date=YYYY-MM-DD), or null for today's live game. Only
 *  while the calendar is on; the server checks the range. */
export function useCalendarDate(): string | null {
    const [params] = useSearchParams();
    const { features } = useFeatures();
    const date = params.get("date");
    return features.calendar && date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}
