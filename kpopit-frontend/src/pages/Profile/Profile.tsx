import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Lock, Mail, Pencil, X } from "lucide-react";
import PageShell from "../../components/PageShell/PageShell";
import PuffTitle from "../../components/PageShell/PuffTitle";
import { PressButton, PressLink, Pill } from "../../components/buttons/PressButton";
import PageLoader from "../../components/Loading/PageLoader";
import PageMeta from "../../components/Seo/PageMeta";
import NotFound from "../NotFound/NotFound";
import EditProfile from "../User/EditProfile";
import { useAuth } from "../../hooks/useAuth";
import { useFeatures } from "../../hooks/useFeatures";
import { useHydrated } from "../../hooks/useHydrated";
import { getProfileStats, getPublicProfile, sendVerificationEmail } from "../../services/api";
import { resolveAvatarUrl } from "../../utils/resolveAvatarUrl";
import { cn } from "../../lib/utils";
import type { ProfileHeroXp, PublicProfile } from "../../interfaces/playerInterfaces";
import { OverviewPane, ModeDot, StatsPane } from "./ProfilePanes";
import ProfileHistory from "./ProfileHistory";
import { MODES, TABS, formatJoined, parseTab, type ModeFilter, type ProfileTab } from "./profileData";
import "./profile.css";

const BANNER_DISMISS_KEY = "emailVerifiedBannerDismissed";

type VisibleProfile = Extract<PublicProfile, { is_private: false }>;

// The Idol XP button: a press control with a pink depth, its jar wobbling and filling on hover.
const IDOL_XP_BUTTON = cn(
    "pp-focus group/xp inline-flex items-center gap-2.75 box-border h-13 pl-2.5 pr-4 rounded-full no-underline text-left whitespace-nowrap",
    "border-2 border-(--ink) bg-(--chip) text-(--chip-ink) font-bold shadow-[3px_4px_0_0_#FF8AC4,3px_4px_0_2px_var(--ink)]",
    "transition-[translate,box-shadow,background-color] duration-500 ease-(--ease-settle) will-change-transform",
    "hover:-translate-y-0.75 hover:bg-(--chip-hover)",
    "active:translate-x-0.75 active:translate-y-1 active:shadow-[0_0_0_0_#FF8AC4,0_0_0_2px_var(--ink)] active:duration-160",
);

const Profile = () => {
    const { username = "" } = useParams();
    const hydrated = useHydrated();
    const { isLoading: authLoading, user } = useAuth();
    const navigate = useNavigate();

    // The viewer decides what the server sends (owner view, anti-spoiler), so it is part of every key.
    const viewerKey = user ? String(user.user_credentials.user_id) : "anon";
    const profile = useQuery({
        queryKey: ["publicProfile", username.toLowerCase(), viewerKey],
        queryFn: () => getPublicProfile(username),
        enabled: hydrated && !authLoading,
        retry: (count, error) => !(isAxiosError(error) && error.response?.status === 404) && count < 2,
    });

    const canonicalName = profile.data?.username;
    useEffect(() => {
        // An old username (held 15 days) answers with the account's current one.
        if (canonicalName && canonicalName !== username) navigate(`/profile/${canonicalName}${window.location.search}`, { replace: true });
    }, [canonicalName, username, navigate]);

    if (isAxiosError(profile.error) && profile.error.response?.status === 404) return <NotFound />;
    if (!hydrated || authLoading || !profile.data) return <PageLoader error={profile.isError} onRetry={() => profile.refetch()} />;
    if (profile.data.is_private) return <PrivateProfile username={profile.data.username} />;

    return <ProfileView key={`${profile.data.username}-${viewerKey}`} profile={profile.data} viewerKey={viewerKey} />;
};

const ProfileMeta = ({ username, name }: { username: string; name: string }) => {
    return (
        <PageMeta
            title={`${name} (@${username}) · KpopIt`}
            description={`${name}'s KpopIt profile: streaks, stats and the K-pop idols they guess the most.`}
            path={`/profile/${username}`}
            noindex
        />
    );
};

