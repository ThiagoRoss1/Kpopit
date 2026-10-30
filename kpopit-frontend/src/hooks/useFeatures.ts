import { useQuery } from "@tanstack/react-query";
import { useRouteLoaderData } from "react-router";
import { getFeatures } from "../services/api";
import { NO_FEATURES, parseFeatures, type Features } from "../utils/features";

/** Flags from GET /api/features. The prerendered value (root loader) renders first, so the
 *  HTML and the first browser render agree; a fresh read follows. A failed read = all off. */
export function useFeatures(): { features: Features; ready: boolean } {
    const prerendered = (useRouteLoaderData("root") as { features?: Features | null } | undefined)?.features;
    const query = useQuery({
        queryKey: ["features"],
        queryFn: async () => parseFeatures(await getFeatures()),
        initialData: prerendered ?? undefined,
        initialDataUpdatedAt: 0,
        staleTime: 60_000,
        retry: 1,
    });
    if (query.isError && !query.data) return { features: NO_FEATURES, ready: true };
    return { features: query.data ?? NO_FEATURES, ready: query.data !== undefined };
}
