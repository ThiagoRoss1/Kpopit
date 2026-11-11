import type { CSSProperties } from "react";
import { Lock } from "lucide-react";
import { cn } from "../../lib/utils";
import { TOOL_IDS, TOOLS, type ToolId } from "../../features/inkit/config.ts";
import { greySpriteUrl, spriteUrl } from "../../features/inkit/sprites.ts";
import { TOOL_INFO } from "./toolInfo";

interface ToolLedgeProps {
    tool: ToolId;
    unlocked: ToolId[];
    /** Ink left as a share (0-1) of a full pot. */
    inkShare: number;
    disabled: boolean;
    onSelect: (tool: ToolId) => void;
    /** Drawing mode (mobile): each tool shows its name under it. */
    labelled?: boolean;
    className?: string;
}

const clampShare = (share: number) => Math.max(0, Math.min(1, share));

/** The ink left, as a small jar that empties. */
const InkJar = ({ inkShare }: { inkShare: number }) => {
    const percent = Math.round(clampShare(inkShare) * 100);

    return (
        <div
            role="meter"
            aria-label="Ink left"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            data-testid="inkit-ink"
            data-ink={percent}
            className="relative h-11 w-8.5 flex-none"
        >
            <div className="absolute top-0 left-2.5 h-2.25 w-3.5 rounded-[4px_4px_2px_2px] bg-(--ink)" />

            <div className="absolute inset-x-0 top-1.75 bottom-0 overflow-hidden rounded-[8px_8px_10px_10px] border-2 border-(--ink) bg-[#FFFDFA] shadow-[2px_3px_0_var(--ctl-off)]">
                <div
                    style={{ scale: `1 ${clampShare(inkShare)}` }}
                    className="absolute inset-0 origin-bottom bg-[#FF70B8] transition-[scale] duration-200 ease-linear"
                />
                <span className="absolute top-[14%] left-[18%] h-[38%] w-[16%] rounded-[9px] bg-white/70" />
            </div>
        </div>
    );
};

/** The three tools (locked until their round) and the ink jar. */
const ToolLedge = ({ tool, unlocked, inkShare, disabled, onSelect, labelled = false, className }: ToolLedgeProps) => {
    return (
        <div
            className={cn(
                "flex items-center rounded-[20px] border-2 border-(--ink) bg-(--face)",
                "shadow-[6px_7px_0_-2px_#FF8AC4,6px_7px_0_0_var(--ink),var(--in)]",
                labelled ? "gap-4 rounded-[22px] px-4 pt-3 pb-2.5" : "gap-4.5 px-5.5 py-3.5",
                className,
            )}
        >
            <div role="group" aria-label="Drawing tools" className={cn("flex items-start", labelled ? "gap-4.5" : "gap-5.5")}>
                {TOOL_IDS.map((id) => {
                    const info = TOOL_INFO[id];
                    const isLocked = !unlocked.includes(id);
                    const isSelected = !isLocked && tool === id;

                    return (
                        <div key={id} className="flex flex-col items-center gap-1.5">
                            <button
                                type="button"
                                aria-pressed={isSelected}
                                aria-label={isLocked ? `${info.name}, locked until guess ${TOOLS[id].fromRound}` : `${info.name}: reveals ${info.reveals}`}
                                disabled={disabled || isLocked}
                                onClick={() => onSelect(id)}
                                data-testid={`inkit-tool-${id}`}
                                data-locked={isLocked}
                                className={cn(
                                    "inkit-tool pp-focus relative grid size-14 place-items-center rounded-full border-0 bg-transparent p-0",
                                    isLocked ? "cursor-not-allowed" : "cursor-pointer",
                                )}
                            >
                                {/* Ink ring: only around the tool in hand. */}
                                <span
                                    aria-hidden
                                    style={{ "--ink-share": clampShare(inkShare) } as CSSProperties}
                                    className={cn(
                                        "inkit-ring pointer-events-none absolute -inset-2 rounded-full transform-gpu",
                                        "transition-[opacity,scale] duration-[250ms,450ms] ease-[ease,var(--ease-pop)]",
                                        isSelected ? "scale-100 opacity-100" : "scale-[0.72] opacity-0",
                                    )}
                                />

                                <span
                                    className={cn(
                                        "relative grid size-14 place-items-center rounded-full border-2 transform-gpu",
                                        "transition-[background-color,box-shadow] duration-[280ms] ease-[ease]",
                                        isSelected && "border-(--ink) bg-[#FF8AC4] shadow-(--in-pink)",
                                        isLocked && "border-dashed border-(--rule) bg-transparent",
                                        !isSelected && !isLocked && "border-(--ink) bg-(--face) shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
                                    )}
                                >
                                    <img
                                        src={isLocked ? greySpriteUrl(id) : spriteUrl(id)}
                                        alt=""
                                        draggable={false}
                                        className={cn(
                                            "inkit-sprite size-8.75 transition-[rotate,scale] duration-[450ms] ease-(--ease-pop)",
                                            isLocked && "opacity-40",
                                            isSelected && "rotate-[-12deg] scale-[1.08]",
                                        )}
                                    />

                                    {isLocked && (
                                        <span className="absolute -top-1.25 -right-1.25 grid size-4.5 place-items-center rounded-full border-[1.5px] border-(--ink) bg-(--face) text-(--face-ink)">
                                            <Lock className="size-2.5" strokeWidth={2.8} aria-hidden />
                                        </span>
                                    )}
                                </span>
                            </button>

                            {(labelled || isLocked) && (
                                <span className={cn("font-bold text-[11px] leading-none", isLocked ? "text-(--muted)" : "text-(--face-ink)")}>
                                    {isLocked ? `guess ${TOOLS[id].fromRound}` : info.name}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            <span aria-hidden className="h-10.5 w-0.5 self-center rounded-[9px] bg-(--rule)" />

            <InkJar inkShare={inkShare} />
        </div>
    );
};

export default ToolLedge;