const PrivateProfile = ({ username }: { username: string }) => {
    return (
        <PageShell width="max-w-260">
            <ProfileMeta username={username} name={username} />

            <div
                className={cn(
                    "pp-enter flex flex-col items-center gap-4 max-w-115 mt-16 mx-auto py-9 px-7 text-center",
                    "rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-(--card-depth)",
                )}
            >
                <span className="grid place-items-center size-14 rounded-2xl -rotate-4 border-2 border-[#1A1418] bg-[#FF8AC4] shadow-(--in-pink)">
                    <Lock size={24} strokeWidth={2.6} color="#1A1418" />
                </span>

                <h1 className="m-0 font-bold text-2xl">This profile is private</h1>
                <p className="m-0 font-medium text-[15px] text-(--muted)">@{username} keeps their stats to themselves.</p>
                <PressLink to="/" variant="cta" size="lg" className="[--ctl-off:var(--ink)]">Return home</PressLink>
            </div>
        </PageShell>
    );
};

const ProfileView = ({ profile, viewerKey }: { profile: VisibleProfile; viewerKey: string }) => {
    const { features } = useFeatures();
    const { user } = useAuth();
    const [params, setParams] = useSearchParams();
    const [filter, setFilter] = useState<ModeFilter>("all");
    const [isEditOpen, setIsEditOpen] = useState(false);
    const queryClient = useQueryClient();

    // The owner sees a lock on History while visitors can't see it.
    const isHistoryHidden = profile.is_owner && user?.profile.visibility?.show_match_history === false;
    const askedTab = parseTab(params.get("tab"));
    const tabs = TABS.filter((option) => option.id !== "history" || profile.history_visible);
    const tab: ProfileTab = tabs.some((option) => option.id === askedTab) ? askedTab : "overview";
    const name = profile.display_name ?? profile.username;

    const stats = useQuery({
        queryKey: ["profileStats", profile.username.toLowerCase(), viewerKey],
        queryFn: () => getProfileStats(profile.username),
    });

    const closeEdit = () => {
        setIsEditOpen(false);
        // Name, avatar, username or privacy may have changed.
        void queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
    };

    const setTab = (next: ProfileTab) => setParams((current) => {
        if (next === "overview") current.delete("tab");
        else current.set("tab", next);
        return current;
    }, { replace: true, preventScrollReset: true });

    return (
        <PageShell width="max-w-260" className="profile-page">
            <ProfileMeta username={profile.username} name={name} />

            <div className="@container flex flex-col gap-7 pt-4.5">
                {profile.is_owner && <EmailBanner />}

                <header className="pp-enter [--pp-anim:puffSide] [--pp-delay:80ms] flex @max-[641px]:flex-col items-center gap-8.5 @max-[641px]:gap-4.5 @max-[641px]:text-center">
                    <Polaroid src={resolveAvatarUrl(profile.avatar_url)} />

                    <div className="flex flex-col gap-3 min-w-0">
                        <PuffTitle className="pb-2 text-[56px] @max-[581px]:text-[42px] leading-[1.02] origin-left @max-[641px]:origin-center truncate">{name}</PuffTitle>

                        <div className="flex flex-wrap items-center @max-[641px]:justify-center gap-2 font-medium text-sm text-(--muted)">
                            <span className="font-bold text-(--text)">@{profile.username}</span>
                            {profile.member_since && (
                                <>
                                    <span>·</span>
                                    <span>{formatJoined(profile.member_since)}</span>
                                </>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center @max-[641px]:justify-center gap-3 mt-1.5">
                            {features.idol_xp && profile.idol_xp && <IdolXpButton hero={profile.idol_xp} isOwner={profile.is_owner} />}

                            {profile.is_owner && (
                                <PressButton className="h-11 pl-3.25 pr-4 font-semibold text-sm" onClick={() => setIsEditOpen(true)}>
                                    <Pencil size={15} strokeWidth={2.6} />
                                    Edit profile
                                </PressButton>
                            )}
                        </div>
                    </div>
                </header>

                <div className="sticky top-17.5 max-[760px]:top-16 z-15 flex justify-center">
                    <div
                        role="tablist"
                        aria-label="Profile sections"
                        className={cn(
                            "box-border flex gap-1 @max-[581px]:w-full p-1.25 rounded-full",
                            "border-2 border-(--ink) bg-(--menu-bg) shadow-[3px_4px_0_var(--ctl-off),var(--in)]",
                        )}
                    >
                        {tabs.map(({ id, label }) => {
                            const isOn = tab === id;

                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isOn}
                                    onClick={() => setTab(id)}
                                    className={cn(
                                        "pp-focus box-border flex flex-none @max-[581px]:flex-1 items-center justify-center gap-1.75",
                                        "min-w-31 @max-[581px]:min-w-0 h-10 px-4.5 @max-[581px]:px-2 rounded-full border-2 font-bold text-sm cursor-pointer",
                                        "transition-[background-color,border-color,color] duration-300 active:translate-y-px",
                                        isOn
                                            ? "border-(--ink) bg-(--side) text-[#1A1418] shadow-(--in-pink)"
                                            : "border-transparent bg-transparent text-(--chip-ink) hover:bg-(--chip-hover)",
                                    )}
                                >
                                    {label}
                                    {id === "history" && isHistoryHidden && <Lock size={12} strokeWidth={3} className="opacity-70" aria-label="Hidden from visitors" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {tab !== "overview" && (
                    <div role="group" aria-label="Mode" className="flex flex-wrap justify-center gap-2 -mt-2.5">
                        {(["all", ...MODES.map((mode) => mode.id)] as ModeFilter[]).map((id) => (
                            <Pill
                                key={id}
                                active={filter === id}
                                onClick={() => setFilter(id)}
                                className={cn("gap-2 h-9 pl-2.5 pr-3.5 text-[13px]", filter === id && "[--pp-in:var(--in-pink)]")}
                            >
                                <ModeDot color={MODES.find((mode) => mode.id === id)?.color ?? "var(--chip)"} />
                                {id === "all" ? "All modes" : MODES.find((mode) => mode.id === id)!.name}
                            </Pill>
                        ))}
                    </div>
                )}

                {tab === "history" ? (
                    <ProfileHistory
                        username={profile.username}
                        viewerKey={viewerKey}
                        filter={filter}
                        isOwner={profile.is_owner}
                        hiddenFromVisitors={isHistoryHidden}
                        today={profile.today}
                    />
                ) : !stats.data ? (
                    <p className="m-0 py-10 font-medium text-sm text-center text-(--muted)" role={stats.isError ? "alert" : "status"}>
                        {stats.isError ? "Couldn't load the stats." : "Loading stats..."}
                    </p>
                ) : tab === "stats" ? (
                    <StatsPane key={filter} stats={stats.data} filter={filter} />
                ) : (
                    <OverviewPane stats={stats.data} activity={profile.activity} today={profile.today} />
                )}
            </div>

            {profile.is_owner && <EditProfile isOpen={isEditOpen} onClose={closeEdit} />}
        </PageShell>
    );
};

/** The avatar as a tilted polaroid that straightens and lifts on hover. */
const Polaroid = ({ src }: { src: string | null }) => {
    return (
        <div
            className={cn(
                "relative flex-none pt-2.25 px-2.25 pb-8 rounded-lg -rotate-2",
                "border-2 border-[#1A1418] bg-[#FFFDFA] shadow-[4px_5px_0_var(--ctl-off)]",
                "transition-[translate,rotate] duration-400 ease-(--ease-settle) transform-gpu hover:-translate-y-0.75 hover:rotate-0",
            )}
        >
            {src
                ? <img draggable={false} src={src} alt="Avatar" className="block size-37.5 rounded-sm border-2 border-[#1A1418] object-cover" />
                : <div className="size-37.5 rounded-sm border-2 border-[#1A1418] bg-[#FFE3F1]" />}

            <span className="absolute inset-x-0 bottom-1.25 font-caveat font-bold text-[19px] text-center text-[#6B5F66]">~ KpopIt ID ~</span>
        </div>
    );
};

const IdolXpButton = ({ hero, isOwner }: { hero: ProfileHeroXp; isOwner: boolean }) => {
    const current = hero.current;
    const progress = current && current.next_level_xp
        ? (current.xp - current.level_xp) / (current.next_level_xp - current.level_xp)
        : current ? 1 : 0;
    const label = current ? `${current.artist_name} · Lv ${current.level}` : "No idol yet";
    const ariaLabel = `Idol XP: ${current ? `${current.artist_name}, level ${current.level}` : "no idol picked"}${isOwner ? ". Change idol" : ""}`;

    return (
        <Link to="/idol-xp" aria-label={ariaLabel} className={IDOL_XP_BUTTON}>
            <span
                aria-hidden
                className={cn(
                    "relative box-border flex-none w-7 h-7.5 overflow-hidden rounded-[9px_9px_11px_11px] origin-[50%_90%]",
                    "border-2 border-[#1A1418] bg-[#FFFDFA]",
                    "group-hover/xp:animate-[profileJarWobble_.8s_var(--ease-pop)_both]",
                )}
            >
                <span
                    className={cn(
                        "absolute inset-x-0 bottom-0 h-[58%] origin-bottom border-t-2 border-[#1A1418] bg-[#FF8AC4]",
                        "transition-[scale] duration-600 ease-[cubic-bezier(.34,1.4,.64,1)] group-hover/xp:scale-y-125",
                    )}
                />
                <span className="profile-bubble absolute left-1.5 bottom-1 size-1 rounded-[9px] bg-[#FFFDFA]" />
                <span className="profile-bubble absolute left-3.5 bottom-0.75 size-0.75 rounded-[9px] bg-[#FFFDFA] [animation-delay:1.1s]" />
            </span>

            <span className="flex flex-col gap-1.25">
                <span className="flex items-baseline gap-1.75 font-bold text-[15px] leading-none">
                    Idol XP
                    <span className="font-semibold text-xs text-(--muted)">{label}</span>
                </span>

                <span className="box-border w-30 h-1.75 overflow-hidden rounded-full border-[1.5px] border-(--ink) bg-(--panel)">
                    <span
                        className="block h-full origin-left bg-neon-pink transition-[scale] duration-700 ease-(--ease-settle) group-hover/xp:scale-x-112"
                        style={{ width: `${Math.round(Math.min(1, progress) * 100)}%` }}
                    />
                </span>
            </span>
        </Link>
    );
};

const EmailBanner = () => {
    const { user } = useAuth();
    const [isDismissed, setIsDismissed] = useState(() => sessionStorage.getItem(BANNER_DISMISS_KEY) === "true");
    const resend = useMutation({ mutationFn: sendVerificationEmail });

    if (isDismissed || !user?.user_credentials.email || user.profile.email_verified) return null;
    const isSent = resend.isSuccess;

    return (
        <div
            role="status"
            className={cn(
                "pp-enter [--pp-anim:puffDrop] flex flex-wrap @max-[581px]:flex-nowrap items-center @max-[581px]:items-start gap-3.5 p-3",
                "rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[4px_4px_0_0_#FF8AC4,4px_4px_0_2px_var(--ink)]",
            )}
        >
            <span aria-hidden className="box-border grid place-items-center flex-none size-11 rounded-[14px] -rotate-4 border-2 border-[#1A1418] bg-[#FF8AC4] shadow-(--in-pink)">
                <Mail size={20} strokeWidth={2.4} fill="#FFFDFA" color="#1A1418" />
            </span>

            <span className="flex flex-col flex-1 gap-0.5 min-w-50 @max-[581px]:min-w-0">
                <span className="font-bold text-[15px] leading-[1.3]">{isSent ? "Email sent!" : "Verify your email..."}</span>
                <span className="font-medium text-[13px] leading-[1.4] text-(--muted)">
                    {isSent ? "Check your inbox and tap the link." : "Your email isn't verified yet. Verify it to keep your streaks safe."}
                </span>
            </span>

            {!isSent && (
                <PressButton
                    variant="pink"
                    disabled={resend.isPending}
                    onClick={() => resend.mutate()}
                    className="@max-[581px]:hidden flex-none h-10 px-4 bg-neon-pink [--ctl-off:var(--ink)]"
                >
                    Resend email
                </PressButton>
            )}

            <PressButton
                aria-label="Dismiss"
                className="flex-none size-10 p-0"
                onClick={() => {
                    sessionStorage.setItem(BANNER_DISMISS_KEY, "true");
                    setIsDismissed(true);
                }}
            >
                <X size={14} strokeWidth={3} />
            </PressButton>
        </div>
    );
};

export default Profile;
