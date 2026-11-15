import "./InkIt.css";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navigate, useSearchParams } from "react-router";
import { Check, Info } from "lucide-react";
import { cn } from "../../lib/utils";
import {
    getDailyUserCount, getInkItCalendarDay, getInkItDaily, getInkItDevPhotoSource, getUserPosition, getYesterdaysIdol,
    postInkItGuess, postInkItHint,
} from "../../services/api";
import type { IdolListItem, InkItAnswer, InkItGame, InkItGuess, YesterdayIdol } from "../../interfaces/gameInterfaces";
import type { CardGranted } from "../../interfaces/albumInterfaces";
import { useInkIt } from "../../features/inkit/useInkIt.ts";
import { grainUrl } from "../../features/inkit/sprites.ts";
import { useSharedGameData } from "../../hooks/useSharedGameData";
import { useGameMode } from "../../hooks/useGameMode";
import { useMediaQuery } from "../../hooks/useIsDevice";
import { useResetTimer } from "../../hooks/useResetTimer";
import { useAllGameModes } from "../../hooks/useAllGameModes";
import { useClearGameStorage } from "../../hooks/useClearGameStorage";
import { DAILY_REFETCH, useGameDay } from "../../contexts/game_day_context";
import { isNewGameDay, startFirstGameDay } from "../../utils/gameStorage";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { buildIdolSlug } from "../../utils/formatters";
import { WinnerExplosion } from "../../utils/confetti";
import PageLoader from "../../components/Loading/PageLoader";
import PageMeta from "../../components/Seo/PageMeta";
import { useToast } from "../../components/Toast/Toast";
import { GAME_ROWS } from "../../components/NavBar/navigation";
import Modal from "../../components/buttons/modals/Modal";
import TransferDataText from "../../components/buttons/modals/TransferDataContent";
import ImportDataText from "../../components/buttons/modals/ImportDataContent";
import ExportDataText from "../../components/buttons/modals/ExportDataContent";
import CardGrantedReveal from "../Collection/components/CardGrantedReveal";
import DripBand from "../../components/InkIt/DripBand";
import InkSheet from "../../components/InkIt/InkSheet";
import ToolLedge from "../../components/InkIt/ToolLedge";
import InkHints from "../../components/InkIt/InkHints";
import InkSearch from "../../components/InkIt/InkSearch";
import { groupOf } from "../../components/InkIt/idolGroup";
import InkGuessRows, { type GuessRow } from "../../components/InkIt/InkGuessRows";
import InkVictory, { type ShareState, type YesterdayInfo } from "../../components/InkIt/InkVictory";
import InkStatsModal from "../../components/InkIt/InkStatsModal";
import { PAPER_COLOR } from "../../components/InkIt/toolInfo";

// Dev builds only: the playtest panel is never part of a production bundle.
const InkDebugPanel = import.meta.env.DEV ? lazy(() => import("../../components/InkIt/InkDebugPanel")) : null;

// The winning row drops in and washes green before the sheet starts to resolve.
const ROW_SETTLE_MS = 1900;
// Phones and small tablets: no tool ledge, drawing happens in drawing mode.
const MOBILE_QUERY = "(width < 900px)";
const PAGE_GRAIN = `url("${grainUrl(0.05)}")`;
// Drawing mode: room kept for the Done pill above the sheet and the tools bar under it.
const DRAW_TOP_ROOM = 76;
const DRAW_TOOLS_HEIGHT = 104;
const DRAW_GAP = 18;

interface InkItProps {
    /** A past day from the calendar (?date=), or null for today's live game. */
    date?: string | null;
}

/** What the page plays, whether it came from the live route or from the calendar. */
interface DayData {
    imagePath: string;
    imageVersion: string;
    dayNumber: number | null;
    /** The challenge day guesses and hints are recorded on. */
    gameDate: string;
    game: InkItGame | null;
}

type StatsModal = null | "stats" | "transfer-data" | "import-data" | "export-data";

/** In production the photo is the opaque bucket path. A dev build asks the local backend where the
 *  photo really is, since the opaque copies only exist in the bucket once they are uploaded. */
