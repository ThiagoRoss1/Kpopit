import GamePage from "../game-page";
import BlurryMode from "../../src/pages/BlurryMode/blurry_mode";

export default function BlurryRoute() {
  return (
    <GamePage
      title="KpopIt Blurry - K-pop Idol Image Guessing Game"
      description="Identify today's K-pop idol from a gradually unblurred photo in KpopIt's daily Blurry mode."
      path="/blurry"
    >
      <BlurryMode />
    </GamePage>
  );
}
