import { useQuery } from "@tanstack/react-query";
import { authError } from "../services/api";
import { useAuth } from "./useAuth";

export type EmailLinkStatus = "loading" | "success" | "error";

type Messages = { missing: string; failed: string };

// The pages behind email links (verify, confirm change, revert) spend their one-time token once.
// React Query shares the request between StrictMode's two mounts and never repeats it.
export function useEmailLinkAction<T>(name: string, token: string | null, action: (token: string) => Promise<T>, messages: Messages) {
    const { isAuthenticated, refreshAuth } = useAuth();

    const query = useQuery({
        queryKey: ["emailLink", name, token],
        queryFn: async () => {
            const data = await action(token as string);
            if (isAuthenticated) await refreshAuth();
            return data ?? null;
        },
        enabled: !!token,
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    const status: EmailLinkStatus = !token ? "error" : query.isPending ? "loading" : query.isError ? "error" : "success";
    const errorMessage = !token
        ? messages.missing
        : query.isError
            ? (authError(query.error) ? query.error.response.data.error : messages.failed)
            : null;

    return { status, errorMessage, data: query.data };
}
