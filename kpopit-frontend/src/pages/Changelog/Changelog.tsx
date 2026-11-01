import { useSearchParams } from "react-router";
import { ArrowLeftRight, ArrowRight, Sparkle, Wrench } from "lucide-react";
import PageShell from "../../components/PageShell/PageShell";
import { Pill, PressLink } from "../../components/buttons/PressButton";
import PageMeta from "../../components/Seo/PageMeta";
import { useHydrated } from "../../hooks/useHydrated";
import { CHANGELOG, filterChangelog, parseChangeType, type ChangeType } from "../../content/changelog";
import { cn } from "../../lib/utils";
import "./changelog.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TYPE_LOOK: Record<ChangeType, { label: string; bg: string; Icon: typeof Sparkle; fill: string }> = {
    new: { label: "NEW", bg: "#5EE8AA", Icon: Sparkle, fill: "#1A1418" },
    change: { label: "CHANGE", bg: "#FFD64F", Icon: ArrowLeftRight, fill: "none" },
    fix: { label: "FIX", bg: "#FF926B", Icon: Wrench, fill: "none" },
};
const FILTERS: { id: ChangeType | "all"; label: string; short: string }[] = [
    { id: "all", label: "All updates", short: "All" },
    { id: "new", label: "New", short: "New" },
    { id: "change", label: "Changes", short: "Changes" },
];

export default function Changelog() {
    const hydrated = useHydrated();
    const [params, setParams] = useSearchParams();
    // Prerendered with every entry; the ?type= filter applies once the page is live.
    const type = hydrated ? parseChangeType(params.get("type")) : "all";
    const entries = filterChangelog(CHANGELOG, type);
    const latest = CHANGELOG[0];

    const pick = (next: ChangeType | "all") =>
        setParams((p) => {
            if (next === "all") p.delete("type");
            else p.set("type", next);
            return p;
        }, { replace: true, preventScrollReset: true });

    return (
        <>
            <PageMeta
                title="KpopIt Changelog: every update to the daily K-pop game"
                description="Every KpopIt update, newest first: new game modes like Blurry and Pixelated, accounts, the Idols page and more."
                path="/changelog"
            />
            <PageShell header={{ title: "Changelog", korean: "업데이트", koreanLength: "mid", subtitle: "What changed, and when..." }} width="max-w-[780px]">
                <div role="group" aria-label="Filter updates" className="pp-enter [--pp-delay:160ms] flex justify-center flex-wrap gap-2 mt-[26px] mb-[34px] @max-[580px]:flex-nowrap @max-[580px]:gap-1.5">
                    {FILTERS.map((f) => (
                        <Pill key={f.id} active={type === f.id} onClick={() => pick(f.id)} className="pr-2 pl-4 @max-[580px]:pr-1.5 @max-[580px]:pl-[13px] @max-[580px]:gap-1.5 @max-[359px]:px-3.5">
                            <span className="@max-[580px]:hidden">{f.label}</span>
                            <span className="hidden @max-[580px]:inline">{f.short}</span>
                            <span className="min-w-6 h-[22px] px-[7px] grid place-items-center rounded-full bg-white text-[#1A1418] border-[1.5px] border-[#1A1418] font-bold text-[11px] leading-none @max-[359px]:hidden">
                                {filterChangelog(CHANGELOG, f.id).length}
                            </span>
                        </Pill>
                    ))}
                </div>

                <div className="relative flex flex-col gap-[22px]">
                    <div aria-hidden className="absolute left-[105px] @max-[580px]:left-2.5 top-2 bottom-2 w-0.5 bg-(--rule)" />
                    {entries.map((entry, i) => {
                        const [y, m, d] = entry.date.split("-").map(Number);
                        const isLatest = entry === latest;
                        return (
                            <article
                                key={`${type}-${entry.date}`}
                                className="cl-entry pp-enter relative grid grid-cols-[92px_28px_minmax(0,1fr)] items-start @max-[580px]:grid-cols-[22px_minmax(0,1fr)]"
                                style={{ ["--pp-delay" as string]: `${Math.min(200 + i * 60, 700)}ms`, ["--cl-tilt" as string]: `${i % 2 ? 0.4 : -0.4}deg` }}
                            >
                                <div className="flex flex-col items-end gap-[3px] pt-4 pr-3.5 @max-[580px]:hidden">
                                    <span className="font-bold text-base leading-none">{`${MONTHS[m - 1]} ${d}`}</span>
                                    <span className="font-medium text-[11px] text-(--muted)">{y}</span>
                                </div>
                                <span
                                    aria-hidden
                                    className={cn("cl-dot justify-self-center mt-[18px] w-4 h-4 rounded-full border-2 border-(--ink)", isLatest ? "bg-[#FF3399] [box-shadow:0_0_0_4px_rgba(255,51,153,.18)]" : "bg-(--face)")}
                                />
                                <div
                                    className={cn(
                                        "cl-card ml-2.5 rounded-[20px] border-2 border-(--ink) bg-(--face) text-(--face-ink) pt-4 px-5 pb-[18px] flex flex-col gap-2.5",
                                        isLatest ? "[box-shadow:0_5px_0_0_#FF8AC4,0_5px_0_2px_var(--ink)]" : "[box-shadow:2px_3px_0_var(--ctl-off)]",
                                    )}
                                >
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <time dateTime={entry.date} className="hidden @max-[580px]:inline font-semibold text-xs text-(--muted)">{`${MONTHS[m - 1]} ${d}, ${y}`}</time>
                                        <h2 className="m-0 font-bold text-lg leading-[1.25] [text-wrap:pretty]">{entry.title}</h2>
                                        {isLatest && (
                                            <span className="px-[9px] py-[3px] rounded-full border-[1.5px] border-[#1A1418] bg-[#FF70B8] font-bold text-[10px] tracking-[.08em] text-white [text-shadow:var(--tag-text)] [box-shadow:1.5px_2px_0_#1A1418] -rotate-3">LATEST</span>
                                        )}
                                    </div>
                                    {entry.items.map((item) => {
                                        const look = TYPE_LOOK[item.type];
                                        return (
                                            <div key={item.text} className="flex gap-2.5 items-baseline @max-[430px]:flex-col @max-[430px]:gap-1.5 @max-[430px]:items-start">
                                                <span
                                                    className="flex-none min-w-[82px] inline-flex items-center justify-center gap-[5px] px-[9px] py-[3px] rounded-full border-[1.5px] border-[#1A1418] text-[#1A1418] font-bold text-[10px] tracking-[.06em] [box-shadow:inset_0_2px_0_rgba(255,255,255,.6),inset_0_-2px_0_rgba(26,20,24,.12),2px_2.5px_0_#1A1418] -translate-y-px"
                                                    style={{ background: look.bg }}
                                                >
                                                    <look.Icon className="w-[11px] h-[11px]" fill={look.fill} stroke="#1A1418" strokeWidth={2.6} aria-hidden />
                                                    {look.label}
                                                </span>
                                                <span className="font-normal text-[14.5px] leading-[1.55] [text-wrap:pretty]">{item.text}</span>
                                            </div>
                                        );
                                    })}
                                    {entry.post && (
                                        <PressLink to={`/blog/${entry.post}`} className="self-start mt-1 h-[38px] text-[13px]">
                                            Read the post
                                            <ArrowRight className="w-[13px] h-[13px]" strokeWidth={3} aria-hidden />
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
}
