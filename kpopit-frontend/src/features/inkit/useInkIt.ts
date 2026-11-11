import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { SHEET_SIDE, TOOLS, type ToolId } from "./config.ts";
import { spriteUrl } from "./sprites.ts";
import { decodeDraft, encodeDraft } from "./codec.ts";
import {
    addHintInk, buildLayers, clearSheet, composeFrame, createPen, createSheet, isSheetEmpty, loadMasks, newestTool,
    penDown, penMove, penTick, penUp, refill, seedFromPath, showPhoto, startReveal, stepReveal, toSheetPoint,
    unlockedTools, type InkPen, type Layers, type Point, type Sheet,
} from "./engine.ts";

export type SheetStatus = "loading" | "ready" | "error";

interface UseInkItOptions {
    /** Full URL of the day's photo (CORS-readable), or null while the day loads. */
    photoUrl: string | null;
    /** Stable per photo: seeds the pencil sketch, so every device draws the same one. */
    photoKey: string;
    /** The guess being made now: 1 + guesses already sent. */
    round: number;
    /** Hint 1 "More ink" was used in this game. */
    hintActive: boolean;
    /** The game is over: the sheet takes no strokes. */
    finished: boolean;
    /** Only while true does the sheet take strokes (mobile: drawing mode). */
    canDraw: boolean;
    /** The drawing saved with the last guess, restored once the photo is ready. */
    savedDraft: string | null;
    onOutOfInk?: () => void;
}

const makeCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SHEET_SIDE;

    return canvas;
};

