import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

// Runs at build time, where VITE_* flags aren't loaded: the env-gated pages (Collections, admin)
// are always registered and check their flag in the route module instead.
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
    // Unknown paths go home; the admin page also lives here because its path comes from an env var.
    route("*", "routes/catch-all.tsx"),
  ]),
] satisfies RouteConfig;
