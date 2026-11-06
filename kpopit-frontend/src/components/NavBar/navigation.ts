import { BookOpen, CircleHelp, Heart, List, Mail, MessageCircle, type LucideIcon } from "lucide-react";
import type { Features } from "../../utils/features";
import { prefetchIdolsList } from "../../pages/Idols/idolsData";
import { prefetchCollectionsList } from "../../pages/Collection/collectionData";

export type NavPage =
    | "classic"
    | "blurry"
    | "pixelated"
    | "idols"
    | "albums"
    | "calendar"
    | "collections"
    | "about"
    | "howto"
    | "changelog"
    | "blog"
    | "faq"
    | "contact"
    | "privacy"
    | "idolxp"
    | "profile"
    | "login"
    | "register";

export type NavMenu = "games" | "idols" | "about";

export interface NavRow {
    id: NavPage | "inkit";
    label: string;
    to?: string;
    /** Mode/idol tiles show a photo, the About tiles an icon. */
    img?: string;
    imgClass?: string;
    icon?: LucideIcon;
    description?: string;
    /** Shown but not linked yet (InkIt). */
    wip?: boolean;
}

// Placeholder until the patch has its page and real name; show:false removes the card.
export const MAJOR_PATCH = {
    show: false,
    version: "2.0",
    name: "Patch 2.0",
    tagline: "Calendar, profiles and Idol XP",
    href: "/major-patch",
};

export const GAME_ROWS: NavRow[] = [
    { id: "classic", label: "Classic", to: "/classic", img: "/images/idols/sakura.webp" },
    { id: "blurry", label: "Blurry", to: "/blurry", img: "/images/idols/karina.webp", imgClass: "blur-[3px]" },
    { id: "pixelated", label: "Pixelated", to: "/pixelated", img: "/images/albums/after_like.webp", imgClass: "[image-rendering:pixelated] scale-[1.02]" },
    { id: "inkit", label: "InkIt", img: "/images/idols/winter.webp", imgClass: "grayscale contrast-[1.3]", wip: true },
];

export const IDOL_ROWS: NavRow[] = [
    { id: "idols", label: "All idols", to: "/idols", img: "/images/idols/kazuha.webp" },
    { id: "albums", label: "Albums", to: "/albums", img: "/images/albums/after_like.webp" },
];

export const ABOUT_ROWS: NavRow[] = [
    { id: "about", label: "About", to: "/about", icon: Heart, description: "Who makes KpopIt" },
    { id: "howto", label: "How to play", to: "/how-to-play", icon: CircleHelp, description: "Rules for every mode" },
    { id: "changelog", label: "Changelog", to: "/changelog", icon: List, description: "What changed and when" },
    { id: "blog", label: "Blog", to: "/blog", icon: BookOpen, description: "News and my thoughts" },
    { id: "faq", label: "FAQ", to: "/faq", icon: MessageCircle, description: "Quick answers" },
    { id: "contact", label: "Contact", to: "/contact", icon: Mail, description: "Report a bug or say hi" },
];

const PAGE_PATHS: [string, NavPage][] = [
    ["/login", "login"],
    ["/register", "register"],
    ["/classic", "classic"],
    ["/blurry", "blurry"],
    ["/pixelated", "pixelated"],
    ["/idols", "idols"],
    ["/albums", "albums"],
    ["/calendar", "calendar"],
    ["/collections", "collections"],
    ["/about", "about"],
    ["/how-to-play", "howto"],
    ["/changelog", "changelog"],
    ["/blog", "blog"],
    ["/faq", "faq"],
    ["/contact", "contact"],
    ["/privacy-policy", "privacy"],
    ["/idol-xp", "idolxp"],
    ["/profile", "profile"],
];

export function pageOf(pathname: string): NavPage | null {
    const match = PAGE_PATHS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));

    return match ? match[1] : null;
}

/** The "• page" label next to the logo. */
export const PAGE_LABEL: Record<NavPage, string> = {
    login: "login",
    register: "register",
    classic: "classic",
    blurry: "blurry",
    pixelated: "pixelated",
    idols: "idols",
    albums: "albums",
    calendar: "calendar",
    collections: "collections",
    about: "about",
    howto: "how to play",
    changelog: "changelog",
    blog: "blog",
    faq: "faq",
    contact: "contact",
    privacy: "privacy",
    idolxp: "idol xp",
    profile: "profile",
};

/** Which top-level entry is the current section (Contact and Privacy belong to About). */
export function menuOf(page: NavPage | null): NavMenu | "calendar" | "collections" | null {
    if (!page) return null;

    if (GAME_ROWS.some((row) => row.id === page)) return "games";
    if (IDOL_ROWS.some((row) => row.id === page)) return "idols";
    if (page === "calendar" || page === "collections") return page;
    if (ABOUT_ROWS.some((row) => row.id === page) || page === "privacy") return "about";

    return null;
}

// Pages whose data starts loading as soon as their link is hovered or focused.
export const PREFETCH: Partial<Record<NavPage, () => void>> = {
    idols: prefetchIdolsList,
    collections: prefetchCollectionsList,
};

// Collections also needs its frontend build flag: without it the route isn't mounted.
export const showCollections = (features: Features) =>
    features.collection && import.meta.env.VITE_COLLECTION_ENABLED === "true";
