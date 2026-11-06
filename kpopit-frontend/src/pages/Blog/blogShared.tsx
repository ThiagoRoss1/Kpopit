import { cn } from "../../lib/utils";
import type { Post, PostTag } from "../../utils/posts";
import { COVER_ZOOM, TAG_GROUND } from "./blogLooks";

export const TagChip = ({ tag, className }: { tag: PostTag; className?: string }) => {
    return (
        <span
            className={cn(
                "inline-flex px-2.5 py-0.75 rounded-full",
                "border-[1.5px] border-[#1A1418] shadow-[inset_0_2px_0_rgba(255,255,255,.6),2px_2.5px_0_#1A1418]",
                "font-bold text-[10px] tracking-[.08em] text-[#1A1418]",
                TAG_GROUND[tag],
                className,
            )}
        >
            {tag.toUpperCase()}
        </span>
    );
};

export const Sticker = ({ children, tone, className }: { children: string; tone: "pink" | "butter"; className?: string }) => {
    return (
        <span
            className={cn(
                "px-2.5 py-1 rounded-full border-2 border-[#1A1418] shadow-[inset_0_2px_0_rgba(255,255,255,.55),2px_3px_0_#1A1418]",
                "font-bold text-[10.5px] tracking-[.08em]",
                tone === "pink" ? "bg-[#FF70B8] text-white text-shadow-(--tag-text)" : "bg-[#FFD64F] text-[#1A1418]",
                className,
            )}
        >
            {children}
        </span>
    );
};

/** A post's cover in its frame; it zooms in when its card is hovered. */
export const Cover = ({ post, className, ratio = "aspect-16/10" }: { post: Post; className?: string; ratio?: string }) => {
    return (
        <div className={cn("isolate overflow-hidden border-2 border-[#1A1418] bg-[#1A1418] transform-gpu", ratio, className)}>
            <img draggable={false} src={post.image} alt="" loading="lazy" className={cn("block size-full object-cover backface-hidden", COVER_ZOOM)} />
        </div>
    );
};

/** Small uppercase label followed by a dashed rule. */
export const SectionRule = ({ label, count }: { label: string; count?: number }) => {
    return (
        <div className="flex items-center gap-3">
            <span className="font-semibold text-[11px] tracking-[.14em] text-(--muted)">{label}</span>

            {count !== undefined && (
                <span className="px-2 py-0.75 rounded-full border-[1.5px] border-(--ink) bg-(--chip) font-bold text-[11px] leading-none text-(--chip-ink)">
                    {count}
                </span>
            )}

            <span aria-hidden className="flex-1 h-0.5 bg-[repeating-linear-gradient(90deg,var(--rule)_0_8px,transparent_8px_14px)]" />
        </div>
    );
};
