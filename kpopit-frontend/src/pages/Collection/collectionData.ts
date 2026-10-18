import { queryOptions } from "@tanstack/react-query";
import { getCollectionAlbum, getCollectionsList } from "../../services/api";
import { getQueryClient } from "../../services/queryClient";
import { sessionReady } from "../../utils/sessionMarker";

const STALE_MS = 1000 * 60 * 5;

// Shared by the pages, their route clientLoaders and the link prefetch, so all read one cache.
export const collectionsListQuery = queryOptions({
    queryKey: ["collectionsList"],
    queryFn: getCollectionsList,
    staleTime: STALE_MS,
});

export const collectionAlbumQuery = (collectionId: number) => queryOptions({
    queryKey: ["collectionAlbum", collectionId],
    queryFn: () => getCollectionAlbum(collectionId),
    staleTime: STALE_MS,
});

// Ownership is per user: nothing loads ahead of the page until the session is known.
export const loadCollectionsList = () =>
    sessionReady() ? getQueryClient().ensureQueryData(collectionsListQuery) : null;

export const loadCollectionAlbum = (collectionId: number) =>
    sessionReady() ? getQueryClient().ensureQueryData(collectionAlbumQuery(collectionId)) : null;

export const prefetchCollectionsList = () => {
    if (sessionReady()) void getQueryClient().prefetchQuery(collectionsListQuery);
};

export const prefetchCollectionAlbum = (collectionId: number) => {
    if (sessionReady()) void getQueryClient().prefetchQuery(collectionAlbumQuery(collectionId));
};
