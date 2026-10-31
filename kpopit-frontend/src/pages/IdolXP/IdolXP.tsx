import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpDown, Search, Star, X } from "lucide-react";
import PageShell from "../../components/Puff/PageShell";
import PuffCard from "../../components/Puff/PuffCard";
import { PressButton, Pill } from "../../components/Puff/PressButton";
import { useToast } from "../../components/Puff/Toast";
import PageLoader from "../../components/Loading/PageLoader";
import PageMeta from "../../components/Seo/PageMeta";
import { useAuth } from "../../hooks/useAuth";
import { useHydrated } from "../../hooks/useHydrated";
import { useSharedGameData } from "../../hooks/useSharedGameData";
import { getIdolXpState, pourPotion, selectXpIdol } from "../../services/api";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { cn } from "../../lib/utils";
import type { IdolXpState } from "../../interfaces/playerInterfaces";
import PotionJar from "./PotionJar";
import {
    FILTERS, LIST_LIMIT, MAX_LEVEL, RULES, buildIdols, levelOf, readFavourites, saveFavourites,
    type XpFilter, type XpIdol,
} from "./xpData";
import "./idolXp.css";

const LABEL = "font-semibold text-[11px] tracking-[.14em]";
const CARD_SHADOW = "[box-shadow:2px_3px_0_var(--ctl-off),var(--in)]";
const PICKED_SHADOW = "[box-shadow:4px_5px_0_0_#FF8AC4,4px_5px_0_2px_var(--ink),var(--in)]";
const imageOf = (idol: Pick<XpIdol, "imagePath" | "imageVersion">) => resolveCdnUrl(idol.imagePath, idol.imageVersion) ?? "";

export default function IdolXP() {
    const hydrated = useHydrated();
    const { isAuthenticated, isLoading, user } = useAuth();
    const { allIdolsData, isInitialized } = useSharedGameData();
    const member = isAuthenticated;
    const stateKey = ["idolXpState", member ? user?.user_credentials.user_id : "guest"];
    const state = useQuery({
        queryKey: stateKey,
        queryFn: () => getIdolXpState(!member),
        enabled: hydrated && !isLoading && (member || isInitialized),
    });
    const ready = hydrated && !isLoading && state.data && (!member || allIdolsData);

    return (
        <PageShell
            width="max-w-[1080px]"
            header={{
                title: "Idol XP",
                korean: "아이돌 레벨",
                subtitle: member ? "Pick who your wins level up..." : "Every game you finish fills your potion. Sign up to level up an idol.",
            }}
        >
            <PageMeta
                title="Idol XP · KpopIt"
                description="Level up your favourite K-pop idols with the games you finish on KpopIt."
                path="/idol-xp"
                noindex
            />
            {!ready ? (
                <PageLoader error={state.isError} onRetry={() => state.refetch()} />
            ) : member ? (
                <MemberView state={state.data as IdolXpState} stateKey={stateKey} idols={allIdolsData ?? []} username={user?.user_credentials.username ?? ""} />
            ) : (
                <GuestView potion={state.data!.potion} />
            )}
        </PageShell>
    );
}

function useFilled() {
    // Bars and the jar grow in shortly after the page appears.
    const [filled, setFilled] = useState(false);
    useEffect(() => {
        const timer = window.setTimeout(() => setFilled(true), 500);
        return () => clearTimeout(timer);
    }, []);
    return filled;
}

