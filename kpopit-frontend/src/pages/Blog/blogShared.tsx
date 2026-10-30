import { cn } from "../../lib/utils";
import type { PostTag } from "../../utils/posts";
import { TAG_BG } from "./blogData";

export function TagChip({ tag, className }: { tag: PostTag; className?: string }) {
    return (
        <span
            className={cn("inline-flex px-2.5 py-[3px] rounded-full border-[1.5px] border-[#1A1418] text-[#1A1418] font-bold text-[10px] tracking-[.08em] shadow-[inset_0_2px_0_rgba(255,255,255,.6),2px_2.5px_0_#1A1418]", className)}
            style={{ background: TAG_BG[tag] }}
        >
            {tag.toUpperCase()}
        </span>
    );
}

export function Sticker({ children, tone, className }: { children: string; tone: "pink" | "butter"; className?: string }) {
    return (
        <span
            className={cn(
                "px-2.5 py-1 rounded-full border-2 border-[#1A1418] font-bold text-[10.5px] tracking-[.08em] shadow-[inset_0_2px_0_rgba(255,255,255,.55),2px_3px_0_#1A1418]",
                tone === "pink" ? "bg-[#FF70B8] text-white [text-shadow:var(--tag-text)]" : "bg-[#FFD64F] text-[#1A1418]",
                className,
            )}
        >
            {children}
        </span>
    );
}

/** Small uppercase label followed by a dashed rule. */
export function SectionRule({ label, count }: { label: string; count?: number }) {
    return (
        <div className="flex items-center gap-3">
            <span className="font-semibold text-[11px] tracking-[.14em] text-(--muted)">{label}</span>
            {count !== undefined && (
                <span className="font-bold text-[11px] leading-none text-(--chip-ink) bg-(--chip) border-[1.5px] border-(--ink) rounded-full px-2 py-[3px]">{count}</span>
            )}
            <span aria-hidden className="flex-1 h-0.5 bg-[repeating-linear-gradient(90deg,var(--rule)_0_8px,transparent_8px_14px)]" />
        </div>
    );
}
