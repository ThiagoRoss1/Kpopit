import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpDown, Search, X } from "lucide-react";
import { PressButton, PressLink, Pill } from "../../components/buttons/PressButton";
import { useToast } from "../../components/Toast/Toast";
import { pourPotion, selectXpIdol } from "../../services/api";
import { cn } from "../../lib/utils";
import type { IdolXpState } from "../../interfaces/playerInterfaces";
import PuffCard from "./PuffCard";
import PotionJar from "./PotionJar";
import { HowXpWorks, LevelBadge, RulesRow, XpBar, XpCard } from "./XpParts";
import {
    FILTERS, LIST_LIMIT, MAX_LEVEL, buildIdols, imageOf, levelOf, readFavourites, rememberXp, saveFavourites, xpGained,
    type XpFilter, type XpIdol,
} from "./xpData";
import { useFilled } from "./useFilled";

const LABEL = "font-semibold text-[11px] tracking-[.14em]";

// The search field lifts while focused and its glass tilts.
const SEARCH_FIELD = cn(
    "group/search box-border flex flex-none @max-[581px]:flex-1 items-center gap-2.5 w-65 @max-[581px]:w-auto max-w-full @max-[581px]:min-w-0 h-11 pl-3.5 pr-1.5",
    "rounded-[14px] border-2 border-(--ink) bg-(--chip) text-(--chip-ink) shadow-[3px_4px_0_var(--ctl-off),var(--in)]",
    "transition-[translate,box-shadow] duration-400 ease-[cubic-bezier(.34,1.4,.64,1)] will-change-transform",
    "focus-within:-translate-x-px focus-within:-translate-y-0.5 focus-within:shadow-[5px_6px_0_var(--ctl-off),var(--in)]",
);

interface MemberViewProps {
    state: IdolXpState;
    stateKey: unknown[];
    idols: Parameters<typeof buildIdols>[0];
    username: string;
}

