import "./idolPage.css";
import { useEffect, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import type { IdolProfileData, IdolsPageData } from "../../interfaces/gameInterfaces";
import calculateAge from "../../hooks/useCalculateAge";
import { useHydrated } from "../../hooks/useHydrated";
import PageMeta, { SITE_URL } from "../../components/Seo/PageMeta";
import PageLoader from "../../components/Loading/PageLoader";
import HScrollRow from "../../components/Puff/HScrollRow";
import IntentLink from "../../components/Links/IntentLink";
import { getNationalityFlag } from "../../utils/getFlags";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { buildIdolSlug } from "../../utils/formatters";
import { groupLabel, idolProfileQuery, idolsListQuery, prefetchIdolProfile, prefetchIdolsList } from "./idolsData";
import { buildFacts, relatedIdols, type Fact, type FactChip, type TabKey } from "./idolFacts";
import IdolSearch from "./IdolSearch";

const TABS: [TabKey, string][] = [["profile", "Profile"], ["career", "Career"], ["status", "Status"]];
const NO_IDOLS: IdolsPageData[] = [];

// Ransom-note letters: five sticker looks cycled per letter, offset by the idol id.
const LT = "inset 0 3px 0 rgba(255,255,255,.75),inset 0 -5px 0 rgba(26,20,24,.13),4px 4px 0 #1A1418";
const DK = "inset 0 3px 0 rgba(255,255,255,.2),inset 0 -5px 0 rgba(0,0,0,.45),4px 4px 0 #1A1418";
const PK = "inset 0 3px 0 rgba(255,255,255,.55),inset 0 -5px 0 rgba(198,35,104,.35),4px 4px 0 #1A1418";
const LETTER = [
    { bg: "#FFFFFF", fg: "#1A1418", sh: LT }, { bg: "#1A1418", fg: "#FFFFFF", sh: DK }, { bg: "#FF3399", fg: "#1A1418", sh: PK },
    { bg: "#FAF6F0", fg: "#1A1418", sh: LT }, { bg: "#FF8AC4", fg: "#1A1418", sh: PK },
];
const ROT = [-6, 4, -3, 7, -5, 3, -7, 5];
const DY = ["0px", "-5px", "3px", "-2px", "5px", "-4px"];
const CHIP = [
    { bg: "#FF8AC4", fg: "#1A1418", in: "inset 0 2px 0 rgba(255,255,255,.55),inset 0 -3px 0 rgba(198,35,104,.3)" },
    { bg: "#FFFDFA", fg: "#1A1418", in: "inset 0 2px 0 #FFFFFF,inset 0 -3px 0 rgba(26,20,24,.08)" },
    { bg: "#1A1418", fg: "#FFFFFF", in: "inset 0 2px 0 rgba(255,255,255,.2),inset 0 -3px 0 rgba(0,0,0,.4)" },
];

// initialProfile: build-time data for the prerendered page; stale at once, so it refetches.
export default function IdolProfile({ initialProfile }: { initialProfile?: IdolProfileData }) {
    const { id, slug } = useParams<{ id: string; slug: string }>();
    const navigate = useNavigate();
    const { data: idols } = useQuery({ ...idolsListQuery, refetchOnWindowFocus: false });
    const { data, isLoading, isError, refetch } = useQuery({
        ...idolProfileQuery(id ?? ""),
        initialData: initialProfile,
        initialDataUpdatedAt: 0,
        refetchOnWindowFocus: false,
        enabled: !!id,
    });

    // Old or edited slugs redirect to the canonical one.
    useEffect(() => {
        if (!data) return;
        const correct = buildIdolSlug(data.idol_profile.artist_name, data.idol_career.group_name);
        if (slug !== correct) navigate(`/idols/${id}/${correct}`, { replace: true });
    }, [data, id, slug, navigate]);

    if (!data) {
        return <PageLoader message="Loading Idol Profile Data..." error={isError && !isLoading} errorMessage="Error fetching idol profile data." onRetry={() => refetch()} />;
    }
    return <IdolPage key={data.idol_profile.idol_id} data={data} idols={idols ?? NO_IDOLS} />;
}

function IdolPage({ data, idols }: { data: IdolProfileData; idols: IdolsPageData[] }) {
    const [tab, setTab] = useState<TabKey>("profile");
    // Age depends on today's date, which can differ between the build and the visit.
    const hydrated = useHydrated();
    const p = data.idol_profile;
    const c = data.idol_career;
    const facts = buildFacts(data, hydrated ? calculateAge(p.birth_date) : null);
    const related = relatedIdols(idols, data);

    const artistName = p.artist_name;
    const groupName = c.group_name;
    const nameWithGroup = groupName ? `${artistName} (${groupName})` : artistName;
    const ofGroup = groupName ? `${artistName} of ${groupName}` : artistName;
    const canonicalPath = `/idols/${p.idol_id}/${buildIdolSlug(artistName, groupName)}`;
    const cdnImage = resolveCdnUrl(p.image_path, p.image_version);
    // Link previews need an absolute URL; without a bucket URL in the build, keep the site image.
    const idolImage = cdnImage && /^https?:\/\//.test(cdnImage) ? cdnImage : undefined;
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "url": `${SITE_URL}${canonicalPath}`,
        "mainEntity": {
            "@type": "Person",
            "name": artistName,
            ...(p.real_name && { "alternateName": p.real_name }),
            ...(groupName && { "memberOf": { "@type": "MusicGroup", "name": groupName } }),
            ...(idolImage && { "image": idolImage }),
        },
    };

    const letters = [...artistName.toUpperCase()];
    const count = letters.filter((ch) => ch !== " ").length;
    const scale = count <= 5 ? 1 : count <= 7 ? 0.86 : count <= 9 ? 0.74 : 0.64;
    let letterIndex = -1;

    return (
        <div className="ip-root relative flex-1">
            <PageMeta
                title={`${nameWithGroup} · Stats & Profile - KpopIt`}
                description={`Stats and profile for ${ofGroup} on KpopIt.`}
                path={canonicalPath}
                image={idolImage}
                social={{ title: `${nameWithGroup} · KpopIt`, description: `Stats, profile and career info for ${ofGroup}.` }}
                jsonLd={jsonLd}
            />
            <div className="ip-inner relative isolate overflow-hidden min-h-full bg-(--ground) text-(--text) px-(--pad-x) pb-9 transition-colors duration-300">
                <div aria-hidden className="absolute inset-0 -z-2 pointer-events-none bg-[radial-gradient(circle,var(--dot)_1.4px,transparent_1.8px)] bg-size-[19px_19px]" />
                <div aria-hidden className="absolute -left-[30%] -right-[30%] top-(--band-top) h-[300px] -z-1 bg-(--band) -rotate-9 pointer-events-none" />
                <div aria-hidden className="absolute -left-[30%] -right-[30%] top-[calc(var(--band-top)+316px)] h-3 -z-1 bg-[#FF3399] opacity-45 -rotate-9 pointer-events-none" />
                <div aria-hidden className="absolute -left-[30%] -right-[30%] top-[calc(var(--band-top)+334px)] h-1 -z-1 bg-(--band) opacity-45 -rotate-9 pointer-events-none" />

                <div className="relative z-8 max-w-[1360px] mx-auto mt-[26px] grid grid-cols-(--tb-cols) justify-center items-center gap-(--tb-gap)">
                    <div className="[justify-self:var(--tb-bk-js)] w-(--tb-bk-w) flex min-w-0">
                        <IntentLink
                            to="/idols"
                            onIntent={prefetchIdolsList}
                            aria-label="Back to the idols list"
                            className="ip-back ip-btn grid place-items-center w-11 h-11 m-0.5 no-underline bg-[#FF8AC4] [box-shadow:inset_0_3px_0_rgba(255,255,255,.5),0_0_0_2px_#1A1418,4px_5px_0_2px_#1A1418] [transform:skewX(-7deg)_rotate(-4deg)] [backface-visibility:hidden]"
                        >
                            <ArrowLeft aria-hidden className="w-5 h-5 text-[#1A1418]" strokeWidth={3} />
                        </IntentLink>
                    </div>
                    <IdolSearch idols={idols} currentId={p.idol_id} />
                </div>

                <section className="relative w-full max-w-[1360px] mx-auto mt-9 grid grid-cols-(--hero-cols) justify-center gap-y-11 gap-x-(--hero-gap) items-center">
                    <div className="ip-photo-wrap relative isolate justify-self-center w-[min(100%,var(--p-photo))] mt-3.5 pb-[calc(var(--rn)*.8)]">
                        <div aria-hidden className="absolute -left-[18%] -top-[14%] w-[136%] aspect-square -z-1 pointer-events-none bg-[radial-gradient(circle,var(--tone)_2.4px,transparent_2.8px)] bg-size-[11px_11px] [mask-image:radial-gradient(circle_at_55%_45%,#000_0%,rgba(0,0,0,.5)_32%,transparent_62%)]" />
                        <div className="ip-in-photo relative">
                            <div className="ip-photo relative -rotate-3 border-[3px] border-[#1A1418] rounded-[30px] bg-[#1A1418] shadow-[8px_8px_0_#FF8AC4,8px_8px_0_3px_#1A1418] aspect-[4/5]">
                                <div className="absolute inset-0 overflow-hidden rounded-[27px] [clip-path:inset(0_round_27px)] isolate [transform:translateZ(0)]">
                                    <img src={cdnImage ?? ""} alt={`${artistName} photo`} draggable={false} className="w-full h-full object-cover block" />
                                    <div aria-hidden className="ip-sweep absolute top-0 bottom-0 -left-[60%] w-[220%] pointer-events-none bg-[linear-gradient(118deg,rgba(255,255,255,0)_40%,rgba(255,255,255,.13)_47%,rgba(255,255,255,.04)_51%,rgba(255,255,255,0)_57%)]" />
                                    <div aria-hidden className="absolute inset-0 pointer-events-none mix-blend-screen bg-[radial-gradient(ellipse_85%_50%_at_82%_-4%,rgba(255,138,196,.24),rgba(255,138,196,0)_70%)]" />
                                </div>
                            </div>
                        </div>
                        <div className="ip-in-side absolute -left-[18px] -right-[18px] bottom-0 z-4 flex flex-col items-start gap-3">
                            {groupName && (
                                <span className="ml-2 inline-flex items-center gap-2 pt-[7px] px-[13px] pb-2 bg-[#FF3399] text-[#1A1418] border-[2.5px] border-[#1A1418] rounded-[12px] font-bold text-[15px] leading-none tracking-[.08em] -rotate-4 shadow-[3px_3px_0_#1A1418]">
                                    <span>{groupName.toUpperCase()}</span>
                                    {c.group_hangul && (
                                        <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#1A1418]" />
                                            <span lang="ko" className="font-korean font-bold text-[13px] tracking-normal">{c.group_hangul}</span>
                                        </>
                                    )}
                                </span>
                            )}
                            <div className="ip-name w-full">
                                <div role="img" aria-label={artistName} className="flex flex-nowrap gap-[3px]">
                                    {letters.map((ch, k) => {
                                        if (ch === " ") return <span key={k} aria-hidden className="w-2.5 flex-none" />;
                                        letterIndex++;
                                        const look = LETTER[(letterIndex * 3 + p.idol_id) % 5];
                                        const odd = letterIndex % 2 === 1;
                                        return (
                                            <span
                                                key={k}
                                                aria-hidden
                                                className="ip-letter inline-block font-bold leading-none pt-1 px-2 pb-1.5 border-[2.5px] border-[#1A1418] rounded-[12px] [backface-visibility:hidden]"
                                                style={{
                                                    background: look.bg, color: look.fg, boxShadow: look.sh,
                                                    transform: `rotate(${ROT[letterIndex % 8]}deg) translateY(${DY[letterIndex % 6]})`,
                                                    "--ls": odd ? scale * 0.82 : scale, "--lk": odd ? 0.82 : 1, "--len": count,
                                                } as CSSProperties}
                                            >
                                                {ch}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ip-in-menu [animation-delay:.1s] flex flex-col gap-[18px] min-w-0 [align-items:var(--hero-items)] [text-align:var(--hero-align)]">
                        <div className="w-full flex flex-col gap-[22px]">
                            <div role="tablist" aria-label="Idol sections" className="flex flex-wrap [justify-content:var(--hero-items)] gap-3">
                                {TABS.map(([key, label], k) => {
                                    const on = tab === key;
                                    return (
                                        <div key={key} className="ip-in-menu" style={{ animationDelay: `${160 + k * 80}ms` }}>
                                            <button
                                                type="button"
                                                role="tab"
                                                id={`ip-tab-${key}`}
                                                aria-selected={on}
                                                aria-controls={`ip-pane-${key}`}
                                                data-on={on ? "true" : "false"}
                                                onClick={() => setTab(key)}
                                                className="ip-tab ip-btn flex items-baseline gap-2.5 pt-[11px] px-6 pb-[13px] border-2 border-[#1A1418] rounded-[16px] font-bold text-(length:--tab-fs) leading-none uppercase whitespace-nowrap cursor-pointer will-change-transform"
                                                style={{
                                                    background: on ? "#FF8AC4" : "var(--ip-panel)",
                                                    color: on ? "#FFFFFF" : "var(--text)",
                                                    textShadow: on ? "var(--ink-puff)" : "none",
                                                    boxShadow: on ? "3px 4px 0 0 var(--tab-o),3px 4px 0 0 var(--tab-o)" : "3px 4px 0 0 #FF8AC4,3px 4px 0 2px #1A1418",
                                                    transform: on ? "translate3d(0,-3px,0) rotate(-2deg)" : `rotate(${k % 2 ? 1 : -1}deg)`,
                                                }}
                                            >
                                                {label}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="ip-in-tile box-border min-w-0 w-full flex flex-col bg-(--ip-panel) text-(--text) border-[3px] border-[#1A1418] rounded-[30px] shadow-[7px_7px_0_0_#FF8AC4,7px_7px_0_3px_#1A1418] p-(--panel-pad) text-left">
                                <div className="flex-1 min-h-0 grid">
                                    {TABS.map(([key]) => (
                                        <div
                                            key={key}
                                            id={`ip-pane-${key}`}
                                            role="tabpanel"
                                            aria-labelledby={`ip-tab-${key}`}
                                            aria-hidden={tab !== key}
                                            className="ip-pane [grid-area:1/1] min-w-0 grid grid-cols-(--fact-cols) auto-rows-[minmax(min-content,1fr)] grid-flow-row-dense gap-x-3.5 gap-y-6 pt-1.5"
                                            style={{ visibility: tab === key ? "visible" : "hidden" }}
                                        >
                                            {facts[key].map((f, k) => <FactTile key={f.label} f={f} delay={60 + k * 60} />)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {related.length > 0 && <Related idols={related} />}

                <footer className="max-w-[1360px] mx-auto flex justify-between items-center flex-wrap gap-x-5 gap-y-3 mt-12 pt-4 border-t-[1.5px] border-(--rule)">
                    <span className="font-medium text-xs text-(--muted)">KpopIt · Idol data from the KpopIt catalogue</span>
                    <span className="flex items-center gap-3">
                        <span className="font-semibold text-sm text-(--muted)">Wrong info?</span>
                        <Link to="/contact" className="ip-cta ip-btn grid place-items-center h-11 px-[18px] rounded-full border-2 border-[#1A1418] bg-[#FF3399] text-[#1A1418] font-bold text-sm no-underline shadow-[0_4px_0_#1A1418,inset_0_2px_0_rgba(255,255,255,.4)]">
                            Contact me
                        </Link>
                    </span>
                </footer>
            </div>
        </div>
    );
}

function FactTile({ f, delay }: { f: Fact; delay: number }) {
    const text = f.value ?? "";
    // Numbers and short values may grow larger than text values.
    const big = f.big || /^[\d\s.,%#/-]+$/.test(text) || text.length <= 4;
    const flags = (f.flags ?? []).map((n) => ({ n, src: getNationalityFlag(n) })).filter((x) => x.src);
    const cap = flags.length ? "20px" : big ? "var(--cap-b)" : "var(--cap-t)";
    return (
        <div
            className="ip-fact ip-in-tile relative flex flex-col items-center justify-center gap-1.5 min-w-0 pt-[22px] px-3 pb-3 text-center bg-(--chip) text-(--chip-ink) border-[2.5px] border-[#1A1418] rounded-[20px] shadow-[4px_4px_0_var(--ctl-off),var(--in)]"
            style={{ gridColumn: f.solo ? `var(--solo, span var(--s-${f.span}))` : `span var(--s-${f.span})`, animationDelay: `${delay}ms` }}
        >
            <span aria-hidden className="absolute top-0 right-0 w-16 h-16 bg-[repeating-linear-gradient(135deg,var(--stripe)_0_2.5px,transparent_2.5px_8px)] [clip-path:polygon(0_0,100%_0,100%_100%)] rounded-tr-[20px] pointer-events-none" />
            <span className="ip-lab absolute -top-4 left-(--lab-l,14px) max-w-[calc(100%-4px)] box-border bg-[#1A1418] text-white border-[2.5px] border-[#1A1418] pt-[7px] px-3 pb-2 rounded-[12px] font-bold text-(length:--lab-fs) leading-none tracking-[.12em] whitespace-nowrap overflow-hidden text-ellipsis shadow-[3px_3px_0_#FF3399,3px_3px_0_2px_#1A1418,inset_0_2px_0_rgba(255,255,255,.18)] -rotate-2">
                {f.label}
            </span>
            {f.chips ? (
                <span className="flex flex-wrap justify-center gap-2.5 pt-1 pb-0.5">
                    {f.chips.length ? f.chips.map((chip) => <ChipTag key={chip.label} chip={chip} />) : <span className="font-semibold text-(--muted)">N/A</span>}
                </span>
            ) : (
                <span className="flex flex-col items-center gap-2.5 max-w-full w-full" style={{ paddingTop: flags.length ? 10 : 0 }}>
                    {flags.length > 0 && (
                        <span className="flex gap-2 justify-center">
                            {flags.map((x) => (
                                <img key={x.n} src={x.src!} alt={x.n} className="w-[calc(var(--kf-w)*1.1)] h-[calc(var(--kf-h)*1.1)] @max-[560px]:w-[calc(var(--kf-w)*1.2)] rounded-[5px] border-2 border-[#1A1418] object-cover shadow-[2px_2.5px_0_#1A1418] -rotate-3" />
                            ))}
                        </span>
                    )}
                    <span
                        className="ip-val font-bold leading-[1.1] text-white [text-shadow:var(--puff-value)] pr-[5px] pb-[5px] whitespace-nowrap"
                        style={{ "--fs-cap": cap, "--len": Math.max(text.length, 1), "--fit-k": big ? 1.6 : 1.45, letterSpacing: flags.length ? ".06em" : undefined } as CSSProperties}
                    >
                        {text}
                    </span>
                </span>
            )}
            {f.sub && <span className="font-semibold text-(length:--sub-fs) leading-[1.3] text-(--muted) [text-wrap:balance]">{f.sub}</span>}
        </div>
    );
}

function ChipTag({ chip }: { chip: FactChip }) {
    const look = CHIP[chip.k % 3];
    const style = {
        background: look.bg,
        color: look.fg,
        "--tilt": `${chip.k % 3 === 0 ? -2 : chip.k % 3 === 1 ? 2 : -1}deg`,
        "--chip-in": look.in,
    } as CSSProperties;
    const body = (
        <>
            {chip.label}
            {chip.sub && <span className="font-semibold text-xs leading-none opacity-80">{chip.sub}</span>}
        </>
    );
    return chip.to
        ? <Link to={chip.to} className={`${cnChip(chip.big)} ip-chip ip-chip-link ip-btn no-underline`} style={style}>{body}</Link>
        : <span className={`${cnChip(chip.big)} ip-chip`} style={style}>{body}</span>;
}

const cnChip = (big?: boolean) =>
    big
        ? "inline-flex items-center gap-1.5 pt-3.5 px-[26px] pb-4 border-[2.5px] border-[#1A1418] rounded-[16px] font-bold text-[calc(var(--chip-fs)*1.45)] leading-none"
        : "inline-flex items-center gap-1.5 pt-2 px-[13px] pb-[9px] border-[2.5px] border-[#1A1418] rounded-[12px] font-bold text-(length:--chip-fs) leading-none";

function Related({ idols }: { idols: IdolsPageData[] }) {
    return (
        <section aria-labelledby="ip-related" className="max-w-[1360px] mx-auto mt-14 pt-14">
            <div className="relative h-[176px]">
                <div aria-hidden className="absolute -left-[700px] -right-[700px] top-11 h-[108px] bg-(--band) bg-[repeating-linear-gradient(92deg,var(--speed)_0_2px,transparent_2px_26px),linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,0)_40%)] -rotate-2" />
                <div aria-hidden className="absolute -left-[700px] -right-[700px] top-[162px] h-3 box-border bg-[#FF8AC4] border-y-2 border-[#1A1418] [box-shadow:var(--rb-in)] -rotate-2" />
                <div aria-hidden className="[display:var(--rb-l2)] absolute -left-[700px] -right-[700px] top-[182px] h-1 bg-(--band) -rotate-2" />
                <div className="absolute left-0 right-0 top-11 h-[108px] px-2 flex items-center -rotate-2">
                    <h2 id="ip-related" className="m-0 font-mono-display font-normal text-[clamp(30px,6.4cqi,60px)] leading-none tracking-[.02em] text-white whitespace-nowrap">related idols</h2>
                </div>
            </div>
            <HScrollRow bar aria-label="Related idols" className="ip-rel gap-6 overflow-y-hidden pt-5 px-3.5 pb-[30px] mt-[30px] -mx-3.5">
                {idols.map((idol, k) => (
                    <IntentLink
                        key={idol.id}
                        to={`/idols/${idol.id}/${buildIdolSlug(idol.artist_name, idol.group_name)}`}
                        onIntent={() => prefetchIdolProfile(idol.id)}
                        aria-label={`${idol.artist_name} of ${groupLabel(idol)}`}
                        className="ip-rcard ip-btn relative flex-none w-(--rel-w) flex flex-col gap-3 pt-2.5 px-2.5 pb-4 border-[3px] border-[#1A1418] rounded-[20px] bg-(--chip) text-(--chip-ink) no-underline text-left shadow-[6px_6px_0_var(--ctl-off),var(--in)] will-change-transform"
                        style={{ transform: `rotate(${k % 2 ? 0.8 : -0.8}deg)` }}
                    >
                        <span className="block aspect-square border-[2.5px] border-[#1A1418] rounded-[12px] overflow-hidden bg-[#1A1418]">
                            <img src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${idol.image_path}?v=${idol.image_version}`} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover block" />
                        </span>
                        <span className="flex flex-col gap-[5px] px-1 min-w-0">
                            <span className="block font-bold text-2xl leading-none text-white [text-shadow:var(--puff-value)] pr-1 pb-[5px] whitespace-nowrap overflow-hidden text-ellipsis">{idol.artist_name}</span>
                            <span className="font-semibold text-[13px] leading-[1.25] text-(--muted) [text-wrap:balance]">{groupLabel(idol)}</span>
                        </span>
                    </IntentLink>
                ))}
            </HScrollRow>
        </section>
    );
}
