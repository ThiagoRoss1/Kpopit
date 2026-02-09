import "../../index.css";
import "./style.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSharedGameData } from "../../hooks/useSharedGameData.tsx";
import { useState, useEffect } from "react";
import { getDailyIdol, getGuessIdol, getYesterdaysIdol, getDailyUserCount, getUserPosition, saveGameState } from "../../services/api.ts";
import type {
  GameData,
  IdolListItem,
  GuessResponse,
  YesterdayIdol,
  GuessedIdolData,
  CompleteGuessRequest,
  CompleteGuessTrafficRequest,
} from "../../interfaces/gameInterfaces.ts";
import { Link } from "react-router-dom";
import { decryptToken } from "../../utils/tokenEncryption.ts";
import SearchBar from "../../components/GuessSearchBar/SearchBar.tsx";
import GuessesGrid from "../../components/GuessesGrid/GuessGrid.tsx";
import VictoryCardHud from "../../components/VictoryCard/VictoryCardHud.tsx";
import AnswerHintsBox from "../../components/AnswerHints/AnswerHintsBox.tsx";
import TopButtons from "../../components/buttons/TopButtons.tsx";
import Modal from "../../components/buttons/modals/Modal.tsx";
import HowToPlayText from "../../components/buttons/modals/HowToPlayContent.tsx";
import StatsText from "../../components/buttons/modals/StatsContent.tsx";
import ShareText from "../../components/buttons/modals/ShareContent.tsx";
import TransferDataText from "../../components/buttons/modals/TransferDataContent.tsx";
import ImportDataText from "../../components/buttons/modals/ImportDataContent.tsx";
import ExportDataText from "../../components/buttons/modals/ExportDataContent.tsx";
import { useResetTimer } from "../../hooks/useResetTimer.tsx";
import { useGameMode } from "../../hooks/useGameMode.tsx";
import BackgroundStyle from "../../components/Background/BackgroundStyle.tsx";
import FeedbackSquares from "../../components/FeedbackSquares/FeedbackSquares.tsx";
import { WinnerExplosion } from "../../utils/confetti.tsx";
import { calculateFeedback } from "../../utils/calculateFeedback.ts";
import { useAllGameModes } from "../../hooks/useAllGameModes.tsx";
// import { Input } from "@chakra-ui/react"; - Css framework import example

