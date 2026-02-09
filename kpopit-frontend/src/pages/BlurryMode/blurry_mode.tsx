import "../BlurryMode/blurry_mode.css";
import { AxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSharedGameData } from "../../hooks/useSharedGameData";
import { useGameMode } from "../../hooks/useGameMode";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getBlurryDailyIdol, getBlurryGuessIdol, getUserPosition, getYesterdaysIdol, getDailyUserCount, saveGameState } from "../../services/api";
import type { 
    GuessResponse, 
    BlurryGameData, 
    IdolListItem, 
    FeedbackData, 
    YesterdayIdol,
    CompleteGuessRequest,
    CompleteGuessTrafficRequest,
} from "../../interfaces/gameInterfaces";
import { Link } from "react-router-dom";
import { decryptToken } from "../../utils/tokenEncryption";
import BackgroundStyle from "../../components/Background/BackgroundStyle";
import SearchBar from "../../components/GuessSearchBar/SearchBar";
import TopButtons from "../../components/buttons/TopButtons";
import ModeOptions from "../../components/Blurry/buttons/ModeOptions";
import GetBlurLevel, { BLUR_LEVELS } from "./blurLevels";
import GuessGrid from "../../components/Blurry/GuessesGrid/GuessGrid";
import VictoryCardHudBlurry from "../../components/Blurry/VictoryCard/VictoryCardHudBlurry";
import { useResetTimer } from "../../hooks/useResetTimer";
import { useAllGameModes } from "../../hooks/useAllGameModes";
import Modal from "../../components/buttons/modals/Modal";
import StatsText from "../../components/buttons/modals/StatsContent";
import HowToPlayBlurryContent from "../../components/buttons/modals/HowToPlayBlurryContent";
import ShareText from "../../components/buttons/modals/ShareContent";
import TransferDataText from "../../components/buttons/modals/TransferDataContent";
import ImportDataText from "../../components/buttons/modals/ImportDataContent";
import ExportDataText from "../../components/buttons/modals/ExportDataContent";
import { WinnerExplosion } from "../../utils/confetti";

