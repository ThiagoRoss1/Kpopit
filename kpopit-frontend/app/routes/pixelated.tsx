import GamePage from "../game-page";
import PixelatedMode from "../../src/pages/PixelatedMode/PixelatedMode";

export default function PixelatedRoute() {
  return (
    <GamePage
      title="KpopIt Pixelated - K-pop Album Cover Guessing Game"
      description="Guess today's K-pop album from its pixelated cover art in KpopIt's daily Pixelated mode."
      path="/pixelated"
    >
      <PixelatedMode />
    </GamePage>
  );
}
