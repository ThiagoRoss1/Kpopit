import type { ComponentProps, CSSProperties, ReactNode, RefObject } from "react";
import { Paintbrush, RotateCw } from "lucide-react";
import { SHEET_SIDE, type ToolId } from "../../features/inkit/config.ts";
import { grainUrl, greySpriteUrl, spriteUrl, toolCursor } from "../../features/inkit/sprites.ts";
import type { SheetStatus } from "../../features/inkit/useInkIt.ts";

interface InkSheetProps {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    canvasHandlers: Pick<ComponentProps<"canvas">, "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onLostPointerCapture">;
    /** The tool sprite that rides the win reveal; the engine moves it. */
    revealSpriteRef: RefObject<HTMLImageElement | null>;
    status: SheetStatus;
    onRetry: () => void;
    dayNumber: number | null;
    tool: ToolId;
    canDraw: boolean;
    isEmpty: boolean;
    finished: boolean;
    outOfInk: boolean;
    /** Changes every time the player tries to draw with no ink: replays the toast. */
    outOfInkNudge: number;
    /** Drawing mode (mobile): where the sheet sits, fixed over the page. */
    fixedRect: { left: number; top: number; size: number } | null;
    /** Mobile, outside drawing mode: a tap anywhere on the sheet opens it. */
    onOpenDrawing?: () => void;
    /** The tool ledge under the sheet (desktop and tablet). */
    children?: ReactNode;
}

const SHEET_GRAIN = `url("${grainUrl(0.09)}")`;

// Sheets still to come, behind the one on top: the pile grows slowly with the day number.
const stackSheets = (dayNumber: number) => {
    const count = Math.min(4, Math.max(0, Math.round(Math.log2(dayNumber + 1) * 0.5)));

    return Array.from({ length: count }, (_, index) => {
        const depth = count - index;

        return { x: depth * 1.6, y: depth * 1.9, color: depth % 2 ? "#EFE8DC" : "#F6F1E7" };
    });
};

