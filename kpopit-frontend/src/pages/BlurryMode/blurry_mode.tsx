import "../BlurryMode/blurry_mode.css";
import { AxiosError } from "axios";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSharedGameData } from "../../hooks/useSharedGameData";
import { useGameMode } from "../../hooks/useGameMode";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getBlurryDailyIdol, getBlurryGuessIdol, getYesterdaysIdol, saveGameState } from "../../services/api";
import type { GuessResponse, BlurryGameData, IdolListItem, FeedbackData, YesterdayIdol } from "../../interfaces/gameInterfaces";
import { decryptToken } from "../../utils/tokenEncryption";
import BackgroundStyle from "../../components/Background/BackgroundStyle";
import SearchBar from "../../components/GuessSearchBar/SearchBar";
import TopButtons from "../../components/Blurry/buttons/TopButtons";
import ModeOptions from "../../components/Blurry/buttons/ModeOptions";
import GetBlurLevel, { BLUR_LEVELS } from "./blurLevels";
import GuessGrid from "../../components/Blurry/GuessesGrid/GuessGrid";

function BlurryMode() {
    const gameMode = useGameMode();
    const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
    const [currentGuess, setCurrentGuess] = useState<string>("");
    const [selectedIdol, setSelectedIdol] = useState<IdolListItem | null>(null);
    const [guesses, setGuesses] = useState<GuessResponse<Partial<FeedbackData>>[]>([]);
    const [attempts, setAttempts] = useState<number>(0);


    const {decryptedTokenRef, allIdolsData, 
        isLoadingAllIdols, isInitialized, isErrorAllIdols} = useSharedGameData();

    const isCorrect = guesses.some(g => g.guess_correct === true);
    const endGame = isCorrect;

    useEffect(() => {
        if (guesses.length > 0) {
            localStorage.setItem("blurryGameComplete", endGame ? "true" : "false");
            localStorage.setItem("blurryGameWon", isCorrect ? "true" : "false");
        }
    }, [isCorrect, endGame, guesses.length]);

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

            return () => {
                isCancelled = true;
                img.onload = null;
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

    // remove later 
    console.log(yesterdayIdol.data?.artist_name);

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

            setGuesses([]);
            setAttempts(0);
            setBlurryToggleOptions({ hardcore: false, color: false });

            localStorage.setItem("blurryGameDate", serverDate);
            
        } else {
            console.log("Same day, restoring cache.");

            const cachedGuesses = localStorage.getItem("blurryGuessesDetails");

            if (cachedGuesses) {
                try {
                    const parsedGuesses = JSON.parse(cachedGuesses) as GuessResponse<Partial<FeedbackData>>[];
                    setGuesses(parsedGuesses);
                    setAttempts(parsedGuesses.length);
                } catch (error) {
                    console.error("Error parsing cached guesses:", error);
                }
            }
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
        mutationFn: getBlurryGuessIdol,
        onSuccess: (data, variables) => {
            if (import.meta.env.DEV) {
                console.log("Guess response data:", data);
                console.log("Got user token guess:", decryptedTokenRef.current);
            }

            setGuesses((prev) => {
                const updatedGuesses = [...prev, data];
            
                localStorage.setItem("blurryGuessesDetails", JSON.stringify(updatedGuesses));
                const names = updatedGuesses.map(g => g.guessed_idol_data?.artist_name);
                localStorage.setItem("blurryGuessedIdols", JSON.stringify(names));

                // Victory and game complete
                localStorage.setItem("blurryGameComplete", data.guess_correct ? "true" : "false");
                localStorage.setItem("blurryGameWon", data.guess_correct ? "true" : "false");
                
                saveGameState({
                    blurry_guesses_details: updatedGuesses,
                    game_complete: data.guess_correct,
                    game_won: data.guess_correct,
                    game_date: variables.game_date,
                    guessed_idols: updatedGuesses.map(g => g.guessed_idol_data?.artist_name),
                });

                return updatedGuesses;
            });
        },
        onError: (error) => {
            console.error("Error submitting guess:", error);
        }
    });

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

    // Loading and error states
    if (isLoadingBlurryGameData || isLoadingAllIdols || !isInitialized) {
        return <div className="flex w-full h-screen justify-center items-center text-white">Loading Kpopit...</div>;
    }

    if (isErrorAllIdols || isErrorBlurryGameData || !blurryGameData) {
        const error = blurryGameDataError as AxiosError;
        console.error("Error loading Blurry Mode data:", blurryGameDataError);
        console.error(error?.response?.data || error?.message);
        return <div className="flex w-full h-screen justify-center items-center text-white">Error loading Kpopit. Please try again later.</div>;
    }

    return (
        <>
        <BackgroundStyle attempts={attempts} />
        <div className="min-h-screen w-full flex flex-col items-center justify-start mt-4">
            <div className="flex items-center justify-center text-center w-3xs sm:w-3xs h-9 sm:h-14 mb-4">
                <h1 className="leading-tight text-2xl sm:text-5xl font-bold text-center">
                    <span className="it-part">K</span>
                    <span className="kpop-part">blurry</span>
                </h1>
            </div>

            <div className="flex items-center justify-center mb-4">
                <TopButtons
                    onSubmitStatus={() => {}}
                    onSubmitHowToPlay={() => {}}
                    onSubmitShare={() => {}}
                />
            </div>

            {/* Blurry Image */}
            <div className="relative group">
                <div className={`relative flex items-center justify-center bg-transparent border-2 border-white
                w-100 h-128 rounded-[46px] overflow-hidden mb-4
                ${isImageLoading ? 'bg-gray-600' : 'bg-black'}`}>
                    {/* Corner Decorations */}
                    {[
                        "top-5 left-5 border-l-3 border-t-3", "top-5 right-5 border-r-3 border-t-3",
                        "bottom-5 left-5 border-l-3 border-b-3", "bottom-5 right-5 border-r-3 border-b-3"
                    ].map((cornerClasses, index) => (
                        <div
                            key={index}
                            className={`absolute w-6 h-6 z-50 border-white/20 ${cornerClasses}`}
                        />
                    ))}

                    {/* Image */}
                    <img
                        src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${blurryGameData.blur_image_path}`}
                        style={{filter: `${endGame ? "blur(0px)" : `blur(${currentBlur}px)`} ${endGame ? "grayscale(0%)" : `grayscale(${blurryToggleOptions.color ? 0 : 100}%)`}`}}
                        alt={`Blurry image of ${artistName}`}
                        onLoad={() => setIsImageLoading(false)}
                        draggable={false}
                        className={`sm:w-100 sm:h-128 object-cover transition-all duration-1000
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

            <div className="w-full h-fit flex items-center justify-center mb-4">
                <GuessGrid
                    guesses={guesses}
                    onAnimationComplete={() => {}}
                />
            </div>

            <div className="z-10 w-full h-fit flex items-center justify-center">
                <span className={`${isCorrect ? "text-green-500" : "text-white"} text-xl`}>{guesses.map(g => g.guessed_idol_data?.artist_name).join(", ")}</span> 
            </div>

            {endGame && (
                <div className="z-10 w-full h-fit flex items-center justify-center">
                    <span className="text-white text-2xl">Game won!</span>
                </div>
            )}
        </div>
        </>
    )
}

export default BlurryMode;