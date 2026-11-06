import type { ElementType, ReactNode } from "react";
import { cn } from "../../lib/utils";

interface PuffTitleProps {
    as?: ElementType;
    className?: string;
    children: ReactNode;
}

/** Puffy white-on-pink lettering, only for names and titles. puff-ink gives it the headroom its
 *  outline needs above the tall letters, so nothing around it can clip the top. */
const PuffTitle = ({ as: Tag = "h1", className, children }: PuffTitleProps) => {
    return (
        <Tag
            className={cn(
                "m-0 pr-1.5 pb-2.5 pl-1 puff-ink",
                "font-bold leading-[1.05] whitespace-nowrap text-white text-shadow-(--puff-title)",
                "rotate-[-1.5deg]",
                className,
            )}
        >
            {children}
        </Tag>
    );
};

interface KoreanTagProps {
    children: ReactNode;
    length?: "short" | "mid" | "long";
}

/** Small Hangul sticker next to a page title; long ones hide sooner on narrow screens. */
export const KoreanTag = ({ children, length = "short" }: KoreanTagProps) => {
    return (
        <span
            lang="ko"
            className={cn(
                "flex-none px-2.25 py-1.5 rounded-[10px] border-2 border-(--ink)",
                "bg-(--chip) shadow-[2px_3px_0_var(--ctl-off)] rotate-4",
                "font-korean font-bold text-sm leading-none whitespace-nowrap text-(--chip-ink)",
                "@max-[359px]:hidden",
                length === "mid" && "@max-[389px]:hidden",
                length === "long" && "@max-[419px]:hidden",
            )}
        >
            {children}
        </span>
    );
};

export default PuffTitle;
