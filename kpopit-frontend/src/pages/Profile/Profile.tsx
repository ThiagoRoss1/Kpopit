import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
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

export default function Profile() {
    const { username = "" } = useParams();
    const hydrated = useHydrated();
    const { isLoading: authLoading, user } = useAuth();
    // The viewer decides what the server sends (owner view, anti-spoiler), so it is part of every key.
    const viewerKey = user ? String(user.user_credentials.user_id) : "anon";
    const profile = useQuery({
        queryKey: ["publicProfile", username.toLowerCase(), viewerKey],
        queryFn: () => getPublicProfile(username),
        enabled: hydrated && !authLoading,
        retry: (count, error) => !(isAxiosError(error) && error.response?.status === 404) && count < 2,
    });
    const navigate = useNavigate();
    const canonical = profile.data?.username;
    useEffect(() => {
        // An old username (held 15 days) answers with the account's current one.
        if (canonical && canonical !== username) navigate(`/profile/${canonical}${window.location.search}`, { replace: true });
    }, [canonical, username, navigate]);

    if (isAxiosError(profile.error) && profile.error.response?.status === 404) return <NotFound />;
    if (!hydrated || authLoading || !profile.data) return <PageLoader error={profile.isError} onRetry={() => profile.refetch()} />;
    if (profile.data.is_private) return <PrivateProfile username={profile.data.username} />;
    return <ProfileView profile={profile.data} viewerKey={viewerKey} />;
}

function ProfileMeta({ username, name }: { username: string; name: string }) {
    return (
        <PageMeta
            title={`${name} (@${username}) · KpopIt`}
            description={`${name}'s KpopIt profile: streaks, stats and the K-pop idols they guess the most.`}
            path={`/profile/${username}`}
            noindex
        />
    );
}

function PrivateProfile({ username }: { username: string }) {
    return (
        <PageShell width="max-w-[1040px]">
            <ProfileMeta username={username} name={username} />
            <div className="pp-enter mt-16 mx-auto max-w-[460px] flex flex-col items-center gap-4 text-center rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) [box-shadow:var(--card-depth)] py-9 px-7">
                <span className="w-14 h-14 rounded-2xl border-2 border-[#1A1418] bg-[#FF8AC4] grid place-items-center [box-shadow:var(--in-pink)] -rotate-[4deg]">
                    <Lock size={24} strokeWidth={2.6} color="#1A1418" />
                </span>
                <h1 className="m-0 font-bold text-2xl">This profile is private</h1>
                <p className="m-0 font-medium text-[15px] text-(--muted)">@{username} keeps their stats to themselves.</p>
                <PressLink to="/" variant="cta" size="lg" className="[--ctl-off:var(--ink)]">Play today's game</PressLink>
            </div>
        </PageShell>
    );
}

