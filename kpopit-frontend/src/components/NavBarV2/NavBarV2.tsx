import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { ArrowRight, ChevronDown, Menu, Moon, Sparkles, Sun, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useFeatures } from "../../hooks/useFeatures";
import { useTheme } from "../../hooks/useTheme";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { prefetchIdolsList } from "../../pages/Idols/idolsData";
import { prefetchCollectionsList } from "../../pages/Collection/collectionData";
import IntentLink from "../Links/IntentLink";
import NavAuthSlot from "./NavAuthSlot";
import {
    ABOUT_ROWS, GAME_ROWS, IDOL_ROWS, MAJOR_PATCH, PAGE_LABEL, menuOf, pageOf, showCollections,
    type NavMenu, type NavPage, type NavRow,
} from "./navConfig";
import "../Puff/puff.css";
import "./navbar.css";

type Open = NavMenu | "sheet" | "user" | null;

const PREFETCH: Partial<Record<NavPage, () => void>> = { idols: prefetchIdolsList, collections: prefetchCollectionsList };

const dot = (size: "sm" | "md" = "md") => (
    <span aria-hidden className={cn("flex-none rounded-full bg-[#FF3399] border-[#1A1418]", size === "md" ? "w-[9px] h-[9px] border-2" : "w-[7px] h-[7px] border-[1.5px]")} />
);

/** The site navbar on every page. Old pages pass `forceTheme` (night for the dark ones, day for
 *  Pixelated's light page); the theme toggle is then hidden but keeps its space so the bar doesn't
 *  shift between pages. */
