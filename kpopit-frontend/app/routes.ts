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
    route("about", "routes/about.tsx"),
    route("how-to-play", "routes/how-to-play.tsx"),
    route("faq", "routes/faq.tsx"),
    route("blog", "routes/blog.tsx"),
    route("blog/:slug", "routes/blog-post.tsx"),
    route("changelog", "routes/changelog.tsx"),
    route("albums", "routes/albums.tsx"),
    route("albums/:id/:slug", "routes/album.tsx"),
    // Flag-gated (calendar, idol_xp): the page itself shows the 404 when the flag is off.
    route("calendar", "routes/calendar.tsx"),
    route("idol-xp", "routes/idol-xp.tsx"),
    route("profile/:username", "routes/profile.tsx"),
    route("major-patch", "routes/major-patch.tsx"),
    ...(ADMIN_ROUTE ? [route(ADMIN_ROUTE, "routes/admin.tsx")] : []),
    // Unknown paths get the 404 page.
    route("*", "routes/catch-all.tsx"),
  ]),
] satisfies RouteConfig;
