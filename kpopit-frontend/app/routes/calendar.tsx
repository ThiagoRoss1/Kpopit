import Calendar from "../../src/pages/Calendar/Calendar";
import FeatureGate from "../../src/components/FeatureGate";

export const handle = { puff: true };

export default function Route() {
  return <FeatureGate flag="calendar"><Calendar /></FeatureGate>;
}
