import ComingSoon from "../../src/pages/ComingSoon/ComingSoon";
import { MAJOR_PATCH } from "../../src/components/NavBarV2/navConfig";

export const handle = { puff: true };

// The patch page is still in design: a stub, never indexed.
export default function MajorPatchRoute() {
  return <ComingSoon title={MAJOR_PATCH.name} path={MAJOR_PATCH.href} />;
}
