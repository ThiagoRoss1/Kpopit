import "../../index.css";
import "./style.css";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { getDailyIdol, getGuessIdol, getAllIdols, getYesterdaysIdol } from "../../services/api";
import type {
  GameData,
  IdolListItem,
  GuessResponse,
  YesterdayIdol,
} from "../../interfaces/gameInterfaces";
import SearchBar from "../../components/GuessSearchBar/SearchBar.tsx";
import GuessesGrid from "../../components/GuessesGrid/GuessGrid.tsx";
import VictoryCardHudProps from "../../components/VictoryCard/VictoryCardHud.tsx";
import AnswerHintsBox from "../../components/AnswerHints/AnswerHintsBox.tsx";
import TopButtons from "../../components/buttons/TopButtons.tsx";
import BottomButtons from "../../components/buttons/BottomButtons.tsx";
import Modal from "../../components/buttons/modals/Modal.tsx";
import HowToPlayText from "../../components/buttons/modals/HowToPlayContent.tsx";
import { useResetTimer } from "../../hooks/useResetTimer.tsx";
import VictoryCardBig from "../../components/VictoryCard/VictoryCardBig.tsx";
// import { Input } from "@chakra-ui/react"; - Css framework import example

function Home() {
  // -- Client-side -- //
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [guesses, setGuesses] = useState<GuessResponse[]>([]);
  const [endGame, setEndGame] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<null | "changelog" | "how-to-play" | "about" | "stats" | "streak" | "share">(null);
  const [showVictoryCard, setShowVictoryCard] = useState<boolean>(false);
  const [showBig, setShowBig] = useState<boolean>(false); // test.

  // Counter
  const [attempts, setAttempts] = useState<number>(0);

  const handleGuessAttempts = () => {
    setAttempts(prev => prev + 1);
  };

  // -- Api-side -- //

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

  const yesterdayArtistGroup = yesterday.data?.groups ? yesterday.data.groups.join(", ") : null;
  
  const guessMutation = useMutation({
    mutationFn: getGuessIdol,
    onSuccess: (data) => {
      console.log("Guess successful:", data);
      setGuesses((prevGuesses) => [...prevGuesses, data]);
      /// Check if the guess is correct
      if (data.guess_correct) {
        setEndGame(true);
        setShowVictoryCard(true);
        setShowBig(true);
      }
    },
    onError: (error) => {
      console.error("Error during guess:", error);
    },
  });

  // Guess submission handler function
  const handleGuessSubmit = () => {
    if (!currentGuess || !gameData || !allIdolsData) return;

    // Look for idol
    const guessedIdolObject = allIdolsData.find(
      (idol: IdolListItem) =>
        idol.artist_name.toLowerCase() === currentGuess.toLowerCase()
    );

    if (!guessedIdolObject) {
      return;
    }

    guessMutation.mutate({
      guessed_idol_id: guessedIdolObject.id,
      answer_id: gameData.answer_id,
    });
    // Clear input field after submission
    setCurrentGuess("");
  };
  
  if (isLoadingGameData || isLoadingAllIdols) {
    return <div>Loading Kpopdle...</div>;
  }

  if (isErrorGameData || isErrorAllIdols) {
    return <div>Error: Error fetching game data</div>;
  }



  // Main return
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start">
      <div className="flex items-center justify-center p-[9px] sm:w-[242px] sm:h-[84px] mt-[70px] mb-[38px] text-center">
        <h1 className="text-[54px] font-bold text-center text-amber-700">
        Kpopdle
        </h1>
      </div>    
      <div className="flex items-center justify-center mb-[31px]">
        <TopButtons
          onSubmitChangelog={() => { setShowModal("changelog") }}
          onSubmitHowToPlay={() => { setShowModal("how-to-play") }}
          onSubmitAbout={() => { setShowModal("about") }}
        />
        {showModal === "changelog" && <Modal onClose={() => setShowModal(null)} title="Changelog..."><p>On working...</p></Modal>}
        {showModal === "how-to-play" && <Modal onClose={() => setShowModal(null)} title="How to Play..."><HowToPlayText /></Modal>}
        {showModal === "about" && <Modal onClose={() => setShowModal(null)} title="About..."><p>On working...</p></Modal>}

      </div>

      <div className="flex items-center justify-center mb-[31px]">
        <BottomButtons
          onSubmitStats={() => { setShowModal("stats") }}
          onSubmitStreak={() => { setShowModal("streak") }}
          onSubmitShare={() => { setShowModal("share") }}
        />
        {showModal === "stats" && <Modal onClose={() => setShowModal(null)} title="Stats..."><p>On working...</p></Modal>}
        {showModal === "streak" && <Modal onClose={() => setShowModal(null)} title="Streak..."><p>On working...</p></Modal>}
        {showModal === "share" && <Modal onClose={() => setShowModal(null)} title="Share..."><p>On working...</p></Modal>}
      </div>

      <div className="w-full flex flex-col items-center justify-center mb-[41px]">
        <AnswerHintsBox memberCount={gameData?.member_count ?? null} groups={gameData?.groups ?? null} />
      </div>
      
      {/* {!endGame && ()} */}
      <div className="flex text-center items-center justify-center sm:w-[194px] sm:h-[19px] mb-[3px]">
        <p className="text-[16px] drop-shadow-lg text-[#d7d7d7]/85">
          Guess today's idol...
        </p>
      </div>
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
        disabled={endGame || guessMutation.isPending}
      />
      </div>

      <br />

      <div className="w-full flex flex-col items-center justify-center mt-4 mb-4">
        <GuessesGrid
          guesses={guesses}
          allIdols={allIdolsData || []}
        />
      </div>

      <p>ID: {gameData?.answer_id}</p>
      {/* <h2>Game Categories</h2>
      <ul>
        {gameData?.categories &&
          gameData.categories.map((category: string) => (
            <li key={category}>{category}</li>
          ))}
      </ul> */}


      {endGame && guesses.length > 0 && showVictoryCard && (
        <VictoryCardHudProps cardInfo={guesses[guesses.length - 1].guessed_idol_data}
        attempts={attempts}
        nextReset={useResetTimer}
        yesterdayIdol={yesterdayArtist || "unknown"} // Don't need at small card
        onClose={() => setShowVictoryCard(false)}
        />
      )}
      
      {endGame && guesses.length > 0 && showBig && (
        <VictoryCardBig 
        cardInfo={guesses[guesses.length - 1].guessed_idol_data}
        idolActiveGroup={gameData?.groups ?? null}
        attempts={attempts}
        nextReset={useResetTimer}
        yesterdayIdol={yesterdayArtist || "unknown"} // Don't need at small card
        yesterdayIdolGroup={yesterdayArtistGroup ?? null}
       />
      )}
        
      
    </div>
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