const XpMemberView = ({ state, stateKey, idols: idolList, username }: MemberViewProps) => {
    const queryClient = useQueryClient();
    const toast = useToast();
    const filled = useFilled();
    const [pendingId, setPendingId] = useState<number | null>(null);
    const [filter, setFilter] = useState<XpFilter>("All");
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<"level" | "az">("level");
    const [favourites, setFavourites] = useState<number[]>(readFavourites);
    const [extra, setExtra] = useState(0);
    const [levelUpAt, setLevelUpAt] = useState(0);
    const [shineCount, setShineCount] = useState(0);

    const allIdols = useMemo(() => buildIdols(idolList, state), [idolList, state]);
    const current = state.current ? allIdols.find((idol) => idol.id === state.current!.idol_id) ?? null : null;
    const potion = state.potion;

    const select = useMutation({
        mutationFn: (id: number) => selectXpIdol(id),
        onSuccess: (_, id) => {
            setPendingId(null);
            queryClient.invalidateQueries({ queryKey: ["idolXpState"] });
            queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
            toast.show(`Now leveling ${allIdols.find((idol) => idol.id === id)?.name ?? "your idol"}.`);
        },
        onError: () => toast.show("Couldn't switch idol. Try again."),
    });

    const pour = useMutation({
        mutationFn: (id: number) => pourPotion(id),
        onSuccess: (result) => {
            const levelBefore = current?.level ?? 0;
            const levelAfter = levelOf(Math.min(300, result.idols.find((idol) => idol.idol_id === result.poured.idol_id)?.xp ?? 0)).level;

            queryClient.setQueryData(stateKey, result);
            queryClient.invalidateQueries({ queryKey: ["publicProfile"] });

            if (levelAfter > levelBefore) setLevelUpAt(Date.now());
            toast.show(`+${result.poured.amount} XP to ${current?.name ?? "your idol"}${levelAfter > levelBefore ? ". Level up!" : ""}`);
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: ["idolXpState"] });
            toast.show("Nothing poured. Try again.");
        },
    });

    // The bar shines once when the idol gained XP (a pour, or games since the last visit).
    const currentId = current?.id;
    const currentXp = current?.xp;
    useEffect(() => {
        if (currentId === undefined || currentXp === undefined) return;

        const gained = xpGained(currentId, currentXp);
        const timer = window.setTimeout(() => {
            rememberXp(currentId, currentXp);
            if (gained) setShineCount((count) => count + 1);
        }, 0);

        return () => clearTimeout(timer);
    }, [currentId, currentXp]);

    useEffect(() => {
        if (!levelUpAt) return;
        const timer = window.setTimeout(() => setLevelUpAt(0), 2400);
        return () => clearTimeout(timer);
    }, [levelUpAt]);

    const search = query.trim().toLowerCase();
    const isFavourite = (id: number) => favourites.includes(id);

    // Pinned idols first, then by XP (or A–Z), then by name.
    const sorted = allIdols
        .filter(FILTERS[filter])
        .filter((idol) => !search || `${idol.name} ${idol.group}`.toLowerCase().includes(search))
        .sort((a, b) => Number(isFavourite(b.id)) - Number(isFavourite(a.id))
            || (sort === "az" ? 0 : b.xp - a.xp)
            || a.name.localeCompare(b.name));

    const isLimited = filter === "All" && !search;
    const shownLimit = LIST_LIMIT + extra;
    const shown = isLimited ? sorted.slice(0, shownLimit) : sorted;
    const pendingIdol = pendingId === null ? null : allIdols.find((idol) => idol.id === pendingId) ?? null;

    const toggleFavourite = (event: MouseEvent, id: number) => {
        event.stopPropagation();
        setFavourites((list) => {
            const next = list.includes(id) ? list.filter((favourite) => favourite !== id) : [id, ...list];
            saveFavourites(next);
            return next;
        });
    };

    const pick = (idol: XpIdol) => setPendingId(idol.id === current?.id || idol.id === pendingId ? null : idol.id);

    const canPour = !!current && potion.xp > 0 && !current.max && !pour.isPending;
    let pourLabel = "Potion is empty";
    if (!current) pourLabel = "Pick an idol first";
    else if (current.max) pourLabel = `${current.name} is maxed`;
    else if (potion.xp) pourLabel = `Pour into ${current.name}`;

    return (
        <div className="flex flex-col gap-6.5 mt-8.5">
            {username && (
                <PressLink to={`/profile/${username}`} variant="chip" className="self-start gap-2 h-9.5 -mt-4.5 pl-2.5 pr-3.5 text-[13px]">
                    <ArrowLeft size={15} strokeWidth={3} />
                    Back to profile
                </PressLink>
            )}

            <div className="pp-enter [--pp-delay:140ms] grid grid-cols-[minmax(0,1fr)_300px] @max-[901px]:grid-cols-1 gap-5.5">
                <PuffCard className="relative flex flex-col gap-4 p-5.5">
                    <div className="flex items-center gap-5 @max-[581px]:gap-4">
                        <div className="relative flex-none w-32.5 @max-[581px]:w-23 -rotate-2">
                            {current ? (
                                <img
                                    src={imageOf(current)}
                                    alt={current.name}
                                    className="block size-32.5 @max-[581px]:size-23 rounded-[18px] border-[2.5px] border-[#1A1418] object-cover shadow-[4px_5px_0_#1A1418]"
                                />
                            ) : (
                                <div className="size-32.5 @max-[581px]:size-23 rounded-[18px] border-[2.5px] border-dashed border-(--rule) bg-(--panel)" />
                            )}

                            {current && <LevelBadge idol={current} className="absolute -right-3 -bottom-2.5 px-2.5 py-1 text-[13px] shadow-[2px_3px_0_#1A1418] -rotate-3" />}

                            {levelUpAt > 0 && (
                                <span
                                    key={levelUpAt}
                                    className={cn(
                                        "xp-level-up absolute -left-3.5 -top-3.5 px-2.75 py-1.25 rounded-full",
                                        "border-2 border-[#1A1418] bg-[#FF70B8] shadow-[2px_3px_0_#1A1418]",
                                        "font-bold text-xs text-white text-shadow-(--tag-text)",
                                    )}
                                >
                                    LEVEL UP!
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col flex-1 gap-1.5 min-w-0">
                            <span className={cn(LABEL, "text-(--group)")}>{current ? "LEVELING NOW" : "NO IDOL PICKED"}</span>
                            <span className="puff-ink pb-1.5 font-bold text-[40px] @max-[581px]:text-[30px] leading-none text-white text-shadow-(--puff-value) truncate">
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

                        <div className="relative h-4 overflow-hidden rounded-full border-2 border-(--ink) bg-(--panel)">
                            <XpBar progress={current?.progress ?? 0} filled={filled && !!current} className="absolute inset-0" />

                            {shineCount > 0 && (
                                <div
                                    key={shineCount}
                                    aria-hidden
                                    onAnimationEnd={() => setShineCount(0)}
                                    className="xp-shine absolute inset-y-0 w-[30%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)]"
                                />
                            )}
                        </div>

                        <div aria-label="Levels" className="grid grid-cols-10 gap-1">
                            {Array.from({ length: MAX_LEVEL }, (_, level) => (
                                <span
                                    key={level}
                                    className={cn(
                                        "grid place-items-center h-5.5 rounded-[7px] border-2 border-(--ink) font-bold text-[10px]",
                                        current && level < current.level ? "bg-[#FF8AC4] text-[#1A1418]" : "bg-(--chip) text-(--chip-ink)",
                                    )}
                                >
                                    {level + 1}
                                </span>
                            ))}
                        </div>
                    </div>
                </PuffCard>

                <div
                    className={cn(
                        "flex @max-[581px]:grid flex-col @max-[581px]:grid-cols-[64px_minmax(0,1fr)] items-center gap-3 @max-[581px]:gap-x-3.5",
                        "px-5 py-4.5 text-center @max-[581px]:text-left",
                        "rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[3px_4px_0_var(--ctl-off),var(--in)]",
                    )}
                >
                    <span className={cn(LABEL, "flex justify-between self-stretch @max-[581px]:col-span-full text-(--muted)")}>
                        POTION
                        <span className="text-(--group)">{potion.xp} / {potion.cap}</span>
                    </span>

                    <PotionJar fill={filled ? potion.xp / potion.cap : 0} className="block w-21 @max-[581px]:w-16 h-auto" />

                    <span className="font-medium text-[13px] leading-[1.45] text-(--muted) text-pretty">XP from games with no idol picked. Pour it into anyone.</span>

                    <PressButton
                        variant="cta"
                        disabled={!canPour}
                        onClick={() => current && pour.mutate(current.id)}
                        className="@max-[581px]:col-span-full @max-[581px]:w-full h-11 px-4.5 text-sm tracking-[.01em] [--ctl-off:var(--ink)]"
                    >
                        {pourLabel}
                    </PressButton>
                </div>
            </div>

            <HowXpWorks />
            <RulesRow />

            <div className="flex @max-[581px]:flex-col flex-wrap items-center @max-[581px]:items-stretch justify-between gap-3">
                <div role="group" aria-label="Filter idols" className="flex @max-[581px]:grid flex-wrap @max-[581px]:grid-cols-2 gap-2 min-w-0">
                    {(Object.keys(FILTERS) as XpFilter[]).map((name) => (
                        <Pill
                            key={name}
                            active={filter === name}
                            onClick={() => setFilter(name)}
                            className={cn(
                                "gap-2 @max-[581px]:justify-between @max-[581px]:w-full h-9.5 pl-3.5 pr-1.75 text-[13px]",
                                filter === name && "[--pp-in:var(--in-pink)]",
                            )}
                        >
                            {name}
                            <span
                                className={cn(
                                    "box-border grid place-items-center min-w-5.5 h-5 px-1.5 rounded-full",
                                    "border-[1.5px] border-[#1A1418] bg-white font-bold text-[10px] leading-none text-[#1A1418]",
                                )}
                            >
                                {allIdols.filter(FILTERS[name]).length}
                            </span>
                        </Pill>
                    ))}
                </div>

                <div className="flex items-center gap-2.5 @max-[581px]:w-full">
                    <PressButton
                        onClick={() => setSort((previous) => (previous === "az" ? "level" : "az"))}
                        aria-label={`Sort: ${sort === "az" ? "A to Z" : "by level"}. Tap to change.`}
                        className="flex-none gap-1.75 @max-[581px]:gap-1.25 h-11 pl-3 @max-[581px]:pl-2.5 pr-3.5 @max-[581px]:pr-3 rounded-[14px] text-[13px]"
                    >
                        <ArrowUpDown size={16} strokeWidth={2.8} />
                        <span>
                            {sort === "level" && <span className="@max-[581px]:hidden">By </span>}
                            {sort === "az" ? "A–Z" : "Level"}
                        </span>
                    </PressButton>

                    <label className={SEARCH_FIELD}>
                        <Search
                            size={18}
                            strokeWidth={2.6}
                            className="shrink-0 transition-[rotate,scale] duration-450 ease-(--ease-pop) group-focus-within/search:-rotate-12 group-focus-within/search:scale-110"
                        />

                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Find an idol..."
                            aria-label="Find an idol or group"
                            className={cn(
                                "flex-1 min-w-0 h-full m-0 p-0 border-0 outline-none appearance-none bg-transparent",
                                "font-medium text-sm leading-[1.35] text-inherit",
                                "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
                            )}
                        />

                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery("")}
                                aria-label="Clear search"
                                className="grid place-items-center shrink-0 size-8 rounded-[10px] border-0 bg-transparent text-inherit cursor-pointer"
                            >
                                <X size={16} strokeWidth={2.6} />
                            </button>
                        )}
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] @max-[581px]:grid-cols-1 gap-4 @max-[581px]:gap-4.5">
                {shown.map((idol, index) => (
                    <XpCard
                        key={idol.id}
                        idol={idol}
                        index={index}
                        isCurrent={idol.id === current?.id}
                        isPending={idol.id === pendingId}
                        favourite={isFavourite(idol.id)}
                        filled={filled}
                        onPick={() => pick(idol)}
                        onFavourite={(event) => toggleFavourite(event, idol.id)}
                    />
                ))}
            </div>

            {shown.length === 0 && <div className="py-6 font-medium text-sm text-center text-(--muted)">No idols here yet...</div>}

            {isLimited && sorted.length > shownLimit && (
                <PressButton className="self-center h-11.5 px-5.5 text-sm" onClick={() => setExtra((count) => count + LIST_LIMIT)}>
                    Show more ({sorted.length - shownLimit})
                </PressButton>
            )}

            {pendingIdol && (
                <div className="pointer-events-none fixed inset-x-0 bottom-5.5 z-55 flex justify-center px-4">
                    <div
                        role="dialog"
                        aria-label="Switch idol"
                        className={cn(
                            "pointer-events-auto flex flex-wrap items-center justify-center gap-3.5 py-2.5 pr-2.5 pl-3 rounded-full",
                            "border-2 border-(--ink) bg-(--menu-bg) text-(--chip-ink) shadow-[3px_4px_0_var(--ctl-off),var(--in)]",
                            "animate-[puffIn_.4s_var(--ease-settle)_backwards]",
                        )}
                    >
                        <img src={imageOf(pendingIdol)} alt="" className="size-10 rounded-full border-2 border-[#1A1418] object-cover" />

                        <span className="flex flex-col">
                            <span className="font-bold text-sm">Level up {pendingIdol.name}?</span>
                            <span className="font-medium text-xs text-(--muted)">XP stays with each idol.</span>
                        </span>

                        <span className="flex gap-1.5">
                            <PressButton className="h-10 px-3.5 text-[13px]" onClick={() => setPendingId(null)}>Cancel</PressButton>
                            <PressButton
                                variant="pink"
                                disabled={select.isPending}
                                className="h-10 px-4 bg-neon-pink text-[13px] [--ctl-off:var(--ink)]"
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
};

export default XpMemberView;
