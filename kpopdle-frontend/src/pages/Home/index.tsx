import "../../index.css";
import "./style.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { getDailyIdol, getGuessIdol, getAllIdols, getYesterdaysIdol, getUserToken, getUserStats, getDailyUserCount, getUserPosition, saveGameState } from "../../services/api";
import type {
  GameData,
  IdolListItem,
  GuessResponse,
  YesterdayIdol,
  Users,
  UserStats,
} from "../../interfaces/gameInterfaces";
import { Link } from "react-router-dom";
import { encryptToken, decryptToken } from "../../utils/tokenEncryption.ts";
import SearchBar from "../../components/GuessSearchBar/SearchBar.tsx";
import GuessesGrid from "../../components/GuessesGrid/GuessGrid.tsx";
import VictoryCardHudProps from "../../components/VictoryCard/VictoryCardHud.tsx";
import AnswerHintsBox from "../../components/AnswerHints/AnswerHintsBox.tsx";
import TopButtons from "../../components/buttons/TopButtons.tsx";
import BottomButtons from "../../components/buttons/BottomButtons.tsx";
import Modal from "../../components/buttons/modals/Modal.tsx";
import HowToPlayText from "../../components/buttons/modals/HowToPlayContent.tsx";
import StatsText from "../../components/buttons/modals/StatsContent.tsx";
import ShareText from "../../components/buttons/modals/ShareContent.tsx";
import AboutText from "../../components/buttons/modals/AboutContent.tsx";
import TransferDataText from "../../components/buttons/modals/TransferDataContent.tsx";
import ImportDataText from "../../components/buttons/modals/ImportDataContent.tsx";
import ExportDataText from "../../components/buttons/modals/ExportDataContent.tsx";
import ChangelogText from "../../components/buttons/modals/ChangelogContent.tsx";
import { useResetTimer } from "../../hooks/useResetTimer.tsx";
import { useTransferDataLogic } from "../../hooks/useTransferDataLogic.tsx";
import BackgroundStyle from "../../components/Background/BackgroundStyle.tsx";
import FeedbackSquares from "../../components/FeedbackSquares/FeedbackSquares.tsx";
import XLogo from "../../assets/icons/x-logo.svg";
import { Info } from "lucide-react";
// import { Input } from "@chakra-ui/react"; - Css framework import example

