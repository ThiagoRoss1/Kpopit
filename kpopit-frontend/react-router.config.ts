import type { Config } from "@react-router/dev/config";
import { buildIdolSlug } from "./src/utils/formatters";
import { fetchIdolsPage, LENIENT_PRERENDER, requirePrerenderApi } from "./app/prerender-api";

const STATIC_PATHS = ["/", "/classic", "/blurry", "/pixelated", "/idols", "/privacy-policy", "/contact"];

requirePrerenderApi();

async function prerenderPaths() {
  let idols;
  try {
    idols = await fetchIdolsPage();
  } catch (err) {
    if (!LENIENT_PRERENDER) throw err;
    console.warn(`${(err as Error).message} Preview build: the idol pages load client-side; set PRERENDER_API_URL to a running API to prerender them.`);
    // React Router needs one prerendered path per route with a build-time loader: /idols is kept
    // (its loader returns nothing) and a placeholder stands in for the idol pages.
    return [...STATIC_PATHS, "/idols/0/preview"];
  }
  if (idols.length === 0) throw new Error("Prerender: the idol list is empty; check the build-time API database.");
  return [...STATIC_PATHS, ...idols.map((idol) => `/idols/${idol.id}/${buildIdolSlug(idol.artist_name, idol.group_name)}`)];
}

// The build asks for the paths more than once; one API read (and at most one warning) per build.
let paths: Promise<string[]> | undefined;

// Static site (no server): the listed paths are prerendered, every other route loads from the
// SPA fallback. The idol list comes from the build-time API (app/prerender-api.ts).
export default {
  ssr: false,
  prerender: () => (paths ??= prerenderPaths()),
} satisfies Config;
