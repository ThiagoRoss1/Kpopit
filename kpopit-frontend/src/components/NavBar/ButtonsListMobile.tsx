import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";
import IntentLink from "../Links/IntentLink";
import { Dot, RowLink, Tile } from "./DroplistBase";
import { MAJOR_PATCH, PREFETCH, menuOf, type NavMenu, type NavPage, type NavRow } from "./navigation";

interface ButtonsListMobileProps {
    page: NavPage | null;
    section: ReturnType<typeof menuOf>;
    rowsOf: (menu: NavMenu) => NavRow[];
    calendar: boolean;
    collections: boolean;
}

// A section button of the sheet (an accordion header or a direct link).
const sectionClasses = (isCurrent: boolean, isOpen: boolean) => cn(
    "pp-press pp-focus flex-none flex items-center gap-2.5 box-border w-full h-13.5 pr-3.5 pl-4",
    "rounded-2xl border-2 border-(--ink) font-bold text-base text-left no-underline cursor-pointer",
    isCurrent && "bg-(--side) text-[#1A1418] [--pp-in:var(--in-pink)]",
    !isCurrent && isOpen && "bg-(--chip-hover) text-(--chip-ink)",
    !isCurrent && !isOpen && "bg-(--chip) text-(--chip-ink)",
);

/** The menu sheet under the navbar on phones and small tablets: Games, Idols and About open as
 *  accordions of tiles; Calendar and Collections are direct links. */
const ButtonsListMobile = ({ page, section, rowsOf, calendar, collections }: ButtonsListMobileProps) => {
    // The current page's section starts open.
    const startOpen = section === "games" || section === "idols" || section === "about" ? section : null;
    const [openMenu, setOpenMenu] = useState<NavMenu | null>(startOpen);

    const renderAccordion = (menu: NavMenu, label: string) => {
        const isOpen = openMenu === menu;
        const isCurrent = section === menu;

        return (
            <div className="flex-none flex flex-col">
                <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenMenu(isOpen ? null : menu)}
                    className={sectionClasses(isCurrent, isOpen)}
                >
                    {isCurrent && <Dot />}
                    <span className="flex-1">{label}</span>
                    <ChevronDown
                        className={cn(
                            "flex-none size-4 transition-transform duration-400 ease-(--ease-pop) transform-gpu",
                            isOpen && "rotate-180",
                        )}
                        strokeWidth={3}
                        aria-hidden
                    />
                </button>

                <div className="pp-collapse" data-open={isOpen ? "1" : "0"}>
                    <div>
                        <div className="pp-collapse-in pt-2.5 pr-1 pb-1.5">
                            <div className="grid grid-cols-2 gap-2.5">
                                {rowsOf(menu).map((row) => {
                                    const isCurrentRow = row.id === page;
                                    const isWip = !!row.wip;

                                    return (
                                        <RowLink
                                            key={row.id}
                                            row={row}
                                            className={cn(
                                                "pp-focus group relative box-border flex items-center gap-2.5 overflow-hidden min-h-14.5 py-1.5 pr-2.5 pl-1.5",
                                                "rounded-[15px] border-2 border-(--ink) text-(--chip-ink) no-underline",
                                                "shadow-[2px_2.5px_0_var(--ctl-off)] active:shadow-[0_0_0_var(--ctl-off)]",
                                                "transition-[translate,background-color,box-shadow] duration-450 ease-(--ease-settle) transform-gpu",
                                                isCurrentRow ? "bg-(--chip-hover)" : "bg-(--chip)",
                                                !isWip && "active:translate-x-0.5 active:translate-y-0.75 active:duration-180",
                                                isWip && "opacity-60 cursor-default",
                                            )}
                                        >
                                            <Tile row={row} size="sm" />

                                            <span className="flex flex-col gap-0.5 min-w-0">
                                                <span className="flex items-center gap-1.5 font-bold text-sm leading-[1.1] whitespace-nowrap">
                                                    {isCurrentRow && <Dot size="sm" />}
                                                    {row.label}
                                                </span>

                                                {isWip && <span className="font-bold text-[9px] tracking-[.08em] text-(--muted)">SOON</span>}
                                            </span>
                                        </RowLink>
                                    );
                                })}

                                {menu === "about" && MAJOR_PATCH.show && (
                                    <Link
                                        to={MAJOR_PATCH.href}
                                        className={cn(
                                            "pp-focus col-span-2 box-border flex items-center gap-2.5 overflow-hidden h-13 pr-3 pl-2",
                                            "rounded-[15px] border-2 border-[#1A1418] bg-[#FF8AC4] text-[#1A1418] no-underline",
                                            "shadow-[2px_2.5px_0_var(--ctl-off),inset_0_2px_0_rgba(255,255,255,.55)]",
                                        )}
                                    >
                                        <Sparkles className="flex-none size-4.25" fill="#FF3399" stroke="#1A1418" strokeWidth={2} aria-hidden />
                                        <span className="flex-1 min-w-0 font-bold text-sm truncate">{`${MAJOR_PATCH.name} is here`}</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderDirectLink = (id: "calendar" | "collections", label: string, to: string) => {
        const isCurrent = section === id;

        return (
            <IntentLink
                to={to}
                onIntent={PREFETCH[id]}
                aria-current={isCurrent ? "page" : undefined}
                className={sectionClasses(isCurrent, false)}
            >
                {isCurrent && <Dot />}
                <span className="flex-1">{label}</span>
                <ArrowRight className="flex-none size-4" strokeWidth={3} aria-hidden />
            </IntentLink>
        );
    };

    return (
        <div
            className={cn(
                "absolute inset-x-2.5 top-[calc(100%+10px)] z-40 flex flex-col gap-2.5 box-border",
                "max-h-[calc(100dvh-54px-30px)] overflow-auto overscroll-contain pt-3.5 px-3.5 pb-4",
                "rounded-[22px] border-2 border-(--ink) bg-(--menu-bg) shadow-[4px_5px_0_var(--ctl-off),var(--in)]",
                "animate-[puffMenu_0.38s_var(--ease-settle)_both] origin-[calc(100%-24px)_0]",
            )}
        >
            {renderAccordion("games", "Games")}
            {renderAccordion("idols", "Idols")}
            {calendar && renderDirectLink("calendar", "Calendar", "/calendar")}
            {collections && renderDirectLink("collections", "Collections", "/collections")}
            {renderAccordion("about", "About")}
        </div>
    );
};

export default ButtonsListMobile;
