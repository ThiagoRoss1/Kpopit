import type { PostTag } from "../../utils/posts";

// Tailwind looks shared by the blog list and the post page.

export const TAG_GROUND: Record<PostTag, string> = {
    Update: "bg-[#5EE8AA]",
    "Dev log": "bg-[#FFD64F]",
    Thoughts: "bg-[#FF8AC4]",
    News: "bg-[#FF926B]",
};

// A post card: a slow settle lift that straightens its tilt, and a press that sinks into its depth.
export const CARD_MOTION = [
    "group/card pp-focus no-underline text-(--face-ink) border-2 border-(--ink) bg-(--face)",
    "transition-[translate,rotate,box-shadow] duration-850 ease-(--ease-settle) transform-gpu",
    "hover:-translate-y-1 hover:rotate-0 active:rotate-0 active:duration-160",
].join(" ");

export const CARD_DEPTH = "shadow-[3px_4px_0_var(--ctl-off),var(--in)] active:translate-x-0.75 active:translate-y-1 active:shadow-[0_0_0_var(--ctl-off),var(--in)]";

export const FEATURED_DEPTH = "shadow-[5px_5px_0_0_#FF8AC4,5px_5px_0_2px_var(--ink)] active:translate-1.25 active:shadow-[0_0_0_0_#FF8AC4,0_0_0_2px_var(--ink)]";

// The cover zooms in on itself (never through its frame), so the photo stays sharp.
export const COVER_ZOOM = "transition-[scale] duration-1000 ease-(--ease-settle) group-hover/card:scale-105";

// The arrow of a card nudges out on hover.
export const CARD_ARROW = "transition-[translate] duration-400 ease-(--ease-pop) will-change-transform group-hover/card:translate-x-0.75";
