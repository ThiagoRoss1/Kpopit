import "../BlurryMode/blurry_mode.css";
import { AxiosError } from "axios";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSharedGameData } from "../../hooks/useSharedGameData";
import { useState, useEffect, useMemo } from "react";
import { getBlurryDailyIdol, getBlurryGuessIdol } from "../../services/api";
import type { GuessResponse, BlurryGameData, IdolListItem, FeedbackData } from "../../interfaces/gameInterfaces";
import { decryptToken } from "../../utils/tokenEncryption";
import SearchBar from "../../components/GuessSearchBar/SearchBar"; 

function BlurryMode() {
    const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
    const [currentGuess, setCurrentGuess] = useState<string>("");
    const [selectedIdol, setSelectedIdol] = useState<IdolListItem | null>(null);
    const [guesses, setGuesses] = useState<GuessResponse<Partial<FeedbackData>>[]>([]);
    const [isCorrect, setIsCorrect] = useState<boolean>(false);
    const [endGame, setEndGame] = useState<boolean>(false);

    const [attempts, setAttempts] = useState<number>(0);

    const {decryptedTokenRef, allIdolsData, 
        isLoadingAllIdols, isInitialized, isErrorAllIdols} = useSharedGameData();

    // to be used consts - initUser / userToken / isMobile / userStatsData / queryClient / useMutation / useQueryClient / useEffect
    // Just to remove errors for now

    // Blurry game data
    const {
        data: blurryGameData,
        isLoading: isLoadingBlurryGameData,
        isError: isErrorBlurryGameData,
        error: blurryGameDataError,
    } = useQuery<BlurryGameData>({
        queryKey: ['blurryDailyIdol'],
        queryFn: getBlurryDailyIdol,
        enabled: isInitialized || !!decryptedTokenRef.current,
        staleTime: 1000 * 60 * 60 * 4,
        refetchOnWindowFocus: false,
    })

    useEffect(() => {
        if (!blurryGameData?.server_date) return;

        const serverDate = blurryGameData?.server_date;
        const lastGameDate = localStorage.getItem('blurryGameDate');

        if (lastGameDate !== serverDate) {
            localStorage.removeItem('blurryGuessesDetails');
            localStorage.removeItem('blurryGuessedIdols');
            localStorage.removeItem('blurryGameComplete');
            localStorage.removeItem('blurryGameWon');

            setGuesses([]);
            setAttempts(0);
            setIsCorrect(false);
            setEndGame(false);

            localStorage.setItem('blurryGameDate', serverDate);
            
        }; // do else 

        console.log("Same day, restoring cache.");
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
            };
            const updatedGuesses = [...guesses, data];

            // Save on local storage - later

            const names = updatedGuesses.map(g => g.guessed_idol_data?.artist_name);
            localStorage.setItem("blurryGuessedIdols", JSON.stringify(names));

            if (data.guess_correct) {
                setIsCorrect(true);
                setEndGame(true);
            }
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

        setGuesses(prev => {
            const updatedGuesses = [...prev];
            return updatedGuesses;
        });

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
        <div className="min-h-screen w-full flex flex-col items-center justify-start">
            <div className="flex items-center justify-center text-center mt-40">
                <span className="text-white text-3xl">Blurry Mode - Coming Soon!</span>
            </div>

            <div className={`flex items-center justify-center text-center mt-40 h-100 w-100 bg-white ${isImageLoading ? 'bg-gray-600' : 'bg-black'}`}>
                <img
                    src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${blurryGameData.blur_image_path}`}
                    alt={`Blurry image of ${artistName}`}
                    onLoad={() => setIsImageLoading(false)}
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
        </div>
    )
}

export default BlurryMode;