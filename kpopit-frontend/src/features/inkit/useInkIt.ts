import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { SHEET, type ToolId } from "./config.ts";
import { exportDraft, importDraft } from "./codec.ts";
import { InkItSheet, toSheet, unlockedTools, type Layers } from "./engine.ts";
import { buildLayers, seedFromPath } from "./layers.ts";
import { spriteUrl } from "./sprites.ts";

export type SheetStatus = "loading" | "ready" | "error";

interface UseInkItOptions {
    /** Full URL of the day's photo (CORS-readable), or null while the day loads. */
    photoUrl: string | null;
    /** Stable per photo: seeds the pencil hatching, so every device draws the same one. */
    photoKey: string;
    /** The server's round: the guess about to be made = wrong guesses + 1. */
    round: number;
    /** Hint 1 "More ink" was accepted by the server in this game. */
    hintActive: boolean;
    /** The game is over: the sheet takes no strokes. */
    finished: boolean;
    /** Only while true does the sheet take strokes (mobile: drawing mode). */
    canDraw: boolean;
    /** The drawing saved with the last guess, restored once the photo is ready. */
    savedDraft: string | null;
    onOutOfInk?: () => void;
}

// The reference drives the drain and the hold build-up once per animation frame with a fixed step.
const FRAME_SECONDS = 1 / 60;

const makeCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SHEET;

    return canvas;
};

