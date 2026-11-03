import "./IdolProfile.css";
import { useEffect, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "../../lib/utils";
import type { IdolProfileData, IdolsPageData } from "../../interfaces/gameInterfaces";
import calculateAge from "../../hooks/useCalculateAge";
import { useHydrated } from "../../hooks/useHydrated";
import PageMeta, { SITE_URL } from "../../components/Seo/PageMeta";
import PageLoader from "../../components/Loading/PageLoader";
import HScrollRow from "../../components/HScrollRow/HScrollRow";
import IntentLink from "../../components/Links/IntentLink";
import IdolsProfileSearch from "../../components/IdolsSearchBar/IdolsProfileSearch";
import FadeImg from "../../components/FadeImg";
import FitText from "../../components/FitText";
import { getNationalityFlag } from "../../utils/getFlags";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { buildIdolSlug } from "../../utils/formatters";
import { groupLabel, idolProfileQuery, idolsListQuery, prefetchIdolProfile, prefetchIdolsList } from "./idolsData";
import { buildFacts, relatedIdols, type Fact, type FactChip, type Span, type TabKey } from "./idolFacts";

const TABS: { key: TabKey; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "career", label: "Career" },
    { key: "status", label: "Status" },
];

const NO_IDOLS: IdolsPageData[] = [];

// Ransom-note letters: five sticker looks cycled per letter (offset by the idol id), each tilted
// and nudged up or down.
const LIGHT_LETTER_SHADOW = "inset 0 3px 0 rgba(255,255,255,.75),inset 0 -5px 0 rgba(26,20,24,.13),4px 4px 0 #1A1418";
const DARK_LETTER_SHADOW = "inset 0 3px 0 rgba(255,255,255,.2),inset 0 -5px 0 rgba(0,0,0,.45),4px 4px 0 #1A1418";
const PINK_LETTER_SHADOW = "inset 0 3px 0 rgba(255,255,255,.55),inset 0 -5px 0 rgba(198,35,104,.35),4px 4px 0 #1A1418";

const LETTER_STYLES = [
    { background: "#FFFFFF", color: "#1A1418", boxShadow: LIGHT_LETTER_SHADOW },
    { background: "#1A1418", color: "#FFFFFF", boxShadow: DARK_LETTER_SHADOW },
    { background: "#FF3399", color: "#1A1418", boxShadow: PINK_LETTER_SHADOW },
    { background: "#FAF6F0", color: "#1A1418", boxShadow: LIGHT_LETTER_SHADOW },
    { background: "#FF8AC4", color: "#1A1418", boxShadow: PINK_LETTER_SHADOW },
];

const LETTER_ROTATIONS = [-6, 4, -3, 7, -5, 3, -7, 5];
const LETTER_OFFSETS = ["0px", "-5px", "3px", "-2px", "5px", "-4px"];

// Fact chips: three sticker looks (pink, cream, ink) and their tilts.
const CHIP_STYLES = [
    {
        className: "bg-[#FF8AC4] text-[#1A1418]",
        inset: "inset 0 2px 0 rgba(255,255,255,.55),inset 0 -3px 0 rgba(198,35,104,.3)",
        tilt: "-rotate-2",
    },
    {
        className: "bg-[#FFFDFA] text-[#1A1418]",
        inset: "inset 0 2px 0 #FFFFFF,inset 0 -3px 0 rgba(26,20,24,.08)",
        tilt: "rotate-2",
    },
    {
        className: "bg-[#1A1418] text-white",
        inset: "inset 0 2px 0 rgba(255,255,255,.2),inset 0 -3px 0 rgba(0,0,0,.4)",
        tilt: "-rotate-1",
    },
];

// Tile widths on the 6-column grid; the phone grid has 2 columns.
const SPAN_CLASSES: Record<Span, string> = {
    "6": "col-span-6 @max-[561px]/idol:col-span-2",
    "4": "col-span-4 @max-[561px]/idol:col-span-2",
    "3": "col-span-3 @max-[561px]/idol:col-span-1",
    "3n": "col-span-3 @max-[561px]/idol:col-span-2",
    "2": "col-span-2 @max-[561px]/idol:col-span-1",
    "2w": "col-span-2 @max-[561px]/idol:col-span-2",
};

