import type { PostTag } from "../../utils/posts";
import { cn } from "../../lib/utils";

// Tailwind looks shared by the blog list and the post page.

export const TAG_GROUND: Record<PostTag, string> = {
    Update: "bg-[#5EE8AA]",
    "Dev log": "bg-[#FFD64F]",
    Thoughts: "bg-[#FF8AC4]",
    News: "bg-[#FF926B]",
};

// Keep the frame's tilt fixed while the photo zooms, avoiding a slow re-raster of every border.
export const CARD_MOTION = cn(
    "group/card pp-focus no-underline text-(--face-ink) border-2 border-(--ink) bg-(--face)",
    "transition-[translate,box-shadow] duration-350 ease-(--ease-settle) transform-gpu",
    "hover:-translate-y-1 pressed:duration-160 [--press-x:3px] [--press-y:4px]",
);

export const CARD_DEPTH = cn(
    "shadow-[3px_4px_0_var(--ctl-off),var(--in)]",
    "pressed:translate-x-0.75 pressed:translate-y-1 pressed:shadow-[0_0_0_var(--ctl-off),var(--in)]",
);

export const FEATURED_DEPTH = cn(
    "[--press-x:5px] [--press-y:5px]",
    "shadow-[5px_5px_0_0_#FF8AC4,5px_5px_0_2px_var(--ink)]",
    "pressed:translate-1.25 pressed:shadow-[0_0_0_0_#FF8AC4,0_0_0_2px_var(--ink)]",
);

// The cover zooms in on itself (never through its frame), so the photo stays sharp.
export const COVER_ZOOM = "transition-[scale] duration-500 ease-(--ease-settle) transform-gpu group-hover/card:scale-105";

// The arrow of a card nudges out on hover.
export const CARD_ARROW = "transition-[translate] duration-400 ease-(--ease-pop) will-change-transform group-hover/card:translate-x-0.75";
