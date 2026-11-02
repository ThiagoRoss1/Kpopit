import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Star, X } from "lucide-react";
import { PressButton } from "../../components/buttons/PressButton";
import { cn } from "../../lib/utils";
import { RULES, imageOf, type XpIdol } from "./xpData";

/** The rules as dashed chips (hidden on phones, where HowXpWorks shows them). */
export const RulesRow = () => {
    return (
        <div className="pp-enter [--pp-delay:200ms] flex @max-[581px]:hidden flex-wrap justify-center gap-2">
            {RULES.map((rule) => (
                <span
                    key={rule.label}
                    className="flex items-center gap-2 py-1.5 pr-3 pl-1.5 rounded-full border-2 border-dashed border-(--rule) font-medium text-[13px] text-(--muted)"
                >
                    <RuleValue>{rule.value}</RuleValue>
                    {rule.label}
                </span>
            ))}
        </div>
    );
};

const RuleValue = ({ children, big }: { children: string; big?: boolean }) => {
    return (
        <span
            className={cn(
                "rounded-full border-[1.5px] border-[#1A1418] bg-[#FFE3F1] font-bold text-[#1A1418]",
                big ? "px-2.25 py-0.75 text-xs" : "px-2 py-0.75 text-[11px]",
            )}
        >
            {children}
        </span>
    );
};

