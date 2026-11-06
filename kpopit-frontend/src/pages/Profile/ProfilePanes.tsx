import { useState, type ReactNode } from "react";
import SlidingPill from "../../components/buttons/SlidingPill";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { cn } from "../../lib/utils";
import type { ModeStats, ProfileStats } from "../../interfaces/playerInterfaces";
import {
    CHART_W, GROUP_COLORS, HEAT_TONES, MODES, chartY, formatDay, formatDuration, heatmapDays, lastRate, linePath,
    modeName, type ModeFilter,
} from "./profileData";

// A stat tile: tilted, it straightens and lifts on hover.
const TILE = cn(
    "flex flex-col gap-1 py-3.5 px-4 rounded-[20px]",
    "border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[4px_4px_0_0_#FF8AC4,4px_4px_0_2px_var(--ink)]",
    "transition-[translate,rotate] duration-500 ease-(--ease-settle) transform-gpu hover:-translate-y-0.75 hover:rotate-0",
);
const Y_LINES = [25, 50, 75, 100];

interface Tile {
    label: string;
    value: ReactNode;
    sub: string;
}

const Tiles = ({ tiles }: { tiles: Tile[] }) => {
    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3.5">
            {tiles.map((tile, i) => (
                <div key={tile.label} className={cn(TILE, i % 2 ? "rotate-[0.5deg]" : "rotate-[-0.5deg]")}>
                    <span className="font-semibold text-[10px] tracking-[.14em] text-(--muted)">{tile.label}</span>
                    <span className="puff-ink pb-1 font-bold text-[30px] leading-[1.05] text-white text-shadow-(--puff-value)">{tile.value}</span>
                    <span className="font-medium text-xs text-(--muted)">{tile.sub}</span>
                </div>
            ))}
        </div>
    );
};

