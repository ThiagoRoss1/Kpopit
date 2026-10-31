import { useState, type ReactNode } from "react";
import SlidingPill from "../../components/Puff/SlidingPill";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { cn } from "../../lib/utils";
import type { ModeStats, ProfileStats } from "../../interfaces/playerInterfaces";
import {
    CHART_W, GROUP_COLORS, HEAT_TONES, MODES, chartY, formatDay, formatDuration, heatmapDays, lastRate, linePath,
    modeName, type ModeFilter,
} from "./profileData";

const TILE_DEPTH = "shadow-[4px_4px_0_0_#FF8AC4,4px_4px_0_2px_var(--ink)]";
const Y_LINES = [25, 50, 75, 100];

interface Tile {
    label: string;
    value: ReactNode;
    sub: string;
}

function Tiles({ tiles }: { tiles: Tile[] }) {
    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3.5">
            {tiles.map((tile, i) => (
                <div
                    key={tile.label}
                    style={{ ["--up-tilt" as string]: `${i % 2 ? 0.5 : -0.5}deg` }}
                    className={cn("up-tile py-3.5 px-4 rounded-[20px] border-2 border-(--ink) bg-(--face) text-(--face-ink) flex flex-col gap-1", TILE_DEPTH)}
                >
                    <span className="font-semibold text-[10px] tracking-[.14em] text-(--muted)">{tile.label}</span>
                    <span className="font-bold text-[30px] leading-[1.05] text-white [text-shadow:var(--puff-value)] pt-0.5 pb-1">{tile.value}</span>
                    <span className="font-medium text-xs text-(--muted)">{tile.sub}</span>
                </div>
            ))}
        </div>
    );
}

function Section({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={cn("bg-(--face) text-(--face-ink) border-2 border-(--ink) rounded-[23px] shadow-[var(--card-depth)] py-5 px-[22px] flex flex-col gap-3.5 min-w-0", className)}>
            <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="m-0 font-bold text-lg leading-[1.2]">{title}</h2>
                {aside && <span className="ml-auto font-medium text-xs text-(--muted)">{aside}</span>}
            </div>
            {children}
        </section>
    );
}

const Footnote = ({ children }: { children: ReactNode }) => <span className="font-medium text-xs text-(--muted)">{children}</span>;

