import { useState } from "react";

interface PixelatedHintsProps {
    guessCount: number;
    releaseYear: number;
    artistName: string;
}

type HintId = "year" | "artist";

interface HintDef {
    id: HintId;
    sleeve: "year" | "artist";
    label: string;
    korean: string;
    unlockGuesses: number;
    stampIndex: string;
}

const HINTS: HintDef[] = [
    { id: "year", sleeve: "year", label: "Release Year", korean: "연도", unlockGuesses: 3, stampIndex: "#01" },
    { id: "artist", sleeve: "artist", label: "Artist", korean: "아티스트", unlockGuesses: 3, stampIndex: "#02" },
];

const PixelatedHints = ({ guessCount, releaseYear, artistName }: PixelatedHintsProps) => {
    const [opened, setOpened] = useState<Record<HintId, boolean>>({ year: false, artist: false });

    const hintValue = (id: HintId) => (id === "year" ? String(releaseYear) : artistName);

    return (
        <div className="pixel-hints flex w-full justify-center items-start gap-6 zm:gap-12 sm:gap-22 lg:gap-20 xl:gap-22">
            {HINTS.map((hint) => {
                const unlocked = guessCount >= hint.unlockGuesses;
                const isOpen = unlocked && opened[hint.id];
                const remaining = Math.max(0, hint.unlockGuesses - guessCount);
                return (
                    <div
                        key={hint.id}
                        /* Below zm the card matches the sleeve width (so two fit) and grows
                           downward on open to reserve room for the disc that drops out the
                           bottom. zm+ keeps the original w-40/h-46 + sideways reveal. */
                        className={`relative shrink-0 w-28 zm:w-40 zm:h-46
                            transition-[height] duration-550 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none
                            ${isOpen ? "h-58" : "h-37"} ${unlocked ? "cursor-pointer" : ""}`}
                        role={unlocked ? "button" : undefined}
                        tabIndex={unlocked ? 0 : undefined}
                        aria-label={unlocked ? `${hint.label} hint` : `${hint.label} hint, locked`}
                        onClick={() => unlocked && setOpened((s) => ({ ...s, [hint.id]: !s[hint.id] }))}
                    >
                        {/* Vinyl disc behind the sleeve */}
                        <div
                            className={`pixel-hint-disc absolute z-1 w-27 h-27 zm:w-28 zm:h-28 sm:w-31 sm:h-31 xl:w-35 xl:h-35 rounded-full rotate-[2.4deg]
                                shadow-[0_4px_10px_rgba(0,0,0,0.32),inset_0_0_0_1px_rgba(255,255,255,0.05)]
                                left-1/2 -translate-x-1/2 zm:translate-x-0
                                transition-[top,left] duration-550 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none
                                ${isOpen
                                    ? "top-32 zm:top-5 zm:left-22 sm:left-26 lg:left-22 xl:left-26"
                                    : "top-5 zm:left-4 lg:left-0 xl:left-4"}`}
                        >
                            <div
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[62%] h-[62%] rounded-full
                                    bg-neon-pink flex flex-col items-center justify-center text-center p-1
                                    shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25),inset_0_2px_4px_rgba(255,255,255,0.18)]
                                    transition-opacity duration-350 delay-[180ms] motion-reduce:transition-none"
                            >
                                <span className={`font-bold ${hintValue(hint.id).length > 8 ? "text-[12px] xl:text-sm" : "text-sm xl:text-base"} text-white leading-[1.02] [text-shadow:0_1px_0_rgba(0,0,0,0.5)]`}>
                                    {hintValue(hint.id)}
                                </span>
                            </div>
                        </div>

                        {/* Paper sleeve on top */}
                        <div
                            className={`absolute top-2 z-2 left-1/2 -translate-x-1/2 zm:translate-x-0 zm:left-0 lg:-left-4 xl:left-0
                                w-27 h-33 sm:w-30 sm:h-36 xl:w-34 xl:h-40 px-2 py-2 border-2 rounded-lg border-ink -rotate-2
                                flex flex-col justify-between select-none
                                shadow-[0_4px_0_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.10)]
                                ${hint.sleeve === "year" ? "bg-[#ffe047] text-[#422006]" : "bg-[#ffd1e8] text-[#5a1a48]"}`}
                        >
                            <div className="flex justify-between text-sm font-bold uppercase">
                                <span>Hint</span>
                                <span className="opacity-60">{hint.stampIndex}</span>
                            </div>

                            <div>
                                <div className="font-bold text-xl leading-none">{hint.label}</div>
                                <div className="font-korean text-sm opacity-60 font-bold">{hint.korean}</div>
                            </div>
                            
                            <div className="font-bold text-[12px] uppercase">
                                {unlocked ? (isOpen ? "← tap to hide" : "tap to reveal →") : "locked"}
                            </div>

                            {!unlocked && (
                                <div className="absolute -top-3 -right-3 px-3 py-1.5 rounded-full rotate-6
                                    bg-ink text-white font-bold text-sm shadow-[2px_2px_0_var(--color-neon-pink)]">
                                    + {remaining}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PixelatedHints;