function ClassicMode() {
  const gameMode = useGameMode()
  // -- Client-side -- //
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [selectedIdol, setSelectedIdol] = useState<IdolListItem | null>(null);
  const [guesses, setGuesses] = useState<GuessResponse[]>([]);
  const [endGame, setEndGame] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<null | "how-to-play" | "stats" | "streak" | "share" | "transfer-data" | "import-data" | "export-data">(null);
  const [showVictoryCard, setShowVictoryCard] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [dayChecked, setDayChecked] = useState<boolean>(false);
  const [closeFeedbackSquares, setCloseFeedbackSquares] = useState<boolean>(false);
  const [confetti, setConfetti] = useState<boolean>(false);
  // Counter
  const [attempts, setAttempts] = useState<number>(0);

  // Transfer data logic hook
  
  const { userToken, initUser, decryptedTokenRef, allIdolsData, isLoadingAllIdols, isErrorAllIdols, 
    isInitialized, userStatsData, transferData, queryClient } = useSharedGameData();

  const handleGuessAttempts = () => {
    setAttempts(prev => prev + 1);
  };

  // -- Api-side -- //
  const queryUserCount = useQueryClient();


  const dailyUserCount = useQuery({
    queryKey: ["dailyUserCount", gameMode],
    queryFn: getDailyUserCount,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // Daily idol game data
  const {
    data: gameData,
    isLoading: isLoadingGameData,
    isError: isErrorGameData,
  } = useQuery<GameData>({
    queryKey: ["dailyIdol", gameMode],
    queryFn: getDailyIdol,
    staleTime: 1000 * 60 * 60 * 4,
    refetchOnWindowFocus: false,
    enabled: isInitialized,
    placeholderData: (previousData) => previousData,
  });

  const yesterday = useQuery<YesterdayIdol>({
    queryKey: ["yesterdayIdol", gameMode],
    queryFn: getYesterdaysIdol,
    staleTime: 1000 * 60 * 60 * 4,
    refetchOnWindowFocus: false,
    enabled: isInitialized,
  });

  const yesterdayArtist = allIdolsData?.find(
    (idol) => idol.id === yesterday.data?.past_idol_id
  )?.artist_name;

  const yesterdayArtistGroup = yesterday.data?.groups ?? null;

  const yesterdayIdolImage = yesterday.data?.image_path ?? null;

  useEffect(() => {
    if (!gameData) return;

    const serverDate = gameData?.server_date;
    const lastGameDate = localStorage.getItem("gameDate");
   
    if (lastGameDate !== serverDate) {
      console.log("New day detected, clearing cache.");
      localStorage.removeItem("todayGuessesDetails");
      localStorage.removeItem("GuessedIdols");
      localStorage.removeItem("gameComplete");
      localStorage.removeItem("gameWon");
      localStorage.removeItem("hint1Revealed");
      localStorage.removeItem("showHint1");
      localStorage.removeItem("colorize1");
      localStorage.removeItem("hint2Revealed");
      localStorage.removeItem("showHint2");
      localStorage.removeItem("colorize2");
      localStorage.removeItem("animatedIdols");
      localStorage.removeItem("closeFeedbackSquares");
      localStorage.removeItem("confettiShown");

      localStorage.setItem("gameDate", serverDate || "");

      window.location.reload();

      return;
    } else {
      console.log("Same day, restoring cache.");
      const cachedGuesses = localStorage.getItem("todayGuessesDetails");
      const gameComplete = localStorage.getItem("gameComplete");
      const gameWon = localStorage.getItem("gameWon");
      const closeFeedbackSquares = localStorage.getItem("closeFeedbackSquares") === "true";
      const confettiShown = localStorage.getItem("confettiShown") === "true";

      if (cachedGuesses) {
        try {
          const parsedGuesses = JSON.parse(cachedGuesses);
          setGuesses(parsedGuesses);
          setAttempts(parsedGuesses.length);
        } catch (error) {
          console.error("Error parsing cached guesses:", error);
        }
      }
      setCloseFeedbackSquares(closeFeedbackSquares);

      if (gameComplete === "true") {
        setEndGame(true);
        if (gameWon === "true") {
          setIsCorrect(true);
          setShowVictoryCard(true);
        }
      }

      setDayChecked(true);
      setConfetti(confettiShown);
    }
  }, [gameData]);

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
      return getGuessIdol(payload);
    },
    onSuccess: (data) => {
      if (import.meta.env.DEV) {
        console.log("Guess successful:", data);
        console.log("Got user token guess:", localStorage.getItem("userToken"));
      };

      const updatedGuesses = guesses;

      saveGameState({
        today_guesses_details: updatedGuesses,
        game_complete: data.guess_correct,
        game_won: data.guess_correct,
        hints_revealed: {
          hint1: (localStorage.getItem("hint1Revealed")  || false) === "true",
          hint2: (localStorage.getItem("hint2Revealed")  || false) === "true",
        },
        show_hints: {
          hint1: (localStorage.getItem("showHint1")  || false) === "true",
          hint2: (localStorage.getItem("showHint2")  || false) === "true",
        },
        colorize_hints: {
          hint1: (localStorage.getItem("colorize1")  || false) === "true",
          hint2: (localStorage.getItem("colorize2")  || false) === "true",
        },
        animated_idols: JSON.parse(localStorage.getItem("animatedIdols") || "[]"),
        game_date: gameData?.server_date || "",
        guessed_idols: updatedGuesses.map(g => g.guessed_idol_data.artist_name),
      });

      const names = updatedGuesses.map(g => g.guessed_idol_data.artist_name);
      localStorage.setItem("GuessedIdols", JSON.stringify(names));
      
      if (data.guess_correct) {
        setIsCorrect(true);
        localStorage.setItem("gameComplete", "true");
        localStorage.setItem("gameWon", "true");

        queryClient.invalidateQueries({ queryKey: ["userStats"] });
        queryUserCount.invalidateQueries({ queryKey: ["dailyUserCount"] });
        queryClient.invalidateQueries({ queryKey: ["userPosition"] });
      }
    },
    onError: (error) => {
      console.error("Error during guess:", error);
    },
  });

  const userPosition = useQuery({
    queryKey: ["userPosition", userToken],
    queryFn: async () => getUserPosition(await initUser() || ""),
    enabled: isInitialized,
    refetchOnWindowFocus: false,
  });

  const userPositionData = userPosition?.data?.position;
  const userRankData = userPosition?.data?.rank;
  const userScoreData = userPosition?.data?.score;


  const handleAnimationsComplete = () => {
    if (isCorrect) {
      setEndGame(true);
      setShowVictoryCard(true)
      setCurrentGuess("");
  }};

  // Guess submission handler function
  const handleGuessSubmit = async () => {
    if (!selectedIdol || !gameData || !allIdolsData || guessMutation.isPending) return;

    // PREVENT DUPLICATE GUESSES - check if idol already guessed
    const alreadyGuessed = guesses.some(g => g.guessed_idol_data.idol_id === selectedIdol.id);
    if (alreadyGuessed) {
      setCurrentGuess("");
      setSelectedIdol(null);
      return;
    }

    const guessedIdolData = allIdolsData.find(idol => idol.id === selectedIdol.id);
    const answerIdolData = allIdolsData.find(idol => idol.id === gameData.answer_id);

    if (!guessedIdolData || !answerIdolData) {
      console.error("Idol data not found");
      return;
    }

    // Maps 'id' from list item to 'idol_id' expected calculation types
    const guessForCalculation: GuessedIdolData = {
      ...guessedIdolData,
      idol_id: guessedIdolData.id,
    };

    const answerForCalculation: GuessedIdolData = {
      ...answerIdolData,
      idol_id: answerIdolData.id,
    };
    
    const localFeedback = calculateFeedback(guessForCalculation, answerForCalculation);

    const localGuessResult: GuessResponse = {
      guess_correct: guessedIdolData.id === gameData.answer_id,
      feedback: localFeedback,
      guessed_idol_data: guessForCalculation
    };

    setGuesses(prev => {
      const updatedGuesses = [...prev, localGuessResult]
      localStorage.setItem("todayGuessesDetails", JSON.stringify(updatedGuesses));
      return updatedGuesses; 
    });

    if (localGuessResult.guess_correct && !isCorrect) {
      setIsCorrect(true);
      // Just a confirmation
      localStorage.setItem("gameComplete", "true");
      localStorage.setItem("gameWon", "true");
    }

    if (!selectedIdol) {
      return;
    }

    const encrypted = localStorage.getItem("userToken") || "";
    const token = decryptedTokenRef.current || await decryptToken(encrypted);

    if (!token) {
      console.warn("User token not available, cannot submit guess.");
      await initUser();
      return;
    }

    guessMutation.mutate({
      guessed_idol_id: selectedIdol.id,
      answer_id: gameData.answer_id,
      user_token: token,
      current_attempt: attempts + 1,
      game_date: localStorage.getItem("gameDate") || "",
    });
    // Clear input field after submission
    setCurrentGuess("");
    setSelectedIdol(null);
  };

  // All gameModes for victory card
  const { otherModes } = useAllGameModes(gameMode);
  
  if ((isLoadingGameData || isLoadingAllIdols || !isInitialized) && !gameData) {
    return (
      <div className="fixed inset-0 z-100 flex w-full h-screen bg-black justify-center items-center">
        <span className="text-white animate-pulse">Loading Kpopit...</span>
      </div>
    );
  }

  if (isErrorGameData || isErrorAllIdols) {
    return (
      <div className="fixed inset-0 z-100 flex w-full h-screen bg-black justify-center items-center">
        <span className="text-white animate-pulse">Error: Error fetching game data</span>
      </div>
    );
  }

  if (!dayChecked) return null;

  // Main return
  return (
    <>
    <BackgroundStyle attempts={attempts} />
    <div className="min-h-full w-full flex flex-col items-center justify-start">
      <div className="flex items-center justify-center p-2 w-3xs sm:w-3xs h-9 sm:h-20 mt-12 mb-13 text-center">
        <Link 
          to="/"
          className="inline-block bg-transparent border-0 p-0 cursor-pointer hover:scale-105
          transition-all duration-500 transform-gpu"
          draggable={false}>
          <h1 className="leading-tight max-sxs:text-4xl sxs:text-5xl zm:text-6xl sm:text-7xl font-bold text-center">
            <span className="kpop-part">Kpop</span>
            <span className="it-part">it</span>
          </h1>
        </Link>
      </div>    
      <div className="flex items-center justify-center mb-10">
        <TopButtons
          onSubmitHowToPlay={() => { setShowModal("how-to-play") }}
          onSubmitStats={() => { setShowModal("stats") }}
          // onSubmitStreak={() => { setShowModal("streak") }}
          onSubmitShare={() => { setShowModal("share") }}
        />
        {showModal === "how-to-play" && <Modal isOpen onClose={() => setShowModal(null)} title="How to Play..." isHowToPlay={true}><HowToPlayText /></Modal>}

        {showModal === "stats" && <Modal isOpen onClose={() => setShowModal(null)} title="Stats..."><StatsText stats={userStatsData} onSubmitTransferData={() => {setShowModal("transfer-data")}} /></Modal>}
        {showModal === "share" && <Modal isOpen onClose={() => setShowModal(null)} title="Share..."><ShareText guesses={guesses} hasWon={isCorrect} attempts={attempts} gameMode={"classic"} /></Modal>}
        {/* {showModal === "streak" && <Modal onClose={() => setShowModal(null)} title="Streak..."><p>Working in progress...</p></Modal>} */}

        {/* Sub-Stats Modals */}
        {showModal === "transfer-data" && <Modal isOpen onClose={() => setShowModal(null)} title="Transfer Data..." isTransferDataSubPages={true} returnPage={() => {setShowModal("stats")}}><TransferDataText onSubmitImportData={() => {setShowModal("import-data")}} onSubmitExportData={() => {setShowModal("export-data")}} /></Modal>}
        {showModal === "import-data" && <Modal isOpen onClose={() => {transferData.clearError(); setShowModal(null);}} title="Import Data..." isTransferDataSubPages={true} returnPage={() => {setShowModal("transfer-data")}}><ImportDataText handleRedeem={transferData.handleRedeem} isRedeeming={transferData.isRedeeming} redeemError={transferData.redeemError} /></Modal>}
        {showModal === "export-data" && <Modal isOpen onClose={() => setShowModal(null)} title="Export Data..." isTransferDataSubPages={true} returnPage={() => {setShowModal("transfer-data")}}><ExportDataText handleGenerate={transferData.handleGenerate} generatedCodes={transferData.generatedCodes} timeLeft={transferData.timeLeft} expires_At={transferData.expiresAt} fetchActiveCode={transferData.fetchActiveCode} /></Modal>}

      </div>
      
      <div className="w-full flex flex-col items-center justify-center mb-10.25">
        <AnswerHintsBox 
        memberCount={gameData?.member_count ?? null} 
        groups={gameData?.groups ?? null} 
        attempts={attempts}
        gameEnded={endGame}
        />
      </div>

      {!endGame && !showVictoryCard && (
        <div className="flex text-center items-center justify-center w-full max-w-100 sm:w-48.5 h-5 sm:h-4.75 mb-1">
          <span className="text-[14px] sm:text-[16px] drop-shadow-lg text-[#d7d7d7]/85">
            Guess today's idol...
          </span>
        </div>
      )}

      {!endGame && !showVictoryCard && (
      <div className="w-full flex flex-col">
        <div className="relative w-full max-w-4xl px-4 mx-auto flex justify-center z-40 mb-4">
          <SearchBar
            allIdols={allIdolsData || []}
            value={currentGuess}
            onIdolSelect={(idolName) => setCurrentGuess(idolName)}
            onIdolSelectId={(idolId) => setSelectedIdol(idolId)}
            onSubmit={() => {
              handleGuessSubmit();
              handleGuessAttempts();
            }}
            excludedIdols={guesses.map(guess => guess.guessed_idol_data?.idol_id)}
            disabled={endGame || guessMutation.isPending || isCorrect}
            gameMode={"classic"}
          />
        </div>
      </div>
      )}
      
      <div className="flex flex-row items-center justify-center mb-10">
        <span className="leading-tight text-base sm:text-base">
          <span className="text-[#b43777] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(180,55,119,1.0)] brightness-110">
            {dailyUserCount?.data.user_count}
          </span> <span className="text-[#d7d7d7]/85 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(255,255,255,0.2)]">
            {dailyUserCount?.data.user_count === 1 ? "person" : "people"} already found today's idol!
          </span>
        </span>
      </div>

      {guesses.length > 0 && (
      <div className="w-full flex flex-col items-center justify-center mt-2 mb-4 overflow-x-auto">
        <GuessesGrid
          guesses={guesses}
          allIdols={allIdolsData || []}
          onAllAnimationsComplete={handleAnimationsComplete}
        />
      </div>
      )}

       <div className="w-full flex mt-2 mb-2">
        {guesses.length > 0 && !closeFeedbackSquares && (
        <FeedbackSquares onClose={() => (setCloseFeedbackSquares(true), localStorage.setItem("closeFeedbackSquares", "true"))} />
        )}
      </div>

      {endGame && isCorrect && !confetti && (
        <WinnerExplosion onComplete={() => {
          setConfetti(true)
          localStorage.setItem("confettiShown", "true");
        }}
        />
      )} 
      {/* see later */}

      {endGame && guesses.length > 0 && showVictoryCard && (
        <div className="w-full flex items-center justify-center mt-10">
          <VictoryCardHud
            cardInfo={guesses[guesses.length - 1].guessed_idol_data}
            guesses={guesses}
            attempts={attempts}
            nextReset={useResetTimer}
            yesterdayIdol={yesterdayArtist || "Unknown"}
            yesterdayIdolGroup={yesterdayArtistGroup}
            yesterdayIdolImage={yesterdayIdolImage}
            userPosition={userPositionData}
            userRank={userRankData}
            userScore={userScoreData}
            stats={userStatsData}
            idolActiveGroup={gameData?.groups ?? null}
            otherGameModes={otherModes}
          />
        </div>
      )}

      {!showVictoryCard && yesterdayArtist && yesterdayArtistGroup && yesterdayIdolImage && (
      <div className={`w-full flex flex-col items-center justify-center mt-10 mb-26`}>
        <span className="font-semibold max-xxs:text-[14px] xxs:text-[15px] xs:text-base sm:text-[18px] leading-tight">
          <span className="text-white">
            Yesterday's idol was
          </span> <span className="text-[#b43777] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(180,55,119,1.0)] brightness-105">
            {yesterdayArtist ? `${yesterdayArtist} (${yesterdayArtistGroup && yesterdayArtistGroup.length > 0 ? yesterdayArtistGroup : "Soloist"})` : "Unknown"}
          </span>
        </span>
      </div>
      )}
      
      {/* <p>ID: {gameData?.answer_id}</p> */}
    </div>
    </>
  );
}

export default ClassicMode;