export function OverviewPane({ stats, activity, today }: { stats: ProfileStats; activity: { date: string; modes: number }[] | null; today: string }) {
    const total = stats.all;
    const streakMode = MODES.find((m) => m.id === total.current_streak_mode);
    const days = activity ? heatmapDays(today, activity) : [];
    return (
        <div className="up-pane flex flex-col gap-5">
            <Tiles tiles={[
                { label: "CURRENT STREAK", value: total.current_streak, sub: streakMode ? `days in ${streakMode.name}` : "no streak yet" },
                { label: "MAX STREAK", value: total.max_streak, sub: "best ever" },
                { label: "WINS", value: total.wins, sub: `${total.played} games` },
                { label: "WIN RATE", value: `${total.win_rate}%`, sub: "all modes" },
            ]} />
            <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-5 items-stretch @max-[900px]:grid-cols-1">
                <Section title="Activity" aside="Last 18 weeks">
                    {activity ? (
                        <>
                            <div aria-label="Days played" className="grid grid-rows-7 grid-flow-col auto-cols-fr gap-1">
                                {days.map((day) => (
                                    <span
                                        key={day.date}
                                        title={`${formatDay(day.date)}: ${day.modes} ${day.modes === 1 ? "mode" : "modes"}`}
                                        className={cn("aspect-square rounded-[4px] border-[1.5px]", day.modes ? "border-(--ink)" : "border-(--rule)")}
                                        style={{ background: HEAT_TONES[day.modes] }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-1.5 justify-end font-medium text-[11px] text-(--muted)">
                                0 modes
                                {HEAT_TONES.map((tone) => <span key={tone} className="w-3 h-3 rounded-[3px] border-[1.5px] border-(--ink)" style={{ background: tone }} />)}
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
                            const s = stats[mode.id];
                            return (
                                <div key={mode.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center py-2.5 px-3.5 rounded-2xl border-2 border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]">
                                    <span className="flex flex-col gap-[3px] min-w-0">
                                        <span className="flex items-center gap-2 font-bold text-[15px]">
                                            <ModeDot color={mode.color} />{mode.name}
                                        </span>
                                        <span className="font-medium text-xs text-(--muted)">{s.played} games · best streak {s.max_streak}</span>
                                    </span>
                                    <span className="font-bold text-[22px] leading-none">{s.win_rate}%</span>
                                </div>
                            );
                        })}
                    </div>
                    <Footnote>Win rate per mode.</Footnote>
                </Section>
            </div>
        </div>
    );
}

export const ModeDot = ({ color }: { color: string }) => (
    <span className="w-3 h-3 box-border rounded-full border-2 border-[#1A1418]" style={{ background: color }} />
);

export function StatsPane({ stats, filter }: { stats: ProfileStats; filter: ModeFilter }) {
    const s = stats[filter];
    const label = modeName(filter);
    return (
        <div className="up-pane flex flex-col gap-5">
            <Tiles tiles={[
                { label: "WIN RATE", value: `${s.win_rate}%`, sub: `${s.wins} of ${s.played} games` },
                { label: "AVG GUESSES", value: s.avg_guesses ?? "—", sub: "to land the answer" },
                { label: "ONE-SHOT WINS", value: s.one_shots, sub: "first guess" },
                { label: "FASTEST WIN", value: formatDuration(s.fastest_seconds), sub: filter === "all" ? "across modes" : `in ${label}` },
            ]} />
            <div className="grid grid-cols-2 gap-5 items-stretch @max-[900px]:grid-cols-1">
                <Distribution stats={s} label={label} />
                <Section title="Accuracy by mode">
                    <div className="grid grid-cols-3 gap-2.5 flex-1 items-center">
                        {MODES.map((mode, i) => {
                            const p = stats[mode.id].win_rate;
                            return (
                                <div key={mode.id} className="flex flex-col items-center gap-2.5 transition-opacity duration-300" style={{ opacity: filter === "all" || filter === mode.id ? 1 : 0.35 }}>
                                    <div
                                        className="up-ring w-[92px] h-[92px] max-w-full aspect-square box-border rounded-full border-2 border-(--ink) grid place-items-center shadow-[2px_3px_0_var(--ctl-off)]"
                                        style={{ background: `conic-gradient(${mode.color} 0 ${p}%,var(--track) ${p}% 100%)`, ["--up-delay" as string]: `${i * 90}ms` }}
                                    >
                                        <span className="w-16 h-16 box-border rounded-full border-2 border-(--ink) bg-(--face) grid place-items-center font-bold text-[15px] whitespace-nowrap">{p}%</span>
                                    </div>
                                    <span className="font-bold text-[13.5px]">{mode.name}</span>
                                </div>
                            );
                        })}
                    </div>
                    <Footnote>Win rate per mode. Fastest win: {formatDuration(s.fastest_seconds)}.</Footnote>
                </Section>
            </div>
            <WinRateChart stats={stats} filter={filter} />
            <div className="grid grid-cols-2 gap-5 items-stretch @max-[900px]:grid-cols-1">
                <MostGuessed stats={stats} filter={filter} />
                <GroupsPie groups={s.groups} />
            </div>
        </div>
    );
}

function Distribution({ stats, label }: { stats: ModeStats; label: string }) {
    const peakValue = Math.max(...stats.distribution);
    const peak = stats.distribution.indexOf(peakValue) + 1;
    return (
        <Section title="Guess distribution" aside={label}>
            <div className="grid grid-cols-8 gap-2 items-end h-[170px] pt-2.5">
                {stats.distribution.map((value, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end">
                        <span className="font-bold text-xs">{value}</span>
                        <span
                            className="up-col w-full min-h-1.5 box-border rounded-[9px_9px_4px_4px] border-2 border-(--ink) shadow-[inset_0_2px_0_rgba(255,255,255,.5)]"
                            style={{
                                height: `${peakValue ? Math.round((value / peakValue) * 100) : 0}%`,
                                background: peakValue && i + 1 === peak ? "#FF3399" : "#FF8AC4",
                                ["--up-delay" as string]: `${i * 60}ms`,
                            }}
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
}

function WinRateChart({ stats, filter }: { stats: ProfileStats; filter: ModeFilter }) {
    const [span, setSpan] = useState<"weekly" | "monthly">("weekly");
    const lines = MODES.filter((m) => filter === "all" || filter === m.id).map((mode) => ({ mode, buckets: stats[mode.id][span] }));
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
                            <span className="w-3.5 h-1.5 box-border rounded-[9px] border-[1.5px] border-(--ink)" style={{ background: mode.color }} />
                            {mode.name} · {lastRate(buckets)}
                        </span>
                    ))}
                </div>
            </div>
            <div className="relative h-[200px] ml-9">
                <svg viewBox={`0 0 ${CHART_W} 200`} preserveAspectRatio="none" aria-hidden className="absolute inset-0 w-full h-full overflow-visible">
                    <path d={Y_LINES.map((v) => `M0,${chartY(v).toFixed(1)} H${CHART_W}`).join(" ")} stroke="var(--rule)" strokeWidth="1.5" strokeDasharray="4 6" fill="none" vectorEffect="non-scaling-stroke" />
                    {lines.map(({ mode, buckets }) => {
                        const d = linePath(buckets);
                        return (
                            <g key={mode.id}>
                                <path d={d} fill="none" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                <path d={d} fill="none" stroke={mode.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                            </g>
                        );
                    })}
                </svg>
                {Y_LINES.map((v) => (
                    <span key={v} className="absolute -left-9 -translate-y-1/2 font-semibold text-[11px] text-(--muted)" style={{ top: `${(chartY(v) / 2).toFixed(1)}%` }}>{v}%</span>
                ))}
            </div>
            <div className="flex justify-between ml-9 font-semibold text-[11px] text-(--muted)">
                {marks.map((mark) => <span key={mark}>{mark}</span>)}
            </div>
        </Section>
    );
}

function MostGuessed({ stats, filter }: { stats: ProfileStats; filter: ModeFilter }) {
    // Pixelated guesses are albums: its filter shows the idol modes' list instead.
    const source = filter === "pixelated" ? "all" : filter;
    const idols = stats[source].most_guessed;
    const top = idols[0]?.guesses ?? 1;
    return (
        <Section title="Most guessed idols" aside={source === "all" ? "Classic + Blurry" : modeName(source)}>
            <div className="flex flex-col gap-2.5">
                {idols.map((idol, i) => {
                    const src = resolveCdnUrl(idol.image_path);
                    return (
                        <div key={idol.idol_id} className="grid grid-cols-[18px_40px_minmax(0,1fr)_36px] gap-2.5 items-center">
                            <span className={cn("font-bold text-[13px]", i ? "text-(--muted)" : "text-(--group)")}>{i + 1}</span>
                            <span className="w-10 h-10 box-border rounded-xl border-2 border-[#1A1418] overflow-hidden bg-[#FFE3F1] grid place-items-center font-bold text-base text-[#1A1418]">
                                {src ? <img src={src} alt="" loading="lazy" className="w-full h-full object-cover block" /> : idol.artist_name[0]}
                            </span>
                            <span className="flex flex-col gap-1 min-w-0">
                                <span className="font-bold text-sm truncate">
                                    {idol.artist_name} <span className="font-medium text-(--muted) text-xs">{idol.group_name ?? ""}</span>
                                </span>
                                <span className="h-2 rounded-full border-[1.5px] border-(--ink) bg-(--panel) overflow-hidden">
                                    <span className="up-bar block h-full bg-[#FF8AC4]" style={{ width: `${Math.round((idol.guesses / top) * 100)}%` }} />
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
}

function GroupsPie({ groups }: { groups: ModeStats["groups"] }) {
    const total = groups.reduce((sum, g) => sum + g.guesses, 0);
    const shares = groups.map((g, i) => ({ name: g.name ?? "Others", share: total ? Math.round((g.guesses * 100) / total) : 0, color: GROUP_COLORS[g.name === null ? 5 : i] }));
    let start = 0;
    const pie = total
        ? `conic-gradient(${groups.map((g, i) => {
            const from = start;
            start += (g.guesses * 100) / total;
            return `${shares[i].color} ${from}% ${start}%`;
        }).join(",")})`
        : "var(--track)";
    return (
        <Section title="Groups you guess" aside="Share of guesses">
            <div className="flex items-center gap-[22px] flex-wrap flex-1">
                <div className="up-ring flex-none w-[150px] h-[150px] box-border rounded-full border-2 border-(--ink) grid place-items-center shadow-[3px_4px_0_var(--ctl-off)] mx-auto" style={{ background: pie }}>
                    <span className="w-[52%] aspect-square box-border rounded-full border-2 border-(--ink) bg-(--face) flex flex-col items-center justify-center gap-px">
                        <span className="font-bold text-lg leading-none">{shares[0] ? `${shares[0].share}%` : "—"}</span>
                        <span className="font-semibold text-[10px] text-(--muted) max-w-[70px] truncate">{shares[0]?.name ?? ""}</span>
                    </span>
                </div>
                <div className="flex-1 min-w-[150px] flex flex-col gap-2">
                    {shares.map((g) => (
                        <div key={g.name} className="grid grid-cols-[14px_minmax(0,1fr)_auto] gap-2.5 items-center font-semibold text-[13.5px]">
                            <span className="w-3.5 h-3.5 box-border rounded-[4px] border-[1.5px] border-(--ink)" style={{ background: g.color }} />
                            <span className="truncate">{g.name}</span>
                            <span className="font-bold">{g.share}%</span>
                        </div>
                    ))}
                    {!shares.length && <p className="m-0 font-medium text-sm text-(--muted)">No guesses yet...</p>}
                </div>
            </div>
        </Section>
    );
}