function Home() {
  // -- Client-side -- //
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [guesses, setGuesses] = useState<GuessResponse[]>([]);
  const [endGame, setEndGame] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<null | "changelog" | "how-to-play" | "about" | "stats" | "streak" | "share" | "transfer-data" | "import-data" | "export-data">(null);
  const [showVictoryCard, setShowVictoryCard] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [shouldFetchToken, setShouldFetchToken] = useState<boolean>(!localStorage.getItem("userToken"));
  const [dayChecked, setDayChecked] = useState<boolean>(false);
  const [closeFeedbackSquares, setCloseFeedbackSquares] = useState<boolean>(false);
  // Counter
  const [attempts, setAttempts] = useState<number>(0);

  // Transfer data logic hook
  const transferData = useTransferDataLogic();

  const handleGuessAttempts = () => {
    setAttempts(prev => prev + 1);
  };

  // -- Api-side -- //
  const queryClient = useQueryClient();
  const queryUserCount = useQueryClient();

  // User token
  const userToken = useQuery<Users>({
    enabled: shouldFetchToken,
    queryKey: ["userToken"],
    queryFn: getUserToken,
  });

  const dailyUserCount = useQuery({
    queryKey: ["dailyUserCount"],
    queryFn: getDailyUserCount,
  });

  const initUser = useCallback(async () => {
    const encrypted = localStorage.getItem("userToken");

    if (encrypted) {
      try {
        const token = await decryptToken(encrypted);
        return token;
      } catch (error) {
        console.error("Error decrypting token:", error);
        localStorage.removeItem("userToken");
      }
    }

    if (userToken.data) {
      const encryptedToken = await encryptToken(userToken.data.token);
      localStorage.setItem("userToken", encryptedToken);
      return userToken.data.token;
    }

    return null;
  }, [userToken.data]);

  useEffect(() => {
    if (userToken.data) {
    initUser();
    setShouldFetchToken(false);
    }
  }, [initUser, userToken.data]);

  // Daily idol game data
  const {
    data: gameData,
    isLoading: isLoadingGameData,
    isError: isErrorGameData,
  } = useQuery<GameData>({
    queryKey: ["dailyIdol"],
    queryFn: getDailyIdol,
  });

  // All idols list
  const {
    data: allIdolsData,
    isLoading: isLoadingAllIdols,
    isError: isErrorAllIdols,
  } = useQuery<IdolListItem[]>({
    queryKey: ["allIdols"],
    queryFn: getAllIdols,
    //staleTime: Infinity // See functionality
  });

  const yesterday = useQuery<YesterdayIdol>({
    queryKey: ["yesterdayIdol"],
    queryFn: getYesterdaysIdol,
  });

  const yesterdayArtist = allIdolsData?.find(
    (idol) => idol.id === yesterday.data?.past_idol_id
  )?.artist_name;

  const yesterdayArtistGroup = yesterday.data?.groups ?? null;

  const yesterdayIdolImage = yesterday.data?.image_path ?? null;

  const userStats = useQuery<UserStats>({
    queryKey: ["userStats", userToken],
    queryFn: async () => getUserStats(await initUser() || ""),
    enabled: !!localStorage.getItem("userToken"),
  });

  const userStatsData = userStats.data;

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

      localStorage.setItem("gameDate", serverDate || "");
      setDayChecked(true);
    } else {
      console.log("Same day, restoring cache.");
      const cachedGuesses = localStorage.getItem("todayGuessesDetails");
      const gameComplete = localStorage.getItem("gameComplete");
      const gameWon = localStorage.getItem("gameWon");
      const closeFeedbackSquares = localStorage.getItem("closeFeedbackSquares") === "true";

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
    }
  }, [gameData]);

  const guessMutation = useMutation({
    mutationFn: getGuessIdol,
    onSuccess: (data) => {
      console.log("Guess successful:", data);
      console.log("Got user token guess:", localStorage.getItem("userToken")); // Testing log
      
      setGuesses((prevGuesses) => {
        const updatedGuesses = [...prevGuesses, data];

        localStorage.setItem("todayGuessesDetails", JSON.stringify(updatedGuesses));

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
        })

        const names = updatedGuesses.map(g => g.guessed_idol_data.artist_name);
        localStorage.setItem("GuessedIdols", JSON.stringify(names));
        
        return updatedGuesses;
      });

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
    enabled: !!localStorage.getItem("userToken"),
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
    if (!currentGuess || !gameData || !allIdolsData) return;

    // Look for idol
    const guessedIdolObject = allIdolsData.find(
      (idol: IdolListItem) =>
        idol.artist_name.toLowerCase() === currentGuess.toLowerCase()
    );

    if (guessedIdolObject?.id === gameData.answer_id && !isCorrect) {
      setIsCorrect(true);
      // Just a confirmation
      localStorage.setItem("gameComplete", "true");
      localStorage.setItem("gameWon", "true");
    }

    if (!guessedIdolObject) {
      return;
    }

    const encrypted = localStorage.getItem("userToken") || "";
    const decrypted = await decryptToken(encrypted);

    guessMutation.mutate({
      guessed_idol_id: guessedIdolObject.id,
      answer_id: gameData.answer_id,
      user_token: decrypted,
      current_attempt: attempts + 1,
    });
    // Clear input field after submission
    setCurrentGuess("");
  };
  
  if (isLoadingGameData || isLoadingAllIdols) {
    return <div className="flex w-full h-screen justify-center items-center text-white">Loading Kpopdle...</div>;
  }

  if (isErrorGameData || isErrorAllIdols) {
    return <div className="flex w-full h-screen justify-center items-center text-white">Error: Error fetching game data</div>;
  }

  if (!dayChecked) return null;

  // Main return
  return (
    <>
    <BackgroundStyle attempts={attempts} />
    <div className="min-h-screen w-full flex flex-col items-center justify-start">
      <div className="flex items-center justify-center p-2 sm:w-3xs sm:h-20 mt-16 mb-9 text-center">
        <h1 className="leading-tight sm:text-6xl font-bold text-center bg-linear-to-r from-[#b43777] to-[#ec4850] text-transparent bg-clip-text drop-shadow-lg
        " >
        Kpopdle
        </h1>
        <h2 className="font-korean absolute -z-10 sm:text-6xl sm:top-27 text-[#ec4850] opacity-20
        [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(236,72,80,1.35)]">
          게임을
        </h2>
      </div>    
      <div className="flex items-center justify-center mb-3">
        <TopButtons
          onSubmitChangelog={() => { setShowModal("changelog") }}
          onSubmitHowToPlay={() => { setShowModal("how-to-play") }}
          onSubmitAbout={() => { setShowModal("about") }}
        />
        {showModal === "changelog" && <Modal isOpen onClose={() => setShowModal(null)} title="Changelog..." isAboutOrChangelog={true}><ChangelogText /></Modal>}
        {showModal === "how-to-play" && <Modal isOpen onClose={() => setShowModal(null)} title="How to Play..." isHowToPlay={true}><HowToPlayText /></Modal>}
        {showModal === "about" && <Modal isOpen onClose={() => setShowModal(null)} title="About..." isAboutOrChangelog={true}><AboutText /></Modal>}

      </div>

      <div className="flex items-center justify-center mb-7">
        <BottomButtons
          onSubmitStats={() => { setShowModal("stats") }}
          // onSubmitStreak={() => { setShowModal("streak") }}
          onSubmitShare={() => { setShowModal("share") }}
        />
        {showModal === "stats" && <Modal isOpen onClose={() => setShowModal(null)} title="Stats..."><StatsText stats={userStatsData} onSubmitTransferData={() => {setShowModal("transfer-data")}} /></Modal>}
        {showModal === "share" && <Modal isOpen onClose={() => setShowModal(null)} title="Share..."><ShareText guesses={guesses} hasWon={isCorrect} attempts={attempts} /></Modal>}
        {/* {showModal === "streak" && <Modal onClose={() => setShowModal(null)} title="Streak..."><p>Working in progress...</p></Modal>} */}

        {/* Sub-Stats Modals */}
        {showModal === "transfer-data" && <Modal isOpen onClose={() => setShowModal(null)} title="Transfer Data..." isTransferDataSubPages={true} returnPage={() => {setShowModal("stats")}}><TransferDataText onSubmitImportData={() => {setShowModal("import-data")}} onSubmitExportData={() => {setShowModal("export-data")}} /></Modal>}
        {showModal === "import-data" && <Modal isOpen onClose={() => {transferData.clearError(); setShowModal(null);}} title="Import Data..." isTransferDataSubPages={true} returnPage={() => {setShowModal("transfer-data")}}><ImportDataText handleRedeem={transferData.handleRedeem} isRedeeming={transferData.isRedeeming} redeemError={transferData.redeemError} /></Modal>}
        {showModal === "export-data" && <Modal isOpen onClose={() => setShowModal(null)} title="Export Data..." isTransferDataSubPages={true} returnPage={() => {setShowModal("transfer-data")}}><ExportDataText handleGenerate={transferData.handleGenerate} generatedCodes={transferData.generatedCodes} timeLeft={transferData.timeLeft} expires_At={transferData.expiresAt} /></Modal>}
      </div>

      <div className="w-full flex flex-col items-center justify-center mb-[41px]">
        <AnswerHintsBox 
        memberCount={gameData?.member_count ?? null} 
        groups={gameData?.groups ?? null} 
        attempts={attempts}
        gameEnded={endGame}
        />
      </div>

      {!endGame && !showVictoryCard && (
        <div className="flex text-center items-center justify-center sm:w-[194px] sm:h-[19px] mb-1">
          <p className="text-[16px] drop-shadow-lg text-[#d7d7d7]/85">
            Guess today's idol...
          </p>
        </div>
      )}

      {!endGame && !showVictoryCard && (
      <div className="w-full flex flex-col">
        <div className="relative w-full max-w-4xl px-4 mx-auto flex justify-center z-40 mb-4">
          <SearchBar
            allIdols={allIdolsData || []}
            value={currentGuess}
            onIdolSelect={(idolName) => setCurrentGuess(idolName)}
            onSubmit={() => {
              handleGuessSubmit();
              handleGuessAttempts();
            }}
            excludedIdols={guesses.map(guess => guess.guessed_idol_data?.idol_id)}
            disabled={endGame || guessMutation.isPending || isCorrect}
          />
        </div>
      </div>
      )}
      
      {!endGame && !showVictoryCard && (
      <div className="flex flex-row items-center justify-center mb-10">
        <span className="leading-tight">
          <span className="text-[#b43777] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(180,55,119,1.0)] brightness-110">
            {dailyUserCount?.data.user_count}
          </span> <span className="text-[#d7d7d7]/85 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(255,255,255,0.2)]">
            {dailyUserCount?.data.user_count === 1 ? "person" : "people"} already found today's idol!
          </span>
        </span>
      </div>
      )}

      <div className="w-full flex flex-col items-center justify-center mt-2 mb-4">
        <GuessesGrid
          guesses={guesses}
          allIdols={allIdolsData || []}
          onAllAnimationsComplete={handleAnimationsComplete}
        />
      </div>

       <div className="w-full flex mt-2 mb-2">
        {guesses.length > 0 && !closeFeedbackSquares && (
        <FeedbackSquares onClose={() => (setCloseFeedbackSquares(true), localStorage.setItem("closeFeedbackSquares", "true"))} />
        )}
      </div>

      {endGame && guesses.length > 0 && showVictoryCard && (
        <div className="w-full flex items-center justify-center mt-10">
          <VictoryCardHudProps 
            cardInfo={guesses[guesses.length - 1].guessed_idol_data}
            guesses={guesses}
            attempts={attempts}
            nextReset={useResetTimer}
            yesterdayIdol={yesterdayArtist || "unknown"}
            yesterdayIdolGroup={yesterdayArtistGroup}
            yesterdayIdolImage={yesterdayIdolImage}
            userPosition={userPositionData}
            userRank={userRankData}
            userScore={userScoreData}
            stats={userStatsData}
            idolActiveGroup={gameData?.groups ?? null}
          />
        </div>
      )}

      {!showVictoryCard && (
      <div className={`w-full flex flex-col items-center justify-center mt-18 mb-22`}>
        <span className="font-semibold text-[18px] leading-tight">
          <span className="text-white">
            Yesterday's idol was
          </span> <span className="text-[#b43777] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(180,55,119,1.0)] brightness-105">
            {yesterdayArtist ? `${yesterdayArtist} (${yesterdayArtistGroup})` : "unknown"}
          </span>
        </span>
      </div>
      )}

      {/* Footer */}
      <div className="w-full flex flex-col items-center justify-center mt-6 mb-2 gap-1">
        <div className="w-full flex flex-row items-center justify-center gap-3">
          <button
          className="flex items-center justify-center sm:w-10 sm:h-10 bg-black rounded-full hover:scale-110 hover:brightness-110 hover:cursor-pointer
          transition-all duration-300 transform-gpu" onClick={() => window.open("https://x.com/TgoRoss1", "_blank")}>
            <img src={XLogo} alt="X" className="sm:w-7.5 sm:h-7.5 items-center justify-center" draggable={false} />
          </button>
          
          <button className="flex items-center justify-center sm:w-10 sm:h-10 bg-white rounded-full hover:scale-110 hover:brightness-110 hover:cursor-pointer
          transition-all duration-300 transform-gpu" onClick={() => {setShowModal("about")}}>
            <Info className="sm:w-10 sm:h-10" />

          </button>
        </div>

        <div className="w-full flex items-center justify-center">
          <Link to="/privacy-policy">
            <span className="normal-font font-bold text-white text-base hover:underline">Privacy Policy</span>
          </Link>
        </div>
      </div>

      <p>ID: {gameData?.answer_id}</p>
      {/* <h2>Game Categories</h2>
      <ul>
        {gameData?.categories &&
          gameData.categories.map((category: string) => (
            <li key={category}>{category}</li>
          ))}
      </ul> */}
        
      
    </div>
    </>
  );
}

export default Home;









  // useEffect(() => {
  //   // Fetch game data
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const [dailyIdolResponse, allIdolsResponse] = await Promise.all([
  //         getDailyIdol(),
  //         getAllIdols()
  //       ]);
  //       setGameData(dailyIdolResponse);
  //       setAllIdols(allIdolsResponse);

  //     } catch (error) {
  //       console.error('Error fetching game data:', error);
  //       setError('Failed to load game data');

  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // if (loading) {
  //   return <div>Loading Kpopdle...</div>;
  // }

  // if (error) {
  //   return <div>Error: {error}</div>;
  // }