function GuestView({ potion }: { potion: IdolXpState["potion"] }) {
    const navigate = useNavigate();
    const filled = useFilled();
    return (
        <div className="mt-[34px] flex flex-col gap-[26px]">
            <PuffCard className="pp-enter [--pp-delay:140ms] grid grid-cols-[240px_minmax(0,1fr)] gap-9 items-center px-10 py-[34px] @max-[760px]:grid-cols-1 @max-[760px]:gap-6 @max-[760px]:px-5 @max-[760px]:py-6">
                <div className="flex flex-col items-center gap-4">
                    <PotionJar fill={filled ? potion.xp / potion.cap : 0} className="block w-[130px] h-auto" />
                    <span className="px-3 py-[5px] rounded-full border-2 border-[#1A1418] bg-[#FFE3F1] text-[#1A1418] font-bold text-[13px] [box-shadow:2px_3px_0_#1A1418] -rotate-2">
                        {potion.xp} / {potion.cap} XP
                    </span>
                </div>
                <div className="flex flex-col gap-3 items-start @max-[760px]:items-center @max-[760px]:text-center">
                    <span className={cn(LABEL, "text-(--group)")}>YOUR POTION</span>
                    <h2 className="m-0 font-bold text-[30px] leading-[1.15] text-balance">Your potion is filling up...</h2>
                    <p className="m-0 text-[15.5px] leading-[1.6] text-(--muted) text-pretty">
                        Every game you finish adds XP to it, even as a guest. Create an account to pick an idol and pour your potion into them.
                    </p>
                    <div className="flex gap-2.5 flex-wrap mt-1">
                        <PressButton variant="cta" className="h-[46px] px-[22px] text-[15px] tracking-[.01em] [--ctl-off:var(--ink)]" onClick={() => navigate("/register")}>
                            Create account
                        </PressButton>
                        <PressButton className="h-[46px] px-5 text-[15px]" onClick={() => navigate("/login")}>Log in</PressButton>
                    </div>
                    <span className="font-medium text-[13px] text-(--muted)">Your potion comes with you when you sign up.</span>
                </div>
            </PuffCard>
            <RulesRow />
        </div>
    );
}

function RulesRow() {
    return (
        <div className="pp-enter [--pp-delay:200ms] flex gap-2 flex-wrap justify-center @max-[580px]:hidden">
            {RULES.map((rule) => (
                <span key={rule.label} className="flex items-center gap-2 py-1.5 pr-3 pl-1.5 rounded-full border-2 border-dashed border-(--rule) font-medium text-[13px] text-(--muted)">
                    <RuleValue>{rule.value}</RuleValue>
                    {rule.label}
                </span>
            ))}
        </div>
    );
}

function RuleValue({ children, big }: { children: string; big?: boolean }) {
    return (
        <span className={cn("rounded-full border-[1.5px] border-[#1A1418] bg-[#FFE3F1] text-[#1A1418] font-bold", big ? "px-[9px] py-[3px] text-xs" : "px-2 py-[3px] text-[11px]")}>
            {children}
        </span>
    );
}