const usePhotoUrl = (imagePath: string, imageVersion: string): string | null => {
    const devSource = useQuery({
        queryKey: ["inkitDevPhoto", imagePath],
        queryFn: () => getInkItDevPhotoSource!(imagePath),
        enabled: getInkItDevPhotoSource !== null,
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
    });

    if (getInkItDevPhotoSource !== null) {
        if (devSource.isPending) return null;
        // The marker keeps a cache entry apart from Blurry's plain copy of the same file: Safari reuses
        // that non-CORS copy for this CORS load, and the sheet can't read its pixels.
        const url = devSource.data && resolveCdnUrl(devSource.data.image_path, devSource.data.image_version);
        if (url) return `${url}${url.includes("?") ? "&" : "?"}inkit=1`;
    }

    return resolveCdnUrl(imagePath, imageVersion);
};

const InkIt = ({ date = null }: InkItProps) => {
    const gameMode = useGameMode();
    const isCalendarDay = date !== null;
    const { userToken, isInitialized, allIdolsData } = useSharedGameData();
    const { day, onNewDay } = useGameDay();
    const { clearInkit } = useClearGameStorage();

    const live = useQuery({
        queryKey: ["inkitDaily", gameMode, day],
        queryFn: getInkItDaily,
        enabled: isInitialized && !isCalendarDay,
        staleTime: 1000 * 60 * 60 * 4,
        ...DAILY_REFETCH,
    });

    const past = useQuery({
        queryKey: ["inkitCalendarDay", date],
        queryFn: () => getInkItCalendarDay(date!),
        enabled: isInitialized && isCalendarDay,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });

    const serverDate = live.data?.server_date;

    // First visit: nothing to reset, just record today.
    if (serverDate && !isCalendarDay) startFirstGameDay(localStorage, "inkit", serverDate);

    // New day: drop yesterday's local mirror and remount on the new day (no page reload).
    useEffect(() => {
        if (!serverDate || isCalendarDay || !isNewGameDay(localStorage, "inkit", serverDate)) return;

        clearInkit();
        localStorage.setItem("inkitGameDate", serverDate);
        onNewDay(serverDate);
    }, [serverDate, isCalendarDay, clearInkit, onNewDay]);

    const data = useMemo<DayData | null>(() => {
        if (isCalendarDay) {
            return past.data ? {
                imagePath: past.data.puzzle.image_path,
                imageVersion: past.data.puzzle.image_version,
                dayNumber: past.data.day_number,
                gameDate: past.data.challenge_date,
                game: past.data.game,
            } : null;
        }

        return live.data ? {
            imagePath: live.data.image_path,
            imageVersion: live.data.image_version,
            dayNumber: live.data.day_number,
            gameDate: live.data.server_date,
            game: live.data.game,
        } : null;
    }, [isCalendarDay, live.data, past.data]);

    const metadata = isCalendarDay && (
        <PageMeta
            title={`InkIt · ${data?.dayNumber == null ? date : `Day ${data.dayNumber}`} – KpopIt`}
            description="Play a past InkIt challenge from the KpopIt calendar."
            path="/inkit"
            noindex="follow"
        />
    );

    const query = isCalendarDay ? past : live;

    // A hand-typed ?date=<today> plays the live game, which keeps the day on this device.
    if (past.data?.is_today) return <Navigate to="/inkit" replace />;

    if (!data || !allIdolsData) {
        const retry = () => {
            if (userToken.isError) userToken.refetch();
            if (query.isError) query.refetch();
        };

        return (
            <>
                {metadata}
                <PageLoader error={query.isError || userToken.isError} onRetry={retry} />
            </>
        );
    }

    return (
        <>
            {metadata}
            <InkItGame key={data.gameDate} data={data} idols={allIdolsData} isCalendarDay={isCalendarDay} />
        </>
    );
};

interface InkItGameProps {
    data: DayData;
    idols: IdolListItem[];
    isCalendarDay: boolean;
}

const viewportSize = () => ({ width: window.innerWidth, height: window.innerHeight });

