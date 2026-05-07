import "./UserProfile.css";
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flame, Zap, Trophy } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getUserStats } from "../../services/api";
import { decryptToken } from "../../utils/tokenEncryption";
import type { UserStats } from "../../interfaces/gameInterfaces";
import HaerinGif from "../../assets/imgs/haerin.gif";

type GamemodeFilter = "all" | "classic" | "blurry";

interface CombinedStats {
    classic: UserStats;
    blurry: UserStats;
}

const EMPTY_STATS: UserStats = {
    current_streak: 0,
    max_streak: 0,
    wins_count: 0,
    average_guesses: 0,
    one_shot_wins: 0,
};

const fetchBothModeStats = async (userToken: string): Promise<CombinedStats> => {
    const original = localStorage.getItem("kpopit_gamemode");

    try {
        localStorage.setItem("kpopit_gamemode", "classic");
        const classic: UserStats = await getUserStats(userToken);

        localStorage.setItem("kpopit_gamemode", "blurry");
        const blurry: UserStats = await getUserStats(userToken);

        return { classic, blurry };
    } finally {
        if (original === null) localStorage.removeItem("kpopit_gamemode");
        else localStorage.setItem("kpopit_gamemode", original);
    }
};

const formatJoined = (iso: string | undefined) => {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-US", { month: "short", year: "numeric" });
};

