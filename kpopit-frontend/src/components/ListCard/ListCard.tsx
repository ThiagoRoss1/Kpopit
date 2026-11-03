import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import IntentLink from "../Links/IntentLink";

interface ListCardProps {
    to: string;
    label: string;
    /** Position in the grid: sets the alternating tilt and the entrance delay. */
    index: number;
    /** Filtering reveals matches immediately; a fresh visit keeps the entrance. */
    animate?: boolean;
    stagger?: boolean;
    onIntent?: () => void;
    children: ReactNode;
}

/** The frame of an idol or album card in a list: it enters with the others, sits tilted on its pink
 *  depth, straightens on hover while the face lifts, and presses into the depth on click. The card
 *  carries `group`, so its content can react to the same hover and press. */
const ListCard = ({ to, label, index, animate = true, stagger = true, onIntent, children }: ListCardProps) => {
    const isEven = index % 2 === 0;

    return (
        <div
            className={cn("group", animate && "animate-[puffIn_0.78s_var(--ease-settle)_backwards]")}
            style={animate ? { animationDelay: stagger ? `${Math.min(260 + index * 45, 900)}ms` : "0ms" } : undefined}
        >
            <div
                className={cn(
                    "relative transition-[rotate] duration-420 ease-(--ease-settle) transform-gpu group-hover:rotate-0",
                    isEven ? "rotate-[-0.5deg]" : "rotate-[0.5deg]",
                )}
            >
                {/* The pink depth the face presses into */}
                <div
                    aria-hidden
                    className={cn(
                        "absolute inset-0 rounded-[23px] @max-[580px]:rounded-[20px] border-2 border-(--ink) bg-(--side)",
                        "translate-x-1.25 translate-y-1.5 @max-[580px]:translate-x-1 @max-[580px]:translate-y-1.25",
                    )}
                />

                <IntentLink
                    to={to}
                    onIntent={onIntent}
                    aria-label={label}
                    className={cn(
                        "relative block pt-1.75 px-1.75 pb-3.25 @max-[580px]:pt-1.5 @max-[580px]:px-1.5 @max-[580px]:pb-2.75",
                        "rounded-[23px] @max-[580px]:rounded-[20px] border-2 border-(--ink)",
                        "bg-(--face) text-(--face-ink) shadow-(--face-hl) no-underline cursor-pointer",
                        "transition-[translate,background-color] duration-380 ease-(--ease-settle) transform-gpu",
                        "[--press-x:5px] [--press-y:5px] @max-[580px]:[--press-x:4px] @max-[580px]:[--press-y:4px]",
                        "group-hover:-translate-x-px group-hover:-translate-y-0.75 group-hover:bg-(--face-hover)",
                        "group-active:translate-1.25 group-active:duration-120",
                        "@max-[580px]:group-active:translate-1",
                        "focus-visible:outline-3 focus-visible:outline-neon-pink focus-visible:outline-offset-5",
                    )}
                >
                    {children}
                </IntentLink>
            </div>
        </div>
    );
};

interface ListCardNameProps {
    children: ReactNode;
    className?: string;
}

/** The puffy name under a card's picture. */
export const ListCardName = ({ children, className }: ListCardNameProps) => {
    return (
        <div className={cn("mt-2.25 -mb-1.25 pt-0.75 pr-2 pb-1.5 pl-1.25 font-bold leading-[1.3] tracking-[-.005em]", className)}>
            <span className="block -mt-0.5 -mr-1.5 -mb-1.5 -ml-0.5 pt-0.5 pr-1.5 pb-1.5 pl-0.5 text-white text-shadow-(--puff-name) truncate">
                {children}
            </span>
        </div>
    );
};

/** The muted line under the name (group and company, artist and year...). */
export const ListCardMeta = ({ children }: { children: ReactNode }) => {
    return (
        <div className="flex items-baseline gap-1.5 min-w-0 pt-1.5 px-1.25 whitespace-nowrap overflow-hidden font-semibold text-[11.5px] @max-[580px]:text-[11px] leading-[1.4] text-(--muted)">
            {children}
        </div>
    );
};

export default ListCard;
