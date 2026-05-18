import "./UserProfile.css";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Mail, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getUserStats, sendVerificationEmail } from "../../services/api";
import { decryptToken } from "../../utils/tokenEncryption";
import type { UserStats } from "../../interfaces/gameInterfaces";
import StatsCard from "./StatsCard";
import EditProfile from "./EditProfile";
import HaerinGif from "../../assets/imgs/haerin.gif";
import HaerinWebp from "../../assets/imgs/haerinok.webp";
import { resolveAvatarUrl } from "../../utils/resolveAvatarUrl";
import { Helmet } from "react-helmet-async";

const EMAIL_BANNER_DISMISS_KEY = "emailVerifiedBannerDismissed";

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

const formatJoined = (raw: string | undefined) => {
    if (!raw) return "—";
    const datePart = raw.split(/[\sT]/)[0];
    const [year, month, day] = datePart.split("-").map(Number);
    if (!year || !month || !day) return "—";
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

const UserProfile = () => {
    const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();

    const username_slug = useParams<string>().username;
    const navigate = useNavigate();

    const [filter, setFilter] = useState<GamemodeFilter>("all");
    const [decryptedToken, setDecryptedToken] = useState<string | null>(null);
    const [isGif, setIsGif] = useState(true);
    const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => sessionStorage.getItem(EMAIL_BANNER_DISMISS_KEY) === "true");
    const [resendSent, setResendSent] = useState(false);
    const [editModal, setEditModal] = useState<{ open: boolean; initialTab: "fields" | "avatar" }>({
        open: false,
        initialTab: "fields",
    });

    const resendMutation = useMutation({
        mutationFn: () => sendVerificationEmail(),
        onSuccess: () => setResendSent(true),
    });

    const showEmailBanner =
        !!user?.user_credentials?.email
        && user?.profile?.email_verified === false
        && !bannerDismissed;

    const dismissBanner = () => {
        sessionStorage.setItem(EMAIL_BANNER_DISMISS_KEY, "true");
        setBannerDismissed(true);
    };

    useEffect(() => {
        let cancelled = false;

        const decrypt = async () => {
            const encrypted = localStorage.getItem("userToken");
            if (!encrypted) {
                setDecryptedToken(null);
                return;
            }

            try {
                const token = await decryptToken(encrypted);
                if (!cancelled) setDecryptedToken(token);
            } catch {
                if (!cancelled) setDecryptedToken(null);
            }
        };

        decrypt();

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

    useEffect(() => {
        if (user && user.profile && user.user_credentials) {
            const correctSlug = user.user_credentials.username.toLowerCase();

            if (username_slug !== correctSlug) {
                navigate(`/profile/${correctSlug}`, { replace: true });
            }
        }
    }, [user, navigate, username_slug]);

    const displayed = useMemo(() => {
        const classic_stats = combinedStats?.classic ?? EMPTY_STATS;
        const blurry_stats = combinedStats?.blurry ?? EMPTY_STATS;

        if (filter === "classic") {
            return {
                current_streak: classic_stats.current_streak,
                max_streak: classic_stats.max_streak,
                wins_count: classic_stats.wins_count + blurry_stats.wins_count,
                streak_label: "Classic",
                max_streak_label: "Classic"
            };
        }
        if (filter === "blurry") {
            return {
                current_streak: blurry_stats.current_streak,
                max_streak: blurry_stats.max_streak,
                wins_count: classic_stats.wins_count + blurry_stats.wins_count,
                streak_label: "Blurry",
                max_streak_label: "Blurry"
            };
        }
        return {
            current_streak: classic_stats.current_streak > blurry_stats.current_streak ? classic_stats.current_streak : blurry_stats.current_streak,
            max_streak: classic_stats.max_streak > blurry_stats.max_streak ? classic_stats.max_streak : blurry_stats.max_streak,
            wins_count: classic_stats.wins_count + blurry_stats.wins_count,
            streak_label: `${classic_stats.current_streak > blurry_stats.current_streak ? "Classic" : classic_stats.current_streak === blurry_stats.current_streak ? "Tied" : "Blurry"}`,
            max_streak_label: `${classic_stats.max_streak > blurry_stats.max_streak ? "Classic" : classic_stats.max_streak === blurry_stats.max_streak ? "Tied" : "Blurry"}`
        };
    }, [combinedStats, filter]);

    if (!isAuthLoading && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const displayName = user?.profile.display_name ?? null;
    const username = user?.user_credentials.username ?? null;
    const avatarSrc = user?.profile.avatar_url
        ? resolveAvatarUrl(user.profile.avatar_url, user.profile.updated_at)
        : null;
    const joinedDisplay = formatJoined(user?.profile.created_at);

    const currentFilterLabel = displayed.streak_label || "null";
    const maxFilterLabel = displayed.max_streak_label || "null";
    const showGameMode = filter !== "all";

    return (
        <>
            <Helmet>
                <title>{`${displayName} (@${username}) Profile · KpopIt`}</title>
                <meta name="robots" content="noindex" />
            </Helmet>
            
            {/* Background layer */}
            <div className="profile-bg-glow fixed inset-0 -z-10 bg-[#0a0a0a] pointer-events-none" />

            <main className="relative w-full min-h-full flex justify-center items-start md:items-center py-8 transform-gpu">
                <div className="w-full max-w-7xl px-4 sxs:px-5 sm:px-6 md:px-8 mt-20">
                    {showEmailBanner && (
                        <div
                            role="status"
                            className="relative flex flex-col xxs:flex-row justify-center items-start xxs:items-center gap-3 xxs:gap-6 mb-5
                            px-4 sxs:px-5 py-3 sxs:py-3.5 bg-[#111111] rounded-xl
                            shadow-[3px_3px_0px_rgba(255,255,255,1)]"
                        >
                            <Mail className="w-5 h-5 text-white shrink-0" />

                            <div className="flex-1 min-w-0">
                                {resendSent ? (
                                    <span className="text-[12px] sxs:text-sm text-white/85 font-bold">
                                        Verification email sent — check your inbox.
                                    </span>
                                ) : (
                                    <span className="text-[12px] sxs:text-sm text-white/85 font-bold leading-snug">
                                        Your email isn't verified yet.
                                    </span>
                                )}
                            </div>

                            {!resendSent && (
                                <button
                                    type="button"
                                    onClick={() => resendMutation.mutate()}
                                    disabled={resendMutation.isPending}
                                    className={`shrink-0 px-3.5 py-2 rounded-lg text-[12px] sxs:text-sm font-black
                                    bg-neon-pink text-white [text-shadow:1.5px_1.5px_2px_rgba(0,0,0,0.9)] shadow-[3px_3px_0px_rgba(255,255,255,1)] 
                                    hover:translate-x-1 hover:translate-y-1 hover:shadow-[0px_0px_0px_#000]
                                    hover:cursor-pointer transition-all duration-150 transform-gpu
                                    ${resendMutation.isPending ? "opacity-70" : ""}`}
                                >
                                    {resendMutation.isPending ? "Sending…" : "Resend Email"}
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={dismissBanner}
                                aria-label="Dismiss"
                                className="absolute top-1.5 right-1.5 xxs:static xxs:top-auto xxs:right-auto
                                shrink-0 grid place-items-center w-10 h-10 rounded-2xl border-2 border-white/15
                                    text-white/70 hover:text-white hover:bg-white/5 hover:border-white
                                    hover:cursor-pointer transition-colors duration-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,32fr)_minmax(0,68fr)] gap-5 md:gap-6 items-stretch">

                        {/* Left Profile card */}
                        <aside
                            className="profile-entry relative flex rounded-2xl p-1.5 transform-gpu
                            shadow-[4px_4px_0px_rgba(255,53,151,1.0)] border-t-2 border-r border-b border-l-0 border-neon-pink"
                            aria-label="Identity"
                        >
                            <div className="flex flex-col w-full h-full items-center text-center gap-4 px-4 sxs:px-5 sm:px-6 py-6 sm:py-7
                                bg-[#111111] rounded-[10px]">

                                {/* Polaroid avatar */}
                                <div className="relative flex h-fit px-2 pt-2 pb-7 mt-1.5 mb-1 rounded-sm bg-[#f4f0e8]
                                    shadow-[4px_4px_0px_#ff3399] -rotate-[1.5deg] transform-gpu">

                                    {/* Washi tape ribbons */}
                                    <span aria-hidden="true"
                                        className="absolute z-10 -top-2 -left-2.5 w-14 h-4.5 -rotate-30 transform-gpu
                                        bg-neon-pink/35 border border-neon-pink/60
                                        shadow-[1px_1px_0px_rgba(0,0,0,0.4)]" />

                                    <span aria-hidden="true"
                                        className="absolute z-10 -top-2 -right-2.5 w-14 h-4.5 rotate-30 transform-gpu
                                        bg-neon-pink/35 border border-neon-pink/60
                                        shadow-[1px_1px_0px_rgba(0,0,0,0.4)]" />

                                    <div className="flex flex-col items-center xxs:flex-row xxs:justify-center xxs:items-center gap-3 xxs:gap-6 sm:gap-8">
                                        <div className="grid place-items-center w-28 sxs:w-32 h-28 sxs:h-32 rounded-sm overflow-hidden bg-transparent -rotate-[1.5deg] border-t-2 border-l-2 border-neon-pink shrink-0">
                                            {avatarSrc ? (
                                                <img
                                                    src={avatarSrc}
                                                    alt={`${displayName} avatar`}
                                                    className="w-full h-full object-cover hover:cursor-pointer hover:brightness-90"
                                                    draggable={false}
                                                    onClick={() => setEditModal({ open: true, initialTab: "avatar" })}
                                                />
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditModal({ open: true, initialTab: "avatar" })}
                                                    className="w-full h-full bg-linear-to-b from-[#2a2a2a] to-[#0e0e0e] hover:cursor-pointer"
                                                />
                                            )}
                                        </div>

                                        <div className="absolute left-0 right-0 bottom-1.5 text-center text-[13px] -rotate-[1.5deg] tracking-[0.5px] text-[#444]">
                                            ~ KpopIt ID ~
                                        </div>
                                    </div>
                                </div>

                                {/* Name */}
                                <div className="flex flex-col items-center gap-1">
                                    <span
                                        title={displayName || undefined}
                                        className="inline-block px-1 text-2xl font-bold text-white tracking-[0.4px] leading-tight
                                        [text-shadow:3px_3px_2px_rgba(255,51,153,1)] truncate max-w-55"
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
                                    onClick={() => setEditModal({ open: true, initialTab: "fields" })}
                                    className="w-full mt-1 px-4 py-2.5 rounded-lg text-base font-black [text-shadow:2px_2px_0px_#000000]
                                    border border-white bg-neon-pink/0 text-white
                                    shadow-[3px_3px_0px_#ffffff]
                                    hover:bg-neon-pink hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_#000]
                                    active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000]
                                    hover:cursor-pointer transition-all duration-300 transform-gpu"
                                >
                                    Edit Profile
                                </button>

                                {/* Joined */}
                                <div className="w-full mt-1 pt-3.5 text-center border-t border-dashed border-[#2a2a2a]">
                                    <div className="font-sans text-[9px] text-[#888] tracking-[1.5px] uppercase mb-1">
                                        Joined
                                    </div>
                                    <div className="font-sans text-base text-white font-semibold">
                                        {joinedDisplay}
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* Right Stats */}
                        <section className="profile-entry flex flex-col gap-4 sm:gap-5 min-w-0 transform-gpu">

                            {/* Stats row */}
                            <div className="grid grid-cols-1 max-xxs:grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5"
                                role="list"
                                aria-label="Player stats">
                                <StatsCard
                                    label="Current Streak"
                                    value={displayed.current_streak}
                                    gameMode={showGameMode ? currentFilterLabel : null}
                                    sub={
                                        filter === "all"
                                            ? `personal best · ${currentFilterLabel.toLowerCase()}`
                                            : filter === "classic"
                                                ? "in classic mode"
                                                : "in blurry mode"
                                    }
                                    fadeKey={`current-${filter}-${displayed.current_streak}`}
                                    actualCard="currentStreak"
                                />
                                <StatsCard
                                    label="Max Streak"
                                    value={displayed.max_streak}
                                    gameMode={showGameMode ? maxFilterLabel : null}
                                    sub={
                                        filter === "all"
                                            ? `personal best · ${maxFilterLabel.toLowerCase()}`
                                            : filter === "classic"
                                                ? "in classic mode"
                                                : "in blurry mode"
                                    }
                                    fadeKey={`max-${filter}-${displayed.max_streak}`}
                                    actualCard="maxStreak"
                                />
                                <StatsCard
                                    label="Wins"
                                    value={displayed.wins_count}
                                    gameMode={null}
                                    sub="total games won"
                                    fadeKey={`wins-${displayed.wins_count}`}
                                    actualCard="wins"
                                />
                            </div>

                            {/* Mode toggle bar */}
                            <div className="flex flex-row flex-wrap items-center justify-between gap-3 px-4 py-3
                                bg-[#111111] rounded-lg
                                border-r-2 border-b-2 border-l-2 border-neon-pink">
                                <span className="font-sans text-[12px] text-[#888888] font-black uppercase tracking-[1.5px]">
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

                            {/* Construction */}
                            <div
                                role="status"
                                aria-label="Page status"
                                className="relative flex-1 grid grid-cols-1 lg:grid-cols-[1fr_auto] items-center gap-7
                                min-h-65 sm:min-h-70 px-6 sm:px-10 py-7 sm:py-8 overflow-hidden
                                rounded-xl border-2 border-dashed border-white/30 bg-[#111111]/50"
                            >
                                <div className="construction-dots absolute inset-0 pointer-events-none" aria-hidden="true" />

                                <div className="relative z-10 flex flex-col items-center lg:items-start gap-3.5 min-w-0 text-center lg:text-left">
                                    <span className="self-center lg:self-start font-mono text-[10px] tracking-[2.5px]
                                        text-white uppercase
                                        border border-white/40 rounded
                                        px-2.5 py-1 bg-white/4">
                                        v1
                                    </span>

                                    <h2 className="flex flex-wrap items-center justify-center lg:justify-start gap-3
                                        text-2xl sm:text-[28px] font-bold text-white tracking-[0.5px] leading-[1.15]
                                        [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]">
                                        <span aria-hidden="true" className="text-3xl sm:text-[32px]">🚧</span>
                                        Under Construction
                                    </h2>

                                    <div className="flex flex-col text-white font-sans text-sm leading-[1.55] max-w-[50ch] gap-0">
                                    <span>
                                        The profile page is a brand new feature and there's a lot of work in progress!
                                    </span>

                                    <span>
                                        I still need to build out the backend to support all the stats and features I want to show here.
                                    </span>

                                    <span>
                                        I'm currently working on some features for registered users (and I hope to build them asap).
                                    </span>
                                    
                                    <span>
                                        Sorry for the wait, but I promise that I'll keep doing my best at Kpopit!
                                    </span>
                                    </div>
                                </div>

                                {/* Haerin */}
                                <div className="relative z-10 grid place-items-center justify-self-center lg:justify-self-end shrink-0
                                    w-full max-w-55 lg:w-50 h-55 lg:h-60
                                    rounded-[14px] overflow-hidden bg-[#1a1a1a]
                                    border-2 border-white/20
                                    shadow-[5px_5px_0px_#fff,0_0_24px_rgba(255,51,153,0.18)]">
                                    <div aria-hidden="true" className="absolute inset-0
                                        bg-[radial-gradient(circle_at_50%_35%,rgba(255,51,153,0.18),transparent_60%),linear-gradient(135deg,#1a1a1a,#0e0e0e)]" />
                                    <img
                                        src={isGif ? HaerinGif : HaerinWebp}
                                        alt="Coming soon"
                                        className="relative z-10 w-full h-full object-cover opacity-90 drop-shadow-[0_0_10px_rgba(255,51,153,0.35)] 
                                        hover:cursor-pointer hover:scale-105 transition-transform duration-500 transform-gpu"
                                        draggable={false}
                                        onClick={() => setIsGif(!isGif)}
                                        
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    {isStatsLoading && (
                        <span className="sr-only">Loading stats…</span>
                    )}
                </div>
            </main>

            <EditProfile
                isOpen={editModal.open}
                onClose={() => setEditModal((m) => ({ ...m, open: false }))}
                initialTab={editModal.initialTab}
            />
        </>
    );
};

export default UserProfile;
