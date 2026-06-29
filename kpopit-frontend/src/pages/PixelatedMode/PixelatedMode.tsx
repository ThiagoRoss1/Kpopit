import "./PixelatedMode.css";
import { AxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { useSharedGameData } from "../../hooks/useSharedGameData";
import { useGameMode } from "../../hooks/useGameMode";
import { useState, useEffect, useCallback, useRef } from "react";
import { getPixelatedDailyAlbum, getPixelatedGuessAlbum, getAllAlbums, getYesterdaysAlbum, getUserPosition, getDailyUserCount, saveGameState}  from "../../services/api";
import type { PixelatedGameData, AlbumSearchResult, PixelatedGuessDetail, YesterdayAlbum } from "../../interfaces/gameInterfaces";
import { decryptToken } from "../../utils/tokenEncryption";
import { albumCoverUrl } from "../../utils/imageUrl";
import PixelatedSearchBar from "../../components/Pixelated/PixelatedSearchBar";
import PixelatedCanvas from "../../components/Pixelated/PixelatedCanvas";
import PixelatedGuessGrid from "../../components/Pixelated/PixelatedGuessGrid";
import PixelatedHints from "../../components/Pixelated/PixelatedHints";
import PixelatedVictory from "../../components/Pixelated/PixelatedVictory";
import {GetPixelLevel, PIXEL_LEVELS} from "../../utils/pixelLevels";
import { WinnerExplosion } from "../../utils/confetti";
import { useClearGameStorage } from "../../hooks/useClearGameStorage";
import { safeReload } from "../../utils/safeReload";
import { useIsLg } from "../../hooks/useIsDevice";
import { useAllGameModes } from "../../hooks/useAllGameModes";
import { BarChart3 } from "lucide-react";
import Modal from "../../components/buttons/modals/Modal";
import StatsText from "../../components/buttons/modals/StatsContent";
import TransferDataText from "../../components/buttons/modals/TransferDataContent";
import ImportDataText from "../../components/buttons/modals/ImportDataContent";
import ExportDataText from "../../components/buttons/modals/ExportDataContent";
import { Link } from "react-router-dom";

const REVEAL_LEVEL = PIXEL_LEVELS[PIXEL_LEVELS.length - 1];

function PixelatedMode() {
    const gameMode = useGameMode();

    const [currentGuess, setCurrentGuess] = useState<string>("");
    const [selectedAlbum, setSelectedAlbum] = useState<AlbumSearchResult | null>(null);
    const [guesses, setGuesses] = useState<PixelatedGuessDetail[]>([]);
    const [endGame, setEndGame] = useState<boolean>(false);
    const [showVictory, setShowVictory] = useState<boolean>(false);
    const [dayChecked, setDayChecked] = useState<boolean>(false);
    const [confetti, setConfetti] = useState<boolean>(false);
    const [attempts, setAttempts] = useState<number>(0);
    const [sessionRestored, setSessionRestored] = useState<number>(0);
    const [showModal, setShowModal] = useState<null | "stats" | "transfer-data" | "import-data" | "export-data">(null);
    const [isTouched, setIsTouched] = useState<boolean>(false);

    const { initUser, decryptedTokenRef, isInitialized, queryClient, userStatsData, transferData } = useSharedGameData();
    const { clearPixelated } = useClearGameStorage();

    const isLg = useIsLg();

    const { otherModes } = useAllGameModes(gameMode);

    const queryUserCount = useQueryClient();

    const isCorrect = guesses.some((g) => g.guess_correct === true);

    useEffect(() => {
        const onSessionRestored = () => setSessionRestored((prev) => prev + 1);
        window.addEventListener("session-restored", onSessionRestored);
        return () => window.removeEventListener("session-restored", onSessionRestored);
    }, []);

    useEffect(() => {
        if (guesses.length > 0) {
            localStorage.setItem("pixelatedGameComplete", endGame ? "true" : "false");
            localStorage.setItem("pixelatedGameWon", isCorrect ? "true" : "false");
        }
    }, [isCorrect, endGame, guesses.length]);

    const dailyUserCount = useQuery({
        queryKey: ["dailyUserCount", gameMode],
        queryFn: getDailyUserCount,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });

    const {
        data: pixelatedGameData,
        isLoading: isLoadingPixelatedGameData,
        isError: isErrorPixelatedGameData,
        error: pixelatedGameDataError,
    } = useQuery<PixelatedGameData>({
        queryKey: ["pixelatedDailyAlbum", gameMode],
        queryFn: getPixelatedDailyAlbum,
        enabled: isInitialized || !!decryptedTokenRef.current,
        staleTime: 1000 * 60 * 60 * 4,
        refetchOnWindowFocus: false,
        placeholderData: (previousData) => previousData,
    });

    const { data: allAlbumsData, isLoading: isLoadingAllAlbums } = useQuery<AlbumSearchResult[]>({
        queryKey: ["allAlbums"],
        queryFn: getAllAlbums,
        staleTime: 1000 * 60 * 60 * 24 * 5,
        gcTime: 1000 * 60 * 60 * 24 * 6,
        refetchOnWindowFocus: false,
    });

    const { data: yesterdayAlbumData } = useQuery<YesterdayAlbum>({
        queryKey: ["yesterdaysAlbum"],
        queryFn: getYesterdaysAlbum,
        staleTime: 1000 * 60 * 60 * 24,
        refetchOnWindowFocus: false,
    });

    const yesterdayAlbum = yesterdayAlbumData?.past_album_id ? yesterdayAlbumData.album_name : null;
    const yesterdayAlbumCover = yesterdayAlbumData?.cover_path ?? null;
    const yesterdayAlbumArtist = yesterdayAlbumData?.artist ?? null;

    useEffect(() => {
        if (!pixelatedGameData?.server_date) return;

        const serverDate = pixelatedGameData.server_date;
        const lastGameDate = localStorage.getItem("pixelatedGameDate");

        if (lastGameDate !== serverDate) {
            console.log("New day detected, clearing pixelated cache.");
            clearPixelated();

            setGuesses([]);
            setAttempts(0);

            localStorage.setItem("pixelatedGameDate", serverDate);

            safeReload();
            return;
        }

        console.log("Same day, restoring pixelated cache.");

        const cachedGuesses = localStorage.getItem("pixelatedGuessesDetails");
        const gameComplete = localStorage.getItem("pixelatedGameComplete");
        const gameWon = localStorage.getItem("pixelatedGameWon");
        const confettiShown = localStorage.getItem("confettiShownPixelated") === "true";

        if (cachedGuesses) {
            try {
                const parsedGuesses = JSON.parse(cachedGuesses) as PixelatedGuessDetail[];
                setGuesses(parsedGuesses);
                setAttempts(parsedGuesses.length);
            } catch (error) {
                console.error("Error parsing cached pixelated guesses:", error);
            }
        }

        if (gameComplete === "true") {
            setEndGame(true);
            if (gameWon === "true") {
                setShowVictory(true);
            }
        }
        setDayChecked(true);
        setConfetti(confettiShown);
    }, [pixelatedGameData, clearPixelated, sessionRestored]);

    const guessMutation = useMutation({
        mutationFn: getPixelatedGuessAlbum,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["userStats"] });
            queryUserCount.invalidateQueries({ queryKey: ["dailyUserCount", gameMode] });
            queryClient.invalidateQueries({ queryKey: ["pixelatedUserPosition", gameMode] });

            const currentGuesses = JSON.parse(localStorage.getItem("pixelatedGuessesDetails") || "[]") as PixelatedGuessDetail[];

            saveGameState({
                pixelated_guesses_details: currentGuesses,
                game_complete: data.guess_correct,
                game_won: data.guess_correct,
                game_date: variables.game_date,
                guessed_albums: currentGuesses.map((g) => g.album_name),
            });
        },
        onError: (error) => {
            console.error("Error submitting pixelated guess:", error);
        },
    });

    const userPosition = useQuery({
        queryKey: ["pixelatedUserPosition", gameMode],
        queryFn: async () => getUserPosition((await initUser()) || ""),
        enabled: isInitialized,
        refetchOnWindowFocus: false,
    });

    const userPositionData = userPosition?.data?.position;
    const userRankData = userPosition?.data?.rank;
    const userScoreData = userPosition?.data?.score;

    // Search bar handlers
    const handleAlbumSelect = useCallback((text: string) => setCurrentGuess(text), []);
    const handleAlbumSelectId = useCallback((album: AlbumSearchResult) => setSelectedAlbum(album), []);

    const stableDataRef = useRef({ selectedAlbum, pixelatedGameData, guesses, attempts, guessMutation });
    
    useEffect(() => {
        stableDataRef.current = { selectedAlbum, pixelatedGameData, guesses, attempts, guessMutation };
    }, [selectedAlbum, pixelatedGameData, guesses, attempts, guessMutation]);

    const handleSubmit = useCallback(async () => {
        const { selectedAlbum, pixelatedGameData, guesses, attempts, guessMutation } = stableDataRef.current;

        if (!selectedAlbum || !pixelatedGameData || guessMutation.isPending) return;

        const gameDate = pixelatedGameData.server_date;

        if (guesses.some((g) => g.album_id === selectedAlbum.id)) {
            setCurrentGuess("");
            setSelectedAlbum(null);
            return;
        }

        const guessCorrect = selectedAlbum.id === pixelatedGameData.answer_id;

        const localGuessResult: PixelatedGuessDetail = {
            album_id: selectedAlbum.id,
            album_name: selectedAlbum.name,
            group_name: selectedAlbum.group_name,
            cover_path: selectedAlbum.cover_path,
            guess_correct: guessCorrect,
        };

        const updatedGuesses = [...guesses, localGuessResult];
        setGuesses(updatedGuesses);

        localStorage.setItem("pixelatedGuessesDetails", JSON.stringify(updatedGuesses));
        localStorage.setItem("pixelatedGuessedAlbums", JSON.stringify(updatedGuesses.map((g) => g.album_name)));
        localStorage.setItem("pixelatedGameComplete", guessCorrect ? "true" : "false");
        localStorage.setItem("pixelatedGameWon", guessCorrect ? "true" : "false");

        const encrypted = localStorage.getItem("userToken") || "";
        const token = decryptedTokenRef.current || (await decryptToken(encrypted));

        guessMutation.mutate({
            album_id: selectedAlbum.id,
            current_attempt: attempts + 1,
            game_date: gameDate,
            user_token: token,
        });

        setCurrentGuess("");
        setSelectedAlbum(null);
        setAttempts((prev) => prev + 1);
    }, [decryptedTokenRef]);

    const handleAnimationsComplete = useCallback(() => {
        if (isCorrect) {
            setEndGame(true);
            setShowVictory(true);
            setCurrentGuess("");
        }
    }, [isCorrect]);

    const excludedIds = guesses.map((g) => g.album_id);
    const blockSize = endGame ? REVEAL_LEVEL : GetPixelLevel(guesses.length);
    const userCount = dailyUserCount?.data?.user_count ?? 0;
    const winningGuess = guesses.find((g) => g.guess_correct);

    // Loading / error states
    if ((isLoadingPixelatedGameData || isLoadingAllAlbums || !isInitialized) && !pixelatedGameData) {
        return (
            <div className="fixed inset-0 z-100 flex w-full h-screen bg-black justify-center items-center">
                <span className="text-white animate-pulse">Loading Kpopit...</span>
            </div>
        );
    }

    if (isErrorPixelatedGameData || !pixelatedGameData) {
        const error = pixelatedGameDataError as AxiosError;
        console.error("Error loading Pixelated Mode data:", error?.response?.data || error?.message);
        return (
            <div className="fixed inset-0 z-100 flex w-full h-screen bg-black justify-center items-center">
                <span className="text-white animate-pulse">Error loading Kpopit. Please try again later.</span>
            </div>
        );
    }

    if (!dayChecked) return null;

    const coverUrl = albumCoverUrl(pixelatedGameData.cover_path);

    const statsButton = (
        <button
            type="button"
            onClick={() => setShowModal("stats")}
            aria-label="Your stats"
            className="flex shrink-0 items-center justify-center w-11 h-11 sm:w-11 sm:h-11 rounded-2xl bg-neon-pink border-2 border-ink text-white
            shadow-[0_4px_0_var(--color-ink)] firefox:shadow-none firefox:drop-shadow-[0_4px_0_var(--color-ink)] firefox:active:drop-shadow-[0_1px_0_var(--color-ink)] transition-all duration-500 transform-gpu
            hover:brightness-110 hover:cursor-pointer hover:scale-105 active:translate-y-1 active:shadow-[0_1px_0_var(--color-ink)]
            focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
    );

    const statsModals = (
        <>
            {showModal === "stats" && <Modal isOpen onClose={() => setShowModal(null)} title="Stats..."><StatsText stats={userStatsData} onSubmitTransferData={() => setShowModal("transfer-data")} /></Modal>}
            {showModal === "transfer-data" && <Modal isOpen onClose={() => setShowModal(null)} title="Transfer Data..." isTransferDataSubPages returnPage={() => setShowModal("stats")}><TransferDataText onSubmitImportData={() => setShowModal("import-data")} onSubmitExportData={() => setShowModal("export-data")} /></Modal>}
            {showModal === "import-data" && <Modal isOpen onClose={() => { transferData.clearError(); setShowModal(null); }} title="Import Data..." isTransferDataSubPages returnPage={() => setShowModal("transfer-data")}><ImportDataText handleRedeem={transferData.handleRedeem} isRedeeming={transferData.isRedeeming} redeemError={transferData.redeemError} /></Modal>}
            {showModal === "export-data" && <Modal isOpen onClose={() => setShowModal(null)} title="Export Data..." isTransferDataSubPages returnPage={() => setShowModal("transfer-data")}><ExportDataText handleGenerate={transferData.handleGenerate} generatedCodes={transferData.generatedCodes} timeLeft={transferData.timeLeft} expires_At={transferData.expiresAt} fetchActiveCode={transferData.fetchActiveCode} /></Modal>}
        </>
    );

    return (
        <>
            <Helmet>
                <title>KpopIt Pixelated - K-pop Album Cover Guessing Game</title>
                <meta name="description" content="Guess today's K-pop album from its pixelated cover art in KpopIt's daily Pixelated mode." />
                <link rel="canonical" href={`https://kpopit.net/pixelated`} />
                <meta property="og:title" content="KpopIt Pixelated - K-pop Album Cover Guessing Game" />
                <meta property="og:description" content="Guess today's K-pop album from its pixelated cover art in KpopIt's daily Pixelated mode." />
            </Helmet>

            <div className="pixelmode min-h-full w-full">
                <div className="pixelmode__bg" aria-hidden="true">
                    <div className="pixelmode__margin" />
                </div>

                {/* Mobile zoom backdrop */}
                {isTouched && (
                    <div
                        className="fixed inset-0 z-40 bg-black/60"
                        onTouchEnd={() => setIsTouched(false)}
                    />
                )}

                <div className={`mx-auto max-w-340 px-4 zm:px-6 sm:px-12 md:px-20 lg:px-10 ${isLg ? "py-10" : "py-4"}`}>
                    <div className={`flex flex-col lg:flex-row gap-4 lg:gap-10 ${isLg ? "items-start" : "items-center"}`}>

                        {!isLg && (
                        <Link 
                            to="/"
                            className="flex flex-row items-center justify-center gap-5 mb-0">
                            <h1 className="text-5xl font-bold text-neon-pink leading-tight">
                                <span
                                    className="kpop-part"
                                    style={{ '--kpop-color': 'var(--color-neon-pink)' } as React.CSSProperties}
                                >
                                    Pixel
                                </span>

                                <span
                                    className="it-part"
                                    style={{ '--it-color': 'var(--color-cream)' } as React.CSSProperties}
                                >
                                    It
                                </span>
                            </h1>

                            {statsButton}
                        </Link>
                        )}
                        
                        {/* ── LEFT: album sleeve + vinyl + hints ── */}
                        <div className="flex flex-col w-full lg:w-1/2 xl:w-160">
                                <div
                                    className={`pixel-stage relative w-full h-70 xxs:h-75 xs:h-80 xm:h-85 zm:h-95 sm:h-100 md:h-110 xl:h-130 mx-auto select-none
                                    ${isTouched ? "scale-110 z-50" : "scale-100"} transition-transform duration-300 transform-gpu`}
                                    onTouchEnd={(e) => {
                                        if (window.matchMedia("(orientation: portrait)").matches) {
                                            setIsTouched(!isTouched);
                                            e.stopPropagation();
                                        }
                                    }}
                                >
                                    {/* Vinyl disc */}
                                    <div 
                                        className="absolute flex left-1/2 -translate-x-[35%] xs:-translate-x-[30%] top-5 w-55 zm:-translate-x-[30%] 
                                        xxs:w-60 xs:w-65 xm:w-70 zm:w-76 sm:w-80 md:-translate-x-[25%] md:top-3 md:w-90 lg:-translate-x-[2%] lg:left-32 lg:w-90 xl:translate-x-[5%] xl:left-36 xl:w-110 aspect-square z-1"
                                    >
                                        <div className="pixel-vinyl">
                                            <div className="pixel-vinyl__spin">
                                                <div className="pixel-vinyl__label overflow-hidden">
                                                    <PixelatedCanvas
                                                        imageUrl={coverUrl}
                                                        blockSize={blockSize}
                                                        alt="Pixelated album cover"
                                                        className="w-full h-full object-cover block rounded-full"
                                                    />
                                                </div>
                                            </div>
                                            <div className="pixel-vinyl__light" />
                                            <div className="pixel-vinyl__hole" />
                                        </div>
                                    </div>

                                    {/* Sleeve */}
                                    <div
                                        className="absolute flex z-2 bg-ink border-2 border-cream -rotate-4 left-1/2 -translate-x-[55%] xs:-translate-x-[65%] top-[2%] w-55 h-65 xxs:w-60 xxs:h-70 xs:w-65 xs:h-75 xm:w-70 xm:h-80 zm:w-76 zm:h-86
                                        shadow-[0_14px_30px_rgba(0,0,0,0.35),0_4px_10px_rgba(0,0,0,0.2)] rounded-2xl rounded-b-3xl
                                        sm:w-80 sm:h-90 md:-translate-x-[60%] md:w-90 md:h-100 lg:left-0 lg:translate-x-0 lg:w-90 lg:h-100 xl:w-110 xl:h-120"
                                    >
                                        <div className="relative flex items-center justify-center p-4 w-full h-fit">
                                            <span className="pixel-washi absolute top-0 -left-6 w-[22%] h-5.5 z-4 rotate-[-34.8deg]" />
                                            <span className="pixel-washi absolute top-0 -right-6 w-[22%] h-5.5 z-5 rotate-[34.8deg]" />

                                            {/* Cover */}
                                            <div className="relative w-full aspect-square rounded-xl overflow-hidden flex flex-col bg-transparent">
                                                <PixelatedCanvas
                                                    imageUrl={coverUrl}
                                                    blockSize={blockSize}
                                                    alt="Pixelated album cover"
                                                    className="w-full h-full object-cover block"
                                                />
                                                {!endGame && (
                                                    <div className="absolute inset-0 z-1 flex items-center justify-center font-bold text-white/40
                                                        mix-blend-overlay pointer-events-none text-[clamp(56px,15vw,120px)] [text-shadow:0_4px_20px_rgba(0,0,0,0.5)]">
                                                        {guesses.length === 0 ? "?" : ""}
                                                    </div>
                                                )}
                                                {/* Corner brackets */}
                                                <span className="absolute top-2.5 left-2.5 w-3.5 h-3.5 z-3 pointer-events-none border-l-2 border-t-2 border-white/55" />
                                                <span className="absolute top-2.5 right-2.5 w-3.5 h-3.5 z-3 pointer-events-none border-r-2 border-t-2 border-white/55" />
                                                <span className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 z-3 pointer-events-none border-l-2 border-b-2 border-white/55" />
                                                <span className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 z-3 pointer-events-none border-r-2 border-b-2 border-white/55" />
                                            </div>
                                        </div>

                                        <div className="absolute left-0 right-0 bottom-4 z-3 justify-center items-center text-center text-white text-xl xs:text-2xl leading-none
                                            tracking-[0.02em] font-['Caveat',cursive] [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
                                            Guess the album
                                        </div>
                                    </div>
                                </div>

                                {!endGame && (
                                    <div className="mt-2 lg:mt-6 flex items-center justify-center">
                                        <PixelatedHints
                                            guessCount={guesses.length}
                                            releaseYear={pixelatedGameData.release_year}
                                            artistName={pixelatedGameData.group_name}
                                        />
                                    </div>
                                )}
                       
                        </div>

                        {/* ── RIGHT: title - if lg (1024px +), search, status, guesses ── */}
                        <div className="flex-1 min-w-0 w-full">
                            <div className="flex flex-col mb-1">
                                {isLg && (
                                    <div className="flex flex-row items-center justify-center gap-5 mb-6">
                                        <Link 
                                            to="/"
                                            className="inline-block bg-transparent border-0 p-0 cursor-pointer hover:scale-105
                                            transition-all duration-500 transform-gpu"
                                        >
                                            <h1 className="text-5xl font-bold text-neon-pink leading-tight">
                                                <span
                                                    className="kpop-part"
                                                    style={{ '--kpop-color': 'var(--color-neon-pink)' } as React.CSSProperties}
                                                >
                                                    Pixel
                                                </span>
                                                <span
                                                    className="it-part"
                                                    style={{ '--it-color': 'var(--color-cream)' } as React.CSSProperties}
                                                >
                                                    It
                                                </span>
                                            </h1>
                                        </Link>
                                        {statsButton}
                                    </div>
                                )}
                                
                                {!endGame && (
                                <span className="flex justify-center items-center text-[14px] sm:text-[16px] drop-shadow-lg text-ink/70">
                                    Guess today's album...
                                </span>
                                )}
                            </div>

                            {!endGame && (
                                <div className="flex justify-center mb-3">
                                    <PixelatedSearchBar
                                        allAlbums={allAlbumsData ?? []}
                                        value={currentGuess}
                                        onAlbumSelect={handleAlbumSelect}
                                        onAlbumSelectId={handleAlbumSelectId}
                                        onSubmit={handleSubmit}
                                        excludedAlbums={excludedIds}
                                        disabled={isCorrect || endGame}
                                    />
                                </div>
                            )}

                            {/* Player count */}
                            <div className="flex flex-row items-center justify-center mb-7 text-base">
                                <span className="leading-tight">
                                    <span className="text-neon-pink font-bold [text-shadow:1.2px_1.2px_2px_rgba(0,0,0,0.6),0_0_12px_rgba(255,51,153,1)]">
                                        {userCount}
                                    </span> <span className="text-ink/70">
                                        {userCount === 1 ? "person" : "people"} already found today's album
                                    </span>
                                </span>
                            </div>

                            {/* Past guesses */}
                            {guesses.length > 0 && (
                                <PixelatedGuessGrid
                                    guesses={guesses}
                                    onAnimationComplete={handleAnimationsComplete}
                                />
                            )}
                        </div>
                    </div>

                    {statsModals}

                    {/* Victory Card */}
                    {endGame && isCorrect && showVictory && winningGuess && (
                        <div className="mt-25">
                            <PixelatedVictory
                                albumName={winningGuess.album_name}
                                groupName={pixelatedGameData.group_name}
                                coverPath={pixelatedGameData.cover_path}
                                yesterdayAlbum={yesterdayAlbum}
                                yesterdayAlbumCover={yesterdayAlbumCover}
                                yesterdayAlbumArtist={yesterdayAlbumArtist}
                                attempts={attempts}
                                position={userPositionData}
                                score={userScoreData}
                                rank={userRankData}
                                otherGamemodes={otherModes}
                            />
                        </div>
                    )}
                </div>

                {endGame && isCorrect && !confetti && (
                    <WinnerExplosion
                        onComplete={() => {
                            setConfetti(true);
                            localStorage.setItem("confettiShownPixelated", "true");
                        }}
                    />
                )}
            </div>
        </>
    );
}

export default PixelatedMode;
