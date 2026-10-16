// Whether a failed /auth/refresh (or /auth/me) means the session is really over.
// Only the server saying so counts: 401 (refresh token rejected/expired/revoked) or 404 (user gone).
// Network errors, timeouts and 5xx are transient: the session may be fine, so keep it.

export const isSessionRejected = (err: unknown): boolean => {
    const status = (err as { response?: { status?: number } } | null)?.response?.status;
    return status === 401 || status === 404;
};

/** Delays (ms) between silent session-restore retries after a transient failure. */
export const RESTORE_RETRY_DELAYS_MS = [2_000, 5_000, 15_000] as const;
