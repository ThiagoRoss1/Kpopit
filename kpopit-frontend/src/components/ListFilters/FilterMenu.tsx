import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export interface FilterOption {
    value: string;
    label: string;
    icon?: ReactNode;
    count?: number;
}

interface FilterMenuProps {
    /** Menu heading (e.g. "TYPE"). */
    title: string;
    /** The button text: the picked option, or the filter's name. */
    label: string;
    value: string;
    options: FilterOption[];
    onPick: (value: string) => void;
    minWidth: string;
    icon?: ReactNode;
    align?: "left" | "right";
}

/** A filter control: opens a menu of options (one choice); pink while a value is picked. */
const FilterMenu = ({ title, label, value, options, onPick, minWidth, icon, align = "left" }: FilterMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const isActive = value !== "";

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsOpen(false);
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    const handlePick = (optionValue: string) => {
        onPick(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative min-w-0 flex-[0_0_auto] @max-[580px]:flex-[1_1_calc(50%-4px)]">
            <button
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="true"
                onClick={() => setIsOpen(!isOpen)}
                style={{ minWidth }}
                className={cn(
                    "pp-focus relative flex items-center gap-2 w-auto @max-[580px]:w-full h-10 pointer-coarse:h-11 pr-9.5 pl-3.5",
                    "rounded-[18px] border-2 border-(--ink) cursor-pointer",
                    "font-semibold text-[13px] leading-[1.2] whitespace-nowrap text-left",
                    "transition-[translate,box-shadow,background-color,color] duration-450 ease-(--ease-settle) transform-gpu",
                    "active:translate-x-0.5 active:translate-y-0.75 active:duration-180",
                    isActive ? "text-[#1A1418]" : "text-(--chip-ink)",
                    isOpen && "translate-x-0.5 translate-y-0.75 bg-(--chip-hover) shadow-[0_0_0_var(--ctl-off),var(--in)]",
                    !isOpen && "hover:-translate-y-0.5",
                    !isOpen && isActive && "bg-(--side) shadow-[2px_3px_0_var(--ctl-off),var(--in-pink)] hover:bg-[#FF9BCC] active:shadow-[0_0_0_var(--ctl-off),var(--in-pink)]",
                    !isOpen && !isActive && "bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)] hover:bg-(--chip-hover) active:shadow-[0_0_0_var(--ctl-off),var(--in)]",
                )}
            >
                {icon}
                <span className="flex-1 min-w-0 overflow-hidden text-ellipsis">{label}</span>
                <ChevronDown
                    aria-hidden
                    className={cn(
                        "absolute right-3 size-3.5 transition-transform duration-400 ease-(--ease-pop) transform-gpu",
                        isOpen && "rotate-180",
                    )}
                    strokeWidth={3}
                />
            </button>

            {isOpen && (
                <div
                    role="menu"
                    aria-label={title}
                    className={cn(
                        "absolute top-13 pointer-coarse:top-14 z-20 w-62 overflow-hidden",
                        "rounded-[20px] border-2 border-(--ink) bg-(--menu-bg) text-(--chip-ink)",
                        "shadow-[4px_5px_0_var(--ctl-off),0_16px_32px_rgba(var(--sh),.16),var(--in)]",
                        "animate-[puffMenu_0.38s_var(--ease-settle)_both]",
                        align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left",
                    )}
                >
                    <div
                        className={cn(
                            "flex items-center justify-between gap-2.5 pt-3 px-4 pb-2.5",
                            "border-b-[1.5px] border-dashed border-(--rule)",
                            "font-bold text-[11px] leading-none tracking-[.12em] text-(--muted)",
                        )}
                    >
                        <span>{title}</span>
                        <span className="font-medium tracking-normal">{`${options.length - 1} options`}</span>
                    </div>

                    <div className="pp-scroll flex flex-col gap-1 max-h-71.5 overflow-y-auto overflow-x-hidden p-2">
                        {options.map((option) => {
                            const isSelected = option.value === value;

                            return (
                                <button
                                    key={option.value || "all"}
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={isSelected}
                                    onClick={() => handlePick(option.value)}
                                    className={cn(
                                        "pp-focus flex-none flex items-center gap-2.5 min-h-10.5 pr-2.5 pl-3",
                                        "rounded-[13px] border-2 text-left text-[13px] leading-[1.2] cursor-pointer",
                                        "transition-[translate,background-color,border-color,box-shadow] duration-300 ease-(--ease-settle) transform-gpu",
                                        "hover:translate-x-1 active:translate-x-1.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--ink)]",
                                        isSelected
                                            ? "border-(--ink) bg-(--side) text-[#1A1418] font-bold shadow-[2px_2.5px_0_var(--ink),var(--in-pink)] hover:bg-[#FF9BCC]"
                                            : cn(
                                                "border-transparent bg-transparent text-(--chip-ink) font-medium",
                                                "hover:border-(--ink) hover:bg-(--opt-hover) hover:shadow-[2px_2.5px_0_var(--ink),var(--in)]",
                                            ),
                                    )}
                                >
                                    {option.icon}

                                    <span className="flex-1 min-w-0 truncate">{option.label}</span>

                                    {option.count !== undefined && (
                                        <span
                                            className={cn(
                                                "flex-none inline-grid place-items-center min-w-6 h-5 px-1.75",
                                                "rounded-full border-[1.5px] border-[#1A1418] bg-white text-[#1A1418]",
                                                "shadow-[1px_1.5px_0_#1A1418,inset_0_1.5px_0_rgba(255,255,255,.7)]",
                                                "font-bold text-[11px] leading-none",
                                            )}
                                        >
                                            {option.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterMenu;
