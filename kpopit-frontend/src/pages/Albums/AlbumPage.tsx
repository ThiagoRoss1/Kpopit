import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageLoader from "../../components/Loading/PageLoader";
import NotFound from "../NotFound/NotFound";
import { Link, useNavigate } from "react-router";
import { ArrowRight, ChevronDown, ChevronLeft } from "lucide-react";
import PageShell from "../../components/Puff/PageShell";
import HScrollRow from "../../components/Puff/HScrollRow";
import IntentLink from "../../components/Links/IntentLink";
import PageMeta, { SITE_URL } from "../../components/Seo/PageMeta";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { buildAlbumSlug } from "../../utils/formatters";
import type { AlbumDiscographyItem, AlbumPageData } from "../../interfaces/gameInterfaces";
import { albumPath, albumQuery, languageFlag, shortType } from "./albumsData";
import "./albumPage.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ordinal = (n: number) => {
    const teen = n % 100 >= 11 && n % 100 <= 13;
    return `${n}${teen ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

// Phones show the first releases around the current one; the rest open with "Show all".
const COLLAPSED_ROWS = 5;

function Tile({ label, ko, value, sub, flag }: { label: string; ko: string; value: string; sub?: string; flag?: string | null }) {
    return (
        <div className="ap-tile ap-in-rise flex flex-col gap-2 min-w-0 pt-(--tile-pad) px-(--tile-pad) pb-[13px] rounded-[20px] border-2 border-(--ink) bg-(--chip) text-(--chip-ink) [box-shadow:3px_4px_0_var(--ctl-off),var(--in)]">
            <span className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
                <span className="font-semibold text-[11px] leading-none tracking-[.12em] text-(--muted)">{label}</span>
                <span lang="ko" className="font-korean font-medium text-[10px] leading-none text-(--muted)">{ko}</span>
            </span>
            <span className="flex items-center gap-2 min-w-0 font-bold text-(length:--tile-fs) leading-[1.2]">
                {flag && <img src={flag} alt="" className="w-6 h-4 flex-none rounded-[4px] border-[1.5px] border-[#1A1418] object-cover bg-[#1A1418]" />}
                <span className="overflow-hidden text-ellipsis whitespace-nowrap pb-px">{value}</span>
            </span>
            {sub && <span className="font-medium text-xs leading-[1.3] text-(--muted) overflow-hidden text-ellipsis whitespace-nowrap">{sub}</span>}
        </div>
    );
}

/** The record behind the sleeve: grooves, a turning sheen, the cover as its label. */
function Record({ cover }: { cover: string }) {
    const clip = useId();
    const grooves = [21.5, 23.5, 25.8, 28, 30.4, 32.6, 36.2, 38.4, 40.8, 43, 45.2, 47];
    return (
        <div aria-hidden className="ap-in-disc absolute top-[5%] right-0 w-[72%] aspect-square">
            <div className="ap-disc absolute inset-0">
                <svg viewBox="0 0 100 100" className="absolute inset-0 block w-full h-full overflow-visible">
                    <circle cx="51.3" cy="51.9" r="49.2" fill="#1A1418" />
                    <circle cx="50" cy="50" r="49.2" fill="#120610" />
                    <circle cx="50" cy="50" r="34.4" fill="none" stroke="#050003" strokeWidth=".9" />
                    {grooves.map((r, i) => (
                        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke={i % 3 === 1 ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.05)"} strokeWidth={i % 2 ? ".35" : ".5"} />
                    ))}
                </svg>
                <div className="ap-sheen ap-in-spin absolute inset-[1%] rounded-full pointer-events-none bg-[conic-gradient(from_20deg,rgba(255,255,255,0)_0deg,rgba(255,255,255,.16)_28deg,rgba(255,255,255,0)_64deg,rgba(255,255,255,0)_190deg,rgba(255,255,255,.09)_218deg,rgba(255,255,255,0)_250deg)]" />
                <svg viewBox="0 0 100 100" className="absolute inset-0 block w-full h-full overflow-visible">
                    <defs><clipPath id={clip}><circle cx="50" cy="50" r="19" /></clipPath></defs>
                    <g className="ap-label ap-in-spin [transform-box:view-box] origin-center">
                        <circle cx="50" cy="50" r="19" fill="#FF8AC4" />
                        <image href={cover} x="31" y="31" width="38" height="38" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} />
                        <circle cx="50" cy="50" r="19" fill="none" stroke="#1A1418" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    </g>
                    <circle cx="50" cy="50" r="49.2" fill="none" stroke="#1A1418" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                    <circle cx="50" cy="50" r="1.6" fill="#FAF6F0" stroke="#1A1418" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
            </div>
        </div>
    );
}

// None from the route (a preview build without its API): the page fetches the album itself.
export default function AlbumPage({ id, initialAlbum }: { id: string; initialAlbum?: AlbumPageData }) {
    const { data, isError } = useQuery({ ...albumQuery(id), initialData: initialAlbum, retry: false });
    if (isError) return <NotFound />;
    return data ? <Album key={data.id} album={data} /> : <PageLoader message="Loading album..." />;
}

function Album({ album }: { album: AlbumPageData }) {
    const navigate = useNavigate();
    const { artist } = album;
    const canonical = albumPath(album, artist.name);

    // An old or edited slug goes to the canonical one (the id is what identifies the album).
    useEffect(() => {
        const slug = buildAlbumSlug(album.name, artist.name);
        if (!window.location.pathname.endsWith(`/${slug}`)) navigate(canonical, { replace: true });
    }, [album.name, artist.name, canonical, navigate]);

    // Center the current album in the discography row (without scrolling the page).
    useEffect(() => {
        const current = document.querySelector<HTMLElement>(".ap-dc[aria-current='page']");
        const row = current?.closest<HTMLElement>(".ap-scroll");
        if (current && row) row.scrollLeft = current.offsetLeft - row.clientWidth / 2 + current.clientWidth / 2;
    }, [album.id]);
    const [expanded, setExpanded] = useState(false);

    const [y, m, d] = album.release_date.split("-").map(Number);
    const all: AlbumDiscographyItem[] = [...album.discography, { ...album, release_year: y }].sort((a, b) => a.release_year - b.release_year || a.id - b.id);
    const index = all.findIndex((a) => a.id === album.id);
    const sameType = all.filter((a) => a.type === album.type);
    const nth = sameType.findIndex((a) => a.id === album.id) + 1;
    const years = artist.debut_year ? y - artist.debut_year : null;
    const cover = resolveCdnUrl(album.cover_path) ?? "";
    const foreign = album.language && album.language !== "Korean";
    const era = artist.is_soloist
        ? ["Soloist", artist.generation && `${ordinal(artist.generation)} gen`, artist.fandom_name].filter(Boolean).join(" · ")
        : [artist.generation && `${ordinal(artist.generation)} gen`, artist.member_count && `${artist.member_count} members`, artist.fandom_name].filter(Boolean).join(" · ");
    // The six releases closest to this one, in release order.
    const more = all
        .map((a, i) => ({ a, i }))
        .filter((x) => x.a.id !== album.id)
        .sort((p, q) => Math.abs(p.i - index) - Math.abs(q.i - index))
        .slice(0, 6)
        .sort((p, q) => p.i - q.i)
        .map((x) => x.a);
    const typeLabel = (type: string) => shortType(type);
    const dot = (a: AlbumDiscographyItem, cur: boolean, big: string, small: string) => ({
        width: cur ? big : small,
        height: cur ? big : small,
        background: cur ? "#FF3399" : a.type === "Single" ? "var(--chip)" : "var(--side)",
        boxShadow: cur ? "2px 3px 0 #1A1418,inset 0 2px 0 rgba(255,255,255,.5)" : "1.5px 2px 0 #1A1418",
    });
    // Phones: a window of rows around the current release unless expanded.
    const from = Math.max(0, Math.min(index - 2, all.length - COLLAPSED_ROWS));
    const visible = (i: number) => expanded || (i >= from && i < from + COLLAPSED_ROWS);

    return (
        <>
            <PageMeta
                title={`${album.name} by ${artist.name}: ${album.type}, ${y} | KpopIt`}
                description={`${album.name} is ${artist.name}'s ${shortType(album.type).toLowerCase()} ${album.type === "Single" ? "release" : "album"} from ${MONTHS[m - 1]} ${d}, ${y}${album.language ? ` (${album.language})` : ""}. One of the covers you can guess in KpopIt's Pixelated mode.`}
                path={canonical}
                image={resolveCdnUrl(album.cover_path) ?? undefined}
                jsonLd={{
                    "@context": "https://schema.org",
                    "@type": "MusicAlbum",
                    name: album.name,
                    byArtist: { "@type": "MusicGroup", name: artist.name },
                    datePublished: album.release_date,
                    image: resolveCdnUrl(album.cover_path) ?? undefined,
                    url: `${SITE_URL}${canonical}`,
                }}
            />
            <PageShell width="max-w-[1360px]" className="pt-[18px] pb-8">
                <div className="ap-inner">
                    <PressBack />

                    <section key={album.id} className="ap-in grid grid-cols-(--hero-cols) gap-(--hero-gap) items-center mt-7">
                        <div className="ap-hero ap-in-fade relative aspect-[1/0.8] w-full max-w-(--hero-w) justify-self-center">
                            <Record cover={cover} />
                            <div className="ap-in-dropt absolute left-0 top-0 w-[80%] aspect-square rounded-[18px] border-[2.5px] border-[#1A1418] overflow-hidden bg-[#DCD6D2] [box-shadow:5px_7px_0_var(--side),5px_7px_0_2.5px_#1A1418]">
                                <span aria-hidden className="absolute inset-0 grid place-items-center font-bold text-[64px] leading-none text-[rgba(26,20,24,.28)]">♪</span>
                                <img src={cover} alt={`${album.name} cover`} className="ap-cimg relative block w-full h-full object-cover" />
                                <div aria-hidden className="ap-sweep absolute top-0 bottom-0 -left-[60%] w-[220%] pointer-events-none bg-[linear-gradient(118deg,rgba(255,255,255,0)_40%,rgba(255,255,255,.2)_47%,rgba(255,255,255,.06)_51%,rgba(255,255,255,0)_57%)]" />
                                <div aria-hidden className="absolute -right-[30px] -bottom-[30px] w-[150px] h-[150px] pointer-events-none bg-[radial-gradient(circle,rgba(255,253,250,.85)_2px,transparent_2.4px)] bg-size-[9px_9px] [mask-image:radial-gradient(circle_at_100%_100%,#000_0%,transparent_62%)]" />
                            </div>
                        </div>

                        <div className="flex flex-col [align-items:var(--info-align)] [text-align:var(--info-text)] gap-4 min-w-0">
                            {foreign && (
                                <div className="flex [justify-content:var(--info-align)]">
                                    <span className="ap-in-drop inline-block bg-[#FF70B8] text-white border-2 border-[#1A1418] rounded-[8px] py-[5px] px-[7px] font-bold text-[10px] leading-none [text-shadow:var(--tag-text)] [box-shadow:2px_3px_0_#1A1418,inset_0_1.5px_0_rgba(255,255,255,.6)] -rotate-4">
                                        {album.language === "Japanese" ? "JP release" : "EN release"}
                                    </span>
                                </div>
                            )}
                            <h1 className="ap-in-drop [animation-delay:.06s] m-0 font-bold text-(length:--title-fs) leading-[1.1] tracking-[-.01em] text-white [text-shadow:var(--puff-title)] puff-ink pr-2 pb-3 pl-1 [text-wrap:balance] [overflow-wrap:anywhere]">{album.name}</h1>
                            <div className="flex items-center [justify-content:var(--info-align)] flex-wrap gap-x-3 gap-y-2.5">
                                <Link to={`/albums?artist=${encodeURIComponent(artist.name)}`} className="ap-btn ap-focus inline-flex items-center gap-2 h-10 px-4 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) font-bold text-[15px] no-underline [box-shadow:2px_3px_0_var(--ctl-off),var(--in)]">
                                    {artist.name}
                                </Link>
                                {artist.hangul_name && <span lang="ko" className="font-korean font-bold text-base leading-none text-(--muted)">{artist.hangul_name}</span>}
                            </div>
                            {era && <span className="font-caveat font-normal text-2xl leading-[1.15] text-(--muted) -rotate-2 -mt-1">{era}</span>}
                            <div className="grid grid-cols-(--tiles) gap-3.5 mt-1.5 w-full text-left">
                                <Tile label="RELEASED" ko="발매일" value={`${MONTHS[m - 1]} ${d}, ${y}`} sub={years === null ? undefined : years > 0 ? `${years} ${years === 1 ? "year" : "years"} after debut` : "Debut year"} />
                                <Tile label="TYPE" ko="유형" value={album.type} sub={nth > 0 ? `${ordinal(nth)} ${typeLabel(album.type).toLowerCase()} ${album.type === "Single" ? "release" : "album"}` : undefined} />
                                <Tile label="LANGUAGE" ko="언어" value={album.language ?? "Unknown"} sub={album.language ? `${album.language} release` : undefined} flag={languageFlag(album.language)} />
                            </div>
                        </div>
                    </section>

                    <section aria-labelledby="disco-title" className="ap-in [animation-delay:.12s] mt-16">
                        <div className="flex items-baseline justify-between gap-4 flex-wrap">
                            <h2 id="disco-title" className="m-0 font-mono-display font-normal text-[26px] leading-none tracking-[.02em]">discography</h2>
                            <span className="font-medium text-[13px] text-(--muted)">{`${all.length} ${all.length === 1 ? "release" : "releases"} · ${all[0].release_year}–${all[all.length - 1].release_year}`}</span>
                        </div>
                        <div className="[display:var(--disco-h)] mt-[18px]">
                        <HScrollRow bar aria-label="Discography" className="ap-scroll overflow-y-hidden pt-1 px-1 pb-3.5">
                            <div className="ap-track relative box-border flex flex-none gap-1.5 min-w-full w-max pt-[34px] px-7">
                                {all.map((a, i) => {
                                    const cur = a.id === album.id;
                                    const firstOfYear = i === 0 || all[i - 1].release_year !== a.release_year;
                                    return (
                                        <IntentLink
                                            key={a.id}
                                            to={albumPath(a, artist.name)}
                                            aria-current={cur ? "page" : undefined}
                                            aria-label={`${a.name}, ${a.release_year}`}
                                            draggable={false}
                                            className="ap-dc ap-focus relative flex-[1_0_92px] flex flex-col items-center gap-2.5 p-0 no-underline text-inherit"
                                            style={{ cursor: cur ? "default" : "pointer" }}
                                        >
                                            <span className="absolute -top-[30px] z-1 font-bold text-[11px] leading-none text-(--muted)" style={{ visibility: firstOfYear ? "visible" : "hidden" }}>{a.release_year}</span>
                                            <span aria-hidden className={`ap-dot relative z-1 rounded-full border-2 border-[#1A1418] ${cur ? "ap-in-pop" : ""}`} style={{ ...dot(a, cur, "26px", "16px"), marginTop: cur ? 0 : 5 }} />
                                            <span className="ap-dn w-full text-center text-[11.5px] leading-[1.3] overflow-hidden text-ellipsis whitespace-nowrap pb-px" style={{ fontWeight: cur ? 700 : 500, color: cur ? "var(--text)" : "var(--muted)" }}>{a.name}</span>
                                            <span className="font-medium text-[10.5px] leading-none text-(--muted)">{typeLabel(a.type)}</span>
                                        </IntentLink>
                                    );
                                })}
                            </div>
                        </HScrollRow>
                        </div>

                        <div className="[display:var(--disco-v)] mt-3.5">
                            <div className="relative flex flex-col gap-0.5">
                                <div aria-hidden className="absolute left-4 top-[18px] bottom-[18px] w-[3px] rounded-[3px] bg-(--rule)" />
                                {all.map((a, i) => {
                                    if (!visible(i)) return null;
                                    const cur = a.id === album.id;
                                    const yearHead = i === 0 || !visible(i - 1) || all[i - 1].release_year !== a.release_year;
                                    return (
                                        <div key={a.id} className="ap-in-row">
                                            {yearHead && <div className="relative pt-3 pb-1 pl-10 font-bold text-[11px] leading-none tracking-[.12em] text-(--muted) text-left">{a.release_year}</div>}
                                            <IntentLink
                                                to={albumPath(a, artist.name)}
                                                aria-current={cur ? "page" : undefined}
                                                aria-label={`${a.name}, ${a.release_year}`}
                                                className="ap-vr ap-focus relative flex items-center gap-3 w-full min-h-12 py-1.5 pr-3.5 pl-1 rounded-[16px] border-2 no-underline text-inherit text-left"
                                                style={{ borderColor: cur ? "var(--ink)" : "transparent", background: cur ? "var(--chip)" : "transparent", boxShadow: cur ? "2px 3px 0 var(--ctl-off),var(--in)" : "none" }}
                                            >
                                                <span className="w-[26px] flex-none grid place-items-center">
                                                    <span aria-hidden className={`ap-dot rounded-full border-2 border-[#1A1418] ${cur ? "ap-in-pop" : ""}`} style={dot(a, cur, "22px", "14px")} />
                                                </span>
                                                <span className="ap-dn flex-1 min-w-0 text-sm leading-[1.3] overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontWeight: cur ? 700 : 500, color: cur ? "var(--text)" : "var(--muted)" }}>{a.name}</span>
                                                <span className="flex-none font-medium text-xs text-(--muted)">{typeLabel(a.type)}</span>
                                            </IntentLink>
                                        </div>
                                    );
                                })}
                            </div>
                            {all.length > COLLAPSED_ROWS && (
                                <div className="flex justify-center mt-3.5">
                                    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}
                                        className="ap-btn ap-focus inline-flex items-center gap-2 h-11 px-[18px] rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) font-semibold text-[13px] cursor-pointer [box-shadow:2px_3px_0_var(--ctl-off),var(--in)]">
                                        {expanded ? "Show less" : `Show all ${all.length} releases`}
                                        <ChevronDown aria-hidden className="w-3.5 h-3.5 transition-transform duration-300" strokeWidth={2.5} style={{ rotate: expanded ? "180deg" : "0deg" }} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    {more.length > 0 && (
                        <section aria-labelledby="more-title" className="ap-in [animation-delay:.2s] mt-11">
                            <h2 id="more-title" className="m-0 font-mono-display font-normal text-[26px] leading-none tracking-[.02em]">{`more from ${artist.name.toLowerCase()}`}</h2>
                            <div className="grid grid-cols-(--more) gap-x-[22px] gap-y-7 mt-[22px] pt-1 pr-2 pb-2.5 pl-0.5">
                                {more.map((a) => (
                                    <div key={a.id} className="ap-card ap-in-card">
                                        <div className="ap-cw relative">
                                            <div aria-hidden className="absolute inset-0 rounded-[20px] bg-(--side) border-2 border-(--ink) translate-x-1 translate-y-[5px]" />
                                            <IntentLink to={albumPath(a, artist.name)} aria-label={`${a.name}, ${a.release_year}`}
                                                className="ap-face ap-focus relative block w-full text-left no-underline bg-(--face) text-(--text) border-2 border-(--ink) rounded-[20px] pt-1.5 px-1.5 pb-[11px] [box-shadow:var(--face-hl)]">
                                                <div className="relative aspect-square rounded-[14px] border-[1.5px] border-(--ink) overflow-hidden bg-[#DCD6D2]">
                                                    <span aria-hidden className="absolute inset-0 grid place-items-center font-bold text-[32px] leading-none text-[rgba(26,20,24,.28)]">♪</span>
                                                    <img src={resolveCdnUrl(a.cover_path) ?? ""} alt="" loading="lazy" decoding="async" className="ap-mimg relative block w-full h-full object-cover" />
                                                </div>
                                                <div className="mt-2 px-1 pb-px font-bold text-[13px] leading-[1.3] overflow-hidden text-ellipsis whitespace-nowrap">{a.name}</div>
                                                <div className="pt-[3px] px-1 font-semibold text-[11px] leading-[1.3] text-(--muted)">{`${typeLabel(a.type)} · ${a.release_year}`}</div>
                                            </IntentLink>
                                        </div>
                                    </div>
                                ))}
                                {more.length < 6 && (
                                    <div className="ap-card ap-in-card">
                                        <div className="ap-cw relative h-full">
                                            <Link to="/albums" className="ap-face ap-focus relative box-border flex flex-col items-center justify-center gap-2.5 w-full h-full min-h-40 p-3 no-underline text-center text-(--text) bg-transparent border-2 border-dashed border-(--rule) rounded-[20px]">
                                                <span className="w-11 h-11 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) grid place-items-center [box-shadow:2px_3px_0_var(--ctl-off),var(--in)]">
                                                    <ArrowRight aria-hidden className="w-[18px] h-[18px]" strokeWidth={2.6} />
                                                </span>
                                                <span className="font-bold text-[13px] leading-[1.3]">All albums</span>
                                                <span className="font-medium text-[11px] leading-[1.3] text-(--muted)">Browse the catalogue...</span>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    <footer className="flex justify-between gap-5 mt-10 pt-4 border-t-[1.5px] border-(--rule) font-medium text-[11px] text-(--muted)">
                        <span>KpopIt</span>
                        <span>Album data from the KpopIt catalogue</span>
                    </footer>
                </div>
            </PageShell>
        </>
    );
}

function PressBack() {
    return (
        <Link to="/albums" aria-label="Back to all albums"
            className="ap-btn ap-focus w-max box-border inline-flex items-center gap-2 h-9 pr-3.5 pl-2.5 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) font-semibold text-[13px] no-underline [box-shadow:2px_3px_0_var(--ctl-off),var(--in)]">
            <ChevronLeft aria-hidden className="ap-back w-4 h-4" strokeWidth={2.6} />
            All albums
        </Link>
    );
}