/** ≤580px the rules hide behind this button; its popover closes on Escape or a click outside. */
export const HowXpWorks = () => {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const onKey = (event: globalThis.KeyboardEvent) => event.key === "Escape" && setIsOpen(false);
        const onPointerDown = (event: Event) => !rootRef.current?.contains(event.target as Node) && setIsOpen(false);

        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("touchstart", onPointerDown);

        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("touchstart", onPointerDown);
        };
    }, [isOpen]);

    return (
        <div ref={rootRef} className="relative z-40 hidden @max-[581px]:flex flex-col items-center self-center">
            <PressButton className="gap-2 h-10 pl-3 pr-4 text-[13px]" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
                <span className="grid place-items-center size-5 rounded-full border-[1.5px] border-[#1A1418] bg-[#FFE3F1] font-bold text-xs leading-none text-[#1A1418]">?</span>
                How XP works
            </PressButton>

            {isOpen && (
                <div
                    role="dialog"
                    aria-label="How XP works"
                    className={cn(
                        "absolute top-[calc(100%+12px)] left-1/2 box-border flex flex-col gap-3 w-80 -ml-40 p-4 origin-top",
                        "rounded-[23px] border-2 border-(--ink) bg-(--menu-bg) text-(--chip-ink) shadow-(--card-depth)",
                        "animate-[puffIn_.4s_var(--ease-settle)_backwards]",
                    )}
                >
                    <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-lg">How XP works</span>
                        <PressButton aria-label="Close" className="size-9 p-0" onClick={() => setIsOpen(false)}>
                            <X size={14} strokeWidth={3} />
                        </PressButton>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        {RULES.map((rule) => (
                            <div
                                key={rule.label}
                                className="flex items-center justify-between gap-3 py-2.25 px-3 rounded-[14px] border-2 border-(--ink) bg-(--chip) font-semibold text-[13px]"
                            >
                                {rule.label}
                                <RuleValue big>{rule.value}</RuleValue>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const LevelBadge = ({ idol, className }: { idol: XpIdol; className?: string }) => {
    return (
        <span
            className={cn(
                "rounded-full border-2 border-[#1A1418] font-bold",
                idol.max ? "bg-[#1A1418] text-cream" : idol.xp ? "bg-[#FFFDFA] text-[#1A1418]" : "bg-[#FFE3F1] text-[#1A1418]",
                className,
            )}
        >
            {idol.max ? "MAX" : `Lv ${idol.level}`}
        </span>
    );
};

/** An XP bar that grows from empty to `progress` (0..1) once `filled` turns on. */
export const XpBar = ({ progress, filled, className }: { progress: number; filled: boolean; className?: string }) => {
    return (
        <span
            className={cn("block h-full origin-left bg-[#FF8AC4] transition-[scale] duration-1100 ease-(--ease-settle)", className)}
            style={{ scale: `${filled ? progress : 0} 1` }}
        />
    );
};

interface XpCardProps {
    idol: XpIdol;
    index: number;
    isCurrent: boolean;
    isPending: boolean;
    favourite: boolean;
    filled: boolean;
    onPick: () => void;
    onFavourite: (event: MouseEvent) => void;
}

/** An idol in the list: tilted, it straightens and lifts on hover (barely on phones, where it is a row). */
export const XpCard = ({ idol, index, isCurrent, isPending, favourite, filled, onPick, onFavourite }: XpCardProps) => {
    const isHighlighted = isCurrent || isPending;

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        onPick();
    };

    return (
        <div
            role="button"
            tabIndex={0}
            aria-pressed={isPending}
            aria-label={`${idol.name}, ${idol.max ? "max level" : `level ${idol.level}`}${isCurrent ? ", leveling now" : ""}`}
            onClick={onPick}
            onKeyDown={onKeyDown}
            style={{ animationDelay: `${Math.min(260 + index * 45, 900)}ms` }}
            className={cn(
                "pp-focus relative flex flex-col gap-2.25 p-2.5 rounded-[20px] border-2 border-(--ink) text-left text-(--face-ink) cursor-pointer",
                "@max-[581px]:grid @max-[581px]:grid-cols-[56px_minmax(0,1fr)] @max-[581px]:items-center @max-[581px]:gap-x-3",
                "animate-[puffIn_.6s_var(--ease-settle)_backwards]",
                "transition-[translate,rotate,box-shadow,background-color] duration-420 ease-(--ease-settle) transform-gpu",
                "hover:-translate-y-0.75 hover:rotate-0 @max-[581px]:hover:-translate-y-px",
                "active:translate-x-px active:translate-y-0.5 active:duration-150",
                index % 2 ? "rotate-[0.5deg]" : "rotate-[-0.5deg]",
                "@max-[581px]:rotate-0",
                isHighlighted
                    ? "bg-(--chip-hover) shadow-[4px_5px_0_0_#FF8AC4,4px_5px_0_2px_var(--ink),var(--in)]"
                    : "bg-(--face) shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
            )}
        >
            <div className="relative w-full @max-[581px]:w-14 aspect-square @max-[581px]:row-span-2 overflow-hidden rounded-[14px] border-2 border-[#1A1418] bg-[#DCD6D2]">
                <img
                    src={imageOf(idol)}
                    alt=""
                    loading="lazy"
                    onError={(event) => { event.currentTarget.style.opacity = "0"; }}
                    className={cn("block size-full object-cover", !idol.xp && "grayscale-60")}
                />
            </div>

            <span className="flex items-center justify-between gap-1.5 min-w-0">
                <span className="flex flex-col flex-1 min-w-0">
                    <span className="font-bold text-[15px] leading-[1.15] truncate">{idol.name}</span>
                    <span className="font-semibold text-[11px] text-(--group) truncate">{idol.group}</span>
                </span>

                <button
                    type="button"
                    onClick={onFavourite}
                    aria-label={`${favourite ? "Unpin" : "Pin"} ${idol.name}`}
                    aria-pressed={favourite}
                    className={cn(
                        "pp-focus grid place-items-center flex-none size-7.5 p-0 border-0 bg-transparent text-(--face-ink) cursor-pointer",
                        "transition-[rotate,scale] duration-400 ease-(--ease-pop) will-change-transform",
                        "hover:-rotate-8 hover:scale-115 active:rotate-0 active:scale-90",
                    )}
                >
                    <Star size={20} strokeWidth={2.2} strokeLinejoin="round" fill={favourite ? "#FF8AC4" : "none"} stroke={favourite ? "#1A1418" : "currentColor"} />
                </button>

                <LevelBadge idol={idol} className="flex-none px-2 py-0.5 text-[11px]" />
            </span>

            <span className="block h-2 overflow-hidden rounded-full border-[1.5px] border-(--ink) bg-(--panel)">
                <XpBar progress={idol.progress} filled={filled} />
            </span>

            {isCurrent && (
                <span
                    className={cn(
                        "absolute right-3 -top-2.25 pt-0.75 pb-1 px-2.5 rounded-full rotate-3",
                        "border-2 border-[#1A1418] bg-[#FF70B8] shadow-[inset_0_2px_0_rgba(255,255,255,.55),inset_0_-2px_0_rgba(198,35,104,.3),2px_2.5px_0_#1A1418]",
                        "font-bold text-[10px] tracking-[.06em] text-white text-shadow-(--tag-text)",
                    )}
                >
                    NOW
                </span>
            )}
        </div>
    );
};
