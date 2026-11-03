import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import ArrowUp from "../../assets/icons/arrow-fat-line-up-fill.svg";
import { cn } from "../../lib/utils";
import { FEEDBACK, type Tone } from "./howToPlayData";

/** A guide card; cards rise in one after another by their `index`. */
export const GuideCard = ({ index, className, children }: { index: number; className?: string; children: ReactNode }) => {
    return (
        <section
            className={cn(
                "pp-enter flex flex-col gap-4.5 p-6.5 @max-[581px]:p-4.5 rounded-[23px]",
                "border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[5px_5px_0_0_#FF8AC4,5px_5px_0_2px_var(--ink)]",
                className,
            )}
            style={{ ["--pp-delay" as string]: `${200 + index * 60}ms` }}
        >
            {children}
        </section>
    );
};

export const Heading = ({ number, children }: { number: number; children: ReactNode }) => {
    return (
        <h2 className="flex items-center gap-2.5 m-0 font-bold text-[13px] leading-none tracking-[.12em] text-(--face-ink)">
            <span
                aria-hidden
                className={cn(
                    "grid place-items-center flex-none size-8 rounded-[10px] -rotate-4",
                    "border-2 border-[#1A1418] bg-[#FF8AC4] shadow-[2px_2px_0_var(--ctl-off)]",
                    "font-bold text-[13px] leading-none tracking-normal text-[#1A1418]",
                )}
            >
                {String(number).padStart(2, "0")}
            </span>
            {children}
        </h2>
    );
};

export const Steps = ({ steps }: { steps: string[] }) => {
    return (
        <ol className="flex flex-col gap-3 m-0 p-0 list-none">
            {steps.map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                    <span aria-hidden className="grid place-items-center flex-none size-6.5 rounded-full bg-(--chip-hover) font-bold text-[13px] text-(--group)">
                        {i + 1}
                    </span>
                    <span className="pt-0.75 font-normal text-[15px] leading-[1.55] text-pretty">{step}</span>
                </li>
            ))}
        </ol>
    );
};

const STEPPER_BUTTON = cn(
    "pp-press pp-focus grid place-items-center size-10 rounded-full cursor-pointer",
    "border-2 border-(--ink) bg-(--chip) text-(--chip-ink) disabled:opacity-40",
);

/** Adds or removes wrong guesses so the demo image shows that attempt. */
export const GuessStepper = ({ value, max, onChange }: { value: number; max: number; onChange: (value: number) => void }) => {
    return (
        <div className="flex items-center justify-center gap-3">
            <button type="button" className={STEPPER_BUTTON} onClick={() => onChange(value - 1)} disabled={value <= 0} aria-label="One guess less">
                <ChevronLeft className="size-4" strokeWidth={3} />
            </button>

            <span aria-live="polite" className="min-w-35 font-bold text-sm text-center">
                {value === 0 ? "No guesses yet" : `${value} wrong ${value === 1 ? "guess" : "guesses"}`}
            </span>

            <button type="button" className={STEPPER_BUTTON} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="One more wrong guess">
                <ChevronRight className="size-4" strokeWidth={3} />
            </button>
        </div>
    );
};

/** A Classic feedback tile, flipping in like the game's. */
export const FeedbackTile = ({ tone, arrow, children }: { tone: Tone; arrow?: boolean; children: ReactNode }) => {
    return (
        <span
            className={cn(
                "how-to-play-tile-enter relative grid place-items-center aspect-square px-1.5 rounded-[14px] transform-gpu",
                "border-2 border-[#1A1418] font-bold text-[12.5px] leading-tight text-center text-[#1A1418] whitespace-pre-line",
                FEEDBACK[tone].ground,
                FEEDBACK[tone].tileEdge,
            )}
        >
            {arrow && <img draggable={false} src={ArrowUp} alt="" aria-hidden className="absolute inset-0 size-full object-cover opacity-25" />}
            <span className="relative">{children}</span>
        </span>
    );
};

interface SwitchProps {
    label: string;
    on: boolean;
    locked?: boolean;
    lockText?: string;
    onToggle: () => void;
}

export const Switch = ({ label, on, locked, lockText, onToggle }: SwitchProps) => {
    return (
        <div className={cn("flex items-center gap-2.5", locked && "opacity-45")}>
            {locked && (
                <span className="inline-flex items-center gap-1 font-bold text-[11px] text-(--muted)">
                    <Lock className="size-3" strokeWidth={3} aria-hidden />
                    {lockText}
                </span>
            )}

            <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={label}
                disabled={locked}
                onClick={onToggle}
                className={cn(
                    "pp-focus relative w-13 h-7.5 rounded-full border-2 border-(--ink) transition-colors duration-300",
                    on ? "bg-[#FF8AC4]" : "bg-(--chip-hover)",
                    locked ? "cursor-default" : "cursor-pointer",
                )}
            >
                <span
                    className={cn(
                        "absolute top-0.75 left-0.75 size-5 rounded-full border-2 border-[#1A1418] bg-white",
                        "transition-[translate] duration-400 ease-(--ease-pop) will-change-transform",
                        on && "translate-x-5.5",
                    )}
                />
            </button>
        </div>
    );
};