/** The easel and the drawing sheet: paper, the canvas multiplied over it, and the sheet's notices. */
const InkSheet = ({
    canvasRef, canvasHandlers, revealSpriteRef, status, onRetry, dayNumber, tool, canDraw, isEmpty, finished, outOfInk,
    outOfInkNudge, fixedRect, onOpenDrawing, children,
}: InkSheetProps) => {
    const isReady = status === "ready";
    const takesStrokes = isReady && canDraw && !finished && !outOfInk;

    const sheetPosition: CSSProperties = fixedRect
        ? {
            position: "fixed",
            left: fixedRect.left,
            top: fixedRect.top,
            width: fixedRect.size,
            height: fixedRect.size,
            zIndex: 71,
            boxShadow: "0 0 0 200vmax var(--ground)",
        }
        : { position: "absolute", inset: 0 };

    return (
        <div className="relative w-110 max-w-full pt-6 pb-4 max-[1180px]:w-95 max-[900px]:w-[min(calc(100vw-150px),260px)] max-[900px]:pb-5.5">
            {/* Easel: two legs, the centre post and the clip bar. */}
            <span aria-hidden className="absolute top-3 bottom-0 left-[16%] w-3.5 origin-top rotate-[7deg] rounded-full border-2 border-(--ink) bg-(--wood)" />
            <span aria-hidden className="absolute top-3 right-[16%] bottom-0 w-3.5 origin-top rotate-[-7deg] rounded-full border-2 border-(--ink) bg-(--wood)" />
            <span aria-hidden className="absolute top-0 left-1/2 -ml-1.75 h-11 w-3.5 rounded-[999px_999px_4px_4px] border-2 border-(--ink) bg-(--wood)" />
            <span aria-hidden className="absolute top-2.5 right-[39%] left-[39%] z-4 h-5.5 rounded-[5px] border-2 border-(--ink) bg-(--wood) shadow-[inset_0_-3px_0_rgba(26,20,24,.12)]" />

            <div className="relative pr-2.25 pb-2.75">
                <div className="relative aspect-square w-full">
                    <div style={sheetPosition} data-testid="inkit-sheet-frame">
                        <div aria-hidden className="absolute inset-0 translate-x-2 translate-y-[9.6px] rounded-sm border-2 border-(--ink) bg-[#FF8AC4]" />

                        {stackSheets(dayNumber ?? 1).map((sheet, index) => (
                            <div
                                key={index}
                                aria-hidden
                                style={{ translate: `${sheet.x}px ${sheet.y}px`, backgroundColor: sheet.color }}
                                className="absolute inset-0 rounded-sm border-[1.5px] border-(--ink)"
                            />
                        ))}

                        <div className="inkit-paper absolute inset-0 overflow-hidden rounded-sm border-2 border-(--ink)">
                            <div aria-hidden style={{ backgroundImage: SHEET_GRAIN }} className="pointer-events-none absolute inset-0 opacity-75 mix-blend-multiply" />

                            <canvas
                                ref={canvasRef}
                                width={SHEET_SIDE}
                                height={SHEET_SIDE}
                                role="img"
                                aria-label={finished ? "The idol's photo, revealed" : "Drawing sheet: draw to reveal the idol's photo"}
                                data-testid="inkit-sheet"
                                data-status={status}
                                style={{ cursor: takesStrokes ? toolCursor(tool) : "default" }}
                                className="inkit-canvas absolute inset-0 size-full"
                                {...canvasHandlers}
                            />

                            <span
                                data-testid="inkit-day-number"
                                className="pointer-events-none absolute right-2.5 bottom-1.5 rotate-[-4deg] font-script text-[13px] leading-none text-[rgba(26,20,24,.5)]"
                            >
                                No. {dayNumber ?? "?"}
                            </span>

                            {status === "loading" && (
                                <div className="absolute inset-0 grid place-items-center font-caveat font-semibold text-2xl text-[rgba(60,52,70,.62)]">
                                    laying out the sheet...
                                </div>
                            )}

                            {status === "error" && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
                                    <p className="m-0 font-semibold text-sm text-[#1A1418]">The photo couldn't be laid on the sheet.</p>

                                    <button
                                        type="button"
                                        onClick={onRetry}
                                        className="inkit-btn pp-focus flex h-9 cursor-pointer items-center gap-2 rounded-full border-2 border-[#1A1418] bg-[#FFFDFA] px-3.5 font-bold text-[13px] text-[#1A1418] [--ctl-off:#1A1418]"
                                    >
                                        <RotateCw className="size-4" aria-hidden />
                                        Try again
                                    </button>
                                </div>
                            )}

                            {/* Desktop, before the first stroke. */}
                            {isReady && isEmpty && !finished && !onOpenDrawing && !fixedRect && (
                                <div className="pointer-events-none absolute inset-0 grid place-items-center max-[900px]:hidden" data-testid="inkit-invite">
                                    <div className="flex flex-col items-center gap-1.5 animate-[ikNudge_2.4s_ease-in-out_infinite]">
                                        <img src={spriteUrl("pencil")} alt="" className="inkit-sprite size-12" />
                                        <span className="font-caveat font-semibold text-2xl leading-none text-[rgba(60,52,70,.62)]">draw anywhere...</span>
                                    </div>
                                </div>
                            )}

                            {outOfInk && !finished && isReady && (
                                <div
                                    key={outOfInkNudge}
                                    role="status"
                                    data-testid="inkit-out-of-ink"
                                    className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center animate-[ikToast_2.8s_var(--ease-settle)_forwards]"
                                >
                                    <div className="flex items-center gap-2.5 rounded-2xl border-2 border-[#1A1418] bg-[#FFFDFA] py-2.25 pr-3.5 pl-2.5 text-[#1A1418] shadow-[0_4px_0_0_#FF8AC4,0_4px_0_2px_#1A1418]">
                                        <img src={greySpriteUrl(tool)} alt="" className="inkit-sprite size-7.5" />

                                        <div className="flex flex-col text-left">
                                            <span className="font-bold text-[15px] leading-[1.1]">Out of ink...</span>
                                            <span className="font-medium text-xs text-[#6B5F66]">make a guess to refill</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {onOpenDrawing && isReady && !finished && (
                                <button
                                    type="button"
                                    onClick={onOpenDrawing}
                                    aria-label="Open drawing mode"
                                    data-testid="inkit-open-drawing"
                                    className="pp-focus absolute inset-0 cursor-pointer border-0 bg-transparent p-0"
                                >
                                    <span className="absolute top-2.5 right-2.5 grid size-9.5 place-items-center rounded-full border-2 border-[#1A1418] bg-[#FF70B8] text-white shadow-[2px_3px_0_#1A1418,var(--in-pink)]">
                                        <Paintbrush className="size-4.5" strokeWidth={2.4} aria-hidden />
                                    </span>
                                </button>
                            )}
                        </div>

                        <img
                            ref={revealSpriteRef}
                            src={spriteUrl("eraser")}
                            alt=""
                            aria-hidden
                            className="inkit-sprite pointer-events-none absolute top-0 left-0 z-6 size-17 opacity-0 drop-shadow-[2px_3px_0_rgba(26,20,24,.35)] will-change-transform"
                        />
                    </div>
                </div>
            </div>

            {children && <div className="relative z-2 mt-1.5 flex justify-center">{children}</div>}
        </div>
    );
};

export default InkSheet;
