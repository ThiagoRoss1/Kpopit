import "./style.css";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { getDailyIdol, getGuessIdol, getAllIdols } from "../../services/api";
import type {
  GameData,
  IdolListItem,
  GuessResponse,
} from "../../interfaces/gameInterfaces";
import { Box } from '@chakra-ui/react';
import SearchBar from "../../components/GuessSearchBar/SearchBar.tsx";
import GuessesGrid from "../../components/GuessesGrid/GuessGrid.tsx";
// import { Input } from "@chakra-ui/react"; - Css framework import example

function Home() {
  // -- Client-side -- //
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [guesses, setGuesses] = useState<GuessResponse[]>([]);
  const [excludedIdols, setExcludedIdols] = useState<number[]>([]);
  guesses; // For now, just to avoid the "not used" warning

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

  const guessMutation = useMutation({
    mutationFn: getGuessIdol,
    onSuccess: (data) => {
      console.log("Guess successful:", data);
      setGuesses((prevGuesses) => [...prevGuesses, data]);
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

    // Add guessed idol to excluded list
    setExcludedIdols((prevGuesses) => [...prevGuesses, guessedIdolObject.id]);

    // Clear input field after submission
    setCurrentGuess("");
  };

  if (isLoadingGameData || isLoadingAllIdols) {
    return <div>Loading Kpopdle...</div>;
  }

  if (isErrorGameData || isErrorAllIdols) {
    return <div>Error: Error fetching game data</div>;
  }

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

  return (
    <div>
      <h1>Kpopdle</h1>
      
      <Box position="relative">
      <SearchBar
        allIdols={allIdolsData || []}
        value={currentGuess}
        onIdolSelect={(idolName) => setCurrentGuess(idolName)}
        onSubmit={handleGuessSubmit}
        excludedIdols={excludedIdols}
      />
      </Box>

      <br />

      <Box>
        <GuessesGrid
          guesses={guesses}
          allIdols={allIdolsData || []}
        />
      </Box>

      <form onSubmit={handleGuessSubmit}>
        <input
          type="text"
          value={currentGuess}
          onChange={(e) => setCurrentGuess(e.target.value)}
          placeholder="Guess"
        />
        <button
          type="submit"
          disabled={guessMutation.isPending || !currentGuess}
        >
          {guessMutation.isPending ? "Checking..." : "Guess"}
        </button>
      </form>

      <p>ID: {gameData?.answer_id}</p>
      <h2>Game Categories</h2>
      <ul>
        {gameData?.categories &&
          gameData.categories.map((category: string) => (
            <li key={category}>{category}</li>
          ))}
      </ul>
    </div>
  );
}

export default Home;
