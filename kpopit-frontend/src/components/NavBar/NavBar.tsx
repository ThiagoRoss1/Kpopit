import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useFeatures } from "../../hooks/useFeatures";
import { useTheme } from "../../hooks/useTheme";
import IntentLink from "../Links/IntentLink";
import ButtonsDroplist from "./ButtonsDroplist";
import ButtonsListMobile from "./ButtonsListMobile";
import UserDropdown from "./UserDropdown";
import {
    ABOUT_ROWS,
    GAME_ROWS,
    IDOL_ROWS,
    PAGE_LABEL,
    PREFETCH,
    menuOf,
    pageOf,
    showCollections,
    type NavMenu,
    type NavPage,
} from "./navigation";

type OpenMenu = NavMenu | "sheet" | "user" | null;

interface NavLink {
    id: NavMenu | "calendar" | "collections";
    label: string;
    to?: string;
}

// Each item's state as its data-st attribute, read by the navbar E2E spec.
const STATE_ATTRIBUTE = { current: "cur", open: "open", idle: "idle" } as const;

// A top-level item: a link or a dropdown button. The current section is pink; an idle one shows a
// pill that fades in behind its label on hover (opacity only, so nothing repaints).
const navItemClasses = (state: "current" | "open" | "idle") => cn(
    "pp-focus relative inline-flex items-center box-border h-10 rounded-full border-2",
    "font-bold text-[15.5px] whitespace-nowrap no-underline cursor-pointer",
    "transition-[translate,background-color,border-color,box-shadow] duration-300 ease-(--ease-settle) transform-gpu",
    "hover:-translate-y-0.5 pressed:translate-x-0.5 pressed:translate-y-0.75 pressed:duration-180",
    state === "current" && cn(
        "bg-(--side) border-(--ink) text-[#1A1418]",
        "shadow-[2px_3px_0_0_#FF8AC4,2px_3px_0_2px_var(--ink),var(--in-pink)]",
        "pressed:shadow-[0_0_0_0_#FF8AC4,0_0_0_2px_var(--ink),var(--in-pink)]",
    ),
    state === "open" && cn(
        "bg-(--chip) border-(--ink) text-(--text)",
        "shadow-[2px_3px_0_var(--ctl-off),var(--in)] pressed:shadow-[0_0_0_var(--ctl-off),var(--in)]",
    ),
    state === "idle" && cn(
        "bg-transparent border-transparent text-(--muted) hover:text-(--text) pressed:text-(--text)",
        "before:absolute before:-inset-0.5 before:-z-1 before:rounded-[inherit] before:border-2 before:border-(--ink)",
        "before:bg-(--chip) before:shadow-[2px_3px_0_var(--ctl-off),var(--in)] before:opacity-0",
        "before:transition-[opacity,box-shadow] before:duration-300",
        "hover:before:opacity-100 pressed:before:opacity-100 pressed:before:shadow-[0_0_0_var(--ctl-off),var(--in)]",
    ),
);

const rowsOf = (menu: NavMenu) => {
    if (menu === "games") return GAME_ROWS;
    if (menu === "idols") return IDOL_ROWS;

    return ABOUT_ROWS;
};

interface NavBarProps {
    forceTheme?: "night" | "day";
}

/** The site navbar on every page. Old pages pass `forceTheme` (night for the dark ones, day for
 *  Pixelated's light page); the theme toggle is then hidden but keeps its space so the bar doesn't
 *  shift between pages. */
