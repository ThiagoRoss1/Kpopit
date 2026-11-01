import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { ArrowUp, ChevronLeft, ChevronRight, Lock, Search } from "lucide-react";
import PageShell from "../../components/Puff/PageShell";
import { Pill, PressButton, PressLink } from "../../components/Puff/PressButton";
import PageMeta from "../../components/Seo/PageMeta";
import { useHydrated } from "../../hooks/useHydrated";
import useResetTimer from "../../hooks/useResetTimer";
import { HOW_TO_PLAY } from "../../content/howToPlay";
import { BLUR_LEVELS } from "../BlurryMode/blurLevels";
import { PIXEL_LEVELS } from "../../utils/pixelLevels";
import PixelatedCanvas from "../../components/Pixelated/PixelatedCanvas";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { cn } from "../../lib/utils";
import { CLASSIC_EXAMPLE, CATEGORIES, FEEDBACK, HINT_AT, MODES, parseMode, type HowToMode } from "./howToPlayData";
import "../../components/Puff/puff.css";
import "./howToPlay.css";

const CARD = "htp-card rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) [box-shadow:5px_5px_0_0_#FF8AC4,5px_5px_0_2px_var(--ink)] p-[26px] @max-[580px]:p-[18px] flex flex-col gap-[18px]";

function Heading({ n, children }: { n: number; children: ReactNode }) {
    return (
        <h2 className="m-0 flex items-center gap-2.5 font-bold text-[13px] leading-none tracking-[.12em] text-(--face-ink)">
            <span aria-hidden className="flex-none grid place-items-center w-8 h-8 rounded-[10px] border-2 border-[#1A1418] bg-[#FF8AC4] text-[#1A1418] font-bold text-[13px] leading-none tracking-normal [box-shadow:2px_2px_0_var(--ctl-off)] -rotate-4">
                {String(n).padStart(2, "0")}
            </span>
            {children}
        </h2>
    );
}

function Steps({ steps }: { steps: string[] }) {
    return (
        <ol className="m-0 p-0 list-none flex flex-col gap-3">
            {steps.map((step, i) => (
                <li key={step} className="flex gap-3 items-start">
                    <span aria-hidden className="flex-none grid place-items-center w-[26px] h-[26px] rounded-full bg-(--chip-hover) text-(--group) font-bold text-[13px]">{i + 1}</span>
                    <span className="font-normal text-[15px] leading-[1.55] pt-[3px] [text-wrap:pretty]">{step}</span>
                </li>
            ))}
        </ol>
    );
}

