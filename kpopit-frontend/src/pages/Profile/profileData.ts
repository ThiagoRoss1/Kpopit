import type { CalendarMode } from "../../interfaces/gameInterfaces";
import type { RateBucket } from "../../interfaces/playerInterfaces";

export type ProfileTab = "overview" | "stats" | "history";
export type ModeFilter = CalendarMode | "all";

export const TABS: { id: ProfileTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "stats", label: "Stats" },
    { id: "history", label: "History" },
];

export const MODES: { id: CalendarMode; name: string; color: string; gamemodeId: number }[] = [
    { id: "classic", name: "Classic", color: "#FF3399", gamemodeId: 1 },
    { id: "blurry", name: "Blurry", color: "#FF8AC4", gamemodeId: 2 },
    { id: "pixelated", name: "Pixelated", color: "#FFE3F1", gamemodeId: 3 },
];

export const modeById = (gamemodeId: number) => MODES.find((m) => m.gamemodeId === gamemodeId) ?? MODES[0];
export const modeName = (filter: ModeFilter) => (filter === "all" ? "All modes" : MODES.find((m) => m.id === filter)!.name);

/** ?tab= (the old ?tab=taste opens Stats); anything else is the overview. */
export function parseTab(value: string | null): ProfileTab {
    if (value === "taste") return "stats";
    return TABS.some((t) => t.id === value) ? (value as ProfileTab) : "overview";
}

export const HEAT_DAYS = 18 * 7;
export const HEAT_TONES = ["var(--heat-0)", "var(--heat-1)", "var(--heat-2)", "var(--heat-3)"];
export const GROUP_COLORS = ["#FF3399", "#FF8AC4", "#C62368", "#FF70B8", "#FFD1E8", "var(--track)"];

const DAY_MS = 864e5;
const isoPlus = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** The last 18 weeks ending on `today`, oldest first, with the modes played each day (0-3). */
export function heatmapDays(today: string, activity: { date: string; modes: number }[]): { date: string; modes: number }[] {
    const byDate = new Map(activity.map((a) => [a.date, a.modes]));
    return Array.from({ length: HEAT_DAYS }, (_, n) => {
        const date = isoPlus(today, n - HEAT_DAYS + 1);
        return { date, modes: Math.min(3, byDate.get(date) ?? 0) };
    });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const formatDay = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
export const formatJoined = (iso: string | null) => (iso ? `Joined ${formatDay(iso)}, ${iso.slice(0, 4)}` : null);

/** "Today" / "Yesterday" / "Oct 8" relative to the game day. */
export function relativeDay(iso: string, today: string) {
    if (iso === today) return "Today";
    if (iso === isoPlus(today, -1)) return "Yesterday";
    return formatDay(iso);
}

/** mm:ss, or h:mm:ss past an hour; "—" without a trustworthy time. */
export function formatDuration(seconds: number | null) {
    if (seconds === null) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export const rate = (wins: number, played: number) => (played ? Math.round((wins * 100) / played) : 0);

/** Win-rate line: x across the buckets, y from 0% (bottom) to 100% (top); empty buckets break the line. */
export const CHART_W = 640;
export const chartY = (value: number) => 10 + 180 * (1 - value / 100);

export function linePath(buckets: RateBucket[]) {
    const step = buckets.length > 1 ? CHART_W / (buckets.length - 1) : 0;
    const segments: string[][] = [];
    let open = false;
    buckets.forEach((bucket, i) => {
        if (!bucket.played) {
            open = false;
            return;
        }
        if (!open) segments.push([]);
        segments[segments.length - 1].push(`${(i * step).toFixed(1)},${chartY(rate(bucket.wins, bucket.played)).toFixed(1)}`);
        open = true;
    });
    // A lone bucket gets a tiny segment so its round cap shows as a dot.
    return segments.map((points) => `M${points.join(" L")}${points.length === 1 ? " h0.01" : ""}`).join(" ");
}

export const lastRate = (buckets: RateBucket[]) => {
    const last = [...buckets].reverse().find((b) => b.played);
    return last ? `${rate(last.wins, last.played)}%` : "—";
};