const UserProfile = () => {
    const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
    const [filter, setFilter] = useState<GamemodeFilter>("all");
    const [decryptedToken, setDecryptedToken] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const encrypted = localStorage.getItem("userToken");
        if (!encrypted) {
            setDecryptedToken(null);
            return;
        }
        decryptToken(encrypted)
            .then(token => { if (!cancelled) setDecryptedToken(token); })
            .catch(() => { if (!cancelled) setDecryptedToken(null); });
        return () => { cancelled = true; };
    }, [user]);

    const { data: combinedStats, isLoading: isStatsLoading } = useQuery<CombinedStats>({
        queryKey: ["userProfileStats", decryptedToken],
        queryFn: () => fetchBothModeStats(decryptedToken as string),
        enabled: !!decryptedToken && isAuthenticated,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const displayed = useMemo(() => {
        const c = combinedStats?.classic ?? EMPTY_STATS;
        const b = combinedStats?.blurry ?? EMPTY_STATS;

        if (filter === "classic") {
            return {
                current_streak: c.current_streak,
                max_streak: c.max_streak,
                wins_count: c.wins_count + b.wins_count,
            };
        }
        if (filter === "blurry") {
            return {
                current_streak: b.current_streak,
                max_streak: b.max_streak,
                wins_count: c.wins_count + b.wins_count,
            };
        }
        return {
            current_streak: c.current_streak + b.current_streak,
            max_streak: c.max_streak + b.max_streak,
            wins_count: c.wins_count + b.wins_count,
        };
    }, [combinedStats, filter]);

    if (!isAuthLoading && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const displayName = user?.profile.display_name ?? "—";
    const username = user?.user_credentials.username ?? "";
    const avatarSrc = user?.profile.avatar_url
        ? `${import.meta.env.VITE_IMAGE_BUCKET_URL}${user.profile.avatar_url}`
        : "";
    const joinedDisplay = formatJoined(user?.profile.created_at);

    const filterLabel = filter === "all" ? "All Modes" : filter === "classic" ? "Classic" : "Blurry";
    const showModePill = filter !== "all";

    return (
        <>
            {/* Background layer — placeholder until proper bg component lands */}
            <div className="profile-bg-glow fixed inset-0 -z-10 bg-[#0a0a0a] pointer-events-none" />

            <main className="relative w-full max-w-310 mx-auto px-4 sxs:px-5 sm:px-6 md:px-8 pt-8 pb-20 transform-gpu">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,32fr)_minmax(0,68fr)] gap-5 md:gap-6 items-stretch">

                    {/* ─────────── Left: Identity card ─────────── */}
                    <aside
                        className="profile-entry relative rounded-[14px] p-1.5 transform-gpu
                        border-t-2 border-r-4 border-b-4 border-l-0 border-neon-pink
                        shadow-[6px_6px_0px_rgba(255,51,153,0.18)]"
                        aria-label="Identity"
                    >
                        <div className="flex flex-col items-center text-center gap-4 px-4 sxs:px-5 sm:px-6 py-6 sm:py-7
                            bg-[#111111] rounded-[10px] border-2 border-neon-pink/20">

                            {/* Polaroid avatar */}
                            <div className="relative px-2 pt-2 pb-7 mt-1.5 mb-1 rounded-sm bg-[#f4f0e8]
                                shadow-[4px_4px_0px_#000] -rotate-[1.5deg] transform-gpu">

                                {/* Washi tape ribbons */}
                                <span aria-hidden="true"
                                    className="absolute -top-2 -left-2.5 w-14 h-4.5 -rotate-30 transform-gpu
                                    bg-neon-pink/35 border border-neon-pink/60
                                    shadow-[1px_1px_0px_rgba(0,0,0,0.4)]" />
                                <span aria-hidden="true"
                                    className="absolute -top-2 -right-2.5 w-14 h-4.5 rotate-30 transform-gpu
                                    bg-neon-pink/35 border border-neon-pink/60
                                    shadow-[1px_1px_0px_rgba(0,0,0,0.4)]" />

                                <div className="grid place-items-center w-28 sxs:w-32 h-28 sxs:h-32 rounded-sm overflow-hidden bg-[#1a1a1a]
                                    border-t border-l border-neon-pink/25
                                    border-r-[3px] border-b-[3px] border-r-neon-pink border-b-neon-pink">
                                    {avatarSrc ? (
                                        <img
                                            src={avatarSrc}
                                            alt={`${displayName} avatar`}
                                            className="w-full h-full object-cover"
                                            draggable={false}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-linear-to-b from-[#2a2a2a] to-[#0e0e0e]" />
                                    )}
                                </div>

                                <div className="absolute left-0 right-0 bottom-1.5 text-center text-[13px] tracking-[0.5px] text-[#444]">
                                    ~ {username || "fan"}, '{new Date().getFullYear().toString().slice(-2)} ~
                                </div>
                            </div>

                            {/* Name */}
                            <div className="flex flex-col items-center gap-1">
                                <span
                                    title={displayName}
                                    className="inline-block px-1 text-2xl font-bold text-white tracking-[0.4px] leading-tight
                                    [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)] truncate max-w-55"
                                >
                                    {displayName}
                                </span>
                                {username && (
                                    <span
                                        title={`@${username}`}
                                        className="font-sans text-[13px] text-[#888] truncate max-w-55"
                                    >
                                        @{username}
                                    </span>
                                )}
                            </div>

                            {/* Edit profile */}
                            <button
                                type="button"
                                onClick={() => console.log("Edit profile working")}
                                className="w-full mt-1 px-4 py-2.5 rounded-lg
                                bg-transparent border-2 border-neon-pink text-neon-pink uppercase
                                text-[13px] font-semibold tracking-[1.5px]
                                shadow-[3px_3px_0px_#000]
                                hover:bg-neon-pink hover:text-black hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0px_#000]
                                active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000]
                                hover:cursor-pointer transition-all duration-150 transform-gpu"
                            >
                                Edit Profile
                            </button>

                            {/* Joined */}
                            <div className="w-full mt-1 pt-3.5 text-center border-t border-dashed border-[#2a2a2a]">
                                <div className="font-sans text-[9px] text-[#888] tracking-[1.5px] uppercase mb-1">
                                    Joined
                                </div>
                                <div className="font-sans text-[13px] text-white font-semibold">
                                    {joinedDisplay}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* ─────────── Right: Stats + Construction ─────────── */}
                    <section className="profile-entry flex flex-col gap-4 sm:gap-5 min-w-0 transform-gpu">

                        {/* Stats row */}
                        <div className="grid grid-cols-1 max-xxs:grid-cols-1 xs:grid-cols-3 gap-2.5 sm:gap-3.5"
                            role="list"
                            aria-label="Player stats">
                            <StatCard
                                label="Current Streak"
                                value={displayed.current_streak}
                                icon={<Flame className="w-3.5 h-3.5 text-neon-pink" />}
                                modePill={showModePill ? filterLabel : null}
                                sub={
                                    filter === "all"
                                        ? "across all modes"
                                        : filter === "classic"
                                            ? "in classic mode"
                                            : "in blurry mode"
                                }
                                fadeKey={`current-${filter}-${displayed.current_streak}`}
                            />
                            <StatCard
                                label="Max Streak"
                                value={displayed.max_streak}
                                icon={<Zap className="w-3.5 h-3.5 text-neon-pink" />}
                                modePill={showModePill ? filterLabel : null}
                                sub={
                                    filter === "all"
                                        ? "personal best · all modes"
                                        : filter === "classic"
                                            ? "personal best · classic"
                                            : "personal best · blurry"
                                }
                                fadeKey={`max-${filter}-${displayed.max_streak}`}
                            />
                            <StatCard
                                label="Wins"
                                value={displayed.wins_count}
                                icon={<Trophy className="w-3.5 h-3.5 text-neon-pink" />}
                                modePill={null}
                                sub="total games won"
                                fadeKey={`wins-${displayed.wins_count}`}
                            />
                        </div>

                        {/* Mode toggle bar */}
                        <div className="flex flex-row flex-wrap items-center justify-between gap-3 px-4 py-3
                            bg-[#111111] rounded-lg
                            border-t border-l border-neon-pink/20
                            border-r-2 border-b-2 border-r-neon-pink border-b-neon-pink
                            shadow-[3px_3px_0px_rgba(255,51,153,0.16)]">
                            <span className="font-sans text-[10px] text-[#888] tracking-[1.5px] uppercase font-bold">
                                Streak gamemode
                            </span>

                            <div
                                role="group"
                                aria-label="Streak gamemode"
                                className="inline-flex gap-0.5 p-0.75 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]"
                            >
                                {(["all", "classic", "blurry"] as const).map(mode => {
                                    const active = filter === mode;
                                    return (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setFilter(mode)}
                                            aria-pressed={active}
                                            className={`font-sans text-[10px] font-bold uppercase tracking-[1.2px]
                                            px-3 py-1.25 rounded-full transform-gpu
                                            transition-colors duration-150 hover:cursor-pointer
                                            ${active
                                                    ? "bg-neon-pink text-black shadow-[2px_2px_0px_#000]"
                                                    : "bg-transparent text-[#888] hover:text-[#ddd]"}`}
                                        >
                                            {mode === "all" ? "All" : mode === "classic" ? "Classic" : "Blurry"}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Construction zone */}
                        <div
                            role="status"
                            aria-label="Page status"
                            className="relative flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-7 md:gap-7
                            min-h-65 sm:min-h-70 px-5 sm:px-7 py-7 sm:py-8 overflow-hidden
                            rounded-xl border-2 border-dashed border-neon-pink/30 bg-[#111111]/50"
                        >
                            <div className="construction-dots absolute inset-0 pointer-events-none" aria-hidden="true" />

                            <div className="relative z-10 flex flex-col items-center md:items-start gap-3.5 min-w-0 text-center md:text-left">
                                <span className="self-center md:self-start font-mono text-[10px] tracking-[2.5px]
                                    text-neon-pink uppercase
                                    border border-neon-pink/40 rounded
                                    px-2.5 py-1 bg-neon-pink/4">
                                    v1 beta
                                </span>

                                <h2 className="flex flex-wrap items-center justify-center md:justify-start gap-3
                                    text-2xl sm:text-[28px] font-bold text-white tracking-[0.5px] leading-[1.15]
                                    [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]">
                                    <span aria-hidden="true" className="text-3xl sm:text-[32px]">🚧</span>
                                    Under Construction
                                </h2>

                                <p className="font-sans text-sm text-[#aaa] leading-[1.55] max-w-[50ch]">
                                    We're still in beta and collecting data. More profile features —
                                    collection, badges, achievements, and full match history — will
                                    roll out as we gather more plays. Thanks for being here early ✨
                                </p>

                                <div className="font-sans text-[10px] tracking-[1.5px] text-[#555] uppercase">
                                    More dropping soon · <span className="font-korean">곧 만나요</span>
                                </div>
                            </div>

                            {/* Placeholder image — Kpopit logo until final art is dropped in */}
                            <div className="relative z-10 grid place-items-center justify-self-center md:justify-self-end shrink-0
                                w-full max-w-55 md:w-50 h-55 md:h-60
                                rounded-[14px] overflow-hidden bg-[#1a1a1a]
                                border-[3px] border-neon-pink
                                shadow-[5px_5px_0px_#000,0_0_24px_rgba(255,51,153,0.18)]">
                                <div aria-hidden="true" className="absolute inset-0
                                    bg-[radial-gradient(circle_at_50%_35%,rgba(255,51,153,0.18),transparent_60%),linear-gradient(135deg,#1a1a1a,#0e0e0e)]" />
                                <img
                                    src={HaerinGif}
                                    alt="Coming soon"
                                    className="relative z-10 w-full h-full object-cover opacity-90 drop-shadow-[0_0_10px_rgba(255,51,153,0.35)]"
                                    draggable={false}
                                />
                            </div>
                        </div>
                    </section>
                </div>

                {isStatsLoading && (
                    <span className="sr-only">Loading stats…</span>
                )}
            </main>
        </>
    );
};

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    modePill: string | null;
    sub: string;
    fadeKey: string;
}

const StatCard = ({ label, value, icon, modePill, sub, fadeKey }: StatCardProps) => (
    <article
        role="listitem"
        className="flex flex-col gap-1 min-w-0 px-4 sm:px-4.5 py-3.5 sm:py-4
        bg-[#111111] rounded-lg
        border-t border-l border-neon-pink/20
        border-r-2 border-b-2 border-r-neon-pink border-b-neon-pink
        shadow-[3px_3px_0px_rgba(255,51,153,0.16)]"
    >
        <div className="flex items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="font-sans text-[9px] text-[#888] tracking-[1.5px] uppercase font-bold">
                    {label}
                </span>
                {modePill && (
                    <span
                        aria-live="polite"
                        className="font-mono text-[8.5px] tracking-[1.5px] font-bold uppercase whitespace-nowrap
                        text-neon-pink bg-neon-pink/8 border border-neon-pink/40
                        rounded px-1.5 py-px leading-tight"
                    >
                        {modePill}
                    </span>
                )}
            </span>
            <span aria-hidden="true" className="opacity-95">{icon}</span>
        </div>

        <div
            key={fadeKey}
            className="stat-value-fade-in mt-1.5 text-3xl font-bold text-white tracking-[0.3px] leading-none
            [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]"
        >
            {value}
        </div>

        <div className="font-sans text-[10px] text-[#666] mt-1">
            {sub}
        </div>
    </article>
);

export default UserProfile;