const idolImageUrl = (idol: { image_path: string; image_version: number | string }) =>
    `${import.meta.env.VITE_IMAGE_BUCKET_URL}${idol.image_path}?v=${idol.image_version}`;

interface IdolProfileProps {
    /** Build-time data for the prerendered page; stale at once, so it refetches. */
    initialProfile?: IdolProfileData;
}

const IdolProfile = ({ initialProfile }: IdolProfileProps) => {
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

        const canonicalSlug = buildIdolSlug(data.idol_profile.artist_name, data.idol_career.group_name);

        if (slug !== canonicalSlug) navigate(`/idols/${id}/${canonicalSlug}`, { replace: true });
    }, [data, id, slug, navigate]);

    if (!data) {
        return (
            <PageLoader
                message="Loading Idol Profile Data..."
                error={isError && !isLoading}
                errorMessage="Error fetching idol profile data."
                onRetry={() => refetch()}
            />
        );
    }

    return <IdolPage key={data.idol_profile.idol_id} data={data} idols={idols ?? NO_IDOLS} />;
};

interface IdolPageProps {
    data: IdolProfileData;
    idols: IdolsPageData[];
}

const IdolPage = ({ data, idols }: IdolPageProps) => {
    const [activeTab, setActiveTab] = useState<TabKey>("profile");

    // Age depends on today's date, which can differ between the build and the visit.
    const hydrated = useHydrated();
    const profile = data.idol_profile;
    const career = data.idol_career;
    const facts = buildFacts(data, hydrated ? calculateAge(profile.birth_date) : null);
    const related = relatedIdols(idols, data);

    const artistName = profile.artist_name;
    const groupName = career.group_name;
    const nameWithGroup = groupName ? `${artistName} (${groupName})` : artistName;
    const nameOfGroup = groupName ? `${artistName} of ${groupName}` : artistName;
    const canonicalPath = `/idols/${profile.idol_id}/${buildIdolSlug(artistName, groupName)}`;
    const cdnImage = resolveCdnUrl(profile.image_path, profile.image_version);

    // Link previews need an absolute URL; without a bucket URL in the build, keep the site image.
    const shareImage = cdnImage && /^https?:\/\//.test(cdnImage) ? cdnImage : undefined;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "url": `${SITE_URL}${canonicalPath}`,
        "mainEntity": {
            "@type": "Person",
            "name": artistName,
            ...(profile.real_name && { "alternateName": profile.real_name }),
            ...(groupName && { "memberOf": { "@type": "MusicGroup", "name": groupName } }),
            ...(shareImage && { "image": shareImage }),
        },
    };

    // The name's letters shrink as it gets longer.
    const letters = [...artistName.toUpperCase()];
    const letterCount = letters.filter((character) => character !== " ").length;
    const nameScale = letterCount <= 5 ? 1 : letterCount <= 7 ? 0.86 : letterCount <= 9 ? 0.74 : 0.64;
    let letterIndex = -1;

    return (
        <div className="pp-root @container/idol relative flex-1">
            <PageMeta
                title={`${nameWithGroup} · Stats & Profile - KpopIt`}
                description={`Stats and profile for ${nameOfGroup} on KpopIt.`}
                path={canonicalPath}
                image={shareImage}
                social={{ title: `${nameWithGroup} · KpopIt`, description: `Stats, profile and career info for ${nameOfGroup}.` }}
                jsonLd={jsonLd}
            />

            <div className="idol-page relative isolate overflow-clip min-h-full px-12 @max-[901px]/idol:px-6 @max-[561px]/idol:px-4 pt-6.5 pb-9 text-(--text) transition-colors duration-300">
                {/* The tilted dark band and its two pink lines behind the hero */}
                <div
                    aria-hidden
                    className="absolute inset-x-[-30%] top-37.5 @max-[1281px]/idol:top-47.5 @max-[561px]/idol:top-40 h-75 -z-1 bg-(--band) -rotate-9 pointer-events-none"
                />
                <div
                    aria-hidden
                    className="absolute inset-x-[-30%] top-116.5 @max-[1281px]/idol:top-126.5 @max-[561px]/idol:top-119 h-3 -z-1 bg-neon-pink opacity-45 -rotate-9 pointer-events-none"
                />
                <div
                    aria-hidden
                    className="absolute inset-x-[-30%] top-121 @max-[1281px]/idol:top-131 @max-[561px]/idol:top-123.5 h-1 -z-1 bg-(--band) opacity-45 -rotate-9 pointer-events-none"
                />

                {/* Back button and search */}
                <div
                    className={cn(
                        "relative z-8 grid justify-center items-center max-w-340 mx-auto",
                        "grid-cols-[minmax(0,520px)_minmax(0,760px)] gap-x-16 gap-y-4",
                        "@max-[1281px]/idol:grid-cols-[auto_minmax(0,1fr)] @max-[1281px]/idol:gap-5",
                    )}
                >
                    <div className="flex min-w-0 justify-self-center w-[min(100%,520px)] @max-[1281px]/idol:justify-self-start @max-[1281px]/idol:w-auto">
                        <IntentLink
                            to="/idols"
                            onIntent={prefetchIdolsList}
                            aria-label="Back to the idols list"
                            className={cn(
                                "pp-focus grid place-items-center size-11 m-0.5 bg-[#FF8AC4] no-underline",
                                "[--press-x:3px] [--press-y:3px]",
                                "transform-[skewX(-7deg)] -rotate-4 backface-hidden will-change-transform",
                                "shadow-[inset_0_3px_0_rgba(255,255,255,.5),0_0_0_2px_#1A1418,4px_5px_0_2px_#1A1418]",
                                "pressed:shadow-[inset_0_3px_0_rgba(255,255,255,.5),0_0_0_2px_#1A1418,0_0_0_2px_#1A1418]",
                                "transition-[translate,box-shadow] duration-300 ease-(--ease-pop)",
                                "hover:-translate-x-1 pressed:translate-0.75",
                            )}
                        >
                            <ArrowLeft aria-hidden className="size-5 text-[#1A1418]" strokeWidth={3} />
                        </IntentLink>
                    </div>

                    <IdolsProfileSearch idols={idols} currentId={profile.idol_id} />
                </div>

                {/* Hero: the photo with the name, and the tabbed facts */}
                <section
                    className={cn(
                        "relative grid justify-center items-center w-full max-w-340 mx-auto mt-9",
                        "grid-cols-[minmax(0,520px)_minmax(0,760px)] gap-x-14 gap-y-11",
                        "@max-[1281px]/idol:grid-cols-[minmax(0,1fr)]",
                    )}
                >
                    <div
                        className={cn(
                            "group relative isolate justify-self-center mt-3.5 pb-[calc(var(--rn)*0.8)]",
                            "w-[min(100%,520px)] @max-[1281px]/idol:w-[min(100%,420px)] @max-[561px]/idol:w-[min(100%,300px)] @max-[360px]/idol:w-[min(100%,262px)]",
                        )}
                    >
                        {/* Pink halftone dots behind the photo */}
                        <div
                            aria-hidden
                            className={cn(
                                "absolute left-[-18%] top-[-14%] w-[136%] aspect-square -z-1 pointer-events-none",
                                "bg-[radial-gradient(circle,var(--tone)_2.4px,transparent_2.8px)] bg-size-[11px_11px]",
                                "mask-[radial-gradient(circle_at_55%_45%,#000_0%,rgba(0,0,0,.5)_32%,transparent_62%)]",
                            )}
                        />

                        <div className="idol-photo-enter relative">
                            <div className="relative aspect-4/5 -rotate-3 border-[3px] border-[#1A1418] rounded-[30px] bg-[#1A1418] shadow-[8px_8px_0_#FF8AC4,8px_8px_0_3px_#1A1418]">
                                <div className="absolute inset-0 overflow-hidden rounded-[27px] [clip-path:inset(0_round_27px)] isolate transform-[translateZ(0)]">
                                    <FadeImg
                                        src={cdnImage ?? ""}
                                        alt={`${artistName} photo`}
                                        draggable={false}
                                        className="idol-photo-image block size-full object-cover transition-[scale] duration-800 ease-(--ease-settle) group-hover:scale-104"
                                    />

                                    {/* A light sweep across the photo on hover */}
                                    <div
                                        aria-hidden
                                        className={cn(
                                            "absolute inset-y-0 left-[-60%] w-[220%] pointer-events-none",
                                            "bg-[linear-gradient(118deg,rgba(255,255,255,0)_40%,rgba(255,255,255,.13)_47%,rgba(255,255,255,.04)_51%,rgba(255,255,255,0)_57%)]",
                                            "translate-x-[-30%] transition-[translate] duration-900 ease-[cubic-bezier(.25,1,.5,1)] transform-gpu",
                                            "group-hover:translate-x-[42%] group-hover:duration-1400",
                                        )}
                                    />

                                    <div
                                        aria-hidden
                                        className="absolute inset-0 pointer-events-none mix-blend-screen bg-[radial-gradient(ellipse_85%_50%_at_82%_-4%,rgba(255,138,196,.24),rgba(255,138,196,0)_70%)]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Group tag and the ransom-note name */}
                        <div className="idol-side-enter absolute -inset-x-4.5 bottom-0 z-4 flex flex-col items-start gap-3">
                            {groupName && (
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-2 ml-2 pt-1.75 px-3.25 pb-2 -rotate-4",
                                        "border-[2.5px] border-[#1A1418] rounded-xl bg-neon-pink shadow-[3px_3px_0_#1A1418]",
                                        "font-bold text-[15px] leading-none tracking-[.08em] text-[#1A1418]",
                                    )}
                                >
                                    <span>{groupName.toUpperCase()}</span>

                                    {career.group_hangul && (
                                        <>
                                            <span className="size-1.5 rounded-full bg-[#1A1418]" />
                                            <span lang="ko" className="font-korean font-bold text-[13px] tracking-normal">{career.group_hangul}</span>
                                        </>
                                    )}
                                </span>
                            )}

                            <div className="@container w-full">
                                <div role="img" aria-label={artistName} className="flex flex-nowrap gap-0.75">
                                    {letters.map((character, position) => {
                                        if (character === " ") return <span key={position} aria-hidden className="w-2.5 flex-none" />;

                                        letterIndex++;

                                        const letterStyle = LETTER_STYLES[(letterIndex * 3 + profile.idol_id) % LETTER_STYLES.length];
                                        const isOdd = letterIndex % 2 === 1;

                                        return (
                                            <span
                                                key={position}
                                                aria-hidden
                                                className={cn(
                                                    "idol-name-letter inline-block pt-1 px-2 pb-1.5 border-[2.5px] border-[#1A1418] rounded-xl",
                                                    "font-bold leading-none backface-hidden",
                                                )}
                                                style={{
                                                    ...letterStyle,
                                                    rotate: `${LETTER_ROTATIONS[letterIndex % LETTER_ROTATIONS.length]}deg`,
                                                    translate: `0 ${LETTER_OFFSETS[letterIndex % LETTER_OFFSETS.length]}`,
                                                    "--ls": isOdd ? nameScale * 0.82 : nameScale,
                                                    "--lk": isOdd ? 0.82 : 1,
                                                    "--len": letterCount,
                                                } as CSSProperties}
                                            >
                                                {character}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className={cn(
                            "idol-menu-enter [animation-delay:.1s] flex flex-col gap-4.5 min-w-0",
                            "items-start text-left @max-[1281px]/idol:items-center @max-[1281px]/idol:text-center",
                        )}
                    >
                        <div className="w-full flex flex-col gap-5.5">
                            <div role="tablist" aria-label="Idol sections" className="flex flex-wrap justify-start @max-[1281px]/idol:justify-center gap-3">
                                {TABS.map(({ key, label }, tabIndex) => {
                                    const isActive = activeTab === key;

                                    return (
                                        <div key={key} className="idol-menu-enter" style={{ animationDelay: `${160 + tabIndex * 80}ms` }}>
                                            <button
                                                type="button"
                                                role="tab"
                                                id={`idol-tab-${key}`}
                                                aria-selected={isActive}
                                                aria-controls={`idol-pane-${key}`}
                                                onClick={() => setActiveTab(key)}
                                                className={cn(
                                                    "pp-focus flex items-baseline gap-2 pt-2.5 px-4.5 pb-3 border-2 border-[#1A1418] rounded-2xl",
                                                    "font-bold leading-none uppercase whitespace-nowrap cursor-pointer",
                                                    "text-lg @max-[561px]/idol:text-sm",
                                                    "transition-[translate,rotate,background-color,color,box-shadow] duration-380 ease-(--ease-settle) will-change-transform",
                                                    "pressed:translate-x-0.5 pressed:translate-y-0.75 pressed:rotate-0 pressed:shadow-none pressed:duration-150",
                                                    isActive
                                                        ? "bg-[#FF8AC4] text-white text-shadow-(--ink-puff) -translate-y-0.75 -rotate-2 shadow-[3px_4px_0_0_var(--tab-o),3px_4px_0_0_var(--tab-o)]"
                                                        : cn(
                                                            "bg-(--ip-panel) text-(--text) shadow-[3px_4px_0_0_#FF8AC4,3px_4px_0_2px_#1A1418]",
                                                            tabIndex % 2 ? "rotate-1" : "-rotate-1",
                                                            "hover:-translate-y-0.5 hover:rotate-0",
                                                        ),
                                                )}
                                            >
                                                {label}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            <div
                                className={cn(
                                    "idol-tile-enter box-border flex flex-col min-w-0 w-full p-6 @max-[561px]/idol:p-4 text-left",
                                    "bg-(--ip-panel) text-(--text) border-[3px] border-[#1A1418] rounded-[30px]",
                                    "shadow-[7px_7px_0_0_#FF8AC4,7px_7px_0_3px_#1A1418]",
                                )}
                            >
                                <div className="flex-1 min-h-0 grid">
                                    {TABS.map(({ key }) => {
                                        const isActive = activeTab === key;

                                        return (
                                            <div
                                                key={key}
                                                id={`idol-pane-${key}`}
                                                role="tabpanel"
                                                aria-labelledby={`idol-tab-${key}`}
                                                aria-hidden={!isActive}
                                                className={cn(
                                                    "[grid-area:1/1] grid grid-flow-row-dense min-w-0 gap-x-3.5",
                                                    "grid-cols-6 @max-[561px]/idol:grid-cols-2",
                                                    "auto-rows-[minmax(min-content,1fr)] gap-y-6 pt-1.5",
                                                    "@max-[1281px]/idol:auto-rows-auto @max-[1281px]/idol:content-start @max-[1281px]/idol:gap-y-8 @max-[1281px]/idol:pt-3",
                                                    isActive ? "visible" : "invisible @max-[1281px]/idol:hidden",
                                                )}
                                            >
                                                {facts[key].map((fact, factIndex) => (
                                                    <FactTile key={fact.label} fact={fact} delay={60 + factIndex * 60} />
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {related.length > 0 && <RelatedIdols idols={related} />}

                <footer className="flex justify-between items-center flex-wrap gap-x-5 gap-y-3 max-w-340 mx-auto mt-12 pt-4 border-t-[1.5px] border-(--rule)">
                    <span className="font-medium text-xs text-(--muted)">KpopIt · Idol data from the KpopIt catalogue</span>

                    <span className="flex items-center gap-3">
                        <span className="font-semibold text-sm text-(--muted)">Wrong info?</span>

                        <Link
                            to="/contact"
                            className={cn(
                                "pp-focus grid place-items-center h-11 px-4.5 rounded-full border-2 border-[#1A1418]",
                                "bg-neon-pink text-[#1A1418] font-bold text-sm no-underline",
                                "shadow-[0_4px_0_#1A1418,inset_0_2px_0_rgba(255,255,255,.4)] pressed:shadow-[0_0_0_#1A1418,inset_0_2px_0_rgba(255,255,255,.4)]",
                                "transition-[translate,box-shadow] duration-200 ease-(--ease-settle) transform-gpu",
                                "hover:-translate-y-0.5 pressed:translate-y-1",
                            )}
                        >
                            Contact me
                        </Link>
                    </span>
                </footer>
            </div>
        </div>
    );
};

interface FactTileProps {
    fact: Fact;
    delay: number;
}

/** One fact: its label sticker, then a puffy value (sized to fit), chips, flags or a sub line. */
const FactTile = ({ fact, delay }: FactTileProps) => {
    const text = fact.value ?? "";

    const flags = (fact.flags ?? [])
        .map((nationality) => ({ nationality, src: getNationalityFlag(nationality) }))
        .filter((flag) => flag.src);

    return (
        <div
            className={cn(
                "idol-tile-enter @container relative flex flex-col items-center justify-center gap-1.5 min-w-0",
                "min-h-24 @max-[1281px]/idol:min-h-28 pt-5.5 px-3 pb-3 text-center",
                "bg-(--chip) text-(--chip-ink) border-[2.5px] border-[#1A1418] rounded-[20px] shadow-[4px_4px_0_var(--ctl-off),var(--in)]",
                SPAN_CLASSES[fact.span],
                fact.solo && "@max-[561px]/idol:col-span-full",
            )}
            style={{ animationDelay: `${delay}ms` }}
        >
            {/* Striped corner */}
            <span
                aria-hidden
                className="absolute top-0 right-0 size-16 rounded-tr-[20px] pointer-events-none bg-[repeating-linear-gradient(135deg,var(--stripe)_0_2.5px,transparent_2.5px_8px)] [clip-path:polygon(0_0,100%_0,100%_100%)]"
            />

            <span
                className={cn(
                    "absolute -top-4 left-3.5 @max-[1281px]/idol:left-2 box-border max-w-[calc(100%-4px)] -rotate-2",
                    "pt-1.75 px-3 pb-2 @max-[561px]/idol:pt-1.5 @max-[561px]/idol:px-2.25 @max-[561px]/idol:pb-1.75",
                    "bg-[#1A1418] text-white border-[2.5px] border-[#1A1418] rounded-xl",
                    "shadow-[3px_3px_0_#FF3399,3px_3px_0_2px_#1A1418,inset_0_2px_0_rgba(255,255,255,.18)]",
                    "font-bold text-sm @max-[561px]/idol:text-xs leading-none tracking-[.12em] @max-[561px]/idol:tracking-[.06em] truncate",
                )}
            >
                {fact.label}
            </span>

            {fact.chips ? (
                <span className="flex flex-wrap justify-center gap-2.5 pt-1 pb-0.5">
                    {fact.chips.length
                        ? fact.chips.map((chip) => <ChipTag key={chip.label} chip={chip} />)
                        : <span className="font-semibold text-(--muted)">N/A</span>}
                </span>
            ) : (
                <span className={cn("flex flex-col items-center gap-2.5 w-full max-w-full", flags.length > 0 && "pt-2.5")}>
                    {flags.length > 0 && (
                        <span className="flex justify-center gap-2">
                            {flags.map((flag) => (
                                <img
                                    key={flag.nationality}
                                    src={flag.src!}
                                    alt={flag.nationality}
                                    className={cn(
                                        "w-[50.4px] h-[30.8px] @max-[561px]/idol:w-[28.8px] @max-[561px]/idol:h-[17.6px]",
                                        "rounded-[5px] border-2 border-[#1A1418] object-cover shadow-[2px_2.5px_0_#1A1418] -rotate-3",
                                    )}
                                />
                            ))}
                        </span>
                    )}

                    <FitText
                        maxSize="var(--cap-b)"
                        className={cn(
                            "pr-1.25 pb-1.25 puff-ink font-bold leading-[1.1] text-white text-shadow-(--puff-value)",
                            flags.length > 0 && "tracking-[.06em]",
                        )}
                    >
                        {text}
                    </FitText>
                </span>
            )}

            {fact.sub && (
                <span className="font-semibold text-[15px] @max-[561px]/idol:text-[13px] leading-[1.3] text-(--muted) text-balance">
                    {fact.sub}
                </span>
            )}
        </div>
    );
};

/** A fact chip: a tilted sticker. Linked ones (the game modes) lift, straighten and press like buttons. */
const ChipTag = ({ chip }: { chip: FactChip }) => {
    const chipStyle = CHIP_STYLES[chip.look % CHIP_STYLES.length];

    const className = cn(
        "inline-flex items-center gap-1.5 border-[2.5px] border-[#1A1418] font-bold leading-none",
        "shadow-[3px_3px_0_#1A1418,var(--chip-in)]",
        chipStyle.className,
        chipStyle.tilt,
        chip.big
            ? "pt-3.5 px-6.5 pb-4 rounded-2xl text-[23.2px] @max-[561px]/idol:text-[20.3px]"
            : "pt-2 px-3.25 pb-2.25 rounded-xl text-base @max-[561px]/idol:text-sm",
    );

    const body = (
        <>
            {chip.label}
            {chip.sub && <span className="font-semibold text-xs leading-none opacity-80">{chip.sub}</span>}
        </>
    );

    if (!chip.to) {
        return (
            <span className={className} style={{ "--chip-in": chipStyle.inset } as CSSProperties}>
                {body}
            </span>
        );
    }

    return (
        <Link
            to={chip.to}
            className={cn(
                className,
                "pp-focus no-underline will-change-transform",
                "transition-[translate,rotate,box-shadow] duration-450 ease-(--ease-settle)",
                "hover:-translate-y-0.75 hover:rotate-0",
                "pressed:translate-0.75 pressed:rotate-0 pressed:shadow-[0_0_0_#1A1418,var(--chip-in)] pressed:duration-150",
            )}
            style={{ "--chip-in": chipStyle.inset } as CSSProperties}
        >
            {body}
        </Link>
    );
};

/** "related idols": a tilted speed-line band with the title, then a row of idol cards. */
const RelatedIdols = ({ idols }: { idols: IdolsPageData[] }) => {
    return (
        <section aria-labelledby="related-idols-title" className="max-w-340 mx-auto mt-14 pt-14">
            <div className="relative h-44">
                <div
                    aria-hidden
                    className={cn(
                        "absolute -inset-x-175 top-11 h-27 -rotate-2 bg-(--band)",
                        "bg-[repeating-linear-gradient(92deg,var(--speed)_0_2px,transparent_2px_26px),linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,0)_40%)]",
                    )}
                />
                <div
                    aria-hidden
                    className="absolute -inset-x-175 top-40.5 h-3 box-border -rotate-2 bg-[#FF8AC4] border-y-2 border-[#1A1418] shadow-(--rb-in)"
                />
                <div aria-hidden className="[display:var(--rb-l2)] absolute -inset-x-175 top-45.5 h-1 -rotate-2 bg-(--band)" />

                <div className="absolute inset-x-0 top-11 h-27 flex items-center px-2 -rotate-2">
                    <h2
                        id="related-idols-title"
                        className="m-0 font-mono-display font-normal text-[clamp(30px,6.4cqi,60px)] leading-none tracking-[.02em] text-white whitespace-nowrap"
                    >
                        related idols
                    </h2>
                </div>
            </div>

            <HScrollRow bar aria-label="Related idols" className="gap-6 overflow-y-hidden mt-7.5 -mx-3.5 pt-5 px-3.5 pb-7.5">
                {idols.map((idol, index) => (
                    <IntentLink
                        key={idol.id}
                        to={`/idols/${idol.id}/${buildIdolSlug(idol.artist_name, idol.group_name)}`}
                        onIntent={() => prefetchIdolProfile(idol.id)}
                        aria-label={`${idol.artist_name} of ${groupLabel(idol)}`}
                        className={cn(
                            "pp-focus relative flex-none flex flex-col gap-3 w-60 @max-[861px]/idol:w-52.5 @max-[561px]/idol:w-42.5",
                            "pt-2.5 px-2.5 pb-4 border-[3px] border-[#1A1418] rounded-[20px]",
                            "bg-(--chip) text-(--chip-ink) text-left no-underline shadow-[6px_6px_0_var(--ctl-off),var(--in)]",
                            "transition-[translate,rotate,box-shadow] duration-380 ease-(--ease-settle) will-change-transform",
                            "hover:-translate-y-1 hover:rotate-0",
                            "pressed:translate-x-0.75 pressed:translate-y-1 pressed:rotate-0 pressed:shadow-[2px_2px_0_var(--ctl-off),var(--in)] pressed:duration-150",
                            index % 2 ? "rotate-[0.8deg]" : "rotate-[-0.8deg]",
                        )}
                    >
                        <span className="block aspect-square overflow-hidden border-[2.5px] border-[#1A1418] rounded-xl bg-[#1A1418]">
                            <FadeImg src={idolImageUrl(idol)} alt="" loading="lazy" decoding="async" className="block size-full object-cover" />
                        </span>

                        <span className="flex flex-col gap-1.25 min-w-0 px-1">
                            <span className="block pr-1 pb-1.25 puff-ink font-bold text-2xl leading-none text-white text-shadow-(--puff-value) truncate">
                                {idol.artist_name}
                            </span>

                            <span className="font-semibold text-[13px] leading-tight text-(--muted) text-balance">{groupLabel(idol)}</span>
                        </span>
                    </IntentLink>
                ))}
            </HScrollRow>
        </section>
    );
};

export default IdolProfile;
