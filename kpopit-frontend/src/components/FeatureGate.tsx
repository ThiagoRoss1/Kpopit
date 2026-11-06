import type { ReactNode } from "react";
import { useFeatures } from "../hooks/useFeatures";
import type { Features } from "../utils/features";
import PageLoader from "./Loading/PageLoader";
import NotFound from "../pages/NotFound/NotFound";

/** A disabled feature's page is the 404; the loader shows while the flags are first read. */
export default function FeatureGate({ flag, children }: { flag: keyof Features; children: ReactNode }) {
    const { features, ready } = useFeatures();
    if (!ready) return <PageLoader />;
    return features[flag] ? children : <NotFound />;
}
