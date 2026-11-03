import "./albumPage.css";
import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { ArrowRight, ChevronDown, ChevronLeft } from "lucide-react";
import { cn } from "../../lib/utils";
import PageLoader from "../../components/Loading/PageLoader";
import PageShell from "../../components/PageShell/PageShell";
import HScrollRow from "../../components/HScrollRow/HScrollRow";
import IntentLink from "../../components/Links/IntentLink";
import PageMeta, { SITE_URL } from "../../components/Seo/PageMeta";
import FadeImg from "../../components/FadeImg";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { buildAlbumSlug } from "../../utils/formatters";
import type { AlbumDiscographyItem, AlbumPageData } from "../../interfaces/gameInterfaces";
import NotFound from "../NotFound/NotFound";
import { albumPath, albumQuery, languageFlag, shortType } from "./albumsData";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Phones show the first releases around the current one; the rest open with "Show all".
const COLLAPSED_ROWS = 5;

// The record's groove rings.
const GROOVES = [21.5, 23.5, 25.8, 28, 30.4, 32.6, 36.2, 38.4, 40.8, 43, 45.2, 47];

const SLOW_EASE = "ease-[cubic-bezier(.25,1,.5,1)]";

// A pill button that lifts on hover and presses into its depth.
const PILL_BUTTON = cn(
    "pp-focus inline-flex items-center gap-2 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) no-underline",
    "shadow-[2px_3px_0_var(--ctl-off),var(--in)] active:shadow-[0_0_0_var(--ctl-off),var(--in)]",
    "transition-[translate,box-shadow,background-color] duration-450 ease-(--ease-settle) will-change-transform",
    "hover:-translate-y-0.5 hover:bg-(--chip-hover) active:translate-x-0.5 active:translate-y-0.75 active:duration-180",
);

const ordinal = (value: number) => {
    const isTeen = value % 100 >= 11 && value % 100 <= 13;
    const suffix = isTeen ? "th" : ["th", "st", "nd", "rd"][value % 10] ?? "th";

    return `${value}${suffix}`;
};

interface TileProps {
    label: string;
    koreanLabel: string;
    value: string;
    sub?: string;
    flag?: string | null;
    className?: string;
    delay: number;
}

/** A fact tile under the title (release date, type, language). */
const Tile = ({ label, koreanLabel, value, sub, flag, className, delay }: TileProps) => {
    return (
        <div
            className={cn(
                "album-tile-enter flex flex-col gap-2 min-w-0 pt-3.5 px-3.5 pb-3.25",
                "rounded-[20px] border-2 border-(--ink) bg-(--chip) text-(--chip-ink) shadow-[3px_4px_0_var(--ctl-off),var(--in)]",
                "transition-[translate] duration-450 ease-(--ease-settle) transform-gpu hover:-translate-y-0.5",
                className,
            )}
            style={{ animationDelay: `${delay}s` }}
        >
            <span className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
                <span className="font-semibold text-[11px] leading-none tracking-[.12em] text-(--muted)">{label}</span>
                <span lang="ko" className="font-korean font-medium text-[10px] leading-none text-(--muted)">{koreanLabel}</span>
            </span>

            <span className="flex items-center gap-2 min-w-0 font-bold text-lg leading-[1.2]">
                {flag && (
                    <img draggable={false} src={flag} alt="" className="flex-none w-6 h-4 rounded-sm border-[1.5px] border-[#1A1418] object-cover bg-[#1A1418]" />
                )}
                <span className="pb-px truncate">{value}</span>
            </span>

            {sub && <span className="font-medium text-xs leading-[1.3] text-(--muted) truncate">{sub}</span>}
        </div>
    );
};

/** The record behind the sleeve: grooves, a sheen and the cover as its label. On the hero's hover
 *  it slides out further and its label and sheen turn. */
