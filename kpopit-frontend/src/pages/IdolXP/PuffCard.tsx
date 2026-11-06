import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

type PuffCardProps = { tilt?: number } & ComponentProps<"div">;

/** Card face with the pink thickness layer. `tilt` alternates ±0.5° in lists, and the card
 *  straightens and lifts on hover. */
const PuffCard = ({ tilt, className, ...rest }: PuffCardProps) => {
    const tilted = tilt !== undefined;

    return (
        <div
            {...rest}
            className={cn(
                "bg-(--face) text-(--face-ink) border-2 border-(--ink) rounded-[23px] shadow-(--card-depth)",
                tilted && "transition-[translate,rotate] duration-500 ease-(--ease-settle) hover:-translate-y-1 hover:rotate-0",
                tilted && (tilt % 2 ? "rotate-[0.5deg]" : "rotate-[-0.5deg]"),
                className,
            )}
        />
    );
};

export default PuffCard;