function ProfileView({ profile, viewerKey }: { profile: VisibleProfile; viewerKey: string }) {
    const { features } = useFeatures();
    const { user } = useAuth();
    // The owner sees a lock on History while visitors can't see it.
    const historyHidden = profile.is_owner && user?.profile.visibility?.show_match_history === false;
    const [params, setParams] = useSearchParams();
    const asked = parseTab(params.get("tab"));
    const tabs = TABS.filter((t) => t.id !== "history" || profile.history_visible);
    const tab: ProfileTab = tabs.some((t) => t.id === asked) ? asked : "overview";
    const [filter, setFilter] = useState<ModeFilter>("all");
    const [editOpen, setEditOpen] = useState(false);
    const queryClient = useQueryClient();
    const closeEdit = () => {
        setEditOpen(false);
        // Name, avatar, username or privacy may have changed.
        void queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
    };
    const stats = useQuery({
        queryKey: ["profileStats", profile.username.toLowerCase(), viewerKey],
        queryFn: () => getProfileStats(profile.username),
    });
    const name = profile.display_name ?? profile.username;

    const setTab = (next: ProfileTab) => setParams((p) => {
        if (next === "overview") p.delete("tab");
        else p.set("tab", next);
        return p;
    }, { replace: true, preventScrollReset: true });

    return (
        <PageShell width="max-w-[1040px]" className="up-root">
            <ProfileMeta username={profile.username} name={name} />
            <div className="flex flex-col gap-7 pt-[18px] @container">
                {profile.is_owner && <EmailBanner />}
                <header className="pp-enter [--pp-anim:puffSide] [--pp-delay:80ms] flex items-center gap-[34px] @max-[640px]:flex-col @max-[640px]:text-center @max-[640px]:gap-[18px]">
                    <Polaroid src={resolveAvatarUrl(profile.avatar_url)} />
                    <div className="flex flex-col gap-3 min-w-0">
                        <PuffTitle className="text-[56px] leading-[1.02] origin-left pb-2 @max-[640px]:origin-center @max-[580px]:text-[42px] truncate">{name}</PuffTitle>
                        <div className="flex gap-2 flex-wrap items-center font-medium text-sm text-(--muted) @max-[640px]:justify-center">
                            <span className="text-(--text) font-bold">@{profile.username}</span>
                            {profile.member_since && <><span>·</span><span>{formatJoined(profile.member_since)}</span></>}
                        </div>
                        <div className="flex gap-3 flex-wrap items-center mt-1.5 @max-[640px]:justify-center">
                            {features.idol_xp && profile.idol_xp && <IdolXpButton hero={profile.idol_xp} owner={profile.is_owner} />}
                            {profile.is_owner && (
                                <PressButton className="h-11 pl-[13px] pr-4 text-sm font-semibold" onClick={() => setEditOpen(true)}>
                                    <Pencil size={15} strokeWidth={2.6} />Edit profile
                                </PressButton>
                            )}
                        </div>
                    </div>
                </header>

                <div className="sticky top-[70px] max-[760px]:top-[64px] z-15 flex justify-center">
                    <div role="tablist" aria-label="Profile sections" className="flex gap-1 p-[5px] box-border rounded-full border-2 border-(--ink) bg-(--menu-bg) [box-shadow:3px_4px_0_var(--ctl-off),var(--in)] @max-[580px]:w-full">
                        {tabs.map(({ id, label }) => {
                            const on = tab === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={on}
                                    onClick={() => setTab(id)}
                                    className={cn(
                                        "up-tab pp-focus flex-none min-w-[124px] h-10 box-border px-[18px] flex items-center justify-center gap-[7px] rounded-full border-2 font-bold text-sm cursor-pointer",
                                        "@max-[580px]:flex-1 @max-[580px]:min-w-0 @max-[580px]:px-2",
                                        on ? "border-(--ink) bg-(--side) text-[#1A1418] [box-shadow:var(--in-pink)]" : "border-transparent bg-transparent text-(--chip-ink)",
                                    )}
                                >
                                    {label}
                                    {id === "history" && historyHidden && (
                                        <Lock size={12} strokeWidth={3} className="opacity-70" aria-label="Hidden from visitors" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
                {tab !== "overview" && (
                    <div role="group" aria-label="Mode" className="flex justify-center gap-2 flex-wrap -mt-2.5">
                        {(["all", ...MODES.map((m) => m.id)] as ModeFilter[]).map((id) => (
                            <Pill key={id} active={filter === id} onClick={() => setFilter(id)} className={cn("h-9 pl-2.5 pr-3.5 text-[13px] gap-2", filter === id && "[--pp-in:var(--in-pink)]")}>
                                <ModeDot color={MODES.find((m) => m.id === id)?.color ?? "var(--chip)"} />
                                {id === "all" ? "All modes" : MODES.find((m) => m.id === id)!.name}
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
                        hiddenFromVisitors={historyHidden}
                        today={profile.today}
                    />
                ) : !stats.data ? (
                    <p className="m-0 py-10 text-center font-medium text-sm text-(--muted)" role={stats.isError ? "alert" : "status"}>
                        {stats.isError ? "Couldn't load the stats." : "Loading stats..."}
                    </p>
                ) : tab === "stats" ? (
                    <StatsPane key={filter} stats={stats.data} filter={filter} />
                ) : (
                    <OverviewPane stats={stats.data} activity={profile.activity} today={profile.today} />
                )}
            </div>
            {profile.is_owner && <EditProfile isOpen={editOpen} onClose={closeEdit} />}
        </PageShell>
    );
}

function Polaroid({ src }: { src: string | null }) {
    return (
        <div className="up-photo relative flex-none pt-[9px] px-[9px] pb-8 bg-[#FFFDFA] border-2 border-[#1A1418] rounded-lg [box-shadow:4px_5px_0_var(--ctl-off)]">
            {src ? (
                <img src={src} alt="Avatar" className="block w-[150px] h-[150px] object-cover border-2 border-[#1A1418] rounded-[4px]" />
            ) : (
                <div className="w-[150px] h-[150px] border-2 border-[#1A1418] rounded-[4px] bg-[#FFE3F1]" />
            )}
            <span className="absolute inset-x-0 bottom-[5px] text-center font-caveat font-bold text-[19px] text-[#6B5F66]">~ KpopIt ID ~</span>
        </div>
    );
}

function IdolXpButton({ hero, owner }: { hero: ProfileHeroXp; owner: boolean }) {
    const current = hero.current;
    const progress = current && current.next_level_xp
        ? (current.xp - current.level_xp) / (current.next_level_xp - current.level_xp)
        : current ? 1 : 0;
    const label = current ? `${current.artist_name} · Lv ${current.level}` : "No idol yet";
    return (
        <PressLink
            to="/idol-xp"
            variant="chip"
            aria-label={`Idol XP: ${current ? `${current.artist_name}, level ${current.level}` : "no idol picked"}${owner ? ". Change idol" : ""}`}
            className="up-xp h-[52px] box-border pl-2.5 pr-4 gap-[11px] text-left"
        >
            <span aria-hidden className="up-jar relative flex-none w-7 h-[30px] box-border rounded-[9px_9px_11px_11px] border-2 border-[#1A1418] bg-[#FFFDFA] overflow-hidden">
                <span className="up-liquid absolute inset-x-0 bottom-0 h-[58%] bg-[#FF8AC4] border-t-2 border-[#1A1418]" />
                <span className="up-bubble absolute left-1.5 bottom-1 w-1 h-1 rounded-[9px] bg-[#FFFDFA]" />
                <span className="up-bubble absolute left-3.5 bottom-[3px] w-[3px] h-[3px] rounded-[9px] bg-[#FFFDFA] [animation-delay:1.1s]" />
            </span>
            <span className="flex flex-col gap-[5px]">
                <span className="flex items-baseline gap-[7px] font-bold text-[15px] leading-none">
                    Idol XP<span className="font-semibold text-xs text-(--muted)">{label}</span>
                </span>
                <span className="w-[120px] h-[7px] box-border rounded-full border-[1.5px] border-(--ink) bg-(--panel) overflow-hidden">
                    <span className="up-fill block h-full bg-[#FF3399]" style={{ width: `${Math.round(Math.min(1, progress) * 100)}%` }} />
                </span>
            </span>
        </PressLink>
    );
}

function EmailBanner() {
    const { user } = useAuth();
    const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(BANNER_DISMISS_KEY) === "true");
    const resend = useMutation({ mutationFn: sendVerificationEmail });
    if (dismissed || !user?.user_credentials.email || user.profile.email_verified) return null;
    const sent = resend.isSuccess;
    return (
        <div role="status" className="pp-enter [--pp-anim:puffDrop] flex items-center gap-3.5 flex-wrap p-3 rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) [box-shadow:4px_4px_0_0_#FF8AC4,4px_4px_0_2px_var(--ink)] @max-[580px]:items-start @max-[580px]:flex-nowrap">
            <span aria-hidden className="flex-none w-11 h-11 box-border rounded-[14px] border-2 border-[#1A1418] bg-[#FF8AC4] grid place-items-center [box-shadow:var(--in-pink)] -rotate-[4deg]">
                <Mail size={20} strokeWidth={2.4} fill="#FFFDFA" color="#1A1418" />
            </span>
            <span className="flex-1 min-w-[200px] flex flex-col gap-0.5 @max-[580px]:min-w-0">
                <span className="font-bold text-[15px] leading-[1.3]">{sent ? "Email sent!" : "Verify your email..."}</span>
                <span className="font-medium text-[13px] leading-[1.4] text-(--muted)">
                    {sent ? "Check your inbox and tap the link." : "Your email isn't verified yet. Verify it to keep your streaks safe."}
                </span>
            </span>
            {!sent && (
                <PressButton variant="pink" disabled={resend.isPending} onClick={() => resend.mutate()} className="flex-none h-10 px-4 bg-[#FF3399] [--ctl-off:var(--ink)] @max-[580px]:hidden">
                    Resend email
                </PressButton>
            )}
            <PressButton
                aria-label="Dismiss"
                className="flex-none w-10 h-10 p-0"
                onClick={() => {
                    sessionStorage.setItem(BANNER_DISMISS_KEY, "true");
                    setDismissed(true);
                }}
            >
                <X size={14} strokeWidth={3} />
            </PressButton>
        </div>
    );
}
