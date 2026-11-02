import { useSearchParams } from "react-router";
import { ArrowLeftRight, ArrowRight, Sparkle, Wrench } from "lucide-react";
import PageShell from "../../components/PageShell/PageShell";
import { Pill, PressLink } from "../../components/buttons/PressButton";
import PageMeta from "../../components/Seo/PageMeta";
import { useHydrated } from "../../hooks/useHydrated";
import { CHANGELOG, filterChangelog, parseChangeType, type ChangeType } from "../../content/changelog";
import { cn } from "../../lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TYPE_LOOK: Record<ChangeType, { label: string; ground: string; Icon: typeof Sparkle; fill: string }> = {
    new: { label: "NEW", ground: "bg-[#5EE8AA]", Icon: Sparkle, fill: "#1A1418" },
    change: { label: "CHANGE", ground: "bg-[#FFD64F]", Icon: ArrowLeftRight, fill: "none" },
    fix: { label: "FIX", ground: "bg-[#FF926B]", Icon: Wrench, fill: "none" },
};

const FILTERS: { id: ChangeType | "all"; label: string; short: string }[] = [
    { id: "all", label: "All updates", short: "All" },
    { id: "new", label: "New", short: "New" },
    { id: "change", label: "Changes", short: "Changes" },
];

const Changelog = () => {
    const hydrated = useHydrated();
    const [params, setParams] = useSearchParams();

    // Prerendered with every entry; the ?type= filter applies once the page is live.
    const type = hydrated ? parseChangeType(params.get("type")) : "all";
    const entries = filterChangelog(CHANGELOG, type);
    const latest = CHANGELOG[0];

    const pickType = (next: ChangeType | "all") =>
        setParams((current) => {
            if (next === "all") current.delete("type");
            else current.set("type", next);
            return current;
        }, { replace: true, preventScrollReset: true });

    return (
        <>
            <PageMeta
                title="KpopIt Changelog: every update to the daily K-pop game"
                description="Every KpopIt update, newest first: new game modes like Blurry and Pixelated, accounts, the Idols page and more."
                path="/changelog"
            />

            <PageShell header={{ title: "Changelog", korean: "업데이트", koreanLength: "mid", subtitle: "What changed, and when..." }} width="max-w-195">
                <div
                    role="group"
                    aria-label="Filter updates"
                    className="pp-enter [--pp-delay:160ms] flex flex-wrap @max-[581px]:flex-nowrap justify-center gap-2 @max-[581px]:gap-1.5 mt-6.5 mb-8.5"
                >
                    {FILTERS.map((filter) => (
                        <Pill
                            key={filter.id}
                            active={type === filter.id}
                            onClick={() => pickType(filter.id)}
                            className="pr-2 pl-4 @max-[581px]:gap-1.5 @max-[581px]:pr-1.5 @max-[581px]:pl-3.25 @max-[360px]:px-3.5"
                        >
                            <span className="@max-[581px]:hidden">{filter.label}</span>
                            <span className="hidden @max-[581px]:inline">{filter.short}</span>

                            <span
                                className={cn(
                                    "@max-[360px]:hidden grid place-items-center min-w-6 h-5.5 px-1.75 rounded-full",
                                    "border-[1.5px] border-[#1A1418] bg-white font-bold text-[11px] leading-none text-[#1A1418]",
                                )}
                            >
                                {filterChangelog(CHANGELOG, filter.id).length}
                            </span>
                        </Pill>
                    ))}
                </div>

                <div className="relative flex flex-col gap-5.5">
                    <div aria-hidden className="absolute left-26.25 @max-[581px]:left-2.5 top-2 bottom-2 w-0.5 bg-(--rule)" />

                    {entries.map((entry, i) => {
                        const [year, month, day] = entry.date.split("-").map(Number);
                        const isLatest = entry === latest;

                        return (
                            <article
                                key={`${type}-${entry.date}`}
                                className="pp-enter group/entry relative grid grid-cols-[92px_28px_minmax(0,1fr)] @max-[581px]:grid-cols-[22px_minmax(0,1fr)] items-start"
                                style={{ ["--pp-delay" as string]: `${Math.min(200 + i * 60, 700)}ms` }}
                            >
                                <div className="flex @max-[581px]:hidden flex-col items-end gap-0.75 pt-4 pr-3.5">
                                    <span className="font-bold text-base leading-none">{`${MONTHS[month - 1]} ${day}`}</span>
                                    <span className="font-medium text-[11px] text-(--muted)">{year}</span>
                                </div>

                                <span
                                    aria-hidden
                                    className={cn(
                                        "justify-self-center size-4 mt-4.5 rounded-full border-2 border-(--ink)",
                                        "transition-[scale] duration-500 ease-(--ease-settle) will-change-transform group-hover/entry:scale-125",
                                        isLatest ? "bg-neon-pink shadow-[0_0_0_4px_rgba(255,51,153,.18)]" : "bg-(--face)",
                                    )}
                                />

                                <div
                                    className={cn(
                                        "flex flex-col gap-2.5 ml-2.5 pt-4 px-5 pb-4.5 rounded-[20px]",
                                        "border-2 border-(--ink) bg-(--face) text-(--face-ink)",
                                        "transition-[translate,rotate] duration-450 ease-(--ease-settle) transform-gpu",
                                        "group-hover/entry:-translate-y-0.75 group-hover/entry:rotate-0",
                                        i % 2 ? "rotate-[0.4deg]" : "rotate-[-0.4deg]",
                                        isLatest ? "shadow-[0_5px_0_0_#FF8AC4,0_5px_0_2px_var(--ink)]" : "shadow-[2px_3px_0_var(--ctl-off)]",
                                    )}
                                >
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <time dateTime={entry.date} className="hidden @max-[581px]:inline font-semibold text-xs text-(--muted)">
                                            {`${MONTHS[month - 1]} ${day}, ${year}`}
                                        </time>

                                        <h2 className="m-0 font-bold text-lg/tight text-pretty">{entry.title}</h2>

                                        {isLatest && (
                                            <span
                                                className={cn(
                                                    "px-2.25 py-0.75 rounded-full -rotate-3",
                                                    "border-[1.5px] border-[#1A1418] bg-[#FF70B8] shadow-[1.5px_2px_0_#1A1418]",
                                                    "font-bold text-[10px] tracking-[.08em] text-white text-shadow-(--tag-text)",
                                                )}
                                            >
                                                LATEST
                                            </span>
                                        )}
                                    </div>

                                    {entry.items.map((item) => {
                                        const look = TYPE_LOOK[item.type];

                                        return (
                                            <div
                                                key={item.text}
                                                className="flex @max-[431px]:flex-col items-baseline @max-[431px]:items-start gap-2.5 @max-[431px]:gap-1.5"
                                            >
                                                <span
                                                    className={cn(
                                                        "inline-flex flex-none items-center justify-center gap-1.25 min-w-20.5 px-2.25 py-0.75 rounded-full -translate-y-px",
                                                        "border-[1.5px] border-[#1A1418] text-[#1A1418] font-bold text-[10px] tracking-[.06em]",
                                                        "shadow-[inset_0_2px_0_rgba(255,255,255,.6),inset_0_-2px_0_rgba(26,20,24,.12),2px_2.5px_0_#1A1418]",
                                                        look.ground,
                                                    )}
                                                >
                                                    <look.Icon className="size-2.75" fill={look.fill} stroke="#1A1418" strokeWidth={2.6} aria-hidden />
                                                    {look.label}
                                                </span>

                                                <span className="font-normal text-[14.5px] leading-[1.55] text-pretty">{item.text}</span>
                                            </div>
                                        );
                                    })}

                                    {entry.post && (
                                        <PressLink to={`/blog/${entry.post}`} className="self-start h-9.5 mt-1 text-[13px]">
                                            Read the post
                                            <ArrowRight className="size-3.25" strokeWidth={3} aria-hidden />
                                        </PressLink>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </PageShell>
        </>
    );
};

export default Changelog;
