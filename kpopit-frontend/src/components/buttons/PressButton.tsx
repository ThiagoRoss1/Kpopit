import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "../../lib/utils";

export type PressVariant = "chip" | "cta" | "pink" | "ghost";

// Main CTA: hot pink with white lettering; disabled = chip colour, never pink.
const VARIANTS: Record<PressVariant, string> = {
    chip: "bg-(--chip) text-(--chip-ink)",
    cta: cn(
        "bg-[#FF70B8] text-white text-shadow-(--cta-text) [--pp-in:var(--in-pink)]",
        "disabled:bg-(--chip) disabled:text-(--muted) disabled:text-shadow-none disabled:[--pp-in:var(--in)]",
    ),
    pink: "bg-[#FF8AC4] text-[#1A1418] [--pp-in:var(--in-pink)]",
    ghost: "bg-transparent text-(--muted) border-transparent shadow-none",
};

const SIZES = {
    sm: "h-9 px-3.5 text-[13px]",
    md: "h-10 px-4 text-sm",
    lg: "h-12.5 px-6.5 text-base",
};

export interface PressStyle {
    variant?: PressVariant;
    size?: keyof typeof SIZES;
    className?: string;
    children: ReactNode;
}

const pressClasses = ({ variant = "chip", size = "md", className }: Omit<PressStyle, "children">) => cn(
    "pp-press pp-focus inline-flex items-center justify-center gap-2",
    "rounded-full border-2 border-(--ink)",
    "font-bold whitespace-nowrap no-underline cursor-pointer select-none",
    VARIANTS[variant],
    SIZES[size],
    className,
);

// An explicit chip variant turns pink-tinted on hover (pp-press reads data-hover).
const hoverOf = (variant?: PressVariant) => (variant === "chip" ? "chip" : undefined);

/** Puff Pop button: lifts on hover (hover devices only), presses into its depth. */
export const PressButton = ({ variant, size, className, ...rest }: PressStyle & ComponentProps<"button">) => {
    return (
        <button
            type="button"
            {...rest}
            data-hover={hoverOf(variant)}
            className={pressClasses({ variant, size, className })}
        />
    );
};

/** Same look, as an in-app link. */
export const PressLink = ({ variant, size, className, ...rest }: PressStyle & ComponentProps<typeof Link>) => {
    return (
        <Link
            {...rest}
            data-hover={hoverOf(variant)}
            className={pressClasses({ variant, size, className })}
        />
    );
};

/** Same look, as an external link (new tab). */
export const PressAnchor = ({ variant, size, className, ...rest }: PressStyle & ComponentProps<"a">) => {
    return (
        <a
            target="_blank"
            rel="noopener noreferrer"
            {...rest}
            data-hover={hoverOf(variant)}
            className={pressClasses({ variant, size, className })}
        />
    );
};

/** Toggle pill (filters, tabs): the active one is pink and sits pressed. */
export const Pill = ({ active, className, children, ...rest }: { active: boolean } & Omit<ComponentProps<"button">, "aria-pressed">) => {
    return (
        <button
            type="button"
            aria-pressed={active}
            {...rest}
            data-hover="chip"
            className={cn(
                "pp-press pp-focus inline-flex items-center gap-2 h-10 px-4",
                "rounded-full border-2 border-(--ink)",
                "font-semibold text-sm whitespace-nowrap cursor-pointer",
                active ? "bg-[#FF8AC4] text-[#1A1418]" : "bg-(--chip) text-(--chip-ink)",
                className,
            )}
        >
            {children}
        </button>
    );
};
