import GamePage from "../game-page";
import ClassicMode from "../../src/pages/ClassicMode/classic_mode";

export default function ClassicRoute() {
  return (
    <GamePage
      title="KpopIt Classic - K-pop Idol Guessing Game"
      description="Guess today's K-pop idol by comparing attributes in KpopIt's daily Classic mode."
      path="/classic"
    >
      <ClassicMode />
    </GamePage>
  );
}
