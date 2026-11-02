import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { resolveCdnUrl } from "../../utils/imageUrl";
import IntentLink from "../Links/IntentLink";
import { PREFETCH, type NavPage, type NavRow } from "./navigation";

/** The pink "you are here" dot. */
export const Dot = ({ size = "md" }: { size?: "sm" | "md" }) => {
    return (
        <span
            aria-hidden
            className={cn(
                "flex-none rounded-full bg-neon-pink border-[#1A1418]",
                size === "md" ? "size-2.25 border-2" : "size-1.75 border-[1.5px]",
            )}
        />
    );
};

/** The yellow "SOON" sticker of a row that isn't linked yet. */
export const SoonTag = () => {
    return (
        <span
            className={cn(
                "flex-none px-2.25 py-0.75 rounded-full border-[1.5px] border-[#1A1418] bg-[#FFD64F] rotate-4",
                "shadow-[inset_0_2px_0_rgba(255,255,255,.6),1.5px_2px_0_#1A1418]",
                "font-bold text-[10px] tracking-[.08em] text-[#1A1418]",
            )}
        >
            SOON
        </span>
    );
};

interface TileProps {
    row: NavRow;
    size: "lg" | "sm";
    /** Tilts on the parent row's hover (the row carries `group`). */
    animated?: boolean;
}

/** A row's square: an icon (About rows) or a photo (games, idols). */
export const Tile = ({ row, size, animated = false }: TileProps) => {
    const motion = animated && "transition-transform duration-450 ease-(--ease-pop) transform-gpu group-hover:-rotate-4";

    if (row.icon) {
        const Icon = row.icon;

        return (
            <span
                className={cn(
                    "flex-none grid place-items-center box-border border-2 border-[#1A1418] bg-(--tile)",
                    size === "lg"
                        ? "size-11 rounded-[13px] shadow-[2px_2.5px_0_#1A1418,var(--tile-in)]"
                        : "size-8.5 rounded-[11px] shadow-(--tile-in)",
                    motion,
                )}
            >
                <Icon className={size === "lg" ? "size-5" : "size-4.25"} stroke="var(--tile-ink)" strokeWidth={2.6} aria-hidden />
            </span>
        );
    }

    return (
        <span
            className={cn(
                "flex-none box-border overflow-hidden rounded-[13px] border-2 border-[#1A1418] bg-[#DCD6D2]",
                size === "lg" ? "size-11.5 shadow-[2px_2px_0_#1A1418]" : "size-10",
                motion,
            )}
        >
            <img
                src={resolveCdnUrl(row.img ?? null) ?? ""}
                alt=""
                loading="lazy"
                className={cn("block size-full object-cover", row.imgClass)}
                draggable={false}
            />
        </span>
    );
};

interface RowLinkProps {
    row: NavRow;
    className: string;
    children: ReactNode;
    role?: string;
}

/** A row as a link, or as an inert box while it has no page yet (WIP). */
export const RowLink = ({ row, className, children, role }: RowLinkProps) => {
    if (row.wip || !row.to) {
        return (
            <div aria-disabled="true" role={role} className={className}>
                {children}
            </div>
        );
    }

    return (
        <IntentLink to={row.to} onIntent={PREFETCH[row.id as NavPage]} role={role} className={className}>
            {children}
        </IntentLink>
    );
};
