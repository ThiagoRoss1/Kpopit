import './style.css'
import { useState, useEffect } from 'react';

interface GameData {
  answer_id: number;
  categories: string[];
}

function Home() {

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch game data 
    fetch('http://127.0.0.1:5000/api/game/daily-idol')
    .then(response => {
      if (!response.ok) {
        throw new Error('Server error');
      }
      return response.json();
    })
    .then(data => {
      setGameData(data);
      setLoading(false);
    })
    .catch(error => {
      console.error('Error fetching game data:', error);
      setError('Failed to load game data');
      setLoading(false);
    })
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
