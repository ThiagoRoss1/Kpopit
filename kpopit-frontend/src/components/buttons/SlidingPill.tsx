import { cn } from "../../lib/utils";

export interface SlidingOption<T extends string> {
    value: T;
    label: string;
}

interface SlidingPillProps<T extends string> {
    options: SlidingOption<T>[];
    value: T;
    onChange: (value: T) => void;
    label: string;
    className?: string;
}

/** Two or more equal segments with a pink thumb that slides under the selected one. */
const SlidingPill = <T extends string>({ options, value, onChange, label, className }: SlidingPillProps<T>) => {
    const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

    return (
        <div
            role="radiogroup"
            aria-label={label}
            className={cn(
                "relative grid h-11 p-0.75 rounded-full border-2 border-(--ink)",
                "bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
                className,
            )}
            style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        >
            {/* The thumb */}
            <span
                aria-hidden
                className={cn(
                    "absolute inset-y-0.75 left-0.75 rounded-full border-2 border-[#1A1418]",
                    "bg-[#FF8AC4] shadow-[inset_0_2px_0_rgba(255,255,255,.55)]",
                    "transition-transform duration-500 ease-(--ease-settle) transform-gpu",
                )}
                style={{ width: `calc((100% - 6px) / ${options.length})`, translate: `${selectedIndex * 100}% 0` }}
            />

            {options.map((option) => {
                const isSelected = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "pp-focus relative z-1 px-4 rounded-full",
                            "font-bold text-sm whitespace-nowrap cursor-pointer transition-colors duration-300",
                            isSelected ? "text-[#1A1418]" : "text-(--muted)",
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
};

export default SlidingPill;
