import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

/** Card face with the pink thickness layer. `tilt` alternates ±0.5° in lists. */
export default function PuffCard({ tilt, className, style, ...rest }: { tilt?: number } & ComponentProps<"div">) {
    return (
        <div
            {...rest}
            style={tilt === undefined ? style : { ...style, ["--pp-tilt" as string]: `${tilt % 2 ? 0.5 : -0.5}deg` }}
            className={cn(
                "bg-(--face) text-(--face-ink) border-2 border-(--ink) rounded-[23px] shadow-(--card-depth)",
                tilt !== undefined && "pp-tilt",
                className,
            )}
        />
    );
}