const VinylRecord = ({ cover }: { cover: string }) => {
    const clipId = useId();

    const spinOnHover = cn(
        "album-spin-enter transition-[rotate] duration-850 group-hover/hero:rotate-220 group-hover/hero:duration-1200",
        SLOW_EASE,
    );

    return (
        <div aria-hidden className="album-disc-enter absolute top-[5%] right-0 w-[72%] aspect-square">
            <div
                className={cn(
                    "absolute inset-0 transition-[translate] duration-850 transform-gpu",
                    "group-hover/hero:translate-x-[6%] group-hover/hero:duration-1200",
                    SLOW_EASE,
                )}
            >
                <svg viewBox="0 0 100 100" className="absolute inset-0 block size-full overflow-visible">
                    <circle cx="51.3" cy="51.9" r="49.2" fill="#1A1418" />
                    <circle cx="50" cy="50" r="49.2" fill="#120610" />
                    <circle cx="50" cy="50" r="34.4" fill="none" stroke="#050003" strokeWidth=".9" />

                    {GROOVES.map((radius, index) => (
                        <circle
                            key={radius}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke={index % 3 === 1 ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.05)"}
                            strokeWidth={index % 2 ? ".35" : ".5"}
                        />
                    ))}
                </svg>

                <div
                    className={cn(
                        "absolute inset-[1%] rounded-full pointer-events-none",
                        "bg-[conic-gradient(from_20deg,rgba(255,255,255,0)_0deg,rgba(255,255,255,.16)_28deg,rgba(255,255,255,0)_64deg,rgba(255,255,255,0)_190deg,rgba(255,255,255,.09)_218deg,rgba(255,255,255,0)_250deg)]",
                        spinOnHover,
                    )}
                />

                <svg viewBox="0 0 100 100" className="absolute inset-0 block size-full overflow-visible">
                    <defs>
                        <clipPath id={clipId}>
                            <circle cx="50" cy="50" r="19" />
                        </clipPath>
                    </defs>

                    <g className={cn("transform-view origin-center", spinOnHover)}>
                        <circle cx="50" cy="50" r="19" fill="#FF8AC4" />
                        <image href={cover} x="31" y="31" width="38" height="38" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
                        <circle cx="50" cy="50" r="19" fill="none" stroke="#1A1418" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    </g>

                    <circle cx="50" cy="50" r="49.2" fill="none" stroke="#1A1418" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                    <circle cx="50" cy="50" r="1.6" fill="#FAF6F0" stroke="#1A1418" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
            </div>
        </div>
    );
};

/** A release's dot on the discography line: the current one is bigger and hot pink. */
const ReleaseDot = ({ release, isCurrent, size }: { release: AlbumDiscographyItem; isCurrent: boolean; size: "row" | "list" }) => {
    return (
        <span
            aria-hidden
            className={cn(
                "relative z-1 rounded-full border-2 border-[#1A1418]",
                "transition-[scale,background-color] duration-350 ease-(--ease-pop) transform-gpu",
                "group-hover:scale-120 group-pressed:scale-86 group-pressed:duration-150",
                isCurrent
                    ? "album-dot-enter bg-neon-pink shadow-[2px_3px_0_#1A1418,inset_0_2px_0_rgba(255,255,255,.5)]"
                    : cn("shadow-[1.5px_2px_0_#1A1418]", release.type === "Single" ? "bg-(--chip)" : "bg-(--side)"),
                size === "row" && (isCurrent ? "size-6.5" : "size-4 mt-1.25"),
                size === "list" && (isCurrent ? "size-5.5" : "size-3.5"),
            )}
        />
    );
};

interface AlbumPageProps {
    id: string;
    /** None from the route (a preview build without its API): the page fetches the album itself. */
    initialAlbum?: AlbumPageData;
}

const AlbumPage = ({ id, initialAlbum }: AlbumPageProps) => {
    const { data, isError } = useQuery({ ...albumQuery(id), initialData: initialAlbum, retry: false });

    if (isError) return <NotFound />;
    if (!data) return <PageLoader message="Loading album..." />;

    return <Album key={data.id} album={data} />;
};