export const useInkIt = ({
    photoUrl, photoKey, round, hintActive, finished, canDraw, savedDraft, onOutOfInk,
}: UseInkItOptions) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const sheetRef = useRef<InkItSheet>(new InkItSheet());
    const layersRef = useRef<Layers | null>(null);
    const frameRef = useRef<ImageData | null>(null);
    const renderQueuedRef = useRef(false);
    const pointerIdRef = useRef<number | null>(null);
    const shareSnapshotRef = useRef<ImageData | null>(null);
    // The tool sprite that rides the reveal's leading edge, moved straight on the element.
    const revealSpriteRef = useRef<HTMLImageElement | null>(null);
    const onOutOfInkRef = useRef(onOutOfInk);
    const finishedRef = useRef(finished);
    const hintActiveRef = useRef(hintActive);
    // Playtest panel: the ink the last stroke cost (spent when it ended minus spent when it began).
    const strokeStartSpentRef = useRef(0);
    const lastStrokeCostRef = useRef(0);

    const [status, setStatus] = useState<SheetStatus>("loading");
    const [attempt, setAttempt] = useState(0);
    const [tool, setTool] = useState<ToolId>("pencil");
    const [inkShare, setInkShare] = useState(1);
    const [isEmpty, setIsEmpty] = useState(true);
    const [isRevealing, setIsRevealing] = useState(false);

    // Read by effects that must not re-run when these change.
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

        frameRef.current ??= target.createImageData(SHEET, SHEET);
        sheetRef.current.render(layers, frameRef.current);
        target.putImageData(frameRef.current, 0, 0);
    }, []);

    // Draw at most once per frame, however many dabs land in between.
    const queueRender = useCallback(() => {
        if (renderQueuedRef.current) return;

        renderQueuedRef.current = true;
        requestAnimationFrame(render);
    }, [render]);

    // The ring and the jar follow inkLeft / inkMax.
    const syncInk = useCallback(() => {
        const sheet = sheetRef.current;
        const share = sheet.inkMax > 0 ? sheet.inkLeft / sheet.inkMax : 0;

        setInkShare((current) => (Math.abs(current - share) >= 0.004 || share === 0 || share === 1 ? share : current));
        setTool(sheet.tool);
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
                layersRef.current = buildLayers(image, seedFromPath(photoKey));
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

    // Restore: the sheet of the last guess (or the finished photo), once per photo and saved drawing.
    useEffect(() => {
        if (status !== "ready") return;

        let cancelled = false;
        const sheet = sheetRef.current;

        const settle = () => {
            if (cancelled) return;

            setIsEmpty(sheet.isEmpty());
            if (finishedRef.current && layersRef.current) {
                // Kept for "Share my drawing" after a reload: the sheet as it was at the last guess.
                const snapshot = new ImageData(SHEET, SHEET);
                sheet.render(layersRef.current, snapshot);
                shareSnapshotRef.current ??= snapshot;
                sheet.showPhoto();
            }
            queueRender();
        };

        sheet.clear();
        if (!savedDraft) {
            settle();
            return;
        }

        importDraft(savedDraft, sheet.masks)
            .catch(() => sheet.clear())
            .finally(settle);

        return () => {
            cancelled = true;
        };
    }, [status, savedDraft, queueRender]);

    // The server's round: a new round refills to 100% and a tool that arrives becomes the tool in hand.
    useEffect(() => {
        sheetRef.current.setRound(round, hintActiveRef.current);
        syncInk();
    }, [round, syncInk]);

    const selectTool = useCallback((next: ToolId) => {
        sheetRef.current.selectTool(next);
        syncInk();
    }, [syncInk]);

    /** Hint 1, once the server accepted it: the extra ink right away. */
    const addHint = useCallback(() => {
        sheetRef.current.useHint1();
        syncInk();
    }, [syncInk]);

    const totalSpent = () => Object.values(sheetRef.current.spentByTool).reduce((sum, value) => sum + value, 0);

    const stopStroke = useCallback(() => {
        lastStrokeCostRef.current = totalSpent() - strokeStartSpentRef.current;
        sheetRef.current.pointerUp();
        pointerIdRef.current = null;
        setIsEmpty(sheetRef.current.isEmpty());
        syncInk();
    }, [syncInk]);

    // While the pointer is down, once per frame: the drain and the hold-still build-up. Kept in a
    // ref so the frame callback can schedule itself.
    const frameLoopRef = useRef<(now: number) => void>(() => undefined);

    useEffect(() => {
        frameLoopRef.current = (now) => {
            const sheet = sheetRef.current;
            if (!sheet.drawing) return;

            sheet.tick(FRAME_SECONDS, now);
            syncInk();
            queueRender();

            if (sheet.drawing) {
                requestAnimationFrame((next) => frameLoopRef.current(next));
                return;
            }

            stopStroke();
            onOutOfInkRef.current?.();
        };
    }, [queueRender, stopStroke, syncInk]);

    const onPointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (finished || !canDraw || isRevealing || status !== "ready" || pointerIdRef.current !== null) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        const sheet = sheetRef.current;
        const point = toSheet(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
        strokeStartSpentRef.current = totalSpent();

        if (!sheet.pointerDown(point, performance.now())) {
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
        requestAnimationFrame((next) => frameLoopRef.current(next));
    }, [canDraw, finished, isRevealing, queueRender, status, syncInk]);

    const onPointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (event.pointerId !== pointerIdRef.current) return;

        const sheet = sheetRef.current;
        sheet.pointerMove(toSheet(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()), performance.now());

        queueRender();
        syncInk();

        // The pot ran dry mid-stroke: the sheet locks until the next guess.
        if (!sheet.drawing) {
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
            return await exportDraft(sheetRef.current.masks);
        } catch {
            return null;
        }
    }, []);

    /** Keep the sheet as it is now for "Share my drawing" (call at the winning guess). */
    const snapshotForShare = useCallback(() => {
        if (!layersRef.current) return;

        const snapshot = new ImageData(SHEET, SHEET);
        sheetRef.current.render(layersRef.current, snapshot);
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
        target.fillRect(0, 0, SHEET, SHEET);
        target.globalCompositeOperation = "multiply";
        target.drawImage(drawing, 0, 0);

        return new Promise((resolve) => out.toBlob(resolve, "image/png"));
    }, []);

    /** The win: the reference's reveal stepper (eraser, pencil, pen, paint), with the design's
     *  sprite at its head. Resolves when it ends. */
    const playReveal = useCallback((animate: boolean): Promise<void> => {
        const sheet = sheetRef.current;
        sheet.pointerUp();
        pointerIdRef.current = null;

        if (!animate || !layersRef.current) {
            sheet.showPhoto();
            queueRender();

            return Promise.resolve();
        }

        setIsRevealing(true);

        return new Promise((resolve) => {
            const step = sheet.revealStepper();
            const sprite = revealSpriteRef.current;
            const startedAt = performance.now();

            const frame = (now: number) => {
                const { done, head } = step(now - startedAt);
                render();

                if (sprite && head) {
                    const scale = (sprite.parentElement?.clientWidth ?? SHEET) / SHEET;
                    const wobble = Math.sin((now - startedAt) / 60) * 8;

                    sprite.src = spriteUrl(head.stage);
                    sprite.style.transform = `translate(${head.x * scale - 10}px, ${head.y * scale - 58}px) rotate(${wobble}deg)`;
                    sprite.style.opacity = "1";
                }

                if (!done) {
                    requestAnimationFrame(frame);
                    return;
                }

                if (sprite) sprite.style.opacity = "0";
                setIsRevealing(false);
                resolve();
            };

            requestAnimationFrame(frame);
        });
    }, [queueRender, render]);

    return {
        canvasRef,
        status,
        retry,
        tool,
        selectTool,
        unlocked: unlockedTools(round),
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
        sheet: sheetRef,
        lastStrokeCost: lastStrokeCostRef,
        canvasHandlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp: onPointerEnd,
            onPointerCancel: onPointerEnd,
            onLostPointerCapture: onPointerEnd,
        },
    };
};
