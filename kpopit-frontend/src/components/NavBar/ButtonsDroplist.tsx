import { Link } from "react-router";
import { Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";
import { Dot, RowLink, SoonTag, Tile } from "./DroplistBase";
import { MAJOR_PATCH, type NavMenu, type NavPage, type NavRow } from "./navigation";

interface ButtonsDroplistProps {
    menu: NavMenu;
    rows: NavRow[];
    page: NavPage | null;
}

/** A desktop dropdown: two columns of tilted rows that straighten and lift on hover and sink
 *  into their depth on press. The About menu also shows each page's description. */
const ButtonsDroplist = ({ menu, rows, page }: ButtonsDroplistProps) => {
    const isAbout = menu === "about";

    return (
        <div
            role="menu"
            className={cn(
                "absolute top-14.5 z-40 grid grid-cols-2 gap-x-3 gap-y-3.25 box-border p-3",
                "rounded-3xl border-2 border-(--ink) bg-(--menu-bg)",
                "shadow-[5px_5px_0_0_#FF8AC4,5px_5px_0_2px_var(--ink)]",
                "animate-[puffMenu_0.38s_var(--ease-settle)_both] transform-gpu",
                isAbout ? "right-0 w-117.5 origin-[calc(100%-24px)_0]" : "-left-3 w-105 origin-[24px_0]",
            )}
        >
            {rows.map((row, index) => {
                const isCurrent = row.id === page;
                const isWip = !!row.wip;

                return (
                    <RowLink
                        key={row.id}
                        row={row}
                        role="menuitem"
                        className={cn(
                            "pp-focus group relative box-border flex items-center gap-3 overflow-hidden pr-3 pl-2.5",
                            "rounded-2xl border-2 border-(--ink) text-(--chip-ink) no-underline",
                            "transition-[translate,rotate,background-color,box-shadow] duration-450 ease-(--ease-settle) transform-gpu",
                            index % 2 ? "rotate-[0.6deg]" : "rotate-[-0.6deg]",
                            isAbout ? "min-h-17.5 py-2.5" : "h-17.5",
                            isCurrent
                                ? "bg-(--cur-bg) shadow-[3px_4px_0_0_#FF8AC4,3px_4px_0_2px_var(--ink)] active:shadow-[0_0_0_0_#FF8AC4,0_0_0_2px_var(--ink)]"
                                : "bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)] active:shadow-[0_0_0_var(--ctl-off),var(--in)]",
                            !isCurrent && !isWip && "hover:bg-(--chip-hover)",
                            !isWip && "hover:-translate-y-0.5 hover:rotate-0 active:translate-x-0.5 active:translate-y-0.75 active:rotate-0 active:duration-180",
                            isWip && "opacity-60 cursor-default",
                        )}
                    >
                        <Tile row={row} size="lg" animated={!isWip} />

                        <span className="flex-1 min-w-0 flex flex-col gap-0.75">
                            <span
                                className={cn(
                                    "flex items-center gap-2 font-bold whitespace-nowrap",
                                    isAbout ? "text-base leading-[1.1]" : "text-[17px] leading-none",
                                )}
                            >
                                {isCurrent && <Dot />}
                                {row.label}
                            </span>

                            {isAbout && row.description && (
                                <span className="font-medium text-xs leading-[1.3] text-(--muted)">{row.description}</span>
                            )}
                        </span>

                        {isWip && <SoonTag />}
                    </RowLink>
                );
            })}

            {isAbout && MAJOR_PATCH.show && (
                <Link
                    to={MAJOR_PATCH.href}
                    role="menuitem"
                    className={cn(
                        "pp-focus group col-span-2 mt-0.75 box-border flex items-center gap-3 h-15 pr-3.5 pl-2.5",
                        "rounded-2xl border-2 border-[#1A1418] bg-[#FF8AC4] text-[#1A1418] no-underline",
                        "shadow-[2px_3px_0_#1A1418,inset_0_2px_0_rgba(255,255,255,.55),inset_0_-3px_0_rgba(198,35,104,.22)]",
                        "transition-[translate,box-shadow] duration-450 ease-(--ease-settle) transform-gpu",
                        "hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.75 active:duration-180",
                    )}
                >
                    <span className="flex-none grid place-items-center size-10 rounded-xl border-2 border-[#1A1418] bg-[#FFFDFA]">
                        <Sparkles className="size-5" fill="#FF3399" stroke="#1A1418" strokeWidth={2} aria-hidden />
                    </span>

                    <span className="flex-1 flex flex-col gap-0.5">
                        <span className="font-bold text-base leading-[1.1]">{`${MAJOR_PATCH.name} is here`}</span>
                        <span className="font-medium text-xs">{MAJOR_PATCH.tagline}</span>
                    </span>

                    <span className="px-2.25 py-0.75 rounded-full border-[1.5px] border-[#1A1418] bg-[#FFFDFA] rotate-4 font-bold text-[10px] tracking-[.08em]">
                        NEW
                    </span>
                </Link>
            )}
        </div>
    );
};

export default ButtonsDroplist;