/** ≤580px the rules hide behind this button; its popover closes on Escape or a click outside. */
function HowXpWorks() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
        const onDown = (e: Event) => !ref.current?.contains(e.target as Node) && setOpen(false);
        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onDown);
        document.addEventListener("touchstart", onDown);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("touchstart", onDown);
        };
    }, [open]);
    return (
        <div ref={ref} className="hidden @max-[580px]:flex relative z-40 self-center flex-col items-center">
            <PressButton className="h-10 pl-3 pr-4 text-[13px] gap-2" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                <span className="w-5 h-5 rounded-full border-[1.5px] border-[#1A1418] bg-[#FFE3F1] text-[#1A1418] grid place-items-center font-bold text-xs leading-none">?</span>
                How XP works
            </PressButton>
            {open && (
                <div role="dialog" aria-label="How XP works" className="xp-pop absolute top-[calc(100%+12px)] left-1/2 -ml-40 w-80 box-border rounded-[23px] border-2 border-(--ink) bg-(--menu-bg) text-(--chip-ink) [box-shadow:var(--card-depth)] p-4 flex flex-col gap-3 origin-top">
                    <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-lg">How XP works</span>
                        <PressButton aria-label="Close" className="w-9 h-9 p-0" onClick={() => setOpen(false)}><X size={14} strokeWidth={3} /></PressButton>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {RULES.map((rule) => (
                            <div key={rule.label} className="flex items-center justify-between gap-3 py-[9px] px-3 rounded-[14px] border-2 border-(--ink) bg-(--chip) font-semibold text-[13px]">
                                {rule.label}
                                <RuleValue big>{rule.value}</RuleValue>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function MemberView({ state, stateKey, idols: list, username }: {
    state: IdolXpState;
    stateKey: unknown[];
    idols: Parameters<typeof buildIdols>[0];
    username: string;
}) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const filled = useFilled();
    const [pending, setPending] = useState<number | null>(null);
    const [filter, setFilter] = useState<XpFilter>("All");
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<"level" | "az">("level");
    const [favourites, setFavourites] = useState<number[]>(readFavourites);
    const [extra, setExtra] = useState(0);
    const [levelUp, setLevelUp] = useState(0);

    const all = useMemo(() => buildIdols(list, state), [list, state]);
    const current = state.current ? all.find((i) => i.id === state.current!.idol_id) ?? null : null;
    const potion = state.potion;

    const select = useMutation({
        mutationFn: (id: number) => selectXpIdol(id),
        onSuccess: (_, id) => {
            setPending(null);
            queryClient.invalidateQueries({ queryKey: ["idolXpState"] });
            queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
            toast.show(`Now leveling ${all.find((i) => i.id === id)?.name ?? "your idol"}.`);
        },
        onError: () => toast.show("Couldn't switch idol. Try again."),
    });
    const pour = useMutation({
        mutationFn: (id: number) => pourPotion(id),
        onSuccess: (result) => {
            const before = current?.level ?? 0;
            const after = levelOf(Math.min(300, result.idols.find((i) => i.idol_id === result.poured.idol_id)?.xp ?? 0)).level;
            queryClient.setQueryData(stateKey, result);
            queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
            if (after > before) setLevelUp(Date.now());
            toast.show(`+${result.poured.amount} XP to ${current?.name ?? "your idol"}${after > before ? ". Level up!" : ""}`);
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: ["idolXpState"] });
            toast.show("Nothing poured. Try again.");
        },
    });
    useEffect(() => {
        if (!levelUp) return;
        const timer = window.setTimeout(() => setLevelUp(0), 2400);
        return () => clearTimeout(timer);
    }, [levelUp]);

    const q = query.trim().toLowerCase();
    const isFavourite = (id: number) => favourites.includes(id);
    const sorted = all
        .filter(FILTERS[filter])
        .filter((i) => !q || `${i.name} ${i.group}`.toLowerCase().includes(q))
        .sort((a, b) => Number(isFavourite(b.id)) - Number(isFavourite(a.id))
            || (sort === "az" ? 0 : b.xp - a.xp)
            || a.name.localeCompare(b.name));
    const limited = filter === "All" && !q;
    const cap = LIST_LIMIT + extra;
    const shown = limited ? sorted.slice(0, cap) : sorted;
    const pendingIdol = pending === null ? null : all.find((i) => i.id === pending) ?? null;

    const toggleFavourite = (e: MouseEvent, id: number) => {
        e.stopPropagation();
        setFavourites((favs) => {
            const next = favs.includes(id) ? favs.filter((f) => f !== id) : [id, ...favs];
            saveFavourites(next);
            return next;
        });
    };
    const pick = (idol: XpIdol) => setPending(idol.id === current?.id || idol.id === pending ? null : idol.id);

    const canPour = !!current && potion.xp > 0 && !current.max && !pour.isPending;
    const pourLabel = !current ? "Pick an idol first" : current.max ? `${current.name} is maxed` : potion.xp ? `Pour into ${current.name}` : "Potion is empty";

    return (
        <div className="mt-[34px] flex flex-col gap-[26px]">
            {username && (
                <Link
                    to={`/profile/${username}`}
                    data-hover="chip"
                    className="pp-press pp-focus self-start -mt-[18px] h-[38px] pl-2.5 pr-3.5 flex items-center gap-2 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) no-underline font-bold text-[13px]"
                >
                    <ArrowLeft size={15} strokeWidth={3} />Back to profile
                </Link>
            )}

            <div className="pp-enter [--pp-delay:140ms] grid grid-cols-[minmax(0,1fr)_300px] gap-[22px] @max-[900px]:grid-cols-1">
                <PuffCard className="relative p-[22px] flex flex-col gap-4">
                    <div className="flex items-center gap-5 @max-[580px]:gap-4">
                        <div className="relative flex-none w-[130px] -rotate-2 @max-[580px]:w-[92px]">
                            {current ? (
                                <img src={imageOf(current)} alt={current.name} className="block w-[130px] h-[130px] object-cover rounded-[18px] border-[2.5px] border-[#1A1418] [box-shadow:4px_5px_0_#1A1418] @max-[580px]:w-[92px] @max-[580px]:h-[92px]" />
                            ) : (
                                <div className="w-[130px] h-[130px] rounded-[18px] border-[2.5px] border-dashed border-(--rule) bg-(--panel) @max-[580px]:w-[92px] @max-[580px]:h-[92px]" />
                            )}
                            {current && <LevelBadge idol={current} className="absolute -right-3 -bottom-2.5 px-2.5 py-1 text-[13px] [box-shadow:2px_3px_0_#1A1418] -rotate-3" />}
                            {levelUp > 0 && (
                                <span key={levelUp} className="xp-levelup absolute -left-3.5 -top-3.5 px-[11px] py-[5px] rounded-full border-2 border-[#1A1418] bg-[#FF70B8] text-white [text-shadow:var(--tag-text)] font-bold text-xs [box-shadow:2px_3px_0_#1A1418]">
                                    LEVEL UP!
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <span className={cn(LABEL, "text-(--group)")}>{current ? "LEVELING NOW" : "NO IDOL PICKED"}</span>
                            <span className="font-bold text-[40px] leading-none text-white [text-shadow:var(--puff-value)] pt-0.5 pb-1.5 truncate @max-[580px]:text-[30px]">
                                {current?.name ?? "Pick one below"}
                            </span>
                            <span className="font-semibold text-sm text-(--group)">{current?.group ?? "Your finished games fill the potion meanwhile."}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between font-bold text-[13px]">
                            <span>{current ? (current.max ? "300 / 300 XP" : `${current.xp} / ${current.next} XP`) : "0 XP"}</span>
                            <span className="text-(--muted)">
                                {current ? (current.max ? "Maxed! Keeps 40% of new XP" : `${current.next - current.xp} XP to level ${current.level + 1}`) : ""}
                            </span>
                        </div>
                        <div className="relative h-4 rounded-full border-2 border-(--ink) bg-(--panel) overflow-hidden">
                            <div className="xp-bar absolute inset-0 bg-[#FF8AC4]" style={{ transform: `scaleX(${filled && current ? current.progress : 0})` }} />
                            <div aria-hidden className="xp-shine absolute inset-y-0 w-[30%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)]" />
                        </div>
                        <div aria-label="Levels" className="grid grid-cols-10 gap-1">
                            {Array.from({ length: MAX_LEVEL }, (_, n) => (
                                <span key={n} className={cn("h-[22px] rounded-[7px] border-2 border-(--ink) text-[#1A1418] grid place-items-center font-bold text-[10px]", current && n < current.level ? "bg-[#FF8AC4]" : "bg-(--chip) text-(--chip-ink)")}>
                                    {n + 1}
                                </span>
                            ))}
                        </div>
                    </div>
                </PuffCard>

                <div className="rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) [box-shadow:3px_4px_0_var(--ctl-off),var(--in)] px-5 py-[18px] flex flex-col items-center gap-3 text-center @max-[580px]:grid @max-[580px]:grid-cols-[64px_minmax(0,1fr)] @max-[580px]:items-center @max-[580px]:text-left @max-[580px]:gap-x-3.5">
                    <span className={cn(LABEL, "self-stretch flex justify-between text-(--muted) @max-[580px]:col-span-full")}>
                        POTION<span className="text-(--group)">{potion.xp} / {potion.cap}</span>
                    </span>
                    <PotionJar fill={filled ? potion.xp / potion.cap : 0} className="block w-[84px] h-auto @max-[580px]:w-16" />
                    <span className="font-medium text-[13px] leading-[1.45] text-(--muted) text-pretty">XP from games with no idol picked. Pour it into anyone.</span>
                    <PressButton
                        variant="cta"
                        disabled={!canPour}
                        onClick={() => current && pour.mutate(current.id)}
                        className="h-11 px-[18px] text-sm tracking-[.01em] [--ctl-off:var(--ink)] @max-[580px]:col-span-full @max-[580px]:w-full"
                    >
                        {pourLabel}
                    </PressButton>
                </div>
            </div>

            <HowXpWorks />
            <RulesRow />

            <div className="flex items-center justify-between gap-3 flex-wrap @max-[580px]:flex-col @max-[580px]:items-stretch">
                <div role="group" aria-label="Filter idols" className="flex gap-2 flex-wrap min-w-0 @max-[580px]:grid @max-[580px]:grid-cols-2">
                    {(Object.keys(FILTERS) as XpFilter[]).map((name) => (
                        <Pill
                            key={name}
                            active={filter === name}
                            onClick={() => setFilter(name)}
                            className={cn("h-[38px] pl-3.5 pr-[7px] text-[13px] gap-2 @max-[580px]:justify-between @max-[580px]:w-full", filter === name && "[--pp-in:var(--in-pink)]")}
                        >
                            {name}
                            <span className="min-w-[22px] h-5 px-1.5 box-border rounded-full grid place-items-center bg-white text-[#1A1418] border-[1.5px] border-[#1A1418] font-bold text-[10px] leading-none">
                                {all.filter(FILTERS[name]).length}
                            </span>
                        </Pill>
                    ))}
                </div>
                <div className="flex items-center gap-2.5 @max-[580px]:w-full">
                    <PressButton
                        onClick={() => setSort((s) => (s === "az" ? "level" : "az"))}
                        aria-label={`Sort: ${sort === "az" ? "A to Z" : "by level"}. Tap to change.`}
                        className="flex-none h-11 pl-3 pr-3.5 gap-[7px] rounded-[14px] text-[13px] @max-[580px]:pl-2.5 @max-[580px]:pr-3 @max-[580px]:gap-[5px]"
                    >
                        <ArrowUpDown size={16} strokeWidth={2.8} />
                        <span>{sort === "level" && <span className="@max-[580px]:hidden">By </span>}{sort === "az" ? "A–Z" : "Level"}</span>
                    </PressButton>
                    <label className="xp-search box-border flex-none w-[260px] max-w-full h-11 flex items-center gap-2.5 pl-3.5 pr-1.5 rounded-[14px] bg-(--chip) text-(--chip-ink) border-2 border-(--ink) [box-shadow:3px_4px_0_var(--ctl-off),var(--in)] @max-[580px]:flex-1 @max-[580px]:w-auto @max-[580px]:min-w-0">
                        <Search size={18} strokeWidth={2.6} className="shrink-0" />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Find an idol..."
                            aria-label="Find an idol or group"
                            className="flex-1 min-w-0 h-full m-0 p-0 border-0 outline-none appearance-none bg-transparent text-inherit font-medium text-sm leading-[1.35]"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="w-8 h-8 shrink-0 border-0 bg-transparent text-inherit grid place-items-center cursor-pointer rounded-[10px]">
                                <X size={16} strokeWidth={2.6} />
                            </button>
                        )}
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 @max-[580px]:grid-cols-1 @max-[580px]:gap-[18px]">
                {shown.map((idol, n) => (
                    <XpCard
                        key={idol.id}
                        idol={idol}
                        index={n}
                        isCurrent={idol.id === current?.id}
                        isPending={idol.id === pending}
                        favourite={isFavourite(idol.id)}
                        filled={filled}
                        onPick={() => pick(idol)}
                        onFavourite={(e) => toggleFavourite(e, idol.id)}
                    />
                ))}
            </div>
            {shown.length === 0 && <div className="text-center py-6 font-medium text-sm text-(--muted)">No idols here yet...</div>}
            {limited && sorted.length > cap && (
                <PressButton className="self-center h-[46px] px-[22px] text-sm" onClick={() => setExtra((e) => e + LIST_LIMIT)}>
                    Show more ({sorted.length - cap})
                </PressButton>
            )}

            {pendingIdol && (
                <div className="fixed inset-x-0 bottom-[22px] z-55 flex justify-center px-4 pointer-events-none">
                    <div role="dialog" aria-label="Switch idol" className="xp-pop pointer-events-auto flex items-center gap-3.5 flex-wrap justify-center py-2.5 pr-2.5 pl-3 rounded-full border-2 border-(--ink) bg-(--menu-bg) text-(--chip-ink) [box-shadow:3px_4px_0_var(--ctl-off),var(--in)]">
                        <img src={imageOf(pendingIdol)} alt="" className="w-10 h-10 rounded-full border-2 border-[#1A1418] object-cover" />
                        <span className="flex flex-col">
                            <span className="font-bold text-sm">Level up {pendingIdol.name}?</span>
                            <span className="font-medium text-xs text-(--muted)">XP stays with each idol.</span>
                        </span>
                        <span className="flex gap-1.5">
                            <PressButton className="h-10 px-3.5 text-[13px]" onClick={() => setPending(null)}>Cancel</PressButton>
                            <PressButton
                                variant="pink"
                                disabled={select.isPending}
                                className="h-10 px-4 text-[13px] bg-[#FF3399] [--ctl-off:var(--ink)]"
                                onClick={() => select.mutate(pendingIdol.id)}
                            >
                                Switch
                            </PressButton>
                        </span>
                    </div>
                </div>
            )}
            {toast.node}
        </div>
    );
}

function LevelBadge({ idol, className }: { idol: XpIdol; className?: string }) {
    return (
        <span
            className={cn(
                "rounded-full border-2 border-[#1A1418] font-bold",
                idol.max ? "bg-[#1A1418] text-[#FAF6F0]" : idol.xp ? "bg-[#FFFDFA] text-[#1A1418]" : "bg-[#FFE3F1] text-[#1A1418]",
                className,
            )}
        >
            {idol.max ? "MAX" : `Lv ${idol.level}`}
        </span>
    );
}

function XpCard({ idol, index, isCurrent, isPending, favourite, filled, onPick, onFavourite }: {
    idol: XpIdol;
    index: number;
    isCurrent: boolean;
    isPending: boolean;
    favourite: boolean;
    filled: boolean;
    onPick: () => void;
    onFavourite: (e: MouseEvent) => void;
}) {
    const highlighted = isCurrent || isPending;
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        onPick();
    };
    return (
        <div
            role="button"
            tabIndex={0}
            aria-pressed={isPending}
            aria-label={`${idol.name}, ${idol.max ? "max level" : `level ${idol.level}`}${isCurrent ? ", leveling now" : ""}`}
            onClick={onPick}
            onKeyDown={onKeyDown}
            style={{ ["--xp-tilt" as string]: `${index % 2 ? 0.5 : -0.5}deg`, ["--xp-delay" as string]: `${Math.min(260 + index * 45, 900)}ms` }}
            className={cn(
                "xp-card pp-focus relative text-left p-2.5 rounded-[20px] border-2 border-(--ink) text-(--face-ink) cursor-pointer flex flex-col gap-[9px]",
                "@max-[580px]:grid @max-[580px]:grid-cols-[56px_minmax(0,1fr)] @max-[580px]:items-center @max-[580px]:gap-x-3",
                highlighted ? cn("bg-(--chip-hover)", PICKED_SHADOW) : cn("bg-(--face)", CARD_SHADOW),
            )}
        >
            <div className="relative aspect-square w-full rounded-[14px] border-2 border-[#1A1418] overflow-hidden bg-[#DCD6D2] @max-[580px]:row-span-2 @max-[580px]:w-14">
                <img
                    src={imageOf(idol)}
                    alt=""
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.opacity = "0"; }}
                    className={cn("block w-full h-full object-cover", !idol.xp && "grayscale-[.6]")}
                />
            </div>
            <span className="flex items-center justify-between gap-1.5 min-w-0">
                <span className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-[15px] leading-[1.15] truncate">{idol.name}</span>
                    <span className="font-semibold text-[11px] text-(--group) truncate">{idol.group}</span>
                </span>
                <button
                    type="button"
                    onClick={onFavourite}
                    aria-label={`${favourite ? "Unpin" : "Pin"} ${idol.name}`}
                    aria-pressed={favourite}
                    className="xp-fav pp-focus flex-none w-[30px] h-[30px] p-0 border-0 bg-transparent grid place-items-center cursor-pointer text-(--face-ink)"
                >
                    <Star size={20} strokeWidth={2.2} strokeLinejoin="round" fill={favourite ? "#FF8AC4" : "none"} stroke={favourite ? "#1A1418" : "currentColor"} />
                </button>
                <LevelBadge idol={idol} className="flex-none px-2 py-0.5 text-[11px]" />
            </span>
            <span className="block h-2 rounded-full border-[1.5px] border-(--ink) bg-(--panel) overflow-hidden">
                <span className="xp-bar block h-full bg-[#FF8AC4]" style={{ transform: `scaleX(${filled ? idol.progress : 0})` }} />
            </span>
            {isCurrent && (
                <span className="absolute right-3 -top-[9px] pt-[3px] pb-1 px-2.5 rounded-full border-2 border-[#1A1418] bg-[#FF70B8] text-white [text-shadow:var(--tag-text)] font-bold text-[10px] tracking-[.06em] [box-shadow:inset_0_2px_0_rgba(255,255,255,.55),inset_0_-2px_0_rgba(198,35,104,.3),2px_2.5px_0_#1A1418] rotate-3">
                    NOW
                </span>
            )}
        </div>
    );
}
