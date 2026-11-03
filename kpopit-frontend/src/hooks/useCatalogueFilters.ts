import { startTransition, useMemo, useOptimistic } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useHydrated } from "./useHydrated";

/** Keep typed filters visible immediately while the router commits their URL in a transition. */
export const useCatalogueFilters = <Filters extends { [Key in keyof Filters]: string }>(
    readFilters: (params: URLSearchParams) => Filters,
    defaults: Filters,
) => {
    const hydrated = useHydrated();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const urlFilters = useMemo(() => hydrated ? readFilters(params) : defaults, [hydrated, params, readFilters, defaults]);
    const [filters, applyFilters] = useOptimistic(urlFilters, (current, patch: Partial<Filters>) => ({ ...current, ...patch }));

    const setFilters = (patch: Partial<Filters>) => {
        const nextParams = new URLSearchParams(params);

        for (const [key, value] of Object.entries({ ...filters, ...patch })) {
            if (typeof value === "string" && value) nextParams.set(key, value);
            else nextParams.delete(key);
        }

        startTransition(async () => {
            applyFilters(patch);
            await navigate({ search: nextParams.toString() }, { replace: true, preventScrollReset: true });
        });
    };

    return { hydrated, filters, setFilters };
};