const NavBar = ({ forceTheme }: NavBarProps) => {
    const isThemeForced = forceTheme !== undefined;
    const { pathname, key: locationKey } = useLocation();
    const page = pageOf(pathname);
    const section = menuOf(page);
    const { features } = useFeatures();
    const [theme, toggleTheme] = useTheme();
    const rootRef = useRef<HTMLDivElement>(null);

    // A menu belongs to the page it was opened on: navigating closes it.
    const [openState, setOpenState] = useState<{ menu: OpenMenu; key: string }>({ menu: null, key: locationKey });
    if (openState.key !== locationKey) setOpenState({ menu: null, key: locationKey });

    const openMenu = openState.key === locationKey ? openState.menu : null;
    const setOpenMenu = (menu: OpenMenu) => setOpenState({ menu, key: locationKey });

    // One menu at a time: opening one (dropdown, sheet or the profile menu) closes the others.
    const toggleMenu = (menu: Exclude<OpenMenu, null>) => setOpenMenu(openMenu === menu ? null : menu);

    useEffect(() => {
        if (!openMenu) return;

        const closeMenus = () => setOpenState((state) => ({ ...state, menu: null }));

        const handleMouseDown = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) closeMenus();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeMenus();
        };

        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [openMenu]);

    const links: NavLink[] = [
        { id: "games", label: "Games" },
        { id: "idols", label: "Idols" },
        ...(features.calendar ? [{ id: "calendar" as const, label: "Calendar", to: "/calendar" }] : []),
        ...(showCollections(features) ? [{ id: "collections" as const, label: "Collections", to: "/collections" }] : []),
        { id: "about", label: "About" },
    ];

    return (
        <div
            ref={rootRef}
            data-theme={forceTheme}
            className="pp-nav @container sticky top-0 z-100 w-full font-[DynaPuff,system-ui,sans-serif]"
        >
            {/* A see-through bar: the page ground runs under it, blurred, like the old navbar. The row
                keeps to the old navbar's centred 1536px column so the logo and account never sit on the edges. */}
            <nav
                aria-label="Main"
                className={cn(
                    "relative z-30 h-15 @max-[860px]:h-13.5",
                    "bg-(--bar-glass) backdrop-blur-xl backdrop-saturate-150",
                    "border-b-2 border-(--bar-line) shadow-(--bar-sh) text-(--text)",
                )}
            >
                <div
                    className={cn(
                        "mx-auto flex items-center size-full max-w-384 gap-4 px-6",
                        "@max-[1100px]:gap-3 @max-[1100px]:px-5 @max-[860px]:px-3 @max-[430px]:gap-2.5",
                    )}
                >
                    {/* Keep outlined text at its native scale so hover never rerasterizes its shadow. */}
                    <Link
                        to="/"
                        aria-label="KpopIt home"
                        className={cn(
                            "pp-focus group/brand flex min-w-0 items-center gap-2 no-underline",
                            "transform-gpu backface-hidden",
                        )}
                    >
                        <img
                            src="/kpopit-icon-svg.svg"
                            alt=""
                            width={44}
                            height={44}
                            className={cn(
                                "block flex-none size-11 @max-[860px]:size-10 @max-[430px]:size-9",
                                "transition-[rotate] duration-300 ease-(--ease-settle) group-hover/brand:-rotate-6 group-active/brand:rotate-0",
                            )}
                            draggable={false}
                        />

                        {page && (
                            <span className="flex min-w-0 items-center gap-1.75 -rotate-2 pr-1.25 pb-1.25 pl-0.5 @max-[1180px]:@min-[860px]:hidden @max-[374px]:hidden">
                                <span
                                    aria-hidden
                                    className="flex-none size-2.5 rounded-full border-2 border-(--ink) bg-neon-pink shadow-[1.5px_2px_0_var(--ink)] @max-[430px]:hidden"
                                />

                                <span
                                    className={cn(
                                        "puff-ink min-w-0 truncate pt-1 pr-2 pb-2 pl-0.5 -mb-1",
                                        "font-bold leading-[1.3] whitespace-nowrap text-white text-shadow-(--puff-wm)",
                                        "text-[22px] @max-[1100px]:text-[19px] @max-[860px]:text-lg @max-[430px]:text-[15.5px]",
                                    )}
                                >
                                    {PAGE_LABEL[page]}
                                </span>
                            </span>
                        )}
                    </Link>

                    <span className="flex-1" />

                    {/* Desktop links and dropdowns */}
                    <div className="flex items-center gap-2.5 mr-2 @max-[1100px]:gap-1.5 @max-[1100px]:mr-0.5 @max-[860px]:hidden">
                        {links.map((link) => {
                            const isCurrent = section === link.id;
                            const isOpen = openMenu === link.id;
                            const state = isCurrent ? "current" : isOpen ? "open" : "idle";

                            if (link.to) {
                                return (
                                    <IntentLink
                                        key={link.id}
                                        to={link.to}
                                        onIntent={PREFETCH[link.id as NavPage]}
                                        data-st={STATE_ATTRIBUTE[state]}
                                        aria-current={isCurrent ? "page" : undefined}
                                        className={cn(navItemClasses(state), "px-4")}
                                    >
                                        {link.label}
                                    </IntentLink>
                                );
                            }

                            const menu = link.id as NavMenu;

                            return (
                                <div key={link.id} className="relative">
                                    <button
                                        type="button"
                                        data-st={STATE_ATTRIBUTE[state]}
                                        aria-expanded={isOpen}
                                        aria-haspopup="true"
                                        onClick={() => toggleMenu(menu)}
                                        className={cn(navItemClasses(state), "gap-1.5 pr-3 pl-4")}
                                    >
                                        {link.label}
                                        <ChevronDown
                                            className={cn(
                                                "size-4 transition-transform duration-400 ease-(--ease-pop) transform-gpu",
                                                isOpen && "rotate-180",
                                            )}
                                            strokeWidth={3}
                                            aria-hidden
                                        />
                                    </button>

                                    {isOpen && <ButtonsDroplist menu={menu} rows={rowsOf(menu)} page={page} />}
                                </div>
                            );
                        })}
                    </div>

                    {/* Theme toggle and account */}
                    <div className="flex flex-none items-center gap-3 @max-[430px]:gap-2">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-label="Switch day and night"
                            aria-hidden={isThemeForced || undefined}
                            tabIndex={isThemeForced ? -1 : 0}
                            className={cn(
                                "pp-press pp-focus flex-none grid place-items-center size-9.5 p-0",
                                "rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) cursor-pointer",
                                isThemeForced && "invisible",
                            )}
                        >
                            {!isThemeForced && theme === "night"
                                ? <Sun className="size-4.5" strokeWidth={2.6} />
                                : <Moon className="size-4.5" strokeWidth={2.6} />}
                        </button>

                        <span aria-hidden className="w-0.5 h-7 rounded-xs bg-[rgba(128,110,120,.3)] @max-[860px]:hidden" />

                        <UserDropdown open={openMenu === "user"} onToggle={() => toggleMenu("user")} />
                    </div>

                    {/* Menu sheet button (phones and small tablets) */}
                    <button
                        type="button"
                        onClick={() => toggleMenu("sheet")}
                        aria-label={openMenu === "sheet" ? "Close menu" : "Open menu"}
                        aria-expanded={openMenu === "sheet"}
                        className={cn(
                            "pp-press pp-focus hidden @max-[860px]:grid place-items-center flex-none size-9.5 p-0",
                            "rounded-full border-2 border-(--ink) cursor-pointer",
                            openMenu === "sheet" ? "bg-[#FF8AC4] text-[#1A1418]" : "bg-(--chip) text-(--chip-ink)",
                        )}
                    >
                        {openMenu === "sheet"
                            ? <X className="size-4.5" strokeWidth={3} />
                            : <Menu className="size-4.5" strokeWidth={2.8} />}
                    </button>
                </div>

                {openMenu === "sheet" && (
                    <ButtonsListMobile
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
};

export default NavBar;