const Album = ({ album }: { album: AlbumPageData }) => {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const { artist } = album;
    const canonicalPath = albumPath(album, artist.name);

    // An old or edited slug goes to the canonical one (the id is what identifies the album).
    useEffect(() => {
        const slug = buildAlbumSlug(album.name, artist.name);

        if (!window.location.pathname.endsWith(`/${slug}`)) navigate(canonicalPath, { replace: true });
    }, [album.name, artist.name, canonicalPath, navigate]);

    // Centre the current album in the discography row (without scrolling the page).
    useEffect(() => {
        const current = document.querySelector<HTMLElement>("[data-release-row] [aria-current='page']");
        const row = current?.closest<HTMLElement>(".pp-hscroll");
        if (!current || !row) return;

        row.scrollLeft = current.offsetLeft - row.clientWidth / 2 + current.clientWidth / 2;
    }, [album.id]);

    const [releaseYear, releaseMonth, releaseDay] = album.release_date.split("-").map(Number);
    const releaseDate = `${MONTHS[releaseMonth - 1]} ${releaseDay}, ${releaseYear}`;

    const releases: AlbumDiscographyItem[] = [...album.discography, { ...album, release_year: releaseYear }]
        .sort((first, second) => first.release_year - second.release_year || first.id - second.id);
    const currentIndex = releases.findIndex((release) => release.id === album.id);
    const sameTypeIndex = releases.filter((release) => release.type === album.type).findIndex((release) => release.id === album.id) + 1;

    const yearsAfterDebut = artist.debut_year ? releaseYear - artist.debut_year : null;
    const cover = resolveCdnUrl(album.cover_path) ?? "";
    const isForeignRelease = album.language && album.language !== "Korean";
    const isSingle = album.type === "Single";

    const generation = artist.generation && `${ordinal(artist.generation)} gen`;
    const era = artist.is_soloist
        ? ["Soloist", generation, artist.fandom_name].filter(Boolean).join(" · ")
        : [generation, artist.member_count && `${artist.member_count} members`, artist.fandom_name].filter(Boolean).join(" · ");

    // The six releases closest to this one, in release order.
    const moreReleases = releases
        .map((release, index) => ({ release, index }))
        .filter((entry) => entry.release.id !== album.id)
        .sort((first, second) => Math.abs(first.index - currentIndex) - Math.abs(second.index - currentIndex))
        .slice(0, 6)
        .sort((first, second) => first.index - second.index)
        .map((entry) => entry.release);

    // Phones: a window of rows around the current release unless expanded.
    const windowStart = Math.max(0, Math.min(currentIndex - 2, releases.length - COLLAPSED_ROWS));
    const isVisible = (index: number) => expanded || (index >= windowStart && index < windowStart + COLLAPSED_ROWS);

    const debutSub = yearsAfterDebut === null
        ? undefined
        : yearsAfterDebut > 0 ? `${yearsAfterDebut} ${yearsAfterDebut === 1 ? "year" : "years"} after debut` : "Debut year";
    const typeSub = sameTypeIndex > 0
        ? `${ordinal(sameTypeIndex)} ${shortType(album.type).toLowerCase()} ${isSingle ? "release" : "album"}`
        : undefined;

    const description = `${album.name} is ${artist.name}'s ${shortType(album.type).toLowerCase()} ${isSingle ? "release" : "album"} `
        + `from ${releaseDate}${album.language ? ` (${album.language})` : ""}. One of the covers you can guess in KpopIt's Pixelated mode.`;

    return (
        <>
            <PageMeta
                title={`${album.name} by ${artist.name}: ${album.type}, ${releaseYear} | KpopIt`}
                description={description}
                path={canonicalPath}
                image={cover || undefined}
                jsonLd={{
                    "@context": "https://schema.org",
                    "@type": "MusicAlbum",
                    name: album.name,
                    byArtist: { "@type": "MusicGroup", name: artist.name },
                    datePublished: album.release_date,
                    image: cover || undefined,
                    url: `${SITE_URL}${canonicalPath}`,
                }}
            />

            <PageShell width="max-w-340" className="pt-4.5 pb-8">
                <Link to="/albums" aria-label="Back to all albums" className={cn(PILL_BUTTON, "group w-max box-border h-9 pr-3.5 pl-2.5 font-semibold text-[13px]")}>
                    <ChevronLeft aria-hidden className="size-4 transition-transform duration-350 ease-(--ease-pop) group-hover:-translate-x-0.5" strokeWidth={2.6} />
                    All albums
                </Link>

                {/* Hero: sleeve and record, title, artist and facts */}
                <section
                    key={album.id}
                    className={cn(
                        "album-rise-enter grid items-center mt-7",
                        "grid-cols-[minmax(0,440px)_minmax(0,1fr)] gap-14",
                        "@max-[821px]:grid-cols-[minmax(0,1fr)] @max-[821px]:gap-9",
                    )}
                >
                    <div className="group/hero album-fade-enter relative justify-self-center aspect-[1/0.8] w-full max-w-110 @max-[521px]:max-w-[86%]">
                        <VinylRecord cover={cover} />

                        <div
                            className={cn(
                                "album-sleeve-enter absolute left-0 top-0 w-[80%] aspect-square overflow-hidden",
                                "rounded-[18px] border-[2.5px] border-[#1A1418] bg-[#DCD6D2]",
                                "shadow-[5px_7px_0_var(--side),5px_7px_0_2.5px_#1A1418]",
                            )}
                        >
                            <span aria-hidden className="absolute inset-0 grid place-items-center font-bold text-[64px] leading-none text-[rgba(26,20,24,.28)]">
                                ♪
                            </span>

                            <FadeImg
                                draggable={false}
                                src={cover}
                                alt={`${album.name} cover`}
                                className="relative block size-full object-cover transition-[scale,opacity] duration-700 ease-(--ease-settle) group-hover/hero:scale-105"
                            />

                            {/* A light sweep across the sleeve on hover */}
                            <div
                                aria-hidden
                                className={cn(
                                    "absolute inset-y-0 left-[-60%] w-[220%] pointer-events-none",
                                    "bg-[linear-gradient(118deg,rgba(255,255,255,0)_40%,rgba(255,255,255,.2)_47%,rgba(255,255,255,.06)_51%,rgba(255,255,255,0)_57%)]",
                                    "transition-[translate] duration-800 transform-gpu group-hover/hero:translate-x-[42%] group-hover/hero:duration-1300",
                                    SLOW_EASE,
                                )}
                            />

                            <div
                                aria-hidden
                                className={cn(
                                    "absolute -right-7.5 -bottom-7.5 size-37.5 pointer-events-none",
                                    "bg-[radial-gradient(circle,rgba(255,253,250,.85)_2px,transparent_2.4px)] bg-size-[9px_9px]",
                                    "mask-[radial-gradient(circle_at_100%_100%,#000_0%,transparent_62%)]",
                                )}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 min-w-0 items-start text-left @max-[521px]:items-center @max-[521px]:text-center">
                        {isForeignRelease && (
                            <div className="flex justify-start @max-[521px]:justify-center">
                                <span
                                    className={cn(
                                        "album-drop-enter inline-block py-1.25 px-1.75 -rotate-4",
                                        "rounded-lg border-2 border-[#1A1418] bg-[#FF70B8] shadow-[2px_3px_0_#1A1418,inset_0_1.5px_0_rgba(255,255,255,.6)]",
                                        "font-bold text-[10px] leading-none text-white text-shadow-(--tag-text)",
                                    )}
                                >
                                    {album.language === "Japanese" ? "JP release" : "EN release"}
                                </span>
                            </div>
                        )}

                        <h1
                            className={cn(
                                "album-drop-enter [animation-delay:.06s] m-0 pr-2 pb-3 pl-1 puff-ink",
                                "font-bold text-[60px] @max-[821px]:text-5xl @max-[521px]:text-[38px] leading-[1.1] tracking-[-.01em]",
                                "text-white text-shadow-(--puff-title) text-balance wrap-anywhere",
                            )}
                        >
                            {album.name}
                        </h1>

                        <div className="flex items-center flex-wrap gap-x-3 gap-y-2.5 justify-start @max-[521px]:justify-center">
                            <Link to={`/albums?artist=${encodeURIComponent(artist.name)}`} className={cn(PILL_BUTTON, "h-10 px-4 font-bold text-[15px]")}>
                                {artist.name}
                            </Link>

                            {artist.hangul_name && (
                                <span lang="ko" className="font-korean font-bold text-base leading-none text-(--muted)">{artist.hangul_name}</span>
                            )}
                        </div>

                        {era && <span className="-mt-1 -rotate-2 font-caveat font-normal text-2xl leading-[1.15] text-(--muted)">{era}</span>}

                        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] @max-[521px]:grid-cols-2 gap-3.5 w-full mt-1.5 text-left">
                            <Tile label="RELEASED" koreanLabel="발매일" value={releaseDate} sub={debutSub} delay={0.12} />
                            <Tile label="TYPE" koreanLabel="유형" value={album.type} sub={typeSub} delay={0.165} />
                            <Tile
                                label="LANGUAGE"
                                koreanLabel="언어"
                                value={album.language ?? "Unknown"}
                                sub={album.language ? `${album.language} release` : undefined}
                                flag={languageFlag(album.language)}
                                delay={0.21}
                                className="@max-[521px]:col-span-full @max-[521px]:justify-self-center @max-[521px]:w-[calc(50%-7px)]"
                            />
                        </div>
                    </div>
                </section>

                {/* Discography */}
                <section aria-labelledby="discography-title" className="album-rise-enter [animation-delay:.12s] mt-16">
                    <div className="flex items-baseline justify-between flex-wrap gap-4">
                        <h2 id="discography-title" className="m-0 font-mono-display font-normal text-[26px] leading-none tracking-[.02em]">
                            discography
                        </h2>

                        <span className="font-medium text-[13px] text-(--muted)">
                            {`${releases.length} ${releases.length === 1 ? "release" : "releases"} · ${releases[0].release_year}–${releases[releases.length - 1].release_year}`}
                        </span>
                    </div>

                    {/* Wide screens: a timeline that fills the width and drag-scrolls when it can't */}
                    <div className="mt-4.5 @max-[521px]:hidden">
                        <HScrollRow bar aria-label="Discography" className="overflow-y-hidden pt-1 px-1 pb-3.5">
                            <div data-release-row className="relative box-border flex flex-none gap-1.5 min-w-full w-max pt-8.5 px-7 select-none">
                                {releases.map((release, index) => {
                                    const isCurrent = release.id === album.id;
                                    const isFirstOfYear = index === 0 || releases[index - 1].release_year !== release.release_year;

                                    return (
                                        <IntentLink
                                            key={release.id}
                                            pressTarget="child"
                                            to={albumPath(release, artist.name)}
                                            aria-current={isCurrent ? "page" : undefined}
                                            aria-label={`${release.name}, ${release.release_year}`}
                                            draggable={false}
                                            className={cn(
                                                "pp-focus group relative flex-[1_0_92px] flex flex-col items-center gap-2.5 p-0 no-underline text-inherit",
                                                // Each release draws its piece of the line through the dots, so it spans every one.
                                                "before:absolute before:top-[11.5px] before:-inset-x-0.75 before:h-0.75 before:bg-(--rule)",
                                                "first:before:-left-7 first:before:rounded-l-[3px] last:before:-right-7 last:before:rounded-r-[3px]",
                                                isCurrent ? "cursor-default" : "cursor-pointer",
                                            )}
                                        >
                                            <span className={cn("absolute -top-7.5 z-1 font-bold text-[11px] leading-none text-(--muted)", !isFirstOfYear && "invisible")}>
                                                {release.release_year}
                                            </span>

                                            <ReleaseDot release={release} isCurrent={isCurrent} size="row" />

                                            <span
                                                className={cn(
                                                    "w-full pb-px text-center text-[11.5px] leading-[1.3] truncate transition-colors duration-250 group-hover:text-(--text)",
                                                    isCurrent ? "font-bold text-(--text)" : "font-medium text-(--muted)",
                                                )}
                                            >
                                                {release.name}
                                            </span>

                                            <span className="font-medium text-[10.5px] leading-none text-(--muted)">{shortType(release.type)}</span>
                                        </IntentLink>
                                    );
                                })}
                            </div>
                        </HScrollRow>
                    </div>

                    {/* Phones: a vertical list around the current release */}
                    <div className="hidden @max-[521px]:block mt-3.5">
                        <div className="relative flex flex-col gap-0.5">
                            <div aria-hidden className="absolute left-4 inset-y-4.5 w-0.75 rounded-[3px] bg-(--rule)" />

                            {releases.map((release, index) => {
                                if (!isVisible(index)) return null;

                                const isCurrent = release.id === album.id;
                                const showsYear = index === 0 || !isVisible(index - 1) || releases[index - 1].release_year !== release.release_year;

                                return (
                                    <div key={release.id} className="album-row-enter">
                                        {showsYear && (
                                            <div className="relative pt-3 pb-1 pl-10 text-left font-bold text-[11px] leading-none tracking-[.12em] text-(--muted)">
                                                {release.release_year}
                                            </div>
                                        )}

                                        <IntentLink
                                            pressTarget="child"
                                            to={albumPath(release, artist.name)}
                                            aria-current={isCurrent ? "page" : undefined}
                                            aria-label={`${release.name}, ${release.release_year}`}
                                            className={cn(
                                                "pp-focus group relative flex items-center gap-3 w-full min-h-12 py-1.5 pr-3.5 pl-1",
                                                "rounded-2xl border-2 text-left text-inherit no-underline",
                                                isCurrent
                                                    ? "border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]"
                                                    : "border-transparent bg-transparent",
                                            )}
                                        >
                                            <span className="flex-none grid place-items-center w-6.5">
                                                <ReleaseDot release={release} isCurrent={isCurrent} size="list" />
                                            </span>

                                            <span
                                                className={cn(
                                                    "flex-1 min-w-0 text-sm leading-[1.3] truncate transition-colors duration-250 group-hover:text-(--text)",
                                                    isCurrent ? "font-bold text-(--text)" : "font-medium text-(--muted)",
                                                )}
                                            >
                                                {release.name}
                                            </span>

                                            <span className="flex-none font-medium text-xs text-(--muted)">{shortType(release.type)}</span>
                                        </IntentLink>
                                    </div>
                                );
                            })}
                        </div>

                        {releases.length > COLLAPSED_ROWS && (
                            <div className="flex justify-center mt-3.5">
                                <button
                                    type="button"
                                    aria-expanded={expanded}
                                    onClick={() => setExpanded(!expanded)}
                                    className={cn(PILL_BUTTON, "h-11 px-4.5 font-semibold text-[13px] cursor-pointer")}
                                >
                                    {expanded ? "Show less" : `Show all ${releases.length} releases`}
                                    <ChevronDown
                                        aria-hidden
                                        className={cn("size-3.5 transition-transform duration-300 transform-gpu", expanded && "rotate-180")}
                                        strokeWidth={2.5}
                                    />
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* More from the artist */}
                {moreReleases.length > 0 && (
                    <section aria-labelledby="more-title" className="album-rise-enter [animation-delay:.2s] mt-11">
                        <h2 id="more-title" className="m-0 font-mono-display font-normal text-[26px] leading-none tracking-[.02em]">
                            {`more from ${artist.name.toLowerCase()}`}
                        </h2>

                        <div
                            className={cn(
                                "grid gap-x-5.5 gap-y-7 mt-5.5 pt-1 pr-2 pb-2.5 pl-0.5",
                                "grid-cols-6 @max-[1101px]:grid-cols-4 @max-[821px]:grid-cols-3 @max-[521px]:grid-cols-2",
                            )}
                        >
                            {moreReleases.map((release, index) => (
                                <MoreCard key={release.id} release={release} artistName={artist.name} index={index} />
                            ))}

                            {moreReleases.length < 6 && (
                                <div className="album-rise-enter" style={{ animationDelay: `${0.08 + moreReleases.length * 0.045}s` }}>
                                    <Link
                                        to="/albums"
                                        className={cn(
                                            "pp-focus relative box-border flex flex-col items-center justify-center gap-2.5 size-full min-h-40 p-3",
                                            "rounded-[20px] border-2 border-dashed border-(--rule) bg-transparent text-center text-(--text) no-underline",
                                        )}
                                    >
                                        <span className="grid place-items-center size-11 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) shadow-[2px_3px_0_var(--ctl-off),var(--in)]">
                                            <ArrowRight aria-hidden className="size-4.5" strokeWidth={2.6} />
                                        </span>

                                        <span className="font-bold text-[13px] leading-[1.3]">All albums</span>
                                        <span className="font-medium text-[11px] leading-[1.3] text-(--muted)">Browse the catalogue...</span>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                <footer className="flex justify-between gap-5 mt-10 pt-4 border-t-[1.5px] border-(--rule) font-medium text-[11px] text-(--muted)">
                    <span>KpopIt</span>
                    <span>Album data from the KpopIt catalogue</span>
                </footer>
            </PageShell>
        </>
    );
};

interface MoreCardProps {
    release: AlbumDiscographyItem;
    artistName: string;
    index: number;
}

/** A tilted card of another release that lifts and presses into its pink depth. */
const MoreCard = ({ release, artistName, index }: MoreCardProps) => {
    return (
        <div className="group album-rise-enter" style={{ animationDelay: `${0.08 + index * 0.045}s` }}>
            <div
                className={cn(
                    "relative transition-[rotate] duration-450 ease-(--ease-settle) transform-gpu group-hover:rotate-0",
                    index % 2 ? "rotate-[0.5deg]" : "rotate-[-0.5deg]",
                )}
            >
                <div aria-hidden className="absolute inset-0 rounded-[20px] border-2 border-(--ink) bg-(--side) translate-x-1 translate-y-1.25" />

                <IntentLink
                    to={albumPath(release, artistName)}
                    aria-label={`${release.name}, ${release.release_year}`}
                    className={cn(
                        "pp-focus relative block w-full pt-1.5 px-1.5 pb-2.75 text-left no-underline",
                        "rounded-[20px] border-2 border-(--ink) bg-(--face) text-(--text) shadow-(--face-hl)",
                        "transition-[translate] duration-350 ease-(--ease-settle) transform-gpu",
                        "group-hover:-translate-x-px group-hover:-translate-y-0.75 group-active:translate-x-1 group-active:translate-y-1.25 group-active:duration-150",
                    )}
                >
                    <div className="relative aspect-square overflow-hidden rounded-[14px] border-[1.5px] border-(--ink) bg-[#DCD6D2]">
                        <span aria-hidden className="absolute inset-0 grid place-items-center font-bold text-[32px] leading-none text-[rgba(26,20,24,.28)]">
                            ♪
                        </span>

                        <FadeImg
                            draggable={false}
                            src={resolveCdnUrl(release.cover_path) ?? ""}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="relative block size-full object-cover transition-[scale,opacity] duration-600 ease-(--ease-settle) group-hover:scale-108"
                        />
                    </div>

                    <div className="mt-2 px-1 pb-px font-bold text-[13px] leading-[1.3] truncate">{release.name}</div>
                    <div className="pt-0.75 px-1 font-semibold text-[11px] leading-[1.3] text-(--muted)">{`${shortType(release.type)} · ${release.release_year}`}</div>
                </IntentLink>
            </div>
        </div>
    );
};

export default AlbumPage;
