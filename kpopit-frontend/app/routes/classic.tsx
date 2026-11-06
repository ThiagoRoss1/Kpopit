import GamePage from "../game-page";
import CalendarGame from "../../src/pages/CalendarGame/CalendarGame";
import { useCalendarDate } from "../../src/hooks/useCalendarDate";
import ClassicMode from "../../src/pages/ClassicMode/classic_mode";

export default function ClassicRoute() {
  // ?date= plays a past day from the calendar with the same page look.
  const date = useCalendarDate();
  return (
    <GamePage
      title="KpopIt Classic - K-pop Idol Guessing Game"
      description="Guess today's K-pop idol by comparing attributes in KpopIt's daily Classic mode."
      path="/classic"
      calendarGame={date !== null}
    >
      {date ? <CalendarGame key={date} mode="classic" date={date} /> : <ClassicMode />}
    </GamePage>
  );
}
