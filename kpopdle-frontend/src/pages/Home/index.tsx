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
import { Box } from '@chakra-ui/react';
import SearchBar from "../../components/GuessSearchBar/SearchBar.tsx";
import GuessesGrid from "../../components/GuessesGrid/GuessGrid.tsx";
import VictoryCardHudProps from "../../components/VictoryCard/VictoryCardHud.tsx";
// import { Input } from "@chakra-ui/react"; - Css framework import example

function Home() {
  // -- Client-side -- //
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [guesses, setGuesses] = useState<GuessResponse[]>([]);
  const [endGame, setEndGame] = useState<boolean>(false);

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

  const guessMutation = useMutation({
    mutationFn: getGuessIdol,
    onSuccess: (data) => {
      console.log("Guess successful:", data);
      setGuesses((prevGuesses) => [...prevGuesses, data]);
      /// Check if the guess is correct
      if (data.guess_correct) {
        setEndGame(true);
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
    <div>
      <h1>Kpopdle</h1>
      
      {/* {!endGame && ()} */}
      <Box position="relative">
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
      </Box>

      <br />

      <Box>
        <GuessesGrid
          guesses={guesses}
          allIdols={allIdolsData || []}
        />
      </Box>

      <p>ID: {gameData?.answer_id}</p>
      <h2>Game Categories</h2>
      <ul>
        {gameData?.categories &&
          gameData.categories.map((category: string) => (
            <li key={category}>{category}</li>
          ))}
      </ul>


      {endGame && guesses.length > 0 && (
        <VictoryCardHudProps cardinfo={guesses[guesses.length - 1].guessed_idol_data}
        attempts={attempts}
        yesterdayidol={yesterdayArtist || "unknown"} />
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
