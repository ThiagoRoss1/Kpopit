import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import PuffTitle, { KoreanTag } from "./PuffTitle";

export interface PageHeaderProps {
    title: ReactNode;
    korean?: string;
    koreanLength?: "short" | "mid" | "long";
    subtitle?: ReactNode;
    align?: "center" | "left";
}

interface PageShellProps {
    header?: PageHeaderProps;
    children: ReactNode;
    className?: string;
    width?: string;
}

/** A Puff Pop page: the page padding over the layout's dot ground. The theme comes from the
 *  nearest data-theme (the saved choice on <html>). */
const PageShell = ({ header, children, className, width = "max-w-250" }: PageShellProps) => {
    return (
        <div className="pp-root @container relative isolate flex-1 text-(--text) transition-colors duration-300">
            <div className={cn("relative px-12 pb-18 @max-[900px]:px-7 @max-[580px]:px-4", className)}>
                <div className={cn("mx-auto w-full", width)}>
                    {header && <PageHeader {...header} />}
                    {children}
                </div>
            </div>
        </div>
    );
};

export const PageHeader = ({ title, korean, koreanLength, subtitle, align = "center" }: PageHeaderProps) => {
    const centered = align === "center";

    return (
        <header
            className={cn(
                "pp-enter [--pp-anim:puffSide] [--pp-delay:80ms] flex flex-col gap-2.5 pt-3",
                centered ? "items-center text-center" : "items-start text-left",
            )}
        >
            {/* Title and its Korean tag wrap onto two rows (and the title onto two lines) on small phones. */}
            <div className={cn("flex flex-wrap items-center gap-x-3.5 gap-y-2 max-w-full", centered && "justify-center")}>
                <PuffTitle className="text-[60px] @max-[580px]:text-[44px] @max-[400px]:whitespace-normal @max-[400px]:text-balance">
                    {title}
                </PuffTitle>

                {korean && <KoreanTag length={koreanLength}>{korean}</KoreanTag>}
            </div>

            {subtitle && (
                <p className="m-0 font-medium text-[15px] leading-normal text-(--muted)">
                    {subtitle}
                </p>
            )}
        </header>
    );
};

export default PageShell;
