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

      localStorage.setItem("gameDate", serverDate || "");
      setDayChecked(true);
    } else {
      console.log("Same day, restoring cache.");
      const cachedGuesses = localStorage.getItem("todayGuessesDetails");
      const gameComplete = localStorage.getItem("gameComplete");
      const gameWon = localStorage.getItem("gameWon");

      if (cachedGuesses) {
        try {
          const parsedGuesses = JSON.parse(cachedGuesses);
          setGuesses(parsedGuesses);
          setAttempts(parsedGuesses.length);
        } catch (error) {
          console.error("Error parsing cached guesses:", error);
        }
      }

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
      <div className="flex items-center justify-center p-[9px] sm:w-[242px] sm:h-[84px] mt-[70px] mb-[38px] text-center">
        <h1 className="text-6xl font-bold text-center bg-linear-to-b from-[#e70a7d] to-[#ec4850] text-transparent bg-clip-text drop-shadow-lg" >
        Kpopdle 
        </h1>
      </div>    
      <div className="flex items-center justify-center mb-5">
        <TopButtons
          onSubmitChangelog={() => { setShowModal("changelog") }}
          onSubmitHowToPlay={() => { setShowModal("how-to-play") }}
          onSubmitAbout={() => { setShowModal("about") }}
        />
        {showModal === "changelog" && <Modal isOpen onClose={() => setShowModal(null)} title="Changelog..."><ChangelogText /></Modal>}
        {showModal === "how-to-play" && <Modal isOpen onClose={() => setShowModal(null)} title="How to Play..." isHowToPlay={true}><HowToPlayText /></Modal>}
        {showModal === "about" && <Modal isOpen onClose={() => setShowModal(null)} title="About..."><AboutText /></Modal>}

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
        {showModal === "transfer-data" && <Modal isOpen onClose={() => setShowModal(null)} title="Transfer Data..."><TransferDataText onSubmitImportData={() => {setShowModal("import-data")}} onSubmitExportData={() => {setShowModal("export-data")}} /></Modal>}
        {showModal === "import-data" && <Modal isOpen onClose={() => setShowModal(null)} title="Import Data..."><ImportDataText onSubmitReturn={() => {setShowModal("transfer-data")}} /></Modal>}
        {showModal === "export-data" && <Modal isOpen onClose={() => setShowModal(null)} title="Export Data..."><ExportDataText handleGenerate={transferData.handleGenerate} generatedCodes={transferData.generatedCodes} timeLeft={transferData.timeLeft} /></Modal>}
      </div>

      <div className="w-full flex flex-col items-center justify-center mb-[41px]">
        <AnswerHintsBox 
        memberCount={gameData?.member_count ?? null} 
        groups={gameData?.groups ?? null} 
        attempts={attempts}
        />
      </div>

      {/* {!endGame && !showVictoryCard && ()} */}
        <div className="flex text-center items-center justify-center sm:w-[194px] sm:h-[19px] mb-[3px]">
          <p className="text-[16px] drop-shadow-lg text-[#d7d7d7]/85">
            Guess today's idol...
          </p>
        </div>

      {/* {!endGame && !showVictoryCard && ()} */}
      <div className="relative w-full max-w-4xl px-4 mx-auto flex justify-center z-40 mb-20">
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

      <br />

      <div className="w-full flex flex-col items-center justify-center mt-4 mb-4">
        <GuessesGrid
          guesses={guesses}
          allIdols={allIdolsData || []}
          onAllAnimationsComplete={handleAnimationsComplete}
        />
      </div>

      <p>ID: {gameData?.answer_id}</p>
      <p>User Count: {dailyUserCount?.data.user_count}</p>
      {/* <h2>Game Categories</h2>
      <ul>
        {gameData?.categories &&
          gameData.categories.map((category: string) => (
            <li key={category}>{category}</li>
          ))}
      </ul> */}

      {endGame && guesses.length > 0 && showVictoryCard && (
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
      )}
        
      
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