function BlurryMode() {
    const gameMode = useGameMode();
    const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
    const [currentGuess, setCurrentGuess] = useState<string>("");
    const [selectedIdol, setSelectedIdol] = useState<IdolListItem | null>(null);
    const [guesses, setGuesses] = useState<GuessResponse<Partial<FeedbackData>>[]>([]);
    const [endGame, setEndGame] = useState<boolean>(false);
    const [showModal, setShowModal] = useState<null | "stats" | "how-to-play-blurry" | "share" | "transfer-data" | "import-data" | "export-data">(null);
    const [dayChecked, setDayChecked] = useState<boolean>(false);
    const [showVictoryCard, setShowVictoryCard] = useState<boolean>(false);
    const [confetti, setConfetti] = useState<boolean>(false);
    const [attempts, setAttempts] = useState<number>(0);

    // Mobile
    const [isTouched, setIsTouched] = useState<boolean>(false);

    const { userToken, initUser, decryptedTokenRef, allIdolsData, isLoadingAllIdols, 
        isInitialized, userStatsData, transferData, isErrorAllIdols, queryClient} = useSharedGameData();

    const isCorrect = guesses.some(g => g.guess_correct === true);

    useEffect(() => {
        if (guesses.length > 0) {
            localStorage.setItem("blurryGameComplete", endGame ? "true" : "false");
            localStorage.setItem("blurryGameWon", isCorrect ? "true" : "false");
        }
    }, [isCorrect, endGame, guesses.length]);

    // Query user count
    const queryUserCount = useQueryClient();

    const dailyUserCount = useQuery({
        queryKey: ["dailyUserCount", gameMode],
        queryFn: getDailyUserCount,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });


    // Blurry game data
    const {
        data: blurryGameData,
        isLoading: isLoadingBlurryGameData,
        isError: isErrorBlurryGameData,
        error: blurryGameDataError,
    } = useQuery<BlurryGameData>({
        queryKey: ['blurryDailyIdol', gameMode],
        queryFn: getBlurryDailyIdol,
        enabled: isInitialized || !!decryptedTokenRef.current,
        staleTime: 1000 * 60 * 60 * 4,
        refetchOnWindowFocus: false,
        placeholderData: (previousData) => previousData,
    });

    useEffect(() => {
        if (blurryGameData?.blur_image_path) {
            let isCancelled = false;
            const img = new Image();
            img.src = `${import.meta.env.VITE_IMAGE_BUCKET_URL}${blurryGameData.blur_image_path}`;
            img.onload = () => {
                if (!isCancelled) {
                    setIsImageLoading(false);
                }
            };

            img.onerror = () => {
                if (!isCancelled) {
                    console.error("Error loading image:", img.src);
                    setIsImageLoading(false);
                }
            };

            return () => {
                isCancelled = true;
                img.onload = null;
                img.onerror = null;
            }
        }
    }, [blurryGameData?.blur_image_path]);

    // Yesterday idol
    const yesterdayIdol = useQuery<YesterdayIdol>({
        queryKey: ['blurryYesterdayIdol', gameMode],
        queryFn: getYesterdaysIdol,
        staleTime: 1000 * 60 * 60 * 4,
        refetchOnWindowFocus: false,
        enabled: isInitialized
    });

    const yesterdayArtist = allIdolsData?.find(
        (idol) => idol.id === yesterdayIdol.data?.past_idol_id
    )?.artist_name;

    const yesterdayIdolImage = yesterdayIdol.data?.image_path ?? null;
    
    useEffect(() => {
        if (!blurryGameData?.server_date) return;

        const serverDate = blurryGameData?.server_date;
        const lastGameDate = localStorage.getItem("blurryGameDate");

        if (lastGameDate !== serverDate) {
            console.log("New day detected, clearing cache.");
            localStorage.removeItem("blurryGuessesDetails");
            localStorage.removeItem("blurryGuessedIdols");
            localStorage.removeItem("blurryGameComplete");
            localStorage.removeItem("blurryGameWon");
            localStorage.removeItem("blurryHardcoreMode");
            localStorage.removeItem("blurryColorMode");
            localStorage.removeItem("blurryAnimatedIdols");
            localStorage.removeItem("confettiShownBlurry");

            setGuesses([]);
            setAttempts(0);
            setBlurryToggleOptions({ hardcore: false, color: false });

            localStorage.setItem("blurryGameDate", serverDate);

            window.location.reload();
            return;

        } else {
            console.log("Same day, restoring cache.");

            const cachedGuesses = localStorage.getItem("blurryGuessesDetails");
            const gameComplete = localStorage.getItem("blurryGameComplete");
            const gameWon = localStorage.getItem("blurryGameWon");
            const confettiShown = localStorage.getItem("confettiShownBlurry") === "true";

            if (cachedGuesses) {
                try {
                    const parsedGuesses = JSON.parse(cachedGuesses) as GuessResponse<Partial<FeedbackData>>[];
                    setGuesses(parsedGuesses);
                    setAttempts(parsedGuesses.length);
                } catch (error) {
                    console.error("Error parsing cached guesses:", error);
                }
            }

            if (gameComplete === "true") {
                setEndGame(true);
                if (gameWon === "true") {
                    setShowVictoryCard(true);
                }
            }
            setDayChecked(true);
            setConfetti(confettiShown);
        }
    }, [blurryGameData]);

    const blurryIdols = useMemo(() => {
        if (!allIdolsData) return [];
        return allIdolsData?.filter((idol): idol is IdolListItem & { blur_image_path: string } => !!idol.blur_image_path);
    }, [allIdolsData]);

    // Find the idol of the day
    const targetIdol = useMemo(() => {
        if (!allIdolsData || !blurryGameData?.answer_id) return null;
        return allIdolsData.find((idol) => idol.id === blurryGameData.answer_id) || null;
    }, [allIdolsData, blurryGameData]);

    const artistName = useMemo(() => 
        targetIdol?.artist_name || "Loading...",
    [targetIdol]);

    const guessMutation = useMutation({
        mutationFn: async (guessData: CompleteGuessRequest) => {
            const traffic = {
                utm_source: new URLSearchParams(window.location.search).get('utm_source') || 'organic',
                referrer: document.referrer || 'direct'
            };

            const payload: CompleteGuessTrafficRequest = {
                ...guessData,
                ...traffic
            };
            return getBlurryGuessIdol(payload);
        },
        onSuccess: (data, variables) => {
            if (import.meta.env.DEV) {
                console.log("Guess response data:", data);
                console.log("Got user token guess:", decryptedTokenRef.current);
            }


            queryClient.invalidateQueries({queryKey: ["userStats"]});
            queryUserCount.invalidateQueries({queryKey: ["dailyUserCount", gameMode]});
            queryClient.invalidateQueries({queryKey: ["blurryUserPosition", gameMode]});

            const currentGuesses = JSON.parse(localStorage.getItem("blurryGuessesDetails") || "[]") as GuessResponse<Partial<FeedbackData>>[];

            saveGameState({
                blurry_guesses_details: currentGuesses,
                game_complete: data.guess_correct,
                game_won: data.guess_correct,
                game_date: variables.game_date,
                guessed_idols: currentGuesses.map(g => g.guessed_idol_data?.artist_name),
            });
        },
        onError: (error) => {
            console.error("Error submitting guess:", error);
        }
    });

    // User ranks 
    const userPosition = useQuery({
        queryKey: ['blurryUserPosition', gameMode],
        queryFn: async () => {
            if (!userToken) return null;
            return getUserPosition(await initUser() || "");
        },
        enabled: isInitialized,
        refetchOnWindowFocus: false,
    });

    const userPositionData = userPosition?.data?.position;
    const userRankData = userPosition?.data?.rank;
    const userScoreData = userPosition?.data?.score;

    // Search bar
    const handleIdolSelect = useCallback((idolName: string) => setCurrentGuess(idolName), []);
    const handleIdolSelectId = useCallback((idolId: IdolListItem) => setSelectedIdol(idolId), []);

    const stableDataRef = useRef({ selectedIdol, blurryGameData, allIdolsData, guesses, attempts, guessMutation });

    useEffect(() => {
        stableDataRef.current = { selectedIdol, blurryGameData, allIdolsData, guesses, attempts, guessMutation };
    }, [selectedIdol, blurryGameData, allIdolsData, guesses, attempts, guessMutation]);
    
    const handleSubmit = useCallback(async () => {
        const { selectedIdol, blurryGameData, allIdolsData, guesses, attempts, guessMutation } = stableDataRef.current;

        if (!selectedIdol || !blurryGameData || !allIdolsData || guessMutation.isPending) return;

        const gameDate = blurryGameData.server_date;

        if (guesses.some(g => g.guessed_idol_data?.idol_id === selectedIdol.id)) {
            setCurrentGuess("");
            setSelectedIdol(null);
            return;
        }

        const guessedIdolData = allIdolsData.find(idol => idol.id === selectedIdol.id);
        if (!guessedIdolData) {
            console.error("Idol data not found");
            return;
        }

        const isCorrectGuess = guessedIdolData.id === blurryGameData.answer_id;

        const localGuessResult: GuessResponse<Partial<FeedbackData>> = {
            guess_correct: isCorrectGuess,
            feedback: {},
            guessed_idol_data: {
                ...guessedIdolData,
                idol_id: guessedIdolData.id,
            }
        };

        setGuesses(prev => {
            const updatedGuesses = [...prev, localGuessResult];
            localStorage.setItem("blurryGuessesDetails", JSON.stringify(updatedGuesses));
            const names = updatedGuesses.map(g => g.guessed_idol_data?.artist_name);
            localStorage.setItem("blurryGuessedIdols", JSON.stringify(names));

            localStorage.setItem("blurryGameComplete", isCorrectGuess ? "true" : "false");
            localStorage.setItem("blurryGameWon", isCorrectGuess ? "true" : "false");

            return updatedGuesses;
        });

        const encrypted = localStorage.getItem("userToken") || "";
        const token = decryptedTokenRef.current || await decryptToken(encrypted);
        
        guessMutation.mutate({
            guessed_idol_id: selectedIdol.id,
            answer_id: blurryGameData.answer_id,
            user_token: token,
            current_attempt: attempts + 1,
            game_date: gameDate,
        });

        setCurrentGuess("");
        setSelectedIdol(null);

        setAttempts(prev => prev + 1);

    }, [decryptedTokenRef]);

    const excludedIds = useMemo(() =>
        guesses.map(guess => guess.guessed_idol_data?.idol_id).filter((id): id is number => id !== undefined),
    [guesses]);

    // Toggle UI
    const [blurryToggleOptions, setBlurryToggleOptions] = useState({
        hardcore: localStorage.getItem("blurryHardcoreMode") === "true",
        color: localStorage.getItem("blurryColorMode") === "true",
    });

    const handleToggleOption = useCallback((optionId: "hardcore" | "color") => {
        setBlurryToggleOptions(prev => {
            const nextValue = !prev[optionId];
            localStorage.setItem(`blurry${optionId.charAt(0).toUpperCase() + optionId.slice(1)}Mode`, nextValue ? "true" : "false");
            return {...prev, [optionId]: nextValue};
        });
    }, []);

    // Blur level calculation (logic)
    const currentBlur = blurryToggleOptions.hardcore ? BLUR_LEVELS[0] : GetBlurLevel(attempts);

    // Animations complete
    const handleAnimationsComplete = () => {
        if (isCorrect) {
            setEndGame(true);
            setShowVictoryCard(true);
            setCurrentGuess("");
        }
    };

    // All gameModes for victory card
    const { otherModes } = useAllGameModes(gameMode);

    // Blurry Wins
    const wonWithHardMode = isCorrect && blurryToggleOptions.hardcore;
    const wonWithoutColors = isCorrect && !blurryToggleOptions.color;

    // Loading and error states
    if ((isLoadingBlurryGameData || isLoadingAllIdols || !isInitialized) && !blurryGameData) {
        return (
            <div className="fixed inset-0 z-100 flex w-full h-screen bg-black justify-center items-center">
                <span className="text-white animate-pulse">Loading Kpopit...</span>
            </div>
        );
    }

    if (isErrorAllIdols || isErrorBlurryGameData || !blurryGameData) {
        const error = blurryGameDataError as AxiosError;
        console.error("Error loading Blurry Mode data:", blurryGameDataError);
        console.error(error?.response?.data || error?.message);
        return (
            <div className="fixed inset-0 z-100 flex w-full h-screen bg-black justify-center items-center">
                <span className="text-white animate-pulse">Error loading Kpopit. Please try again later.</span>
            </div>
        );
    }

    if (!dayChecked) return null;

    return (
        <>
        <BackgroundStyle attempts={attempts} />
        <div className="min-h-full w-full flex flex-col items-center justify-start mt-4">
            <Link 
                to="/"
                className="flex items-center justify-center text-center w-fit sm:w-3xs h-fit sm:h-14 mb-4
                hover:scale-105 hover:cursor-pointer transition-all duration-300 transform-gpu">
                <h1 className="leading-tight max-xxs:text-3xl xxs:text-3xl xs:text-4xl sm:text-5xl font-bold text-center">
                    <span className="kpop-part">Blur</span>
                    <span className="it-part">it</span>
                </h1>
            </Link>

            <div className="flex items-center justify-center mb-4">
                <TopButtons
                    onSubmitStats={() => {setShowModal("stats")}}
                    onSubmitHowToPlay={() => {setShowModal("how-to-play-blurry")}}
                    onSubmitShare={() => {setShowModal("share")}}
                />
                {showModal === "stats" && <Modal isOpen onClose={() => setShowModal(null)} title="Stats..."><StatsText stats={userStatsData} onSubmitTransferData={() => {setShowModal("transfer-data")}} /></Modal>}
                {showModal === "how-to-play-blurry" && <Modal isOpen onClose={() => setShowModal(null)} title="How to Play..." isHowToPlay={true}><HowToPlayBlurryContent /></Modal>}
                {showModal === "share" && <Modal isOpen onClose={() => setShowModal(null)} title="Share..."><ShareText guesses={guesses as GuessResponse[]} hasWon={isCorrect} attempts={attempts} gameMode={'blurry'} wonWithHardMode={wonWithHardMode} wonWithoutColors={wonWithoutColors} /></Modal>}

                {/* Sub-Stats Modals */}
                {showModal === "transfer-data" && <Modal isOpen onClose={() => setShowModal(null)} title="Transfer Data..." isTransferDataSubPages={true} returnPage={() => {setShowModal("stats")}}><TransferDataText onSubmitImportData={() => {setShowModal("import-data")}} onSubmitExportData={() => {setShowModal("export-data")}} /></Modal>}
                {showModal === "import-data" && <Modal isOpen onClose={() => {transferData.clearError(); setShowModal(null);}} title="Import Data..." isTransferDataSubPages={true} returnPage={() => {setShowModal("transfer-data")}}><ImportDataText handleRedeem={transferData.handleRedeem} isRedeeming={transferData.isRedeeming} redeemError={transferData.redeemError} /></Modal>}
                {showModal === "export-data" && <Modal isOpen onClose={() => setShowModal(null)} title="Export Data..." isTransferDataSubPages={true} returnPage={() => {setShowModal("transfer-data")}}><ExportDataText handleGenerate={transferData.handleGenerate} generatedCodes={transferData.generatedCodes} timeLeft={transferData.timeLeft} expires_At={transferData.expiresAt} fetchActiveCode={transferData.fetchActiveCode} /></Modal>}
            </div>

            {/* Mobile background card zoom */}
            {isTouched && (
                <div 
                    className="fixed inset-0 z-40 bg-black/60"
                    onTouchEnd={() => setIsTouched(false)}
                    />
            )}

            {/* Blurry Image */}
            <div className="relative group" onTouchEnd={() => setIsTouched(false)}>
                <div className={`relative flex items-center justify-center bg-transparent border-2 border-white
                max-xxs:w-55 max-xxs:h-80 xxs:w-60 xxs:h-88 xs:w-70 xs:h-98 xm:w-70 xm:h-98 zm:w-80 zm:h-108 sm:w-100 sm:h-128 rounded-[46px] overflow-hidden mb-4
                ${isImageLoading ? 'bg-gray-600' : 'bg-black'}
                ${isTouched ? 'scale-110 z-50' : 'scale-100'} transition-all duration-300 transform-gpu`}
                    onTouchEnd={(e) => {
                        if (window.matchMedia("(orientation: portrait)").matches) {
                            setIsTouched(!isTouched)
                            e.stopPropagation();
                        }
                    }}
                >
                    {/* Corner Decorations */}
                    {[
                        "top-5 left-5 border-l-3 border-t-3", "top-5 right-5 border-r-3 border-t-3",
                        "bottom-5 left-5 border-l-3 border-b-3", "bottom-5 right-5 border-r-3 border-b-3"
                    ].map((cornerClasses, index) => (
                        <div
                            key={index}
                            className={`absolute max-xxs:w-4 max-xxs:h-4 xxs:w-4 xxs:h-4 xs:w-6 xs:h-6 z-10 border-white/20 ${cornerClasses}`}
                        />
                    ))}

                    {/* Image */}
                    <img
                        src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${blurryGameData.blur_image_path}`}
                        style={{filter: `${endGame ? "blur(0px)" : `blur(${currentBlur}px)`} ${endGame ? "grayscale(0%)" : `grayscale(${blurryToggleOptions.color ? 0 : 100}%)`}`}}
                        alt={`Blurry image of ${artistName}`}
                        onLoad={() => setIsImageLoading(false)}
                        onError={() => setIsImageLoading(false)}
                        draggable={false}
                        className={`max-xxs:w-55 max-xxs:h-80 xxs:w-60 xxs:h-88 xs:w-70 xs:h-98 xm:w-70 xm:h-98 zm:w-80 zm:h-108 sm:w-100 sm:h-128 object-cover transition-all duration-1000
                        ${isImageLoading ? 'opacity-0' : 'opacity-100'}`} // load image (TODO)
                    />
                </div>
            </div>

            {/* Mode Options */}
            <div className="w-full h-fit flex items-center justify-center mb-4">
                <ModeOptions
                    options={blurryToggleOptions}
                    onToggle={handleToggleOption}
                    attempts={attempts}
                 />
            </div>

            {!endGame && !showVictoryCard && (
            <div className="w-full h-fit flex items-center justify-center mb-4">
                <SearchBar
                    allIdols={blurryIdols}
                    value={currentGuess}
                    onIdolSelect={handleIdolSelect}
                    onIdolSelectId={handleIdolSelectId}
                    onSubmit={handleSubmit}
                    excludedIdols={excludedIds}
                    disabled={isCorrect || endGame}
                    gameMode={"blurry"}
                />
            </div>
            )}
            
            <div className="flex flex-row items-center justify-center mb-4">
                <span className="leading-tight max-xxs:text-[12px] xxs:text-sm xs:text-base sm:text-base">
                    <span className="text-[#b43777] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(180,55,119,1.0)] brightness-110">
                        {dailyUserCount?.data.user_count}
                    </span> <span className="text-[#d7d7d7]/85 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(255,255,255,0.2)]">
                        {dailyUserCount?.data.user_count === 1 ? "person" : "people"} already found today's blurry idol!
                    </span>
                </span>
            </div>

            {guesses.length > 0 && (
            <div className="w-full h-fit flex items-center justify-center mb-20">
                <GuessGrid
                    guesses={guesses}
                    onAnimationComplete={handleAnimationsComplete}
                />
            </div>
            )}

            {!showVictoryCard && yesterdayArtist && yesterdayIdolImage && (
            <div className={`w-full flex flex-col items-center justify-center mt-10 mb-10`}>
                <span className="font-semibold max-xxs:text-[14px] xxs:text-[15px] xs:text-base sm:text-[18px] leading-tight">
                <span className="text-white">
                    Yesterday's idol was
                </span> <span className="text-[#b43777] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(180,55,119,1.0)] brightness-105">
                    {yesterdayArtist ? `${yesterdayArtist}` : "Unknown"}
                </span>
                </span>
            </div>
            )}

            {endGame && isCorrect && !confetti && (
                <WinnerExplosion onComplete={() => {
                    setConfetti(true)
                    localStorage.setItem("confettiShownBlurry", "true");
                }}
                />
            )}

            {endGame && guesses.length > 0 && showVictoryCard && (
                <div className="w-full flex items-center justify-center">
                    <VictoryCardHudBlurry
                        cardInfo={guesses[guesses.length - 1].guessed_idol_data}
                        guesses={guesses}
                        attempts={attempts}
                        idol_blur_image={blurryGameData.blur_image_path}
                        yesterdayIdol={yesterdayArtist || "Unknown"}
                        yesterdayIdolImage={yesterdayIdolImage}
                        userPosition={userPositionData}
                        userRank={userRankData}
                        userScore={userScoreData}
                        stats={userStatsData}
                        nextReset={useResetTimer}
                        otherGameModes={otherModes}
                        wonWithHardMode={wonWithHardMode}
                        wonWithoutColors={wonWithoutColors}
                    />
                </div>
            )}
        </div>
        </>
    );
};

export default BlurryMode;