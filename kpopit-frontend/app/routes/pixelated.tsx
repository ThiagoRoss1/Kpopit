import GamePage from "../game-page";
import CalendarGame from "../../src/pages/CalendarGame/CalendarGame";
import { useCalendarDate } from "../../src/hooks/useCalendarDate";
import PixelatedMode from "../../src/pages/PixelatedMode/PixelatedMode";

export default function PixelatedRoute() {
  // ?date= plays a past day from the calendar with the same page look.
  const date = useCalendarDate();
  return (
    <GamePage
      title="KpopIt Pixelated - K-pop Album Cover Guessing Game"
      description="Guess today's K-pop album from its pixelated cover art in KpopIt's daily Pixelated mode."
      path="/pixelated"
    >
      {date ? <CalendarGame key={date} mode="pixelated" date={date} /> : <PixelatedMode />}
    </GamePage>
  );
}
