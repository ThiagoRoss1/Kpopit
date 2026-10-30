import ComingSoon from "../../src/pages/ComingSoon/ComingSoon";
import FeatureGate from "../../src/components/FeatureGate";

export const handle = { puff: true };

// Placeholder until the page ships in its phase of the redesign.
export default function Route() {
  return <FeatureGate flag="idol_xp"><ComingSoon title="Idol XP" path="/idol-xp" /></FeatureGate>;
}
