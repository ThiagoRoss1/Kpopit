import { QueryClient } from "@tanstack/react-query";

let browserClient: QueryClient | undefined;

// One client for the whole browser session, shared by the providers and the route clientLoaders
// (which run outside React). The prerender gets a fresh one per page: pages must not share a cache.
export function getQueryClient(): QueryClient {
    if (typeof window === "undefined") return new QueryClient();
    browserClient ??= new QueryClient();
    return browserClient;
}
