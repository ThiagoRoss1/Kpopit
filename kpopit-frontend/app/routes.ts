/// <reference types="node" />
import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";
import { loadEnv } from "vite";

// Runs in Node (build, dev start), where Vite hasn't loaded the VITE_* values yet: read them the
// same way. Isolated E2E runs pass everything through the process env (no .env files).
const env: Record<string, string | undefined> = process.env.E2E_ISOLATED === "true"
  ? process.env
  : { ...loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", process.cwd(), "VITE_"), ...process.env };

// Without the flag the route doesn't exist, so the admin code isn't in the build at all.
const ADMIN_ROUTE = env.VITE_ADMIN_ENABLED === "true" ? env.VITE_ADMIN_ROUTE?.replace(/^\/+/, "") : undefined;

export default [
  layout("routes/main-layout.tsx", [
    index("routes/home.tsx"),
    route("login", "routes/auth.tsx", { id: "login" }),
    route("register", "routes/auth.tsx", { id: "register" }),
    route("forgot-password", "routes/forgot-password.tsx"),
    route("reset-password", "routes/reset-password.tsx"),
    route("verify-email", "routes/verify-email.tsx"),
    route("confirm-email-change", "routes/confirm-email-change.tsx"),
    route("revert-email-change", "routes/revert-email-change.tsx"),
    route("classic", "routes/classic.tsx"),
    route("blurry", "routes/blurry.tsx"),
    route("pixelated", "routes/pixelated.tsx"),
    route("collections", "routes/collections.tsx"),
    route("collections/:collectionId/:slug", "routes/collection-album.tsx"),
    route("idols", "routes/idols.tsx"),
    route("idols/:id/:slug", "routes/idol.tsx"),
    route("privacy-policy", "routes/privacy-policy.tsx"),
    route("contact", "routes/contact.tsx"),
    layout("routes/protected.tsx", [
      route("profile/:username", "routes/profile.tsx"),
    ]),
    ...(ADMIN_ROUTE ? [route(ADMIN_ROUTE, "routes/admin.tsx")] : []),
    // Unknown paths go home.
    route("*", "routes/catch-all.tsx"),
  ]),
] satisfies RouteConfig;
