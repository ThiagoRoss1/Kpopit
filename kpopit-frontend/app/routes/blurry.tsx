import GamePage from "../game-page";
import CalendarGame from "../../src/pages/CalendarGame/CalendarGame";
import { useCalendarDate } from "../../src/hooks/useCalendarDate";
import BlurryMode from "../../src/pages/BlurryMode/blurry_mode";

export default function BlurryRoute() {
  // ?date= plays a past day from the calendar with the same page look.
  const date = useCalendarDate();
  return (
    <GamePage
      title="KpopIt Blurry - K-pop Idol Image Guessing Game"
      description="Identify today's K-pop idol from a gradually unblurred photo in KpopIt's daily Blurry mode."
      path="/blurry"
    >
      {date ? <CalendarGame key={date} mode="blurry" date={date} /> : <BlurryMode />}
    </GamePage>
  );
}