// The search bar as it looks while typing, with the first two matches (decorative).
function SearchDemo() {
    const rows = [
        { name: "Kim Chaewon", group: "LE SSERAFIM", image: "/images/idols/chaewon.webp", active: true },
        { name: "Chaeyoung", group: "TWICE", image: "/images/idols/chaeyoung.webp", active: false },
    ];
    return (
        <div aria-hidden className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 p-1.5 rounded-full border-2 border-(--ink) bg-(--chip) [box-shadow:3px_4px_0_var(--ctl-off),var(--in)]">
                <span className="flex-1 min-w-0 h-10 flex items-center px-4 rounded-full border-[1.5px] border-(--ink) bg-(--ground) text-(--text) font-medium text-sm">
                    chae<span className="htp-caret w-0.5 h-[18px] ml-0.5 bg-[#FF3399]" />
                </span>
                <span className="flex-none grid place-items-center w-11 h-11 rounded-full border-2 border-[#1A1418] bg-[#FF3399] text-[#1A1418] [box-shadow:2px_3px_0_#1A1418]">
                    <Search className="w-[18px] h-[18px]" strokeWidth={3} />
                </span>
            </div>
            <div className="p-1.5 rounded-[22px] border-2 border-(--ink) bg-(--menu-bg) text-(--chip-ink) [box-shadow:3px_4px_0_var(--ctl-off)] flex flex-col gap-[3px]">
                {rows.map((r) => (
                    <div key={r.name} className={cn("flex items-center gap-3 py-1.5 px-2.5 rounded-[16px] border-2", r.active ? "border-(--ink) bg-(--opt-hover)" : "border-transparent")}>
                        <span className="relative flex-none w-10 h-10 rounded-full border-2 border-[#1A1418] overflow-hidden bg-[#FFE3F1] grid place-items-center font-bold text-[15px] text-[#1A1418]">
                            {r.name[0]}
                            <img src={resolveCdnUrl(r.image) ?? ""} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        </span>
                        <span className="font-bold text-sm">{r.name} <span className="font-medium text-(--muted)">({r.group})</span></span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function GuessStepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
    const btn = "pp-press pp-focus grid place-items-center w-10 h-10 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) cursor-pointer disabled:opacity-40";
    return (
        <div className="flex items-center justify-center gap-3">
            <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 0} aria-label="One guess less">
                <ChevronLeft className="w-4 h-4" strokeWidth={3} />
            </button>
            <span aria-live="polite" className="min-w-[140px] text-center font-bold text-sm">
                {value === 0 ? "No guesses yet" : `${value} wrong ${value === 1 ? "guess" : "guesses"}`}
            </span>
            <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="One more wrong guess">
                <ChevronRight className="w-4 h-4" strokeWidth={3} />
            </button>
        </div>
    );
}

function Tile({ tone, children, arrow }: { tone: keyof typeof FEEDBACK; children: ReactNode; arrow?: boolean }) {
    return (
        <span className="htp-tile relative grid place-items-center aspect-square px-1.5 rounded-[14px] border-2 border-[#1A1418] text-[#1A1418] font-bold text-[12.5px] leading-tight text-center whitespace-pre-line" style={{ background: FEEDBACK[tone].bg, boxShadow: `inset 0 -3px 0 ${FEEDBACK[tone].edge}` }}>
            {arrow && <ArrowUp aria-hidden className="absolute inset-0 m-auto w-12 h-12 opacity-25" strokeWidth={3} />}
            <span className="relative">{children}</span>
        </span>
    );
}

function ClassicGuide() {
    const [won, setWon] = useState(false);
    const [hints, setHints] = useState([0, 0]);
    const rows = won ? [CLASSIC_EXAMPLE.miss, CLASSIC_EXAMPLE.hit] : [CLASSIC_EXAMPLE.miss];
    return (
        <>
            <section className={CARD}>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,340px)] gap-7 items-center @max-[760px]:grid-cols-1 @max-[760px]:gap-5">
                    <div className="flex flex-col gap-3">
                        <Heading n={1}>HOW TO PLAY</Heading>
                        <Steps steps={["Type the name of a K-pop idol or group in the search bar.", "Press Enter or click the Guess button to submit.", "Each tile changes colour to show how close your guess is."]} />
                        <p className="mt-0.5 mb-0 py-[11px] px-3.5 rounded-[14px] border-2 border-dashed border-(--rule) font-normal text-sm leading-[1.55] [text-wrap:pretty]">
                            Search by the idol's <b>name</b> or <b>group name</b>. For soloists, search <b>"Soloist"</b>. Matching results show in alphabetical order as you type.
                        </p>
                    </div>
                    <SearchDemo />
                </div>
            </section>

            <section className={CARD}>
                <Heading n={2}>FEEDBACK</Heading>
                <div className="grid grid-cols-2 gap-5 @max-[760px]:grid-cols-1">
                    <div className="flex flex-col gap-2.5">
                        <span className="text-sm text-(--muted)">The colour of each tile changes depending on your guess:</span>
                        {(["correct", "partial", "incorrect"] as const).map((tone) => (
                            <div key={tone} className="flex items-center gap-3 font-semibold text-sm">
                                <span aria-hidden className="flex-none w-11 h-11 rounded-[12px] border-2 border-[#1A1418]" style={{ background: FEEDBACK[tone].bg, boxShadow: `0 3px 0 0 ${FEEDBACK[tone].edge},0 3px 0 2px #1A1418` }} />
                                {FEEDBACK[tone].label}
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col gap-2.5">
                        <span className="text-sm text-(--muted)">The arrows show whether <b>today's idol</b> is above or below your guess:</span>
                        {[{ up: true, k: "Up:", t: "today's idol is above. Younger, taller or debuted more recently." }, { up: false, k: "Down:", t: "today's idol is below. Older, shorter or debuted earlier." }].map((a) => (
                            <div key={a.k} className="flex items-start gap-3 text-sm">
                                <span aria-hidden className="flex-none grid place-items-center w-11 h-11 rounded-[12px] border-2 border-[#1A1418] bg-[#FD5C63] text-[#1A1418] [box-shadow:0_3px_0_0_#B91C1C,0_3px_0_2px_#1A1418]">
                                    <ArrowUp className={cn("w-6 h-6", !a.up && "rotate-180")} strokeWidth={3} />
                                </span>
                                <span><b>{a.k}</b> {a.t}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className={CARD}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex flex-col gap-2 max-w-[520px]">
                        <Heading n={3}>EXAMPLE</Heading>
                        <span className="text-sm text-(--muted)">
                            Let's say today's idol is <b>{CLASSIC_EXAMPLE.hit.name}</b>. Your first guess was <b>{CLASSIC_EXAMPLE.miss.name}</b>. Guess again to see the difference.
                        </span>
                    </div>
                    <PressButton variant={won ? "chip" : "cta"} onClick={() => setWon(!won)}>
                        {won ? "Reset example" : `Guess ${CLASSIC_EXAMPLE.hit.name}`}
                    </PressButton>
                </div>
                <div className="htp-scroll overflow-x-auto pb-2">
                    <div className="grid grid-cols-[repeat(8,minmax(76px,112px))] justify-center gap-2 min-w-[660px]">
                        {CLASSIC_EXAMPLE.columns.map((c) => (
                            <span key={c} className="text-center font-semibold text-[11px] tracking-[.06em] text-(--muted) pb-1 border-b-2 border-(--rule)">{c}</span>
                        ))}
                        {rows.flatMap((row) => [
                            <span key={`${row.name}-idol`} className="htp-tile relative aspect-square rounded-[14px] border-2 border-[#1A1418] overflow-hidden bg-[#FFE3F1]">
                                <img src={resolveCdnUrl(row.image) ?? ""} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                <span className="absolute inset-x-0 bottom-0 bg-[#1A1418]/70 text-white font-bold text-[11px] leading-tight px-1 py-1 truncate text-center">{row.name}</span>
                            </span>,
                            ...row.cells.map((cell, i) => (
                                <Tile key={`${row.name}-${i}`} tone={cell.tone} arrow={cell.arrow}>{cell.value}</Tile>
                            )),
                        ])}
                    </div>
                </div>
                <p aria-live="polite" className={cn("m-0 font-semibold text-sm", won ? "text-(--group)" : "text-(--muted)")}>
                    {won ? "All green. That's today's idol!" : CLASSIC_EXAMPLE.missNote}
                </p>
            </section>

            <section className={CARD}>
                <Heading n={4}>CATEGORIES</Heading>
                <span className="text-sm text-(--muted)">What each column means:</span>
                <div className="grid grid-cols-2 gap-3 @max-[580px]:grid-cols-1">
                    {CATEGORIES.map((c, i) => (
                        <div key={c.name} className={cn("htp-cat flex gap-3 items-start p-3 rounded-[16px] border-2 border-(--ink) bg-(--chip) [box-shadow:2px_3px_0_var(--ctl-off),var(--in)]", c.wide && "col-span-2 @max-[580px]:col-span-1")}>
                            <span aria-hidden className="htp-ctile flex-none grid place-items-center w-12 h-12 rounded-[12px] border-2 border-[#1A1418] font-bold text-[10px] text-[#1A1418] text-center leading-tight whitespace-pre-line" style={{ background: FEEDBACK[c.tone].bg, transform: `rotate(${i % 2 ? 3 : -3}deg)` }}>
                                {c.sample}
                            </span>
                            <span className="flex flex-col gap-1 min-w-0">
                                <span className="font-bold text-[15px]">{c.name}</span>
                                <span className="text-[13.5px] leading-normal text-(--muted)">{c.text}</span>
                                {c.notes?.map((n) => <span key={n} className="text-[13px] leading-normal text-(--muted)">• {n}</span>)}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            <section className={CARD}>
                <Heading n={5}>HINTS</Heading>
                <span className="text-sm text-(--muted)">Struggling? You can unlock hints after some guesses. Try the two cards.</span>
                <div className="grid grid-cols-2 gap-4 @max-[580px]:grid-cols-1">
                    {[{ cap: "GROUP MEMBERS", value: "5", at: HINT_AT.classic[0] }, { cap: "CURRENT GROUP", value: "LE SSERAFIM", at: HINT_AT.classic[1] }].map((hint, i) => {
                        const state = hints[i];
                        return (
                            <button
                                key={hint.cap}
                                type="button"
                                aria-label={`${hint.cap.toLowerCase()} hint`}
                                onClick={() => setHints((h) => h.map((v, k) => (k === i ? (v + 1) % 3 : v)))}
                                className="htp-hint pp-focus relative h-[150px] [perspective:800px] cursor-pointer bg-transparent border-0 p-0"
                                style={{ transform: `rotate(${i ? 1.5 : -1.5}deg)` }}
                            >
                                <span className="htp-flip relative block w-full h-full [transform-style:preserve-3d]" style={{ transform: state ? "rotateY(180deg)" : "none" }}>
                                    <span className="absolute inset-0 [backface-visibility:hidden] flex flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-(--ink) bg-[#FF8AC4] text-[#1A1418] [box-shadow:3px_4px_0_var(--ctl-off)]">
                                        <span className="font-bold text-[11px] tracking-[.14em]">HINT #{i + 1}</span>
                                        <span className="font-bold text-[40px] leading-none text-white [text-shadow:var(--puff-value)]">?</span>
                                        <span className="font-medium text-xs">Unlocks after {hint.at} guesses · tap to flip</span>
                                    </span>
                                    <span className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center gap-1.5 rounded-[18px] border-2 border-(--ink) bg-(--chip) text-(--chip-ink) [box-shadow:3px_4px_0_var(--ctl-off)]">
                                        <span className="font-bold text-[11px] tracking-[.14em] text-(--muted)">{hint.cap}</span>
                                        <span className="htp-val font-bold text-2xl" style={{ filter: state === 1 ? "blur(7px)" : "none" }}>{hint.value}</span>
                                        <span className="font-medium text-xs text-(--muted)">{state === 1 ? "Tap to unblur" : "Tap to flip back"}</span>
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
                <p className="m-0 text-sm leading-[1.6]">
                    <b>Member count</b> reveals how many members the idol's <b>current</b> group has. Soloists show <b>"Soloist"</b>. <b>Group name</b> reveals the idol's <b>current</b> group.
                </p>
                <Steps steps={["When a hint unlocks, flip its card over.", "Before that, the card shows how many guesses are left.", "After flipping, the hint is blurred. Click it to unblur."]} />
            </section>
        </>
    );
}

function Switch({ label, on, locked, lockText, onToggle }: { label: string; on: boolean; locked?: boolean; lockText?: string; onToggle: () => void }) {
    return (
        <div className={cn("flex items-center gap-2.5", locked && "opacity-45")}>
            {locked && <span className="inline-flex items-center gap-1 font-bold text-[11px] text-(--muted)"><Lock className="w-3 h-3" strokeWidth={3} aria-hidden />{lockText}</span>}
            <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={label}
                disabled={locked}
                onClick={onToggle}
                className={cn("pp-focus relative w-[52px] h-[30px] rounded-full border-2 border-(--ink) transition-colors duration-300", on ? "bg-[#FF8AC4]" : "bg-(--chip-hover)", locked ? "cursor-default" : "cursor-pointer")}
            >
                <span className="absolute top-[3px] left-[3px] w-5 h-5 rounded-full border-2 border-[#1A1418] bg-white transition-transform duration-400 ease-(--ease-pop)" style={{ transform: on ? "translate3d(22px,0,0)" : "none" }} />
            </button>
        </div>
    );
}

const lockLeft = (guesses: number, need: number) => `${need - guesses} ${need - guesses === 1 ? "guess" : "guesses"}`;

function BlurryGuide() {
    const [guesses, setGuesses] = useState(0);
    const [hard, setHard] = useState(false);
    const [color, setColor] = useState(false);
    const colorOk = guesses >= HINT_AT.blurryColor;
    const blur = hard ? BLUR_LEVELS[0] : BLUR_LEVELS[Math.min(guesses, BLUR_LEVELS.length - 1)];
    return (
        <>
            <section className={CARD}>
                <div className="grid grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-7 items-center @max-[760px]:grid-cols-1 @max-[760px]:gap-5">
                    <div className="flex flex-col gap-3.5">
                        <div className="aspect-square rounded-[18px] border-[2.5px] border-[#1A1418] overflow-hidden bg-[#DCD6D2] [box-shadow:4px_5px_0_var(--ctl-off)]">
                            <img src={resolveCdnUrl(CLASSIC_EXAMPLE.hit.image) ?? ""} alt="Blurred idol photo" className="htp-blur block w-full h-full object-cover scale-110" style={{ filter: `blur(${blur}px) grayscale(${color && colorOk ? 0 : 1})` }} />
                        </div>
                        <GuessStepper value={guesses} max={BLUR_LEVELS.length - 1} onChange={setGuesses} />
                    </div>
                    <div className="flex flex-col gap-4">
                        <Heading n={1}>HOW TO PLAY</Heading>
                        <Steps steps={["Type the name of a K-pop idol or group in the search bar.", "Press Enter or click the Guess button to submit.", "The photo starts blurred and gets clearer with each guess."]} />
                        <p className="m-0 text-sm text-(--muted)"><b>Important:</b> not all idols are in Blurry mode yet. The list is updated regularly.</p>
                    </div>
                </div>
            </section>
            <section className={CARD}>
                <Heading n={2}>HELPS</Heading>
                <span className="text-sm text-(--muted)">Two switches change how the photo behaves. Try them on the photo above.</span>
                {[
                    { label: "Hardmode", text: "Guesses will NOT unblur the photo. For players who want a challenge.", on: hard, toggle: () => setHard(!hard) },
                    { label: "Color", text: `Reveals the photo's colours. Unlocks after ${HINT_AT.blurryColor} guesses, for when you're struggling to spot the idol.`, on: color && colorOk, locked: !colorOk, toggle: () => setColor(!color) },
                ].map((h) => (
                    <div key={h.label} className="flex flex-col gap-2 p-3.5 rounded-[16px] border-2 border-(--ink) bg-(--chip)">
                        <div className="flex items-center justify-between gap-3">
                            <span className="font-bold text-[15px]">{h.label}</span>
                            <Switch label={h.label} on={h.on} locked={h.locked} lockText={`+ ${lockLeft(guesses, HINT_AT.blurryColor)}`} onToggle={h.toggle} />
                        </div>
                        <span className="text-[13.5px] text-(--muted)">{h.text}</span>
                    </div>
                ))}
            </section>
        </>
    );
}

function PixelatedGuide() {
    const [guesses, setGuesses] = useState(0);
    const [open, setOpen] = useState([false, false]);
    const sleeves = [
        { label: "Release Year", ko: "발매년도", value: "2022", at: HINT_AT.pixelated[0], bg: "#E4E4E4", ink: "#72401A" },
        { label: "Artist", ko: "가수", value: "IVE", at: HINT_AT.pixelated[1], bg: "#FFD1E8", ink: "#5A1A48" },
    ];
    return (
        <>
            <section className={CARD}>
                <div className="grid grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-7 items-center @max-[760px]:grid-cols-1 @max-[760px]:gap-5">
                    <div className="flex flex-col gap-3.5">
                        <div className="relative aspect-square rounded-[18px] border-[2.5px] border-[#1A1418] overflow-hidden bg-[#DCD6D2] [box-shadow:4px_5px_0_var(--ctl-off)]">
                            {/* The game's own mosaic canvas, so each step looks exactly like that attempt in Pixelated. */}
                            <PixelatedCanvas
                                imageUrl={resolveCdnUrl("/images/albums/after_like.webp") ?? undefined}
                                blockSize={PIXEL_LEVELS[Math.min(guesses, PIXEL_LEVELS.length - 1)]}
                                alt="Pixelated album cover"
                                className="absolute inset-0 w-full h-full"
                            />
                        </div>
                        <GuessStepper value={guesses} max={PIXEL_LEVELS.length - 1} onChange={setGuesses} />
                    </div>
                    <div className="flex flex-col gap-4">
                        <Heading n={1}>HOW TO PLAY</Heading>
                        <Steps steps={["Type the name of an album in the search bar and pick it from the list.", "Each wrong guess makes the cover less pixelated.", `There are ${PIXEL_LEVELS.length} levels. On the last one the full cover is shown.`]} />
                    </div>
                </div>
            </section>
            <section className={CARD}>
                <Heading n={2}>HINTS</Heading>
                <span className="text-sm text-(--muted)">Two hint sleeves unlock as you guess. Use the arrows above to add guesses.</span>
                <div className="flex flex-col gap-4">
                    {sleeves.map((s, i) => {
                        const ok = guesses >= s.at;
                        const isOpen = ok && open[i];
                        return (
                            <div key={s.label} className="relative h-[96px]">
                                <div aria-hidden className="htp-disc absolute left-2 top-2 w-20 h-20 rounded-full bg-[#0D0008] border-2 border-[#1A1418] grid place-items-center" style={{ transform: isOpen ? "translate3d(82px,0,0) rotate(360deg)" : "none" }}>
                                    <span className="w-10 h-10 rounded-full grid place-items-center font-bold text-xs" style={{ background: s.bg, color: s.ink }}>{s.value}</span>
                                </div>
                                <button
                                    type="button"
                                    disabled={!ok}
                                    aria-label={ok ? `${s.label} hint` : `${s.label} hint, locked`}
                                    onClick={() => setOpen((o) => o.map((v, k) => (k === i ? !v : v)))}
                                    className="htp-sleeve pp-focus absolute left-0 top-0 w-[96px] h-[96px] rounded-[10px] border-2 border-[#1A1418] flex flex-col justify-between p-2 text-left [box-shadow:3px_4px_0_var(--ctl-off)] disabled:cursor-default cursor-pointer"
                                    style={{ background: s.bg, color: s.ink, transform: isOpen ? "translate3d(-6px,0,0) rotate(-7deg)" : "rotate(-2deg)" }}
                                >
                                    <span className="font-bold text-[9px] tracking-[.12em]">HINT #{i + 1}</span>
                                    <span className="font-bold text-[13px] leading-tight">{s.label}<br /><span lang="ko" className="font-korean text-[10px]">{s.ko}</span></span>
                                    <span className="font-semibold text-[9px]">{ok ? (isOpen ? "Tap to hide" : "Tap to reveal") : `+ ${lockLeft(guesses, s.at)}`}</span>
                                </button>
                                <span className="absolute left-[200px] top-1/2 -translate-y-1/2 text-sm @max-[430px]:hidden">
                                    <b>{s.label}</b> unlocks after <b>{s.at} guesses</b>.
                                </span>
                            </div>
                        );
                    })}
                </div>
                <span className="text-sm text-(--muted)">Tap an unlocked sleeve to reveal it, tap again to hide it.</span>
            </section>
        </>
    );
}

export default function HowToPlay() {
    const hydrated = useHydrated();
    const [params, setParams] = useSearchParams();
    // Prerendered as Classic; ?mode= switches once the page is live.
    const mode: HowToMode = hydrated ? parseMode(params.get("mode")) : "classic";
    const { timeRemaining, formattedTime } = useResetTimer({ day: null });
    const name = mode[0].toUpperCase() + mode.slice(1);

    const pick = (next: HowToMode) =>
        setParams((p) => {
            if (next === "classic") p.delete("mode");
            else p.set("mode", next);
            return p;
        }, { replace: true, preventScrollReset: true });

    return (
        <>
            <PageMeta
                title="How to play KpopIt: Classic, Blurry and Pixelated rules"
                description="How each KpopIt mode works: tile colours and arrows in Classic, the blurred photo in Blurry, the pixelated album cover in Pixelated, and when hints unlock."
                path="/how-to-play"
            />
            <PageShell header={{ title: "How to play", korean: "게임 방법", koreanLength: "long", subtitle: HOW_TO_PLAY[mode].intro }} width="max-w-[880px]">
                <div className="pp-enter [--pp-delay:140ms] flex flex-col items-center gap-4 mt-6 mb-[34px]">
                    <div role="tablist" aria-label="Game mode" className="flex gap-2 justify-center @max-[359px]:gap-1.5">
                        {MODES.map((m) => (
                            <Pill key={m} role="tab" aria-selected={mode === m} active={mode === m} onClick={() => pick(m)} className="h-11 px-5 text-[15px] font-bold @max-[359px]:px-[13px] @max-[359px]:text-sm">
                                {m[0].toUpperCase() + m.slice(1)}
                            </Pill>
                        ))}
                    </div>
                    <div className="flex flex-col items-center gap-[5px] pt-[9px] px-[22px] pb-2.5 rounded-[20px] border-2 border-dashed border-(--rule) text-(--muted) text-center">
                        <div className="flex items-center gap-2.5 whitespace-nowrap">
                            <span className="font-semibold text-[13px]">{mode === "pixelated" ? "Next album in" : "Next idol in"}</span>
                            <span aria-label="Time left" className="htp-clock inline-flex font-bold text-[19px] leading-none text-(--text)">
                                {timeRemaining === null ? "--:--:--" : formattedTime}
                            </span>
                        </div>
                        <span className="font-medium text-xs whitespace-nowrap">Midnight at UTC-5 (EST)</span>
                    </div>
                </div>

                <div key={mode} className="flex flex-col gap-[26px]">
                    {mode === "classic" && <ClassicGuide />}
                    {mode === "blurry" && <BlurryGuide />}
                    {mode === "pixelated" && <PixelatedGuide />}
                    <div className="flex items-center justify-center gap-4 flex-wrap mt-3">
                        <span className="font-caveat font-bold text-[28px] text-(--group) -rotate-2">Good luck and have fun!</span>
                        <PressLink to={`/${mode}`} variant="cta" size="lg">{`Play ${name}`}</PressLink>
                    </div>
                </div>
            </PageShell>
        </>
    );
}
