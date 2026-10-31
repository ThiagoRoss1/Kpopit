import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import PageLoader from "../../components/Loading/PageLoader";
import NotFound from "../NotFound/NotFound";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import PageShell from "../../components/Puff/PageShell";
import { PressLink } from "../../components/Puff/PressButton";
import HScrollRow from "../../components/Puff/HScrollRow";
import IntentLink from "../../components/Links/IntentLink";
import PageMeta, { SITE_URL } from "../../components/Seo/PageMeta";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { buildAlbumSlug } from "../../utils/formatters";
import { cn } from "../../lib/utils";
import type { AlbumPageData } from "../../interfaces/gameInterfaces";
import AlbumCard from "./AlbumCard";
import { albumPath, albumQuery, languageFlag, shortType } from "./albumsData";
import "./albumPage.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ordinal = (n: number) => {
    const teen = n % 100 >= 11 && n % 100 <= 13;
    return `${n}${teen ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

function Tile({ label, ko, value, sub, flag }: { label: string; ko: string; value: string; sub?: string; flag?: string | null }) {
    return (
        <div className="ap-tile flex flex-col gap-1.5 p-3.5 rounded-[18px] border-2 border-(--ink) bg-(--face) shadow-[2px_3px_0_var(--ctl-off),var(--in)] min-w-0">
            <span className="flex items-baseline gap-1.5">
                <span className="font-semibold text-[10.5px] tracking-[.14em] text-(--group)">{label}</span>
                <span lang="ko" className="font-korean font-bold text-[10px] text-(--muted)">{ko}</span>
            </span>
            <span className="flex items-center gap-2 font-bold text-lg leading-tight">
                {flag && <img src={flag} alt="" className="w-[26px] h-[18px] rounded-[4px] border-[1.5px] border-[#1A1418] object-cover" />}
                {value}
            </span>
            {sub && <span className="font-medium text-xs text-(--muted)">{sub}</span>}
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
        const row = current?.parentElement;
        if (current && row) row.scrollLeft = current.offsetLeft - row.clientWidth / 2 + current.clientWidth / 2;
    }, [album.id]);

    const [y, m, d] = album.release_date.split("-").map(Number);
    const all = [...album.discography, { ...album, release_year: y }].sort((a, b) => a.release_year - b.release_year || a.id - b.id);
    const sameType = all.filter((a) => a.type === album.type);
    const nth = sameType.findIndex((a) => a.id === album.id) + 1;
    const years = artist.debut_year ? y - artist.debut_year : null;
    const foreign = album.language && album.language !== "Korean";
    const era = artist.is_soloist
        ? "Soloist"
        : [artist.generation && `${ordinal(artist.generation)} gen`, artist.member_count && `${artist.member_count} members`, artist.fandom_name].filter(Boolean).join(" · ");
    const more = [...album.discography]
        .sort((a, b) => Math.abs(a.release_year - y) - Math.abs(b.release_year - y))
        .slice(0, 6)
        .sort((a, b) => a.release_year - b.release_year);

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
            <PageShell width="max-w-[1100px]" className="pt-4">
                <PressLink to="/albums" className="pp-enter [--pp-anim:puffSide] pl-2.5" aria-label="Back to all albums">
                    <ArrowLeft className="w-4 h-4" strokeWidth={3} aria-hidden />
                    All albums
                </PressLink>

                <section key={album.id} className="mt-6 grid grid-cols-[minmax(0,460px)_minmax(0,1fr)] gap-12 items-center @max-[900px]:grid-cols-1 @max-[900px]:gap-8">
                    <div className="ap-hero relative w-full max-w-[460px] aspect-[1.18] @max-[900px]:mx-auto">
                        <div aria-hidden className="ap-disc absolute top-[6%] right-0 w-[78%] aspect-square rounded-full border-2 border-[#1A1418] bg-[repeating-radial-gradient(circle,#0d0008_0_3px,#18091a_3px_5px)] shadow-[4px_5px_0_#1A1418]">
                            <span className="absolute inset-[34%] rounded-full border-2 border-[#1A1418] bg-[#FF8AC4] grid place-items-center">
                                <span className="w-[18%] aspect-square rounded-full bg-[#1A1418]" />
                            </span>
                        </div>
                        <div className="ap-cover absolute top-0 left-0 w-[80%] aspect-square rounded-[20px] overflow-hidden border-[2.5px] border-[#1A1418] bg-[#DCD6D2] shadow-[6px_6px_0_0_#FF8AC4,6px_6px_0_2.5px_#1A1418] -rotate-2">
                            <img src={resolveCdnUrl(album.cover_path) ?? ""} alt={`${album.name} cover`} className="block w-full h-full object-cover" />
                        </div>
                    </div>

                    <div className="pp-enter [--pp-delay:120ms] flex flex-col gap-3.5 min-w-0">
                        {foreign && (
                            <span className="self-start px-2.5 py-1 rounded-full border-2 border-[#1A1418] bg-[#FFD64F] text-[#1A1418] font-bold text-[11px] tracking-[.08em] shadow-[2px_3px_0_#1A1418] rotate-3">
                                {album.language === "Japanese" ? "JP release" : "EN release"}
                            </span>
                        )}
                        <h1 className="m-0 font-bold text-[52px] @max-[580px]:text-[38px] leading-[1.05] text-white [text-shadow:var(--puff-title)] -rotate-[1.5deg] pb-2 [overflow-wrap:anywhere]">{album.name}</h1>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <PressLink to={`/albums?artist=${encodeURIComponent(artist.name)}`} size="sm">{artist.name}</PressLink>
                            {artist.hangul_name && <span lang="ko" className="font-korean font-bold text-sm text-(--muted)">{artist.hangul_name}</span>}
                        </div>
                        {era && <span className="font-caveat font-bold text-2xl text-(--muted) -rotate-2 -mt-1">{era}</span>}
                        <div className="grid grid-cols-3 gap-3 @max-[580px]:grid-cols-1">
                            <Tile label="RELEASED" ko="발매일" value={`${MONTHS[m - 1]} ${d}, ${y}`} sub={years === null ? undefined : years > 0 ? `${years} ${years === 1 ? "year" : "years"} after debut` : "Debut year"} />
                            <Tile label="TYPE" ko="유형" value={album.type} sub={nth > 0 ? `${ordinal(nth)} ${shortType(album.type).toLowerCase()} ${album.type === "Single" ? "release" : "album"}` : undefined} />
                            <Tile label="LANGUAGE" ko="언어" value={album.language ?? "Unknown"} sub={album.language ? `${album.language} release` : undefined} flag={languageFlag(album.language)} />
                        </div>
                    </div>
                </section>

                <section aria-labelledby="disco-title" className="mt-14 flex flex-col gap-4">
                    <div className="flex items-baseline gap-3 flex-wrap">
                        <h2 id="disco-title" className="m-0 font-mono-display text-[26px] lowercase">discography</h2>
                        <span className="font-semibold text-sm text-(--muted)">{`${all.length} ${all.length === 1 ? "release" : "releases"} by ${artist.name}`}</span>
                    </div>
                    <HScrollRow aria-label="Discography" className="ap-scroll relative gap-0 py-3">
                        <div aria-hidden className="absolute left-0 right-0 top-[47px] h-0.5 bg-(--rule)" />
                        {all.map((a, i) => {
                            const cur = a.id === album.id;
                            const yearHead = i === 0 || all[i - 1].release_year !== a.release_year;
                            return (
                                <IntentLink
                                    key={a.id}
                                    to={albumPath(a, artist.name)}
                                    aria-current={cur ? "page" : undefined}
                                    aria-label={`${a.name}, ${a.release_year}`}
                                    className={cn("ap-dc pp-focus relative flex-none w-[150px] flex flex-col items-center gap-2 px-2 py-2 rounded-[16px] border-2 no-underline text-center", cur ? "border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]" : "border-transparent")}
                                >
                                    <span className={cn("font-bold text-xs h-4", yearHead ? "text-(--group)" : "text-transparent")}>{a.release_year}</span>
                                    <span aria-hidden className={cn("rounded-full border-2 border-[#1A1418] relative z-1", cur ? "w-[22px] h-[22px] bg-[#FF3399] shadow-[2px_3px_0_#1A1418]" : cn("w-3.5 h-3.5 shadow-[1.5px_2px_0_#1A1418]", a.type === "Single" ? "bg-(--chip)" : "bg-[#FF8AC4]"))} />
                                    <span className={cn("text-[13px] leading-tight line-clamp-2", cur ? "font-bold text-(--text)" : "font-medium text-(--muted)")}>{a.name}</span>
                                    <span className="font-semibold text-[10px] tracking-[.08em] text-(--muted)">{shortType(a.type).toUpperCase()}</span>
                                </IntentLink>
                            );
                        })}
                    </HScrollRow>
                </section>

                {more.length > 0 && (
                    <section aria-labelledby="more-title" className="mt-12 flex flex-col gap-5">
                        <h2 id="more-title" className="m-0 font-mono-display text-[26px] lowercase">{`more from ${artist.name}`}</h2>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-x-6 gap-y-8 @max-[580px]:grid-cols-2 @max-[580px]:gap-x-3.5">
                            {more.map((a, i) => (
                                <AlbumCard key={a.id} index={i} album={{ ...a, artist_name: artist.name, group_id: artist.group_id, soloist_id: artist.soloist_id }} />
                            ))}
                        </div>
                    </section>
                )}
            </PageShell>
        </>
    );
}
