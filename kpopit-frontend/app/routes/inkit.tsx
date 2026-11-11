import GamePage from "../game-page";
import FeatureGate from "../../src/components/FeatureGate";
import { useCalendarDate } from "../../src/hooks/useCalendarDate";
import InkIt from "../../src/pages/InkIt/InkIt";

export const handle = { puff: true };

export default function InkItRoute() {
  // ?date= plays a past day from the calendar on the same page.
  const date = useCalendarDate();
  return (
    <FeatureGate flag="inkit">
      <GamePage
        title="KpopIt InkIt - Draw to Reveal the K-pop Idol"
        description="Draw on a blank sheet to reveal today's K-pop idol photo, then guess who it is, in KpopIt's daily InkIt mode."
        path="/inkit"
        calendarGame={date !== null}
        puff
      >
        <InkIt key={date ?? "live"} date={date} />
      </GamePage>
    </FeatureGate>
  );
}
