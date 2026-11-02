import { useState } from "react";
import { ArrowUp, Search } from "lucide-react";
import { PressButton } from "../../components/buttons/PressButton";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { cn } from "../../lib/utils";
import { CATEGORIES, CLASSIC_EXAMPLE, FEEDBACK, HINT_AT } from "./howToPlayData";
import { FeedbackTile, GuideCard, Heading, Steps } from "./HowToPlayParts";

const SEARCH_ROWS = [
    { name: "Kim Chaewon", group: "LE SSERAFIM", image: "/images/idols/chaewon.webp", isActive: true },
    { name: "Chaeyoung", group: "TWICE", image: "/images/idols/chaeyoung.webp", isActive: false },
];

const ARROWS = [
    { isUp: true, word: "Up:", text: "today's idol is above. Younger, taller or debuted more recently." },
    { isUp: false, word: "Down:", text: "today's idol is below. Older, shorter or debuted earlier." },
];

const HINTS = [
    { caption: "GROUP MEMBERS", value: "5", unlocksAt: HINT_AT.classic[0] },
    { caption: "CURRENT GROUP", value: "LE SSERAFIM", unlocksAt: HINT_AT.classic[1] },
];

const MUTED = "text-sm text-(--muted)";

/** The search bar as it looks while typing, with the first two matches (decorative). */
const SearchDemo = () => {
    return (
        <div aria-hidden className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 p-1.5 rounded-full border-2 border-(--ink) bg-(--chip) shadow-[3px_4px_0_var(--ctl-off),var(--in)]">
                <span className="flex flex-1 items-center min-w-0 h-10 px-4 rounded-full border-[1.5px] border-(--ink) bg-(--ground) font-medium text-sm text-(--text)">
                    chae
                    <span className="how-to-play-caret w-0.5 h-4.5 ml-0.5 bg-neon-pink" />
                </span>

                <span className="grid place-items-center flex-none size-11 rounded-full border-2 border-[#1A1418] bg-neon-pink text-[#1A1418] shadow-[2px_3px_0_#1A1418]">
                    <Search className="size-4.5" strokeWidth={3} />
                </span>
            </div>

            <div className="flex flex-col gap-0.75 p-1.5 rounded-[22px] border-2 border-(--ink) bg-(--menu-bg) text-(--chip-ink) shadow-[3px_4px_0_var(--ctl-off)]">
                {SEARCH_ROWS.map((row) => (
                    <div
                        key={row.name}
                        className={cn("flex items-center gap-3 py-1.5 px-2.5 rounded-2xl border-2", row.isActive ? "border-(--ink) bg-(--opt-hover)" : "border-transparent")}
                    >
                        <span
                            className={cn(
                                "relative grid place-items-center flex-none size-10 overflow-hidden rounded-full",
                                "border-2 border-[#1A1418] bg-[#FFE3F1] font-bold text-[15px] text-[#1A1418]",
                            )}
                        >
                            {row.name[0]}
                            <img src={resolveCdnUrl(row.image) ?? ""} alt="" className="absolute inset-0 size-full object-cover" />
                        </span>

                        <span className="font-bold text-sm">
                            {row.name} <span className="font-medium text-(--muted)">({row.group})</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/** A hint card that flips over and unblurs: front, blurred value, clear value, then back to front. */
const HintCard = ({ hint, index, step, onStep }: { hint: (typeof HINTS)[number]; index: number; step: number; onStep: () => void }) => {
    const face = "absolute inset-0 flex flex-col items-center justify-center rounded-[18px] border-2 border-(--ink) shadow-[3px_4px_0_var(--ctl-off)] backface-hidden";

    return (
        <button
            type="button"
            aria-label={`${hint.caption.toLowerCase()} hint`}
            onClick={onStep}
            className={cn(
                "pp-focus relative h-37.5 p-0 border-0 bg-transparent cursor-pointer perspective-midrange",
                "transition-[translate,rotate] duration-450 ease-(--ease-settle) will-change-transform",
                "hover:-translate-y-0.75 hover:rotate-0 active:translate-x-0.5 active:translate-y-0.75 active:rotate-0 active:duration-150",
                index ? "rotate-[1.5deg]" : "rotate-[-1.5deg]",
            )}
        >
            <span
                className={cn(
                    "relative block size-full transform-3d",
                    "transition-transform duration-800 ease-[cubic-bezier(.34,1.35,.64,1)]",
                    step > 0 && "rotate-y-180",
                )}
            >
                <span className={cn(face, "gap-1 bg-[#FF8AC4] text-[#1A1418]")}>
                    <span className="font-bold text-[11px] tracking-[.14em]">HINT #{index + 1}</span>
                    <span className="font-bold text-[40px] leading-none text-white text-shadow-(--puff-value)">?</span>
                    <span className="font-medium text-xs">Unlocks after {hint.unlocksAt} guesses · tap to flip</span>
                </span>

                <span className={cn(face, "gap-1.5 bg-(--chip) text-(--chip-ink) rotate-y-180")}>
                    <span className="font-bold text-[11px] tracking-[.14em] text-(--muted)">{hint.caption}</span>
                    <span className={cn("font-bold text-2xl transition-[filter] duration-550 ease-(--ease-settle)", step === 1 && "blur-[7px]")}>{hint.value}</span>
                    <span className="font-medium text-xs text-(--muted)">{step === 1 ? "Tap to unblur" : "Tap to flip back"}</span>
                </span>
            </span>
        </button>
    );
};

const ClassicGuide = () => {
    const [isWon, setIsWon] = useState(false);
    const [hintSteps, setHintSteps] = useState([0, 0]);
    const rows = isWon ? [CLASSIC_EXAMPLE.miss, CLASSIC_EXAMPLE.hit] : [CLASSIC_EXAMPLE.miss];

    const stepHint = (index: number) => setHintSteps((steps) => steps.map((step, i) => (i === index ? (step + 1) % 3 : step)));

    return (
        <>
            <GuideCard index={0}>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,340px)] @max-[761px]:grid-cols-1 items-center gap-7 @max-[761px]:gap-5">
                    <div className="flex flex-col gap-3">
                        <Heading number={1}>HOW TO PLAY</Heading>

                        <Steps
                            steps={[
                                "Type the name of a K-pop idol or group in the search bar.",
                                "Press Enter or click the Guess button to submit.",
                                "Each tile changes colour to show how close your guess is.",
                            ]}
                        />

                        <p className="mt-0.5 mb-0 py-2.75 px-3.5 rounded-[14px] border-2 border-dashed border-(--rule) font-normal text-sm leading-[1.55] text-pretty">
                            Search by the idol's <b>name</b> or <b>group name</b>. For soloists, search <b>"Soloist"</b>.
                            Matching results show in alphabetical order as you type.
                        </p>
                    </div>

                    <SearchDemo />
                </div>
            </GuideCard>

            <GuideCard index={1}>
                <Heading number={2}>FEEDBACK</Heading>

                <div className="grid grid-cols-2 @max-[761px]:grid-cols-1 gap-5">
                    <div className="flex flex-col gap-2.5">
                        <span className={MUTED}>The colour of each tile changes depending on your guess:</span>

                        {(["correct", "partial", "incorrect"] as const).map((tone) => (
                            <div key={tone} className="flex items-center gap-3 font-semibold text-sm">
                                <span aria-hidden className={cn("flex-none size-11 rounded-xl border-2 border-[#1A1418]", FEEDBACK[tone].ground, FEEDBACK[tone].swatchEdge)} />
                                {FEEDBACK[tone].label}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2.5">
                        <span className={MUTED}>The arrows show whether <b>today's idol</b> is above or below your guess:</span>

                        {ARROWS.map((arrow) => (
                            <div key={arrow.word} className="flex items-start gap-3 text-sm">
                                <span
                                    aria-hidden
                                    className={cn(
                                        "grid place-items-center flex-none size-11 rounded-xl",
                                        "border-2 border-[#1A1418] bg-[#FD5C63] text-[#1A1418] shadow-[0_3px_0_0_#B91C1C,0_3px_0_2px_#1A1418]",
                                    )}
                                >
                                    <ArrowUp className={cn("size-6", !arrow.isUp && "rotate-180")} strokeWidth={3} />
                                </span>

                                <span><b>{arrow.word}</b> {arrow.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </GuideCard>

            <GuideCard index={2}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-col gap-2 max-w-130">
                        <Heading number={3}>EXAMPLE</Heading>

                        <span className={MUTED}>
                            Let's say today's idol is <b>{CLASSIC_EXAMPLE.hit.name}</b>. Your first guess was <b>{CLASSIC_EXAMPLE.miss.name}</b>.
                            Guess again to see the difference.
                        </span>
                    </div>

                    <PressButton variant={isWon ? "chip" : "cta"} onClick={() => setIsWon(!isWon)}>
                        {isWon ? "Reset example" : `Guess ${CLASSIC_EXAMPLE.hit.name}`}
                    </PressButton>
                </div>

                <div className="overflow-x-auto pb-2 scrollbar-thin [scrollbar-color:#FF8AC4_transparent]">
                    <div className="grid grid-cols-[repeat(8,minmax(76px,112px))] justify-center gap-2 min-w-165">
                        {CLASSIC_EXAMPLE.columns.map((column) => (
                            <span key={column} className="pb-1 border-b-2 border-(--rule) font-semibold text-[11px] tracking-[.06em] text-center text-(--muted)">
                                {column}
                            </span>
                        ))}

                        {rows.flatMap((row) => [
                            <span
                                key={`${row.name}-idol`}
                                className="how-to-play-tile-enter relative aspect-square overflow-hidden rounded-[14px] border-2 border-[#1A1418] bg-[#FFE3F1]"
                            >
                                <img src={resolveCdnUrl(row.image) ?? ""} alt="" className="absolute inset-0 size-full object-cover" />
                                <span className="absolute inset-x-0 bottom-0 p-1 bg-[#1A1418]/70 font-bold text-[11px] leading-tight text-center text-white truncate">
                                    {row.name}
                                </span>
                            </span>,
                            ...row.cells.map((cell, i) => (
                                <FeedbackTile key={`${row.name}-${i}`} tone={cell.tone} arrow={cell.arrow}>{cell.value}</FeedbackTile>
                            )),
                        ])}
                    </div>
                </div>

                <p aria-live="polite" className={cn("m-0 font-semibold text-sm", isWon ? "text-(--group)" : "text-(--muted)")}>
                    {isWon ? "All green. That's today's idol!" : CLASSIC_EXAMPLE.missNote}
                </p>
            </GuideCard>

            <GuideCard index={3}>
                <Heading number={4}>CATEGORIES</Heading>
                <span className={MUTED}>What each column means:</span>

                <div className="grid grid-cols-2 @max-[581px]:grid-cols-1 gap-3">
                    {CATEGORIES.map((category, i) => (
                        <div
                            key={category.name}
                            className={cn(
                                "group/category flex items-start gap-3 p-3 rounded-2xl",
                                "border-2 border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
                                "transition-[translate] duration-450 ease-(--ease-settle) transform-gpu hover:-translate-y-0.5",
                                category.wide && "col-span-2 @max-[581px]:col-span-1",
                            )}
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    "grid place-items-center flex-none size-12 rounded-xl border-2 border-[#1A1418]",
                                    "font-bold text-[10px] leading-tight text-center text-[#1A1418] whitespace-pre-line",
                                    "transition-[rotate] duration-500 ease-(--ease-settle) will-change-transform group-hover/category:rotate-0",
                                    i % 2 ? "rotate-3" : "-rotate-3",
                                    FEEDBACK[category.tone].ground,
                                )}
                            >
                                {category.sample}
                            </span>

                            <span className="flex flex-col gap-1 min-w-0">
                                <span className="font-bold text-[15px]">{category.name}</span>
                                <span className="text-[13.5px] leading-normal text-(--muted)">{category.text}</span>
                                {category.notes?.map((note) => <span key={note} className="text-[13px] leading-normal text-(--muted)">• {note}</span>)}
                            </span>
                        </div>
                    ))}
                </div>
            </GuideCard>

            <GuideCard index={4}>
                <Heading number={5}>HINTS</Heading>
                <span className={MUTED}>Struggling? You can unlock hints after some guesses. Try the two cards.</span>

                <div className="grid grid-cols-2 @max-[581px]:grid-cols-1 gap-4">
                    {HINTS.map((hint, i) => (
                        <HintCard key={hint.caption} hint={hint} index={i} step={hintSteps[i]} onStep={() => stepHint(i)} />
                    ))}
                </div>

                <p className="m-0 text-sm leading-[1.6]">
                    <b>Member count</b> reveals how many members the idol's <b>current</b> group has. Soloists show <b>"Soloist"</b>.
                    {" "}<b>Group name</b> reveals the idol's <b>current</b> group.
                </p>

                <Steps
                    steps={[
                        "When a hint unlocks, flip its card over.",
                        "Before that, the card shows how many guesses are left.",
                        "After flipping, the hint is blurred. Click it to unblur.",
                    ]}
                />
            </GuideCard>
        </>
    );
};

export default ClassicGuide;
