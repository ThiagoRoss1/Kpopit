import { cn } from "../../lib/utils";
import "../PageShell/puff.css";

export interface SlidingOption<T extends string> {
    value: T;
    label: string;
}

/** Two or more equal segments with a pink thumb that slides under the selected one. */
export default function SlidingPill<T extends string>({ options, value, onChange, label, className }: {
    options: SlidingOption<T>[];
    value: T;
    onChange: (value: T) => void;
    label: string;
    className?: string;
}) {
    const index = Math.max(0, options.findIndex((o) => o.value === value));
    return (
        <div
            role="radiogroup"
            aria-label={label}
            className={cn("relative grid h-11 p-[3px] rounded-full border-2 border-(--ink) bg-(--chip) [box-shadow:2px_3px_0_var(--ctl-off),var(--in)]", className)}
            style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        >
            <span
                aria-hidden
                className="absolute top-[3px] bottom-[3px] left-[3px] rounded-full border-2 border-[#1A1418] bg-[#FF8AC4] [box-shadow:inset_0_2px_0_rgba(255,255,255,.55)] transition-transform will-change-transform duration-500 ease-(--ease-settle)"
                style={{ width: `calc((100% - 6px) / ${options.length})`, translate: `${index * 100}% 0` }}
            />
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={option.value === value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "pp-focus relative z-1 px-4 rounded-full font-bold text-sm whitespace-nowrap cursor-pointer transition-colors duration-300",
                        option.value === value ? "text-[#1A1418]" : "text-(--muted)",
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