const Section = ({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) => {
    return (
        <section
            className={cn(
                "flex flex-col gap-3.5 min-w-0 py-5 px-5.5 rounded-[23px]",
                "border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-(--card-depth)",
                className,
            )}
        >
            <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="m-0 font-bold text-lg leading-[1.2]">{title}</h2>
                {aside && <span className="ml-auto font-medium text-xs text-(--muted)">{aside}</span>}
            </div>
            {children}
        </section>
    );
};

const Footnote = ({ children }: { children: ReactNode }) => <span className="font-medium text-xs text-(--muted)">{children}</span>;

export const OverviewPane = ({ stats, activity, today }: { stats: ProfileStats; activity: { date: string; modes: number }[] | null; today: string }) => {
    const total = stats.all;
    const streakMode = MODES.find((mode) => mode.id === total.current_streak_mode);
    const days = activity ? heatmapDays(today, activity) : [];
    return (
        <div className="profile-pane-enter flex flex-col gap-5">
            <Tiles tiles={[
                { label: "CURRENT STREAK", value: total.current_streak, sub: streakMode ? `days in ${streakMode.name}` : "no streak yet" },
                { label: "MAX STREAK", value: total.max_streak, sub: "best ever" },
                { label: "WINS", value: total.wins, sub: `${total.played} games` },
                { label: "WIN RATE", value: `${total.win_rate}%`, sub: "all modes" },
            ]} />
            <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] @max-[901px]:grid-cols-1 items-stretch gap-5">
                <Section title="Activity" aside="Last 18 weeks">
                    {activity ? (
                        <>
                            <div aria-label="Days played" className="grid grid-rows-7 grid-flow-col auto-cols-fr gap-1">
                                {days.map((day) => (
                                    <span
                                        key={day.date}
                                        title={`${formatDay(day.date)}: ${day.modes} ${day.modes === 1 ? "mode" : "modes"}`}
                                        className={cn("aspect-square rounded-sm border-[1.5px]", day.modes ? "border-(--ink)" : "border-(--rule)")}
                                        style={{ background: HEAT_TONES[day.modes] }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-1.5 justify-end font-medium text-[11px] text-(--muted)">
                                0 modes
                                {HEAT_TONES.map((tone) => <span key={tone} className="size-3 rounded-[3px] border-[1.5px] border-(--ink)" style={{ background: tone }} />)}
                                3 modes
                            </div>
                        </>
                    ) : (
                        <p className="m-0 py-6 text-center font-medium text-sm text-(--muted)">Activity is hidden on this profile.</p>
                    )}
                </Section>
                <Section title="Modes" aside={`${total.played} games`}>
                    <div className="flex flex-col gap-2.5 flex-1 justify-center">
                        {MODES.map((mode) => {
                            const modeStats = stats[mode.id];

                            return (
                                <div
                                    key={mode.id}
                                    className={cn(
                                        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5 px-3.5 rounded-2xl",
                                        "border-2 border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
                                    )}
                                >
                                    <span className="flex flex-col gap-0.75 min-w-0">
                                        <span className="flex items-center gap-2 font-bold text-[15px]">
                                            <ModeDot color={mode.color} />
                                            {mode.name}
                                        </span>
                                        <span className="font-medium text-xs text-(--muted)">{modeStats.played} games · best streak {modeStats.max_streak}</span>
                                    </span>

                                    <span className="font-bold text-[22px] leading-none">{modeStats.win_rate}%</span>
                                </div>
                            );
                        })}
                    </div>
                    <Footnote>Win rate per mode.</Footnote>
                </Section>
            </div>
        </div>
    );
};

export const ModeDot = ({ color }: { color: string }) => (
    <span className="box-border size-3 rounded-full border-2 border-[#1A1418]" style={{ background: color }} />
);

export const StatsPane = ({ stats, filter }: { stats: ProfileStats; filter: ModeFilter }) => {
    const modeStats = stats[filter];
    const label = modeName(filter);

    return (
        <div className="profile-pane-enter flex flex-col gap-5">
            <Tiles tiles={[
                { label: "WIN RATE", value: `${modeStats.win_rate}%`, sub: `${modeStats.wins} of ${modeStats.played} games` },
                { label: "AVG GUESSES", value: modeStats.avg_guesses ?? "—", sub: "to land the answer" },
                { label: "ONE-SHOT WINS", value: modeStats.one_shots, sub: "first guess" },
                { label: "FASTEST WIN", value: formatDuration(modeStats.fastest_seconds), sub: filter === "all" ? "across modes" : `in ${label}` },
            ]} />
            <div className="grid grid-cols-2 @max-[901px]:grid-cols-1 items-stretch gap-5">
                <Distribution stats={modeStats} label={label} />
                <Section title="Accuracy by mode">
                    <div className="grid grid-cols-3 gap-2.5 flex-1 items-center">
                        {MODES.map((mode, i) => {
                            const winRate = stats[mode.id].win_rate;
                            const isShown = filter === "all" || filter === mode.id;

                            return (
                                <div key={mode.id} className={cn("flex flex-col items-center gap-2.5 transition-opacity duration-300", !isShown && "opacity-35")}>
                                    <div
                                        className={cn(
                                            "profile-ring-enter box-border grid place-items-center size-23 max-w-full aspect-square rounded-full",
                                            "border-2 border-(--ink) shadow-[2px_3px_0_var(--ctl-off)]",
                                        )}
                                        style={{ background: `conic-gradient(${mode.color} 0 ${winRate}%,var(--track) ${winRate}% 100%)`, animationDelay: `${i * 90}ms` }}
                                    >
                                        <span className="box-border grid place-items-center size-16 rounded-full border-2 border-(--ink) bg-(--face) font-bold text-[15px] whitespace-nowrap">
                                            {winRate}%
                                        </span>
                                    </div>
                                    <span className="font-bold text-[13.5px]">{mode.name}</span>
                                </div>
                            );
                        })}
                    </div>
                    <Footnote>Win rate per mode. Fastest win: {formatDuration(modeStats.fastest_seconds)}.</Footnote>
                </Section>
            </div>
            <WinRateChart stats={stats} filter={filter} />
            <div className="grid grid-cols-2 @max-[901px]:grid-cols-1 items-stretch gap-5">
                <MostGuessed stats={stats} filter={filter} />
                <GroupsPie groups={modeStats.groups} />
            </div>
        </div>
    );
};

const Distribution = ({ stats, label }: { stats: ModeStats; label: string }) => {
    const peakValue = Math.max(...stats.distribution);
    const peak = stats.distribution.indexOf(peakValue) + 1;

    return (
        <Section title="Guess distribution" aside={label}>
            <div className="grid grid-cols-8 gap-2 items-end h-42.5 pt-2.5">
                {stats.distribution.map((value, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end">
                        <span className="font-bold text-xs">{value}</span>
                        <span
                            className={cn(
                                "profile-column-enter box-border w-full min-h-1.5 rounded-[9px_9px_4px_4px]",
                                "border-2 border-(--ink) shadow-[inset_0_2px_0_rgba(255,255,255,.5)]",
                                peakValue && i + 1 === peak ? "bg-neon-pink" : "bg-[#FF8AC4]",
                            )}
                            style={{ height: `${peakValue ? Math.round((value / peakValue) * 100) : 0}%`, animationDelay: `${i * 60}ms` }}
                        />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-8 gap-2 text-center font-semibold text-[11px] text-(--muted)">
                {stats.distribution.map((_, i) => <span key={i}>{i === 7 ? "8+" : i + 1}</span>)}
            </div>
            <Footnote>
                {stats.wins ? `Average ${stats.avg_guesses} guesses. Most wins land on try ${peak}.` : "No wins here yet..."}
            </Footnote>
        </Section>
    );
};

const WinRateChart = ({ stats, filter }: { stats: ProfileStats; filter: ModeFilter }) => {
    const [span, setSpan] = useState<"weekly" | "monthly">("weekly");
    const lines = MODES.filter((mode) => filter === "all" || filter === mode.id).map((mode) => ({ mode, buckets: stats[mode.id][span] }));
    const marks = span === "weekly" ? ["16 weeks ago", "8 weeks ago", "This week"] : ["12 months ago", "6 months ago", "This month"];
    return (
        <Section title="Win rate over time">
            <div className="flex items-center gap-x-4 gap-y-2 flex-wrap -mt-1">
                <SlidingPill
                    label="Time span"
                    value={span}
                    onChange={setSpan}
                    options={[{ value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]}
                    className="h-10"
                />
                <div className="ml-auto flex gap-3.5 flex-wrap">
                    {lines.map(({ mode, buckets }) => (
                        <span key={mode.id} className="flex items-center gap-1.5 font-semibold text-[12.5px]">
                            <span className="box-border w-3.5 h-1.5 rounded-[9px] border-[1.5px] border-(--ink)" style={{ background: mode.color }} />
                            {mode.name} · {lastRate(buckets)}
                        </span>
                    ))}
                </div>
            </div>
            <div className="relative h-50 ml-9">
                <svg viewBox={`0 0 ${CHART_W} 200`} preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full overflow-visible">
                    <path d={Y_LINES.map((line) => `M0,${chartY(line).toFixed(1)} H${CHART_W}`).join(" ")} stroke="var(--rule)" strokeWidth="1.5" strokeDasharray="4 6" fill="none" vectorEffect="non-scaling-stroke" />
                    {lines.map(({ mode, buckets }) => {
                        const path = linePath(buckets);

                        return (
                            <g key={mode.id}>
                                <path d={path} fill="none" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                <path d={path} fill="none" stroke={mode.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                            </g>
                        );
                    })}
                </svg>
                {Y_LINES.map((line) => (
                    <span key={line} className="absolute -left-9 -translate-y-1/2 font-semibold text-[11px] text-(--muted)" style={{ top: `${(chartY(line) / 2).toFixed(1)}%` }}>
                        {line}%
                    </span>
                ))}
            </div>
            <div className="flex justify-between ml-9 font-semibold text-[11px] text-(--muted)">
                {marks.map((mark) => <span key={mark}>{mark}</span>)}
            </div>
        </Section>
    );
};

const MostGuessed = ({ stats, filter }: { stats: ProfileStats; filter: ModeFilter }) => {
    // Pixelated guesses are albums: its filter shows the idol modes' list instead.
    const source = filter === "pixelated" ? "all" : filter;
    const idols = stats[source].most_guessed;
    const top = idols[0]?.guesses ?? 1;
    return (
        <Section title="Most guessed idols" aside={source === "all" ? "Classic + Blurry" : modeName(source)}>
            <div className="flex flex-col gap-2.5">
                {idols.map((idol, i) => {
                    const imageSource = resolveCdnUrl(idol.image_path);

                    return (
                        <div key={idol.idol_id} className="grid grid-cols-[18px_40px_minmax(0,1fr)_36px] gap-2.5 items-center">
                            <span className={cn("font-bold text-[13px]", i ? "text-(--muted)" : "text-(--group)")}>{i + 1}</span>
                            <span
                                className={cn(
                                    "box-border grid place-items-center size-10 overflow-hidden rounded-xl",
                                    "border-2 border-[#1A1418] bg-[#FFE3F1] font-bold text-base text-[#1A1418]",
                                )}
                            >
                                {imageSource ? <img draggable={false} src={imageSource} alt="" loading="lazy" className="block size-full object-cover" /> : idol.artist_name[0]}
                            </span>
                            <span className="flex flex-col gap-1 min-w-0">
                                <span className="font-bold text-sm truncate">
                                    {idol.artist_name} <span className="font-medium text-(--muted) text-xs">{idol.group_name ?? ""}</span>
                                </span>
                                <span className="h-2 rounded-full border-[1.5px] border-(--ink) bg-(--panel) overflow-hidden">
                                    <span className="profile-bar-enter block h-full bg-[#FF8AC4]" style={{ width: `${Math.round((idol.guesses / top) * 100)}%` }} />
                                </span>
                            </span>
                            <span className="font-bold text-[13px] text-right">{idol.guesses}×</span>
                        </div>
                    );
                })}
                {!idols.length && <p className="m-0 py-4 text-center font-medium text-sm text-(--muted)">No guesses yet...</p>}
            </div>
        </Section>
    );
};

const GroupsPie = ({ groups }: { groups: ModeStats["groups"] }) => {
    const total = groups.reduce((sum, group) => sum + group.guesses, 0);

    // "Others" (a null name) always takes the last colour.
    const shares = groups.map((group, i) => ({
        name: group.name ?? "Others",
        share: total ? Math.round((group.guesses * 100) / total) : 0,
        color: GROUP_COLORS[group.name === null ? 5 : i],
    }));

    let sliceStart = 0;
    const pie = total
        ? `conic-gradient(${groups.map((group, i) => {
            const from = sliceStart;
            sliceStart += (group.guesses * 100) / total;
            return `${shares[i].color} ${from}% ${sliceStart}%`;
        }).join(",")})`
        : "var(--track)";

    return (
        <Section title="Groups you guess" aside="Share of guesses">
            <div className="flex items-center gap-5.5 flex-wrap flex-1">
                <div
                    className="profile-ring-enter box-border grid place-items-center flex-none size-37.5 mx-auto rounded-full border-2 border-(--ink) shadow-[3px_4px_0_var(--ctl-off)]"
                    style={{ background: pie }}
                >
                    <span className="w-[52%] aspect-square box-border rounded-full border-2 border-(--ink) bg-(--face) flex flex-col items-center justify-center gap-px">
                        <span className="font-bold text-lg leading-none">{shares[0] ? `${shares[0].share}%` : "—"}</span>
                        <span className="font-semibold text-[10px] text-(--muted) max-w-17.5 truncate">{shares[0]?.name ?? ""}</span>
                    </span>
                </div>
                <div className="flex-1 min-w-37.5 flex flex-col gap-2">
                    {shares.map((group) => (
                        <div key={group.name} className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2.5 font-semibold text-[13.5px]">
                            <span className="box-border size-3.5 rounded-sm border-[1.5px] border-(--ink)" style={{ background: group.color }} />
                            <span className="truncate">{group.name}</span>
                            <span className="font-bold">{group.share}%</span>
                        </div>
                    ))}
                    {!shares.length && <p className="m-0 font-medium text-sm text-(--muted)">No guesses yet...</p>}
                </div>
            </div>
        </Section>
    );
};
