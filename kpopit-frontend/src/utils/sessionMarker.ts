import { getAccessToken } from "../services/tokenStore";

// A logged-in session that should be restored (remember-me in localStorage, else this tab only).
export const hasSessionMarker = () =>
    typeof window !== "undefined" &&
    (localStorage.getItem("kpopit_session") ?? sessionStorage.getItem("kpopit_session")) !== null;

// Per-user data may be fetched outside React (route loaders) only once the session it belongs to is
// known: no session to restore, or its access token already in memory.
export const sessionReady = () => !hasSessionMarker() || getAccessToken() !== null;
