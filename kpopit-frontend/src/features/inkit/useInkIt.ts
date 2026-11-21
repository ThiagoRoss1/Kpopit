import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { RENDER_SIDE, SHEET, type ToolId } from "./config.ts";
import { exportDraft, importDraft } from "./codec.ts";
import { InkItSheet, toSheet, unlockedTools, type Layers } from "./engine.ts";
import { buildLayersFromPhoto, loadLayer, loadPhotoPixels } from "./layerFiles.ts";
import { createLayerLoader, type LayerKind, type LayerLoader, type LayerStatus, type LayerUrls } from "./layerLoader.ts";
import { spriteUrl } from "./sprites.ts";

export type SheetStatus = "loading" | "ready" | "error";

interface UseInkItOptions {
    /** Full (CORS-readable) URLs of the files the server has unlocked so far. */
    files: LayerUrls;
    /** The emergency photo URL, asked for only when a drawing layer can't be loaded. */
    fallbackPhoto: () => Promise<string>;
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

// The drain and the hold build-up run on real frame time, so 60, 120 and 144 Hz screens play alike.
// The first frame of a stroke has no previous one; a stall (tab switch) is capped so it can't dump ink.
const FIRST_FRAME_SECONDS = 1 / 60;
const MAX_FRAME_SECONDS = 0.05;

// Until the photo arrives the sheet paints with paper: the paint mask stays 0 before its round.
let paperPhoto: Uint8ClampedArray | null = null;
const blankPhoto = () => (paperPhoto ??= new Uint8ClampedArray(RENDER_SIDE * RENDER_SIDE * 4).fill(255));

const TOOL_LAYER: Record<ToolId, LayerKind> = { pencil: "pencil", pen: "pen", paint: "photo" };
const IDLE_LAYERS: Record<LayerKind, LayerStatus> = { pencil: "idle", pen: "idle", photo: "idle" };

const makeCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = RENDER_SIDE;

    return canvas;
};

export const useInkIt = ({
    files, fallbackPhoto, round, hintActive, finished, canDraw, savedDraft, onOutOfInk,
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
    const loaderRef = useRef<LayerLoader | null>(null);
    const fallbackPhotoRef = useRef(fallbackPhoto);
    const onOutOfInkRef = useRef(onOutOfInk);
    const finishedRef = useRef(finished);
    const hintActiveRef = useRef(hintActive);
    // Playtest panel: the ink the last stroke cost (spent when it ended minus spent when it began).
    const strokeStartSpentRef = useRef(0);
    const lastStrokeCostRef = useRef(0);

    const [layerStatus, setLayerStatus] = useState<Record<LayerKind, LayerStatus>>(IDLE_LAYERS);
    const [attempt, setAttempt] = useState(0);
    const [tool, setTool] = useState<ToolId>("pencil");
    const [inkShare, setInkShare] = useState(1);
    const [isEmpty, setIsEmpty] = useState(true);
    const [isRevealing, setIsRevealing] = useState(false);

    // Read by effects that must not re-run when these change.
    useEffect(() => {
        onOutOfInkRef.current = onOutOfInk;
        fallbackPhotoRef.current = fallbackPhoto;
        finishedRef.current = finished;
        hintActiveRef.current = hintActive;
    }, [onOutOfInk, fallbackPhoto, finished, hintActive]);

    // A layer the sheet can't show yet fails the sheet; the pencil alone makes it playable.
    const failed = Object.values(layerStatus).includes("failed");
    const status: SheetStatus = failed ? "error" : layerStatus.pencil === "ready" ? "ready" : "loading";
    const toolReady = (id: ToolId) => layerStatus[TOOL_LAYER[id]] === "ready";

    const render = useCallback(() => {
        renderQueuedRef.current = false;

        const canvas = canvasRef.current;
        const layers = layersRef.current;
        if (!canvas || !layers) return;

        const target = canvas.getContext("2d");
        if (!target) return;

        frameRef.current ??= target.createImageData(RENDER_SIDE, RENDER_SIDE);
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

    // One loader per attempt: it downloads each file as soon as its URL is unlocked.
    useEffect(() => {
        const loader = createLayerLoader({
            load: loadLayer,
            loadPhoto: loadPhotoPixels,
            fallbackPhoto: () => fallbackPhotoRef.current(),
            buildFromPhoto: (url) => {
                if (import.meta.env.DEV) console.warn("InkIt: precomputed layers unavailable, building them in the browser");
                return buildLayersFromPhoto(url);
            },
            onChange: () => {
                if (loaderRef.current !== loader) return;

                const pencil = loader.layer("pencil");
                // Until the pen file arrives the pencil stands in for it: an empty pen layer would rub the
                // pencil out (the win reveal's pen stage) instead of drawing anything.
                layersRef.current = pencil
                    ? { pencil, pen: loader.layer("pen") ?? pencil, photo: loader.layer("photo") ?? blankPhoto() }
                    : null;
                setLayerStatus({ pencil: loader.status("pencil"), pen: loader.status("pen"), photo: loader.status("photo") });
                queueRender();
            },
        });
        loaderRef.current = loader;

        return () => {
            loaderRef.current = null;
        };
    }, [attempt, queueRender]);

    useEffect(() => {
        loaderRef.current?.offer(files);
    }, [files, attempt]);

    const retry = useCallback(() => {
        layersRef.current = null;
        setLayerStatus(IDLE_LAYERS);
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
                const snapshot = new ImageData(RENDER_SIDE, RENDER_SIDE);
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
    const lastFrameRef = useRef<number | null>(null);

    useEffect(() => {
        frameLoopRef.current = (now) => {
            const sheet = sheetRef.current;
            if (!sheet.drawing) return;

            const last = lastFrameRef.current;
            lastFrameRef.current = now;
            sheet.tick(last === null ? FIRST_FRAME_SECONDS : Math.min(MAX_FRAME_SECONDS, Math.max(0, now - last) / 1000));
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
        // A tool whose layer is still downloading would rub out the pencil and reveal nothing.
        if (layerStatus[TOOL_LAYER[sheet.tool]] !== "ready") return;
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
        lastFrameRef.current = null;
        requestAnimationFrame((now) => frameLoopRef.current(now));
    }, [canDraw, finished, isRevealing, queueRender, status, syncInk, layerStatus]);

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

        const snapshot = new ImageData(RENDER_SIDE, RENDER_SIDE);
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
        target.fillRect(0, 0, RENDER_SIDE, RENDER_SIDE);
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
            // Read once: a layout read after each frame's style write would force a layout per frame.
            const scale = (sprite?.parentElement?.clientWidth ?? SHEET) / SHEET;
            let spriteStage: string | null = null;

            const frame = (now: number) => {
                const { done, head } = step(now - startedAt);
                render();

                // The settle has no head: the sprite leaves while the photo eases in.
                if (sprite && !head) sprite.style.opacity = "0";

                if (sprite && head) {
                    const wobble = Math.sin((now - startedAt) / 60) * 8;

                    // Setting src (even to the same data URL) restarts the image load: only per stage.
                    if (head.stage !== spriteStage) {
                        spriteStage = head.stage;
                        sprite.src = spriteUrl(head.stage);
                    }
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
        /** Unlocked tools whose layer is still downloading: shown as loading, not usable yet. */
        loadingTools: unlockedTools(round).filter((id) => !toolReady(id)),
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
