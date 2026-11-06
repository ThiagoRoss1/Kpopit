import IdolXP from "../../src/pages/IdolXP/IdolXP";
import FeatureGate from "../../src/components/FeatureGate";

export const handle = { puff: true };

export default function Route() {
  return <FeatureGate flag="idol_xp"><IdolXP /></FeatureGate>;
}