export default function NavBarV2({ forceTheme }: { forceTheme?: "night" | "day" }) {
    const forced = forceTheme !== undefined;
    const { pathname } = useLocation();
    const page = pageOf(pathname);
    const section = menuOf(page);
    const { features } = useFeatures();
    const [theme, toggleTheme] = useTheme();
    const rootRef = useRef<HTMLDivElement>(null);

    // A menu belongs to the page it was opened on: navigating closes it.
    const [openState, setOpenState] = useState<{ menu: Open; path: string }>({ menu: null, path: pathname });
    const open = openState.path === pathname ? openState.menu : null;
    const setOpen = (menu: Open) => setOpenState({ menu, path: pathname });
    // One menu at a time: opening one (dropdown, sheet or the profile menu) closes the others.
    const toggle = (menu: Exclude<Open, null>) => setOpen(open === menu ? null : menu);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenState((s) => ({ ...s, menu: null }));
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpenState((s) => ({ ...s, menu: null }));
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const links: { id: NavMenu | "calendar" | "collections"; label: string; to?: string }[] = [
        { id: "games", label: "Games" },
        { id: "idols", label: "Idols" },
        ...(features.calendar ? [{ id: "calendar" as const, label: "Calendar", to: "/calendar" }] : []),
        ...(showCollections(features) ? [{ id: "collections" as const, label: "Collections", to: "/collections" }] : []),
        { id: "about", label: "About" },
    ];

    const rowsOf = (menu: NavMenu) => (menu === "games" ? GAME_ROWS : menu === "idols" ? IDOL_ROWS : ABOUT_ROWS);

    return (
        <div
            ref={rootRef}
            data-theme={forceTheme}
            className="pp-nav @container sticky top-0 z-100 w-full font-[DynaPuff,system-ui,sans-serif]"
        >
            {/* A see-through bar: the page ground runs under it, blurred, like the old navbar. The
                row keeps to a centred column so the logo and account never sit on the screen edges. */}
            <nav
                aria-label="Main"
                className="relative z-30 h-[60px] @max-[860px]:h-[54px] bg-(--bar-glass) backdrop-blur-xl backdrop-saturate-150 border-b-2 border-(--bar-line) [box-shadow:var(--bar-sh)] text-(--text)"
            >
                <div className="mx-auto flex h-full w-full max-w-[1360px] items-center gap-4 px-8 @max-[1100px]:gap-3 @max-[1100px]:px-5 @max-[860px]:px-3 @max-[430px]:gap-2.5">
                    <Link to="/" aria-label="KpopIt home" className="nb-logo pp-focus flex min-w-0 items-center gap-2 no-underline">
                        <img src="/kpopit-icon-svg.svg" alt="" width={36} height={36} className="block flex-none w-9 h-9" draggable={false} />
                        {page && (
                            <span className="flex min-w-0 items-center gap-[7px] -rotate-2 pt-0 pr-[5px] pb-[5px] pl-0.5 @max-[1180px]:@min-[860px]:hidden @max-[374px]:hidden">
                                <span aria-hidden className="flex-none w-2.5 h-2.5 rounded-full bg-[#FF3399] border-2 border-(--ink) [box-shadow:1.5px_2px_0_var(--ink)] @max-[430px]:hidden" />
                                <span className="min-w-0 truncate pt-1 pr-2 pb-2 pl-0.5 -mb-1 font-bold text-[19px] @max-[1100px]:text-[17px] @max-[430px]:text-[15.5px] leading-none text-white whitespace-nowrap [text-shadow:var(--puff-wm)]">
                                    {PAGE_LABEL[page]}
                                </span>
                            </span>
                        )}
                    </Link>

                    <span className="flex-1" />

                    <div className="flex items-center gap-2.5 mr-2 @max-[1100px]:gap-1.5 @max-[1100px]:mr-0.5 @max-[860px]:hidden">
                        {links.map((link) => {
                            const isCur = section === link.id;
                            const isOpen = open === link.id;
                            const st = isCur ? "cur" : isOpen ? "open" : "idle";
                            const look = cn(
                                "nb-item pp-focus box-border inline-flex items-center h-10 rounded-full border-2 font-bold text-[15.5px] no-underline cursor-pointer whitespace-nowrap",
                                isCur ? "bg-(--side) border-(--ink) text-[#1A1418] [box-shadow:2px_3px_0_var(--ctl-off),var(--in-pink)]"
                                    : isOpen ? "bg-(--chip) border-(--ink) text-(--text) [box-shadow:2px_3px_0_var(--ctl-off),var(--in)]"
                                        : "bg-transparent border-transparent text-(--muted)",
                            );
                            if (link.to) {
                                const prefetch = PREFETCH[link.id as NavPage];
                                return (
                                    <IntentLink key={link.id} to={link.to} onIntent={prefetch} data-st={st} aria-current={isCur ? "page" : undefined} className={cn(look, "px-4")}>
                                        {link.label}
                                    </IntentLink>
                                );
                            }
                            const menu = link.id as NavMenu;
                            return (
                                <div key={link.id} className="relative">
                                    <button
                                        type="button"
                                        data-st={st}
                                        aria-expanded={isOpen}
                                        aria-haspopup="true"
                                        onClick={() => toggle(menu)}
                                        className={cn(look, "gap-1.5 pr-3 pl-4")}
                                    >
                                        {link.label}
                                        <ChevronDown className="nb-chev w-4 h-4" strokeWidth={3} aria-hidden />
                                    </button>
                                    {isOpen && <DesktopMenu menu={menu} rows={rowsOf(menu)} page={page} />}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-none items-center gap-3 @max-[430px]:gap-2">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-label="Switch day and night"
                            aria-hidden={forced || undefined}
                            tabIndex={forced ? -1 : 0}
                            className={cn(
                                "pp-press pp-focus flex-none grid place-items-center w-[38px] h-[38px] p-0 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) cursor-pointer",
                                forced && "invisible",
                            )}
                        >
                            {!forced && theme === "night" ? <Sun className="w-[18px] h-[18px]" strokeWidth={2.6} /> : <Moon className="w-[18px] h-[18px]" strokeWidth={2.6} />}
                        </button>
                        <span aria-hidden className="w-0.5 h-7 rounded-[2px] bg-[rgba(128,110,120,.3)] @max-[860px]:hidden" />
                        <NavAuthSlot open={open === "user"} onToggle={() => toggle("user")} />
                    </div>

                    <button
                        type="button"
                        onClick={() => toggle("sheet")}
                        aria-label={open === "sheet" ? "Close menu" : "Open menu"}
                        aria-expanded={open === "sheet"}
                        className={cn(
                            "pp-press pp-focus hidden @max-[860px]:grid place-items-center flex-none w-[38px] h-[38px] p-0 rounded-full border-2 border-(--ink) cursor-pointer",
                            open === "sheet" ? "bg-[#FF8AC4] text-[#1A1418]" : "bg-(--chip) text-(--chip-ink)",
                        )}
                    >
                        {open === "sheet" ? <X className="w-[18px] h-[18px]" strokeWidth={3} /> : <Menu className="w-[18px] h-[18px]" strokeWidth={2.8} />}
                    </button>
                </div>

                {open === "sheet" && (
                    <MobileSheet
                        page={page}
                        section={section}
                        rowsOf={rowsOf}
                        calendar={features.calendar}
                        collections={showCollections(features)}
                    />
                )}
            </nav>
        </div>
    );
}

function Tile({ row, size }: { row: NavRow; size: "lg" | "sm" }) {
    const box = size === "lg" ? "w-[46px] h-[46px]" : "w-10 h-10";
    if (row.icon) {
        const Icon = row.icon;
        return (
            <span className={cn("nb-tile flex-none grid place-items-center box-border border-2 border-[#1A1418] bg-(--tile) [box-shadow:var(--tile-in)]", size === "lg" ? "w-11 h-11 rounded-[13px] [box-shadow:2px_2.5px_0_#1A1418,var(--tile-in)]" : "w-[34px] h-[34px] rounded-[11px]")}>
                <Icon className={size === "lg" ? "w-5 h-5" : "w-[17px] h-[17px]"} stroke="var(--tile-ink)" strokeWidth={2.6} aria-hidden />
            </span>
        );
    }
    return (
        <span className={cn("nb-tile flex-none box-border overflow-hidden rounded-[13px] border-2 border-[#1A1418] bg-[#DCD6D2]", box, size === "lg" && "[box-shadow:2px_2px_0_#1A1418]")}>
            <img src={resolveCdnUrl(row.img ?? null) ?? ""} alt="" loading="lazy" className={cn("block w-full h-full object-cover", row.imgClass)} draggable={false} />
        </span>
    );
}

function RowLink({ row, className, children, ...rest }: { row: NavRow; className: string; children: ReactNode; role?: string; "data-cur"?: string; "data-wip"?: string; style?: CSSProperties }) {
    if (row.wip || !row.to) return <div aria-disabled="true" className={className} {...rest}>{children}</div>;
    const prefetch = PREFETCH[row.id as NavPage];
    return <IntentLink to={row.to} onIntent={prefetch} className={className} {...rest}>{children}</IntentLink>;
}

function DesktopMenu({ menu, rows, page }: { menu: NavMenu; rows: NavRow[]; page: NavPage | null }) {
    const about = menu === "about";
    return (
        <div
            role="menu"
            className={cn(
                "nb-menu absolute top-[58px] z-40 box-border p-3 rounded-[24px] border-2 border-(--ink) bg-(--menu-bg) [box-shadow:5px_5px_0_0_#FF8AC4,5px_5px_0_2px_var(--ink)] grid grid-cols-2 gap-x-3 gap-y-[13px]",
                about ? "right-0 w-[470px] origin-[calc(100%-24px)_0]" : "-left-3 w-[420px] origin-[24px_0]",
            )}
        >
            {rows.map((row, i) => {
                const cur = row.id === page;
                return (
                    <RowLink
                        key={row.id}
                        row={row}
                        role="menuitem"
                        data-cur={cur ? "1" : "0"}
                        data-wip={row.wip ? "1" : undefined}
                        style={{ "--nb-tilt": `${i % 2 ? 0.6 : -0.6}deg` } as CSSProperties}
                        className={cn(
                            "nb-row pp-focus box-border flex items-center gap-3 overflow-hidden no-underline text-(--chip-ink) rounded-[16px] border-2 border-(--ink) pr-3 pl-2.5",
                            about ? "min-h-[70px] py-2.5" : "h-[70px]",
                            cur ? "bg-(--cur-bg) [box-shadow:3px_4px_0_0_#FF8AC4,3px_4px_0_2px_var(--ink)]" : "bg-(--chip) [box-shadow:2px_3px_0_var(--ctl-off),var(--in)]",
                            row.wip && "opacity-60",
                        )}
                    >
                        <Tile row={row} size="lg" />
                        <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
                            <span className={cn("flex items-center gap-2 font-bold whitespace-nowrap", about ? "text-base leading-[1.1]" : "text-[17px] leading-none")}>
                                {cur && dot()}
                                {row.label}
                            </span>
                            {about && row.description && <span className="font-medium text-xs leading-[1.3] text-(--muted)">{row.description}</span>}
                        </span>
                        {row.wip && <SoonTag />}
                    </RowLink>
                );
            })}
            {about && MAJOR_PATCH.show && (
                <Link
                    to={MAJOR_PATCH.href}
                    role="menuitem"
                    className="nb-row pp-focus col-span-2 mt-[3px] box-border flex items-center gap-3 h-[60px] pr-3.5 pl-2.5 rounded-[16px] border-2 border-[#1A1418] bg-[#FF8AC4] text-[#1A1418] no-underline [box-shadow:2px_3px_0_#1A1418,inset_0_2px_0_rgba(255,255,255,.55),inset_0_-3px_0_rgba(198,35,104,.22)]"
                >
                    <span className="nb-tile flex-none grid place-items-center w-10 h-10 rounded-[12px] border-2 border-[#1A1418] bg-[#FFFDFA]">
                        <Sparkles className="w-5 h-5" fill="#FF3399" stroke="#1A1418" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="flex-1 flex flex-col gap-0.5">
                        <span className="font-bold text-base leading-[1.1]">{`${MAJOR_PATCH.name} is here`}</span>
                        <span className="font-medium text-xs">{MAJOR_PATCH.tagline}</span>
                    </span>
                    <span className="px-[9px] py-[3px] rounded-full border-[1.5px] border-[#1A1418] bg-[#FFFDFA] font-bold text-[10px] tracking-[.08em] rotate-4">NEW</span>
                </Link>
            )}
        </div>
    );
}

function SoonTag() {
    return (
        <span className="flex-none px-[9px] py-[3px] rounded-full border-[1.5px] border-[#1A1418] bg-[#FFD64F] text-[#1A1418] font-bold text-[10px] tracking-[.08em] [box-shadow:inset_0_2px_0_rgba(255,255,255,.6),1.5px_2px_0_#1A1418] rotate-4">
            SOON
        </span>
    );
}

const sheetSection = (cur: boolean, open: boolean) => cn(
    "pp-press pp-focus flex-none box-border w-full h-[54px] pr-3.5 pl-4 rounded-[16px] border-2 border-(--ink) flex items-center gap-2.5 font-bold text-base text-left no-underline cursor-pointer",
    cur ? "bg-(--side) text-[#1A1418] [--pp-in:var(--in-pink)]" : open ? "bg-(--chip-hover) text-(--chip-ink)" : "bg-(--chip) text-(--chip-ink)",
);

function MobileSheet({ page, section, rowsOf, calendar, collections }: {
    page: NavPage | null;
    section: ReturnType<typeof menuOf>;
    rowsOf: (menu: NavMenu) => NavRow[];
    calendar: boolean;
    collections: boolean;
}) {
    // The current page's section starts open.
    const [acc, setAcc] = useState<NavMenu | null>(section === "games" || section === "idols" || section === "about" ? section : null);
    const accordion = (menu: NavMenu, label: string) => {
        const isOpen = acc === menu;
        return (
            <div className="flex-none flex flex-col">
                <button type="button" aria-expanded={isOpen} onClick={() => setAcc(isOpen ? null : menu)} className={sheetSection(section === menu, isOpen)}>
                    {section === menu && dot()}
                    <span className="flex-1">{label}</span>
                    <ChevronDown className="nb-chev flex-none w-4 h-4" strokeWidth={3} aria-hidden />
                </button>
                <div className="pp-collapse" data-open={isOpen ? "1" : "0"}>
                    <div>
                        <div className="pp-collapse-in pt-2.5 pr-1 pb-1.5">
                            <div className="grid grid-cols-2 gap-2.5">
                                {rowsOf(menu).map((row) => (
                                    <RowLink
                                        key={row.id}
                                        row={row}
                                        data-cur={row.id === page ? "1" : "0"}
                                        data-wip={row.wip ? "1" : undefined}
                                        className={cn(
                                            "nb-row pp-focus box-border min-h-[58px] py-1.5 pr-2.5 pl-1.5 rounded-[15px] border-2 border-(--ink) [box-shadow:2px_2.5px_0_var(--ctl-off)] flex items-center gap-2.5 overflow-hidden no-underline text-(--chip-ink)",
                                            row.id === page ? "bg-(--chip-hover)" : "bg-(--chip)",
                                            row.wip && "opacity-60",
                                        )}
                                    >
                                        <Tile row={row} size="sm" />
                                        <span className="flex flex-col gap-0.5 min-w-0">
                                            <span className="flex items-center gap-1.5 font-bold text-sm leading-[1.1] whitespace-nowrap">
                                                {row.id === page && dot("sm")}
                                                {row.label}
                                            </span>
                                            {row.wip && <span className="font-bold text-[9px] tracking-[.08em] text-(--muted)">SOON</span>}
                                        </span>
                                    </RowLink>
                                ))}
                                {menu === "about" && MAJOR_PATCH.show && (
                                    <Link to={MAJOR_PATCH.href} className="nb-row pp-focus col-span-2 box-border h-[52px] pr-3 pl-2 rounded-[15px] border-2 border-[#1A1418] bg-[#FF8AC4] text-[#1A1418] no-underline flex items-center gap-2.5 overflow-hidden [box-shadow:2px_2.5px_0_var(--ctl-off),inset_0_2px_0_rgba(255,255,255,.55)]">
                                        <Sparkles className="flex-none w-[17px] h-[17px]" fill="#FF3399" stroke="#1A1418" strokeWidth={2} aria-hidden />
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
    const direct = (id: "calendar" | "collections", label: string, to: string) => (
        <IntentLink to={to} onIntent={PREFETCH[id]} aria-current={section === id ? "page" : undefined} className={sheetSection(section === id, false)}>
            {section === id && dot()}
            <span className="flex-1">{label}</span>
            <ArrowRight className="flex-none w-4 h-4" strokeWidth={3} aria-hidden />
        </IntentLink>
    );

    return (
        <div className="nb-menu absolute left-2.5 right-2.5 top-[calc(100%+10px)] z-40 box-border max-h-[calc(100dvh-54px-30px)] overflow-auto overscroll-contain pt-3.5 px-3.5 pb-4 rounded-[22px] border-2 border-(--ink) bg-(--menu-bg) [box-shadow:4px_5px_0_var(--ctl-off),var(--in)] flex flex-col gap-2.5 origin-[calc(100%-24px)_0]">
            {accordion("games", "Games")}
            {accordion("idols", "Idols")}
            {calendar && direct("calendar", "Calendar", "/calendar")}
            {collections && direct("collections", "Collections", "/collections")}
            {accordion("about", "About")}
        </div>
    );
}