const InkItGame = ({ data, idols, isCalendarDay }: InkItGameProps) => {
    const gameMode = useGameMode();
    const [searchParams] = useSearchParams();
    const { day } = useGameDay();
    const { initUser, isInitialized, userStatsData, transferData, queryClient } = useSharedGameData();
    const { otherModes } = useAllGameModes(gameMode);
    const { formattedTime, timeRemaining } = useResetTimer();
    const toast = useToast();

    const isMobile = useMediaQuery(MOBILE_QUERY);
    const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
    const sharesFiles = useMediaQuery("(pointer: coarse)");

    const serverGame = data.game;
    const [guesses, setGuesses] = useState<InkItGuess[]>(() => serverGame?.inkit_guesses ?? []);
    const [inkHintRound, setInkHintRound] = useState<number | null>(() => serverGame?.hint_ink_guess ?? null);
    const [groupHint, setGroupHint] = useState<string[] | null>(() => serverGame?.group_hint ?? null);
    const [groupHintShown, setGroupHintShown] = useState(() => !isCalendarDay && localStorage.getItem("inkitGroupHintShown") === data.gameDate);
    const [answer, setAnswer] = useState<InkItAnswer | null>(() => serverGame?.answer ?? null);
    const [phase, setPhase] = useState<"playing" | "revealing" | "won">(() => (serverGame?.game_won ? "won" : "playing"));
    const [cardGranted, setCardGranted] = useState<CardGranted>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [drawingMode, setDrawingMode] = useState(false);
    const [modal, setModal] = useState<StatsModal>(null);
    const [shareState, setShareState] = useState<ShareState>("idle");
    const [outOfInkNudge, setOutOfInkNudge] = useState(0);
    const [viewport, setViewport] = useState(viewportSize);

    // The sheet is restored once, from the drawing saved with the last guess before this mount.
    const [savedDraft] = useState(() => serverGame?.draft ?? null);
    const [settledCount] = useState(() => serverGame?.inkit_guesses.length ?? 0);

    // Guesses made elsewhere (another device or tab) arrive with a refetch; the sheet stays as it is.
    const [syncedCount, setSyncedCount] = useState(guesses.length);
    const [syncedWin, setSyncedWin] = useState(false);
    if (serverGame && serverGame.inkit_guesses.length > syncedCount && phase === "playing") {
        setSyncedCount(serverGame.inkit_guesses.length);
        setGuesses(serverGame.inkit_guesses);
        setInkHintRound(serverGame.hint_ink_guess);
        setGroupHint(serverGame.group_hint);
        if (serverGame.game_won) {
            setAnswer(serverGame.answer);
            setPhase("won");
            setSyncedWin(true);
        }
    }

    const round = guesses.length + 1;
    const finished = phase !== "playing";
    const photoUrl = usePhotoUrl(data.imagePath, data.imageVersion);
    const onOutOfInk = useCallback(() => setOutOfInkNudge((count) => count + 1), []);

    const ink = useInkIt({
        photoUrl,
        photoKey: data.imagePath,
        round,
        hintActive: inkHintRound !== null,
        finished,
        canDraw: !isMobile || drawingMode,
        savedDraft,
        onOutOfInk,
    });

    // Local mirror (live games only): what the other modes' tiles and the next visit read.
    useEffect(() => {
        if (isCalendarDay || guesses.length === 0) return;

        localStorage.setItem("inkitGame", JSON.stringify({ guesses, hint_ink_guess: inkHintRound, game_date: data.gameDate }));
        localStorage.setItem("inkitGameComplete", finished ? "true" : "false");
        localStorage.setItem("inkitGameWon", finished ? "true" : "false");
    }, [guesses, inkHintRound, finished, isCalendarDay, data.gameDate]);

    // Drawing mode (mobile): the page behind doesn't scroll, Esc closes it, the sheet follows the viewport.
    useEffect(() => {
        if (!drawingMode) return;

        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = "hidden";

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setDrawingMode(false);
        };
        const onResize = () => setViewport(viewportSize());

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("resize", onResize);

        return () => {
            root.style.overflow = previous;
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("resize", onResize);
        };
    }, [drawingMode]);

    // Leaving the phone layout (rotation, resize) or ending the game closes drawing mode.
    if (drawingMode && (!isMobile || finished)) setDrawingMode(false);

    const openDrawingMode = () => {
        setViewport(viewportSize());
        setDrawingMode(true);
    };

    const dailyUserCount = useQuery({
        queryKey: ["dailyUserCount", gameMode, day],
        queryFn: getDailyUserCount,
        enabled: !isCalendarDay,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });

    const userPosition = useQuery({
        queryKey: ["inkitUserPosition", gameMode, day],
        queryFn: async () => getUserPosition((await initUser()) || ""),
        enabled: isInitialized && !isCalendarDay && phase === "won",
        refetchOnWindowFocus: false,
    });

    const yesterdayIdol = useQuery<YesterdayIdol>({
        queryKey: ["yesterdaysInkItIdol", day],
        queryFn: getYesterdaysIdol,
        enabled: !isCalendarDay && phase === "won",
        staleTime: 1000 * 60 * 60 * 24,
        refetchOnWindowFocus: false,
    });

    const victoryRef = useRef<HTMLDivElement | null>(null);
    const timers = useRef<number[]>([]);
    useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

    const { playReveal } = ink;

    // A win from another tab skips the reveal: the sheet shows the photo once its layers are built.
    useEffect(() => {
        if (syncedWin && ink.status === "ready") void playReveal(false);
    }, [syncedWin, ink.status, playReveal]);
    const celebrate = useCallback(() => {
        // 1) the winning row lands, 2) the sheet resolves into the photo, 3) the card and the confetti.
        timers.current.push(window.setTimeout(() => {
            void playReveal(!reducedMotion).then(() => {
                setPhase("won");
                if (isCalendarDay || localStorage.getItem("confettiShownInkit") !== "true") setShowConfetti(true);

                timers.current.push(window.setTimeout(() => {
                    const card = victoryRef.current;
                    if (!card) return;

                    window.scrollTo({
                        top: card.getBoundingClientRect().top + window.scrollY - 96,
                        behavior: reducedMotion ? "auto" : "smooth",
                    });
                }, 160));
            });
        }, reducedMotion ? 0 : ROW_SETTLE_MS));
    }, [isCalendarDay, playReveal, reducedMotion]);

    const guessMutation = useMutation({
        mutationFn: async (idol: IdolListItem) => {
            const draft = await ink.captureDraft();
            // The sheet as it is at this guess: what "Share my drawing" shows if it is the winning one.
            ink.snapshotForShare();

            return postInkItGuess(idol.id, data.gameDate, draft, isCalendarDay ? data.gameDate : null);
        },
        onSuccess: (result) => {
            const guess: InkItGuess = { ...result.guessed_idol_data, correct: result.guess_correct };

            setGuesses((current) => (current.some((entry) => entry.idol_id === guess.idol_id) ? current : [...current, guess]));
            setSyncedCount(result.guesses_count);
            setGroupHint(result.group_hint);
            setDrawingMode(false);

            queryClient.invalidateQueries({ queryKey: ["userStats"] });
            queryClient.invalidateQueries({ queryKey: ["dailyUserCount", gameMode] });
            if (isCalendarDay) queryClient.invalidateQueries({ queryKey: ["calendarTimeline"] });

            if (!result.guess_correct || !result.answer) return;

            setAnswer(result.answer);
            setPhase("revealing");
            setCardGranted(result.card_granted);
            if (result.card_granted) {
                queryClient.invalidateQueries({ queryKey: ["collectionAlbum"] });
                queryClient.invalidateQueries({ queryKey: ["collectionsList"] });
            }
            celebrate();
        },
        onError: () => toast.show("That guess didn't go through. Try again."),
    });

    const hintMutation = useMutation({ mutationFn: () => postInkItHint(data.gameDate) });

    const requestInkHint = async () => {
        try {
            const result = await hintMutation.mutateAsync();
            // The extra ink lands as soon as the server accepts the hint; the card animates on top.
            ink.addHint();
            setInkHintRound(result.hint_ink_guess);

            return true;
        } catch {
            toast.show("The hint couldn't be used. Try again.");

            return false;
        }
    };

    const showGroupHint = () => {
        setGroupHintShown(true);
        if (!isCalendarDay) localStorage.setItem("inkitGroupHintShown", data.gameDate);
    };

    const share = async () => {
        if (!answer) return;

        setShareState("working");
        const blob = await ink.capturePng(PAPER_COLOR);
        if (!blob) {
            setShareState("failed");
            timers.current.push(window.setTimeout(() => setShareState("idle"), 2200));
            return;
        }

        const count = guesses.length;
        const text = `InkIt #${data.dayNumber ?? ""} · ${count} ${count === 1 ? "guess" : "guesses"} · kpopit.net/inkit`;
        const file = new File([blob], `inkit-${data.dayNumber ?? "drawing"}.png`, { type: "image/png" });

        try {
            if (sharesFiles && navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], text });
                setShareState("shared");
            } else if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
                await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                setShareState("copied");
            } else {
                throw new Error("No clipboard");
            }
        } catch (error) {
            // The player closed the share sheet: nothing to report.
            if (error instanceof DOMException && error.name === "AbortError") {
                setShareState("idle");
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = file.name;
            link.click();
            URL.revokeObjectURL(url);
            setShareState("saved");
        }

        timers.current.push(window.setTimeout(() => setShareState("idle"), 2200));
    };

    const idolById = useMemo(() => new Map(idols.map((idol) => [idol.id, idol])), [idols]);
    const idolHref = useCallback((idolId: number, name: string) => {
        const idol = idolById.get(idolId);

        return `/idols/${idolId}/${buildIdolSlug(name, idol ? groupOf(idol) : null)}`;
    }, [idolById]);

    const rows = useMemo<GuessRow[]>(() => guesses.map((guess) => {
        const idol = idolById.get(guess.idol_id);

        return { ...guess, group: idol ? groupOf(idol) : "", href: idolHref(guess.idol_id, guess.artist_name) };
    }), [guesses, idolById, idolHref]);

    const triedIds = useMemo(() => guesses.map((guess) => guess.idol_id), [guesses]);
    // Only the idols InkIt can draw are worth guessing; the full list still names past rows. A list
    // cached before the field existed has no flags at all and is shown whole until it refreshes.
    const guessable = useMemo(() => idols.filter((idol) => idol.has_inkit_photo !== false), [idols]);

    const yesterdayData = yesterdayIdol.data;
    const yesterday: YesterdayInfo | null = !yesterdayData || !("yesterdays_pick_date" in yesterdayData) ? null : yesterdayData.locked
        ? { name: null, group: null, href: null, imagePath: null, imageVersion: null, locked: { date: yesterdayData.yesterdays_pick_date, dayNumber: yesterdayData.day_number } }
        : {
            name: yesterdayData.artist_name,
            group: yesterdayData.groups[0] ?? null,
            href: idolHref(yesterdayData.past_idol_id, yesterdayData.artist_name),
            imagePath: yesterdayData.image_path,
            imageVersion: yesterdayData.image_version,
            locked: null,
        };

    const modeTiles = otherModes.map((mode) => {
        const row = GAME_ROWS.find((entry) => entry.id === mode.id);

        return { id: mode.id, name: mode.name, path: mode.path, won: mode.won, image: row?.img ?? null, imageClass: row?.imgClass, pixelBlock: row?.pixelBlock };
    });

    // Drawing mode: the sheet as large as fits between the Done pill and the tools bar.
    const drawSize = Math.max(200, Math.min(viewport.width - 28, viewport.height - DRAW_TOP_ROOM - DRAW_TOOLS_HEIGHT - 40));
    const drawTop = Math.max(DRAW_TOP_ROOM, Math.round((viewport.height - drawSize - DRAW_GAP - DRAW_TOOLS_HEIGHT) / 2) + 20);
    const fixedRect = drawingMode ? { left: (viewport.width - drawSize) / 2, top: drawTop, size: drawSize } : null;

    const showDebug = InkDebugPanel !== null && searchParams.get("debug") === "1";

    const tools = (labelled: boolean) => (
        <ToolLedge
            tool={ink.tool}
            unlocked={ink.unlocked}
            inkShare={ink.inkShare}
            disabled={finished}
            onSelect={ink.selectTool}
            labelled={labelled}
        />
    );

    return (
        <div
            className="inkit-page relative flex-1 overflow-x-clip bg-(--ground) text-(--face-ink) transition-colors duration-300"
            data-phase={phase}
            data-round={round}
            data-testid="inkit-page"
        >
            <div aria-hidden className="inkit-hatch pointer-events-none absolute inset-0" />
            <div aria-hidden style={{ backgroundImage: PAGE_GRAIN }} className="inkit-grain pointer-events-none absolute inset-0" />

            <DripBand />

            <main
                className={cn(
                    "relative mx-auto grid max-w-310 items-start justify-center gap-x-20 gap-y-5.5 px-6 pt-7.5",
                    "grid-cols-[500px_520px] grid-rows-[auto_auto_1fr_auto_auto]",
                    "[grid-template-areas:'art_head'_'art_search'_'art_rows'_'win_win'_'end_end']",
                    "max-[1180px]:grid-cols-[420px_minmax(0,440px)] max-[1180px]:gap-x-10",
                    "max-[900px]:grid-cols-[minmax(0,1fr)] max-[900px]:grid-rows-none max-[900px]:gap-x-0 max-[900px]:gap-y-2.5 max-[900px]:px-4 max-[900px]:pt-4.5",
                    "max-[900px]:[grid-template-areas:'head'_'art'_'search'_'rows'_'win'_'end']",
                    drawingMode ? "z-110" : "z-2",
                )}
            >
                <header className="flex items-center justify-center gap-4 pt-7.5 [grid-area:head] max-[900px]:pt-0">
                    <h1 className="m-0 inline-block rotate-[-1.5deg] font-bold text-[64px] leading-none text-white text-shadow-(--puff-title) max-[900px]:text-4xl max-[900px]:text-shadow-(--puff-value)">
                        Ink<span className="text-[#FF8AC4]">It</span>
                    </h1>

                    {isCalendarDay && data.dayNumber != null && (
                        <span className="rounded-full border-2 border-(--ink) bg-[#FF8AC4] px-2.5 py-0.5 font-bold text-xs text-[#1A1418]">Day {data.dayNumber}</span>
                    )}

                    <button
                        type="button"
                        aria-label="Stats"
                        onClick={() => setModal("stats")}
                        data-testid="inkit-stats-button"
                        className="inkit-btn pp-focus grid size-11 flex-none cursor-pointer place-items-center rounded-full border-2 border-(--ink) bg-(--face) p-0 text-(--face-ink) max-[900px]:size-9"
                    >
                        <Info className="size-5" strokeWidth={2.5} aria-hidden />
                    </button>
                </header>

                <div className="flex min-w-0 flex-col items-center gap-4 [grid-area:art] max-[900px]:gap-0.5" data-testid="inkit-stage" data-drawing={drawingMode}>
                    <InkSheet
                        canvasRef={ink.canvasRef}
                        canvasHandlers={ink.canvasHandlers}
                        revealSpriteRef={ink.revealSpriteRef}
                        status={photoUrl ? ink.status : "loading"}
                        onRetry={ink.retry}
                        dayNumber={data.dayNumber}
                        tool={ink.tool}
                        canDraw={!isMobile || drawingMode}
                        isEmpty={ink.isEmpty}
                        finished={finished}
                        outOfInk={ink.outOfInk}
                        outOfInkNudge={outOfInkNudge}
                        fixedRect={fixedRect}
                        onOpenDrawing={isMobile && !drawingMode && !finished ? openDrawingMode : undefined}
                    >
                        {!isMobile && tools(false)}
                    </InkSheet>

                    {/* Like Blurry and Pixelated: the hints stay through the reveal and leave with the victory card. */}
                    {phase !== "won" && (
                        <InkHints
                            round={round}
                            finished={finished}
                            reducedMotion={reducedMotion}
                            inkHintUsed={inkHintRound !== null}
                            onUseInkHint={requestInkHint}
                            groupHint={groupHint}
                            groupHintShown={groupHintShown}
                            onShowGroupHint={showGroupHint}
                        />
                    )}
                </div>

                <div className="relative z-20 w-full max-w-140 justify-self-center [grid-area:search]">
                    {phase !== "won" && (
                        <InkSearch
                            idols={guessable}
                            triedIds={triedIds}
                            isPending={guessMutation.isPending || finished}
                            winnerCount={isCalendarDay ? null : dailyUserCount.data?.user_count ?? 0}
                            onGuess={(idol) => guessMutation.mutate(idol)}
                        />
                    )}
                </div>

                <div className="w-full max-w-140 justify-self-center [grid-area:rows]">
                    <InkGuessRows rows={rows} settledCount={settledCount} />
                </div>

                {phase === "won" && answer && (
                    <InkVictory
                        cardRef={victoryRef}
                        answer={answer}
                        answerHref={idolHref(answer.idol_id, answer.artist_name)}
                        guessCount={guesses.length}
                        position={userPosition.data?.position ?? null}
                        score={userPosition.data?.score ?? null}
                        yesterday={yesterday}
                        countdown={timeRemaining !== null ? formattedTime : null}
                        otherModes={modeTiles}
                        shareState={shareState}
                        onShare={share}
                        canShare={ink.status === "ready"}
                        isCalendarDay={isCalendarDay}
                    />
                )}

                <div aria-hidden className="h-14 [grid-area:end]" />
            </main>

            {drawingMode && (
                <div className="pointer-events-none fixed inset-0 z-120 animate-[ikScrim_.2s_ease-out_backwards]" data-testid="inkit-drawing-mode">
                    <button
                        type="button"
                        onClick={() => setDrawingMode(false)}
                        data-testid="inkit-done"
                        className="inkit-btn pp-focus pointer-events-auto absolute top-4 left-3.5 flex h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-(--ink) bg-(--face) pr-4.5 pl-3.5 font-bold text-[15px] text-(--face-ink)"
                    >
                        <Check className="size-4.5" strokeWidth={2.8} aria-hidden />
                        Done
                    </button>

                    <div style={{ top: drawTop + drawSize + DRAW_GAP }} className="absolute inset-x-0 flex justify-center">
                        <div className="pointer-events-auto">{tools(true)}</div>
                    </div>
                </div>
            )}

            {phase === "won" && <CardGrantedReveal cardGranted={cardGranted} />}

            {showConfetti && (
                <WinnerExplosion
                    onComplete={() => {
                        setShowConfetti(false);
                        if (!isCalendarDay) localStorage.setItem("confettiShownInkit", "true");
                    }}
                />
            )}

            {modal === "stats" && (
                <InkStatsModal stats={userStatsData} onClose={() => setModal(null)} onTransferData={() => setModal("transfer-data")} />
            )}
            {modal === "transfer-data" && (
                <Modal isOpen onClose={() => setModal(null)} title="Transfer Data..." isTransferDataSubPages returnPage={() => setModal("stats")}>
                    <TransferDataText onSubmitImportData={() => setModal("import-data")} onSubmitExportData={() => setModal("export-data")} />
                </Modal>
            )}
            {modal === "import-data" && (
                <Modal
                    isOpen
                    onClose={() => {
                        transferData.clearError();
                        setModal(null);
                    }}
                    title="Import Data..."
                    isTransferDataSubPages
                    returnPage={() => setModal("transfer-data")}
                >
                    <ImportDataText handleRedeem={transferData.handleRedeem} isRedeeming={transferData.isRedeeming} redeemError={transferData.redeemError} />
                </Modal>
            )}
            {modal === "export-data" && (
                <Modal isOpen onClose={() => setModal(null)} title="Export Data..." isTransferDataSubPages returnPage={() => setModal("transfer-data")}>
                    <ExportDataText
                        handleGenerate={transferData.handleGenerate}
                        generatedCodes={transferData.generatedCodes}
                        timeLeft={transferData.timeLeft}
                        expires_At={transferData.expiresAt}
                        fetchActiveCode={transferData.fetchActiveCode}
                    />
                </Modal>
            )}

            {showDebug && InkDebugPanel && (
                <Suspense fallback={null}>
                    <InkDebugPanel sheet={ink.sheet} lastStrokeCost={ink.lastStrokeCost} round={round} />
                </Suspense>
            )}

            {toast.node}
        </div>
    );
};

export default InkIt;
