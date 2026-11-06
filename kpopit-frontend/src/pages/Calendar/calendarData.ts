import type { CalendarMode, CalendarTimelineDay } from "../../interfaces/gameInterfaces.ts";

export const MODES: { id: CalendarMode; name: string; noun: string }[] = [
    { id: "classic", name: "Classic", noun: "idol" },
    { id: "blurry", name: "Blurry", noun: "idol" },
    { id: "pixelated", name: "Pixelated", noun: "album" },
];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MON = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 864e5;

export const parseMode = (value: string | null): CalendarMode => (MODES.some((m) => m.id === value) ? (value as CalendarMode) : "classic");

/** UTC midnight of an ISO date (calendar maths without time zones). */
export const toT = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
export const toIso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => toIso(toT(iso) + n * DAY_MS);
export const daysBetween = (a: string, b: string) => Math.round((toT(b) - toT(a)) / DAY_MS);
/** Months as one number (year * 12 + month) to step through them. */
export const monthIndex = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
export const formatShort = (iso: string) => `${MON[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
export const formatLong = (iso: string) => `${WEEKDAYS[new Date(toT(iso)).getUTCDay()]}, ${formatShort(iso)}, ${iso.slice(0, 4)}`;

export type DayKind = "won" | "cal" | "started" | "unplayed" | "today" | "future" | "pre";

export interface CalendarDay {
    date: string;
    kind: DayKind;
    /** Day N of the mode (1 = its first challenge). */
    no: number | null;
    entry: CalendarTimelineDay | null;
}

/** What one date is for this player in a mode: finished (live or calendar), started, open, today,
 *  not yet open, or before the mode existed / without a challenge. */
export function dayOf(date: string, byDate: Map<string, CalendarTimelineDay>, first: string, today: string): CalendarDay {
    if (date < first) return { date, kind: "pre", no: null, entry: null };
    const no = daysBetween(first, date) + 1;
    if (date > today) return { date, kind: "future", no, entry: null };
    const entry = byDate.get(date) ?? null;
    if (!entry) return { date, kind: "pre", no, entry };
    if (entry.status === "won_live") return { date, kind: "won", no, entry };
    if (entry.status === "won_calendar") return { date, kind: "cal", no, entry };
    if (date === today) return { date, kind: "today", no, entry };
    return { date, kind: entry.status === "in_progress" ? "started" : "unplayed", no, entry };
}

export const isDone = (kind: DayKind) => kind === "won" || kind === "cal";
