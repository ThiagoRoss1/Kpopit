import { resolveCdnUrl } from "../../utils/imageUrl";
import type { DayKind } from "./calendarData";

// How each kind of day looks, shared by the month cells, the timeline rows and the side panel.

export const imageUrl = (path: string | null | undefined) => resolveCdnUrl(path ?? null) ?? "";

export const KIND_WORD: Record<DayKind, string> = {
    won: "guessed live",
    cal: "played from the calendar",
    started: "started, not finished",
    unplayed: "not played",
    today: "today",
    future: "locked",
    pre: "",
};

// A day's frame: its border and depth.
export const DAY_FRAME: Record<DayKind, string> = {
    won: "border-2 border-(--ink) shadow-[0_4px_0_0_var(--side),0_4px_0_2px_var(--ink)]",
    cal: "border-2 border-(--ink) shadow-[0_4px_0_0_var(--side),0_4px_0_2px_var(--ink)]",
    started: "border-2 border-(--ink)",
    unplayed: "border-2 border-(--rule)",
    today: "border-2 border-neon-pink shadow-[2px_3px_0_#FF3399]",
    future: "border-2 border-dashed border-(--rule)",
    pre: "border-2 border-transparent",
};

export const DAY_GROUND: Record<DayKind, string> = {
    won: "bg-(--face)",
    cal: "bg-(--face)",
    started: "bg-(--face)",
    unplayed: "bg-(--face)",
    today: "bg-(--face)",
    future: "bg-transparent",
    pre: "bg-transparent",
};

// The word under a month cell that has no answer yet.
export const DAY_TAG: Record<DayKind, string> = {
    won: "",
    cal: "calendar",
    started: "keep going",
    unplayed: "play",
    today: "today",
    future: "",
    pre: "",
};

export const STRIPES = "bg-[repeating-linear-gradient(45deg,rgba(255,138,196,.5)_0_5px,transparent_5px_10px)]";
export const SMALL_STRIPES = "bg-[repeating-linear-gradient(45deg,rgba(255,138,196,.7)_0_3px,transparent_3px_6px)]";

// A round pill button that lifts on hover and presses into its depth.
export const CALENDAR_BUTTON = [
    "pp-focus border-2 border-(--ink) cursor-pointer",
    "transition-[translate,box-shadow,background-color] duration-450 ease-(--ease-settle) will-change-transform",
    "enabled:hover:-translate-y-0.5 enabled:active:translate-x-0.5 enabled:active:translate-y-0.75 enabled:active:duration-180",
].join(" ");
