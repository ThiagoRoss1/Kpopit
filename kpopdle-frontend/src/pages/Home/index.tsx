import './style.css'
import { useState, useEffect } from 'react';
import { getDailyIdol, getGuessIdol, getAllIdols } from '../../services/api';

interface GameData {
  answer_id: number;
  categories: string[];
}

interface IdolListItem {
  id: number;
  artist_name: string;
}

interface FeedbackItem {
  status: string;
  // '?' turns these properties optional. I can or cannot exist.
  correct_items?: string[];
  incorrect_items?: string[];
}

interface FeedbackData {
  artist_name: FeedbackItem;
  gender: FeedbackItem;
  idol_debut_year: FeedbackItem;
  birth_year: FeedbackItem;
  height: FeedbackItem;
  nationality: FeedbackItem;
  groups: FeedbackItem;
  position: FeedbackItem;
  companies: FeedbackItem;
}

interface GuessedIdolData {
  artist_name: string;
  gender: string;
  nationality: string[];
  groups: string[];
  idol_debut_year: number;
  birth_year: number;
  height: number;
  position: string[];
  companies: string[];
}

interface GuessResponse {
  guess_correct: boolean;
  feedback: FeedbackData;
  guessed_idol_data: GuessedIdolData;
}

function Home() {

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [allIdols, setAllIdols] = useState<IdolListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [guesses, setGuesses] = useState<GuessResponse[]>([]);

  // Guess submission handler function
  const handleGuessSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentGuess || !gameData) return;

    // Look for idol
    const guessedIdolObject = allIdols.find(
      idol => idol.artist_name.toLowerCase() === currentGuess.toLowerCase()
    );

    if (!guessedIdolObject) {
      return [];
    }

    try {
      const response = await getGuessIdol({
        guessed_idol_id: guessedIdolObject.id,
        answer_id: gameData.answer_id
      });

      console.log('Guess response:', response);

      setGuesses([...guesses, response]);
    } catch (error) {
      console.error('Error submitting guess:', error);
      setError('Failed to submit guess');
    }

    // Clear input field after submission
    setCurrentGuess("");
  };

  useEffect(() => {
    // Fetch game data 
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dailyIdolResponse, allIdolsResponse] = await Promise.all([
          getDailyIdol(),
          getAllIdols()
        ]);
        setGameData(dailyIdolResponse);
        setAllIdols(allIdolsResponse);
        
      } catch (error) {
        console.error('Error fetching game data:', error);
        setError('Failed to load game data');
        
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading Kpopdle...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Kpopdle</h1>
      
      <form onSubmit={handleGuessSubmit}>
        <input
          type="text"
          value={currentGuess}
          onChange={(e) => setCurrentGuess(e.target.value)}
          placeholder="Guess"
        />
        <button type="submit">Guess</button>
      </form>

      <p>ID: {gameData?.answer_id}</p>
      <h2>Game Categories</h2>
      <ul>
        {gameData?.categories.map(category => (
          <li key={category}>{category}</li>
        ))}
      </ul>
    </div>
  )
}

export default Home
