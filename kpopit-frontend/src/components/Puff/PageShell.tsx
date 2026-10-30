import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import PuffTitle, { KoreanTag } from "./PuffTitle";
import "./puff.css";

export interface PageHeaderProps {
    title: ReactNode;
    korean?: string;
    koreanLength?: "short" | "mid" | "long";
    subtitle?: ReactNode;
    align?: "center" | "left";
}

/** Puff Pop page: cream (or graphite) dot ground with the page padding; the theme comes from
 *  the nearest data-theme (the saved choice on <html>). */
export default function PageShell({ header, children, className, width = "max-w-[1000px]" }: {
    header?: PageHeaderProps;
    children: ReactNode;
    className?: string;
    width?: string;
}) {
    return (
        <div className="pp-root @container relative isolate flex-1 bg-(--ground) text-(--text) transition-colors duration-300">
            <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none bg-[radial-gradient(circle,var(--dot)_1.4px,transparent_1.8px)] bg-size-[19px_19px]" />
            <div className={cn("relative px-12 pb-[72px] @max-[900px]:px-7 @max-[580px]:px-4", className)}>
                <div className={cn("mx-auto w-full", width)}>
                    {header && <PageHeader {...header} />}
                    {children}
                </div>
            </div>
        </div>
    );
}

export function PageHeader({ title, korean, koreanLength, subtitle, align = "center" }: PageHeaderProps) {
    return (
        <header
            className={cn(
                "pp-enter [--pp-anim:puffSide] [--pp-delay:80ms] flex flex-col gap-2.5 pt-3",
                align === "center" ? "items-center text-center" : "items-start text-left",
            )}
        >
            <div className="flex items-center gap-3.5 max-w-full">
                <PuffTitle className="text-[60px] @max-[580px]:text-[44px]">{title}</PuffTitle>
                {korean && <KoreanTag length={koreanLength}>{korean}</KoreanTag>}
            </div>
            {subtitle && <p className="m-0 font-medium text-[15px] leading-normal text-(--muted)">{subtitle}</p>}
        </header>
    );
}
