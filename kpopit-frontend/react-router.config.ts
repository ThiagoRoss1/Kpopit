import type { Config } from "@react-router/dev/config";
import { buildIdolSlug } from "./src/utils/formatters";
import { fetchIdolsPage } from "./app/prerender-api";

const STATIC_PATHS = ["/", "/classic", "/blurry", "/pixelated", "/idols", "/privacy-policy", "/contact"];

// Static site (no server): the listed paths are prerendered, every other route loads from the
// SPA fallback. The idol list comes from the build-time API (app/prerender-api.ts).
export default {
  ssr: false,
  async prerender() {
    const idols = await fetchIdolsPage();
    if (idols.length === 0) throw new Error("Prerender: the idol list is empty; check the build-time API database.");
    return [...STATIC_PATHS, ...idols.map((idol) => `/idols/${idol.id}/${buildIdolSlug(idol.artist_name, idol.group_name)}`)];
  },
} satisfies Config;
