import type { ElementType, ReactNode } from "react";
import { cn } from "../../lib/utils";

/** Puffy white-on-pink lettering, only for names and titles. */
export default function PuffTitle({ as: Tag = "h1", className, children }: { as?: ElementType; className?: string; children: ReactNode }) {
    return (
        <Tag className={cn("m-0 whitespace-nowrap font-bold leading-[1.05] text-white [text-shadow:var(--puff-title)] -rotate-[1.5deg] puff-ink pr-1.5 pb-2.5 pl-1", className)}>
            {children}
        </Tag>
    );
}

/** Small Hangul sticker next to a page title; long ones hide sooner on narrow screens. */
export function KoreanTag({ children, length = "short" }: { children: ReactNode; length?: "short" | "mid" | "long" }) {
    return (
        <span
            lang="ko"
            className={cn(
                "flex-none whitespace-nowrap font-korean font-bold text-sm leading-none text-(--chip-ink) bg-(--chip) border-2 border-(--ink) rounded-[10px] px-[9px] py-1.5 [box-shadow:2px_3px_0_var(--ctl-off)] rotate-4",
                "@max-[359px]:hidden",
                length === "mid" && "@max-[389px]:hidden",
                length === "long" && "@max-[419px]:hidden",
            )}
        >
            {children}
        </span>
    );
}