export const useInkIt = ({
    photoUrl, photoKey, round, hintActive, finished, canDraw, savedDraft, onOutOfInk,
}: UseInkItOptions) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const sheetRef = useRef<Sheet>(createSheet());
    const penRef = useRef<InkPen>(createPen());
    const layersRef = useRef<Layers | null>(null);
    const frameRef = useRef<ImageData | null>(null);
    const renderQueuedRef = useRef(false);
    const pointerIdRef = useRef<number | null>(null);
    const shareSnapshotRef = useRef<ImageData | null>(null);
    const roundRef = useRef(round);
    const onOutOfInkRef = useRef(onOutOfInk);
    const finishedRef = useRef(finished);
    const hintActiveRef = useRef(hintActive);

    const [status, setStatus] = useState<SheetStatus>("loading");
    const [attempt, setAttempt] = useState(0);
    const [tool, setTool] = useState<ToolId>(() => newestTool(round));
    const [inkShare, setInkShare] = useState(1);
    const [isEmpty, setIsEmpty] = useState(true);
    const [isRevealing, setIsRevealing] = useState(false);
    // The tool sprite that rides the reveal's leading edge: moved straight on the element, since
    // it changes every frame.
    const revealSpriteRef = useRef<HTMLImageElement | null>(null);

    const unlocked = useMemo(() => unlockedTools(round), [round]);

    // Read by effects that must not re-run when these change (the win is handled by the reveal,
    // the hint tops the pot up through addHint).
    useEffect(() => {
        onOutOfInkRef.current = onOutOfInk;
        finishedRef.current = finished;
        hintActiveRef.current = hintActive;
    }, [onOutOfInk, finished, hintActive]);

    const render = useCallback(() => {
        renderQueuedRef.current = false;

        const canvas = canvasRef.current;
        const layers = layersRef.current;
        if (!canvas || !layers) return;

        const target = canvas.getContext("2d");
        if (!target) return;

        frameRef.current ??= target.createImageData(SHEET_SIDE, SHEET_SIDE);
        composeFrame(frameRef.current.data, layers, sheetRef.current.masks);
        target.putImageData(frameRef.current, 0, 0);
    }, []);

    // Draw at most once per frame, however many dabs land in between.
    const queueRender = useCallback(() => {
        if (renderQueuedRef.current) return;

        renderQueuedRef.current = true;
        requestAnimationFrame(render);
    }, [render]);

    const syncInk = useCallback(() => {
        const pen = penRef.current;
        const share = pen.capacity > 0 ? pen.ink / pen.capacity : 0;

        setInkShare((current) => (Math.abs(current - share) >= 0.004 || share === 0 || share === 1 ? share : current));
    }, []);

    // Load the photo and build what each tool reveals.
    useEffect(() => {
        if (!photoUrl) return;

        let cancelled = false;
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.decoding = "async";

        image.onload = () => {
            if (cancelled) return;

            try {
                layersRef.current = buildLayers(image, seedFromPath(photoKey), makeCanvas);
                setStatus("ready");
            } catch {
                // A photo served without CORS headers taints the canvas: its pixels can't be read.
                layersRef.current = null;
                setStatus("error");
            }
        };
        image.onerror = () => {
            if (!cancelled) setStatus("error");
        };
        image.src = photoUrl;

        return () => {
            cancelled = true;
            image.onload = image.onerror = null;
        };
    }, [photoUrl, photoKey, attempt]);

    const retry = useCallback(() => {
        setStatus("loading");
        setAttempt((current) => current + 1);
    }, []);

    // The sheet of the last guess (or the finished photo), once per photo and saved drawing.
    useEffect(() => {
        if (status !== "ready") return;

        let cancelled = false;
        const sheet = sheetRef.current;

        const settle = () => {
            if (cancelled) return;

            setIsEmpty(isSheetEmpty(sheet));
            if (finishedRef.current && layersRef.current) {
                // Kept for "Share my drawing" after a reload: the sheet as it was at the last guess.
                const snapshot = new ImageData(SHEET_SIDE, SHEET_SIDE);
                composeFrame(snapshot.data, layersRef.current, sheet.masks);
                shareSnapshotRef.current ??= snapshot;
                showPhoto(sheet);
            }
            queueRender();
        };

        clearSheet(sheet);
        if (!savedDraft) {
            settle();
            return;
        }

        decodeDraft(savedDraft)
            .then((masks) => {
                if (!cancelled) loadMasks(sheet, masks);
            })
            .catch(() => undefined)
            .finally(settle);

        return () => {
            cancelled = true;
        };
    }, [status, savedDraft, queueRender]);

    // A new round: a full pot, and the tool that just arrived (if any) in hand.
    useEffect(() => {
        const previous = roundRef.current;
        roundRef.current = round;

        refill(penRef.current, hintActiveRef.current);
        syncInk();

        const arrived = unlockedTools(round).filter((id) => TOOLS[id].fromRound > previous);
        if (arrived.length || round < previous) setTool(newestTool(round));
    }, [round, syncInk]);

    const selectTool = useCallback((next: ToolId) => {
        if (unlockedTools(roundRef.current).includes(next)) setTool(next);
    }, []);

    /** Hint 1 was just used: the extra ink right away. */
    const addHint = useCallback(() => {
        addHintInk(penRef.current);
        syncInk();
    }, [syncInk]);

    const sheetPoint = (event: ReactPointerEvent<HTMLCanvasElement>): Point =>
        toSheetPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());

    const stopStroke = useCallback(() => {
        penUp(penRef.current);
        pointerIdRef.current = null;
        setIsEmpty(isSheetEmpty(sheetRef.current));
        syncInk();
    }, [syncInk]);

    // While the pointer is down: the continuous drain and the hold-still build-up, once a frame.
    // Kept in a ref so the frame callback can schedule itself.
    const holdFrameRef = useRef<() => void>(() => undefined);

    useEffect(() => {
        holdFrameRef.current = () => {
            const pen = penRef.current;
            if (!pen.drawing) return;

            penTick(sheetRef.current, pen, performance.now());
            syncInk();
            queueRender();

            if (pen.drawing) {
                requestAnimationFrame(holdFrameRef.current);
                return;
            }

            stopStroke();
            onOutOfInkRef.current?.();
        };
    }, [queueRender, stopStroke, syncInk]);

    const onPointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (finished || !canDraw || isRevealing || status !== "ready" || pointerIdRef.current !== null) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        const pen = penRef.current;
        pen.tool = tool;

        if (!penDown(sheetRef.current, pen, sheetPoint(event), performance.now())) {
            onOutOfInkRef.current?.();
            return;
        }

        pointerIdRef.current = event.pointerId;
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            // Without capture the stroke still works while the pointer stays on the sheet.
        }

        setIsEmpty(false);
        syncInk();
        queueRender();
        requestAnimationFrame(() => holdFrameRef.current());
    }, [canDraw, finished, isRevealing, queueRender, status, syncInk, tool]);

    const onPointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (event.pointerId !== pointerIdRef.current) return;

        const pen = penRef.current;
        const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
        const rect = event.currentTarget.getBoundingClientRect();
        const samples = coalesced.length ? coalesced : [event.nativeEvent];

        for (const sample of samples) {
            penMove(sheetRef.current, pen, toSheetPoint(sample.clientX, sample.clientY, rect), sample.timeStamp || performance.now());
        }

        queueRender();
        syncInk();

        // The pot ran dry mid-stroke: the sheet locks until the next guess.
        if (!pen.drawing) {
            stopStroke();
            onOutOfInkRef.current?.();
        }
    }, [queueRender, stopStroke, syncInk]);

    const onPointerEnd = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (event.pointerId === pointerIdRef.current) stopStroke();
    }, [stopStroke]);

    /** The drawing as the string a guess carries (null before the photo is ready). */
    const captureDraft = useCallback(async (): Promise<string | null> => {
        if (!layersRef.current) return null;

        try {
            return await encodeDraft(sheetRef.current.masks);
        } catch {
            return null;
        }
    }, []);

    /** Keep the sheet as it is now for "Share my drawing" (call at the winning guess). */
    const snapshotForShare = useCallback(() => {
        if (!layersRef.current) return;

        const snapshot = new ImageData(SHEET_SIDE, SHEET_SIDE);
        composeFrame(snapshot.data, layersRef.current, sheetRef.current.masks);
        shareSnapshotRef.current = snapshot;
    }, []);

    /** The player's drawing over the paper colour, as a PNG. */
    const capturePng = useCallback(async (paperColor: string): Promise<Blob | null> => {
        const snapshot = shareSnapshotRef.current;
        if (!snapshot) return null;

        const drawing = makeCanvas();
        drawing.getContext("2d")?.putImageData(snapshot, 0, 0);

        const out = makeCanvas();
        const target = out.getContext("2d");
        if (!target) return null;

        target.fillStyle = paperColor;
        target.fillRect(0, 0, SHEET_SIDE, SHEET_SIDE);
        target.globalCompositeOperation = "multiply";
        target.drawImage(drawing, 0, 0);

        return new Promise((resolve) => out.toBlob(resolve, "image/png"));
    }, []);

    /** The win: rub the attempt out and redraw the photo pass by pass. Resolves when it ends. */
    const playReveal = useCallback((animate: boolean): Promise<void> => {
        const sheet = sheetRef.current;
        penUp(penRef.current);
        pointerIdRef.current = null;

        if (!animate || !layersRef.current) {
            showPhoto(sheet);
            queueRender();

            return Promise.resolve();
        }

        setIsRevealing(true);

        return new Promise((resolve) => {
            const reveal = startReveal(sheet, performance.now());
            const sprite = revealSpriteRef.current;

            const tick = (now: number) => {
                const frame = stepReveal(sheet, reveal, now);
                render();

                if (sprite && !frame.done) {
                    const side = sprite.parentElement?.clientWidth ?? 0;
                    const x = frame.edge * side - 10;
                    const y = (0.5 + 0.38 * Math.sin(frame.progress * Math.PI * 5)) * side - 46;

                    sprite.src = spriteUrl(frame.tool ?? "eraser");
                    sprite.style.transform = `translate(${x}px, ${y}px) rotate(${Math.sin(frame.progress * 20) * 8}deg)`;
                    sprite.style.opacity = "1";
                }

                if (!frame.done) {
                    requestAnimationFrame(tick);
                    return;
                }

                if (sprite) sprite.style.opacity = "0";
                setIsRevealing(false);
                resolve();
            };

            requestAnimationFrame(tick);
        });
    }, [queueRender, render]);

    return {
        canvasRef,
        status,
        retry,
        tool,
        selectTool,
        unlocked,
        inkShare,
        outOfInk: inkShare <= 0,
        isEmpty,
        isRevealing,
        revealSpriteRef,
        addHint,
        captureDraft,
        snapshotForShare,
        capturePng,
        playReveal,
        /** Playtest numbers (dev panel only). */
        pen: penRef,
        canvasHandlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp: onPointerEnd,
            onPointerCancel: onPointerEnd,
            onLostPointerCapture: onPointerEnd,
        },
    };
};
