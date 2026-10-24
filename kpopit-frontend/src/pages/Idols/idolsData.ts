import { queryOptions, type QueryKey } from "@tanstack/react-query";
import { getIdolInfo, getIdolsPage } from "../../services/api";
import { getQueryClient } from "../../services/queryClient";
import type { IdolProfileData, IdolsPageData } from "../../interfaces/gameInterfaces";

const STALE_MS = 1000 * 60 * 60 * 4;

// Shared by the pages, their route clientLoaders and the link prefetch, so all read one cache.
export const idolsListQuery = queryOptions<IdolsPageData[]>({
    queryKey: ["idolsPageData"],
    queryFn: getIdolsPage,
    staleTime: STALE_MS,
});

export const idolProfileQuery = (id: string) => queryOptions<IdolProfileData>({
    queryKey: ["idolProfileData", id],
    queryFn: () => getIdolInfo(Number(id)),
    staleTime: STALE_MS,
});

// Cached data at once; otherwise the page's prerendered .data file (snapshot), falling back to the
// API for pages added after the build. A snapshot is marked stale so the page refreshes it quietly.
async function load<T>(queryKey: QueryKey, snapshot: () => Promise<T>, fromApi: () => Promise<T>): Promise<T> {
    const client = getQueryClient();
    const cached = client.getQueryData<T>(queryKey);
    if (cached !== undefined) return cached;
    if (client.getQueryState(queryKey)?.fetchStatus === "fetching") {
        // A link-intent prefetch (hover, focus, touch) is already asking the API. fetchQuery would
        // just join it, so race it against the prerendered snapshot, which is usually faster.
        const prefetch = client.fetchQuery<T>({ queryKey, staleTime: STALE_MS });
        const fromSnapshot = snapshot().then((data) => {
            if (client.getQueryData(queryKey) === undefined) client.setQueryData(queryKey, data);
            return data;
        });
        return Promise.any([fromSnapshot, prefetch]);
    }
    let fromSnapshot = false;
    const value = await client.fetchQuery({
        queryKey,
        staleTime: STALE_MS,
        queryFn: async () => {
            try {
                const data = await snapshot();
                fromSnapshot = true;
                return data;
            } catch {
                return fromApi();
            }
        },
    });
    if (fromSnapshot) void client.invalidateQueries({ queryKey, exact: true, refetchType: "none" });
    return value;
}

export const loadIdolsList = (snapshot: () => Promise<IdolsPageData[]>) =>
    load(idolsListQuery.queryKey, snapshot, getIdolsPage);

export const loadIdolProfile = (id: string, snapshot: () => Promise<IdolProfileData>) =>
    load(idolProfileQuery(id).queryKey, snapshot, () => getIdolInfo(Number(id)));

// Link intent (hover, focus, touch): start the request so it is usually done before the click ends.
export const prefetchIdolsList = () => void getQueryClient().prefetchQuery(idolsListQuery);
export const prefetchIdolProfile = (id: string | number) => void getQueryClient().prefetchQuery(idolProfileQuery(String(id)));
