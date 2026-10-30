import ComingSoon from "../../src/pages/ComingSoon/ComingSoon";
import FeatureGate from "../../src/components/FeatureGate";

export const handle = { puff: true };

// Placeholder until the page ships in its phase of the redesign.
export default function Route() {
  return <FeatureGate flag="calendar"><ComingSoon title="Calendar" path="/calendar" /></FeatureGate>;
}
