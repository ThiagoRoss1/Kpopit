import "../BlurryMode/blurry_mode.css";
import { AxiosError } from "axios";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSharedGameData } from "../../hooks/useSharedGameData";
import { useGameMode } from "../../hooks/useGameMode";
import { useState, useEffect, useMemo } from "react";
import { getBlurryDailyIdol, getBlurryGuessIdol, getYesterdaysIdol, saveGameState } from "../../services/api";
import type { GuessResponse, BlurryGameData, IdolListItem, FeedbackData, YesterdayIdol } from "../../interfaces/gameInterfaces";
import { decryptToken } from "../../utils/tokenEncryption";
import SearchBar from "../../components/GuessSearchBar/SearchBar";
import TopButtons from "../../components/Blurry/buttons/TopButtons";
import ModeOptions from "../../components/Blurry/buttons/ModeOptions";

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
            setAttempts(guesses.length);
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

            setGuesses([]);
            setAttempts(0);

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
        return allIdolsData?.filter(idol => !!idol.blur_image_path) || [];
    }, [allIdolsData]);

    // Find the idol of the day
    const targetIdol = useMemo(() => {
        if (!allIdolsData || !blurryGameData?.answer_id) return null;
        return allIdolsData.find((idol) => idol.id === blurryGameData.answer_id) || null;
    }, [allIdolsData, blurryGameData]);

    const artistName = targetIdol?.artist_name || "Loading...";

    const guessMutation = useMutation({
        mutationFn: getBlurryGuessIdol,
        onSuccess: (data) => {
            if (import.meta.env.DEV) {
                console.log("Guess response data:", data);
                console.log("Got user token guess:", decryptedTokenRef.current);
            }

            const updatedGuesses = [...guesses, data];
            setGuesses(updatedGuesses);
            
            localStorage.setItem("blurryGuessesDetails", JSON.stringify(updatedGuesses));
            const names = updatedGuesses.map(g => g.guessed_idol_data?.artist_name);
            localStorage.setItem("blurryGuessedIdols", JSON.stringify(names));
            
            saveGameState({
                blurry_guesses_details: updatedGuesses,
                game_complete: data.guess_correct,
                game_won: data.guess_correct,
                game_date: blurryGameData?.server_date || "",
                guessed_idols: updatedGuesses.map(g => g.guessed_idol_data?.artist_name),
            });
        },
        onError: (error) => {
            console.error("Error submitting guess:", error);
        }
    });

    const handleGuessSubmit = async () => {
        if (!selectedIdol || !blurryGameData || !allIdolsData || guessMutation.isPending) return;

        if (guesses.some(g => g.guessed_idol_data?.idol_id === selectedIdol.id)) {
            resetInput();
            return;
        }

        const encrypted = localStorage.getItem("userToken") || "";
        const token = decryptedTokenRef.current || await decryptToken(encrypted);
        
        guessMutation.mutate({
            guessed_idol_id: selectedIdol.id,
            answer_id: blurryGameData.answer_id,
            user_token: token,
            current_attempt: attempts + 1,
            game_date: blurryGameData.server_date,
        });

        resetInput();
    };

    const resetInput = () => {
            setCurrentGuess("");
            setSelectedIdol(null);
    };

    const handleGuessAttempts = () => {
        setAttempts(prev => prev + 1);
    }

    // Toggle UI
    const [blurryToggleOptions, setBlurryToggleOptions] = useState({
        hardcore: localStorage.getItem("blurryHardcoreMode") === "true" || false,
        color: localStorage.getItem("blurryColorMode") === "true" || false,
    });

    const handleToggleOption = (optionId: "hardcore" | "color") => {
        setBlurryToggleOptions(prev => {
            const nextValue = !prev[optionId];
            localStorage.setItem(`blurry${optionId.charAt(0).toUpperCase() + optionId.slice(1)}Mode`, nextValue ? "true" : "false");
            return {...prev, [optionId]: nextValue};
        });
    }; 

    // Loading and error states
    if (isLoadingBlurryGameData || isLoadingAllIdols || !isInitialized) {
        return <div className="flex w-full h-screen justify-center items-center text-white">Loading Kpopit...</div>;
    }

    if (isErrorAllIdols || isErrorBlurryGameData || !blurryGameData || isErrorBlurryGameData) {
        const error = blurryGameDataError as AxiosError;
        console.error("Error loading Blurry Mode data:", blurryGameDataError);
        console.error(error?.response?.data || error?.message);
        return <div className="flex w-full h-screen justify-center items-center text-white">Error loading Kpopit. Please try again later.</div>;
    }


    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-start mt-4">
            <div className="flex items-center justify-center text-center w-3xs sm:w-3xs h-9 sm:h-14 mb-4">
                <h1 className="leading-tight text-2xl sm:text-5xl font-bold text-center">
                    <span className="it-part">K-</span>
                    <span className="kpop-part">Blurry</span>
                </h1>
            </div>

            <div className="flex items-center justify-center mb-8.5">
                <TopButtons
                    onSubmitStatus={() => {}}
                    onSubmitHowToPlay={() => {}}
                    onSubmitShare={() => {}}
                />
            </div>

                <div className={`flex items-center justify-center bg-white border-2 border-white
            w-100 h-128 rounded-[46px] overflow-hidden mb-5
            ${isImageLoading ? 'bg-gray-600' : 'bg-black'}`}>
                <img
                    src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${blurryGameData.blur_image_path}`}
                    alt={`Blurry image of ${artistName}`}
                    onLoad={() => setIsImageLoading(false)}
                    draggable={false}
                    className="w-100 h-128 object-cover"
                />
            </div>

            <div className="w-full h-fit flex items-center justify-center">
                <ModeOptions
                    options={blurryToggleOptions}
                    onToggle={handleToggleOption}
                    attempts={attempts}
                 />
            </div>

            <div className="w-full h-fit flex items-center justify-center">
                <SearchBar
                    allIdols={blurryIdols}
                    value={currentGuess}
                    onIdolSelect={(idolName) => setCurrentGuess(idolName)}
                    onIdolSelectId={(idolId) => setSelectedIdol(idolId)}
                    onSubmit={() => {
                        handleGuessSubmit();
                        handleGuessAttempts();
                    }}
                    excludedIdols={guesses.map(guess => guess.guessed_idol_data?.idol_id)}
                    disabled={isCorrect || endGame}
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
    )
}

export default BlurryMode;