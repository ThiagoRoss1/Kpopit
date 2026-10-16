// Whether a failed /auth/refresh (or /auth/me) means the session is really over.
// Only 401 says the refresh token was rejected/expired/revoked. A 404 can be a proxy/deploy problem.
// Network errors, timeouts and 5xx are transient: the session may be fine, so keep it.

export const isSessionRejected = (err: unknown): boolean => {
    const status = (err as { response?: { status?: number } } | null)?.response?.status;
    return status === 401;
};

/** Delays (ms) between silent session-restore retries after a transient failure. */
export const RESTORE_RETRY_DELAYS_MS = [2_000, 5_000, 15_000] as const;
