import { useEffect, useRef, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "../../lib/utils";
import { INKIT_CONFIG } from "../../features/inkit/config.ts";
import { spriteUrl } from "../../features/inkit/sprites.ts";

const ERASE_MS = 720;
const WRITE_MS = 960;

type HintPhase = "idle" | "erase" | "write" | "used";

interface HintCardProps {
    label: string;
    /** Guesses still to make before the hint unlocks (0 = ready). */
    guessesLeft: number;
    /** The hint was already used when the card appeared: no animation. */
    used: boolean;
    disabled: boolean;
    reducedMotion: boolean;
    tilt: string;
    testId: string;
    /** Asks for the hint; resolves false when it couldn't be used. */
    onUse: () => Promise<boolean> | boolean;
    /** The result has been written on the card. */
    onRevealed?: () => void;
    children: ReactNode;
}

/** A paper card: tapping a ready hint rubs the label out and writes the result in. */
const HintCard = ({ label, guessesLeft, used, disabled, reducedMotion, tilt, testId, onUse, onRevealed, children }: HintCardProps) => {
    const [phase, setPhase] = useState<HintPhase>("idle");
    const [isAsking, setIsAsking] = useState(false);
    const timers = useRef<number[]>([]);

    useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

    // A hint used before this card appeared (reload, another device) shows its result at once.
    // (Not while this card is asking: its own animation shows the result.)
    const shown: HintPhase = phase === "idle" && used && !isAsking ? "used" : phase;
    const isLocked = guessesLeft > 0 && shown === "idle";
    const isReady = !isLocked && shown === "idle" && !disabled;
    const isAnimating = shown === "erase" || shown === "write";

    const use = async () => {
        if (!isReady || isAsking) return;

        setIsAsking(true);
        const ok = await onUse();
        setIsAsking(false);
        if (!ok) return;

        if (reducedMotion) {
            setPhase("used");
            onRevealed?.();
            return;
        }

        setPhase("erase");
        timers.current.push(
            window.setTimeout(() => setPhase("write"), ERASE_MS),
            window.setTimeout(() => {
                setPhase("used");
                onRevealed?.();
            }, ERASE_MS + WRITE_MS),
        );
    };

    const tab = isLocked ? `${guessesLeft} more` : shown === "used" ? "Used" : shown === "idle" ? (disabled ? "Unused" : "Tap") : "...";
    const isTabPink = !isLocked && shown !== "used" && !disabled;

    return (
        <button
            type="button"
            onClick={use}
            disabled={!isReady}
            aria-label={isLocked ? `${label} hint, unlocks in ${guessesLeft} ${guessesLeft === 1 ? "guess" : "guesses"}` : `${label} hint`}
            data-testid={testId}
            data-state={isLocked ? "locked" : shown}
            className={cn(
                "pp-focus relative mb-1.25 block h-22.5 rounded-[18px] border-2 border-(--ink) bg-(--face) p-2 text-left max-[900px]:h-15.5",
                "[container-type:inline-size] transition-[translate] duration-200 ease-(--ease-settle)",
                tilt,
                isAnimating ? "z-5" : "z-1",
                isLocked ? "shadow-[2px_3px_0_var(--ctl-off),var(--in)]" : "shadow-[0_7px_0_-2px_#FF8AC4,0_7px_0_0_var(--ink),var(--in)]",
                isReady ? "cursor-pointer active:translate-y-0.5" : "cursor-default",
            )}
        >
            <div className="inkit-paper-card relative grid h-full place-items-center overflow-hidden rounded-[11px] border-[1.5px] border-[rgba(26,20,24,.22)]">
                {(shown === "idle" || shown === "erase") && (
                    <span
                        className={cn(
                            "col-start-1 row-start-1 px-[.25em] py-[.3em] font-caveat font-bold text-4xl leading-tight text-[#4A4448] max-[900px]:text-[25px]",
                            (isLocked || (disabled && shown === "idle")) && "opacity-45",
                            shown === "erase" && "animate-[ikErase_.7s_linear_forwards]",
                        )}
                    >
                        {label}
                    </span>
                )}

                {(shown === "write" || shown === "used") && (
                    <span
                        data-testid={`${testId}-result`}
                        className={cn(
                            "col-start-1 row-start-1 flex items-center gap-1.5 px-[.3em] py-[.35em]",
                            "font-script text-[27px] leading-none whitespace-nowrap text-[#1A1418] max-[900px]:text-[19px]",
                            shown === "write" && "animate-[ikWrite_.9s_linear_both]",
                        )}
                    >
                        {children}
                    </span>
                )}
            </div>

            {shown === "erase" && (
                <span aria-hidden className="absolute top-1/2 left-0 z-3 animate-[ikMove_.7s_linear_forwards]">
                    <img src={spriteUrl("eraser")} alt="" className="inkit-sprite absolute size-11.5 max-w-none animate-[ikWig_.18s_ease-in-out_infinite]" />
                </span>
            )}

            {shown === "write" && (
                <span aria-hidden className="absolute top-[44%] left-0 z-3 animate-[ikMove_.9s_linear_forwards]">
                    <img src={spriteUrl("pen")} alt="" className="inkit-sprite absolute size-11.5 max-w-none translate-x-[-10%] translate-y-[-90%] rotate-[-6deg]" />
                </span>
            )}

            <span
                className={cn(
                    "absolute -top-2.75 left-3 flex items-center gap-1 rounded-[7px] border-2 border-(--ink) px-2 py-0.5 font-bold text-[11px]",
                    isTabPink ? "bg-[#FF70B8] text-white text-shadow-(--tag-text)" : "bg-(--face) text-(--muted)",
                )}
            >
                {isLocked && <Lock className="size-2.5" strokeWidth={2.8} aria-hidden />}
                {tab}
            </span>
        </button>
    );
};

interface InkHintsProps {
    round: number;
    finished: boolean;
    reducedMotion: boolean;
    /** Hint 1 was already used in this game. */
    inkHintUsed: boolean;
    onUseInkHint: () => Promise<boolean>;
    /** The answer's groups, once round 8 unlocked them (the server sends them only then). */
    groupHint: string[] | null;
    groupHintShown: boolean;
    onShowGroupHint: () => void;
}

const BOOST_LABEL = `+${Math.round(INKIT_CONFIG.hint1.bonus * 100)}%`;

/** Hint 1 "More ink" (opt-in, from round 5) and hint 2 "Group" (from round 8). */
const InkHints = ({
    round, finished, reducedMotion, inkHintUsed, onUseInkHint, groupHint, groupHintShown, onShowGroupHint,
}: InkHintsProps) => {
    return (
        <div className="grid w-110 max-w-full grid-cols-2 gap-3.5 pt-2.5 max-[1180px]:w-95 max-[900px]:w-full">
            <HintCard
                label="More ink"
                guessesLeft={Math.max(0, INKIT_CONFIG.hint1.fromRound - round)}
                used={inkHintUsed}
                disabled={finished}
                reducedMotion={reducedMotion}
                tilt="rotate-[-.5deg]"
                testId="inkit-hint-ink"
                onUse={onUseInkHint}
            >
                Max ink
                <span className="rounded-full border-[1.5px] border-[#1A1418] bg-[#FF70B8] px-1.75 py-px font-[DynaPuff,system-ui,sans-serif] font-bold text-xs text-white text-shadow-(--tag-text)">
                    {BOOST_LABEL}
                </span>
            </HintCard>

            <HintCard
                label="Group"
                guessesLeft={groupHint ? 0 : Math.max(1, INKIT_CONFIG.hint2.fromRound - round)}
                used={groupHintShown}
                disabled={finished}
                reducedMotion={reducedMotion}
                tilt="rotate-[.5deg]"
                testId="inkit-hint-group"
                onUse={() => groupHint !== null}
                onRevealed={onShowGroupHint}
            >
                {groupHint?.join(", ") || "No group"}
            </HintCard>
        </div>
    );
};

export default InkHints;
