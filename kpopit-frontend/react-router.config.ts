import type { Config } from "@react-router/dev/config";
import { buildAlbumSlug, buildIdolSlug } from "./src/utils/formatters";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchAlbumsPage, fetchFeatures, fetchIdolsPage, LENIENT_PRERENDER, requirePrerenderApi } from "./app/prerender-api";
import { buildSitemap } from "./app/sitemap";
import { blogPaths } from "./app/blog-paths";

const STATIC_PATHS = [
  "/", "/classic", "/blurry", "/pixelated", "/idols", "/privacy-policy", "/contact",
  "/about", "/how-to-play", "/faq", "/blog", "/changelog",
];

requirePrerenderApi();

// /inkit is prerendered (and listed in the sitemap) only while its flag is on at build time.
const inkitPaths = () => fetchFeatures().then((features) => (features.inkit ? ["/inkit"] : []), () => []);

async function prerenderPaths() {
  let idols, albums;
  const inkit = await inkitPaths();
  try {
    [idols, albums] = await Promise.all([fetchIdolsPage(), fetchAlbumsPage()]);
  } catch (err) {
    if (!LENIENT_PRERENDER) throw err;
    // The dev server reads this list once at startup, so its fix is a restart, not a new URL.
    const fix = process.env.NODE_ENV === "development"
      ? "restart the dev server once the backend is up (until then their .data requests log \"Refusing to SSR\")"
      : "set PRERENDER_API_URL to a running API to prerender them";
    console.warn(`${(err as Error).message} The idol and album pages load from the API; ${fix}.`);
    // React Router needs one prerendered path per route with a build-time loader: /idols is kept
    // (its loader returns nothing) and a placeholder stands in for the idol pages.
    return [...STATIC_PATHS, ...inkit, ...blogPaths(), "/idols/0/preview", "/albums", "/albums/0/preview"];
  }
  if (idols.length === 0) throw new Error("Prerender: the idol list is empty; check the build-time API database.");
  return [
    ...STATIC_PATHS, ...inkit, ...blogPaths(), "/albums",
    ...idols.map((idol) => `/idols/${idol.id}/${buildIdolSlug(idol.artist_name, idol.group_name)}`),
    ...albums.map((album) => `/albums/${album.id}/${buildAlbumSlug(album.name, album.artist_name)}`),
  ];
}

// The build asks for the paths more than once; one API read (and at most one warning) per build.
let paths: Promise<string[]> | undefined;

// Static site (no server): the listed paths are prerendered, every other route loads from the
// SPA fallback. The idol and album lists come from the build-time API (app/prerender-api.ts).
export default {
  ssr: false,
  prerender: () => (paths ??= prerenderPaths()),
  // The sitemap lists what was prerendered (so it can't drift from the routes), plus the
  // client-side calendar while its flag is on at build time.
  async buildEnd({ reactRouterConfig }) {
    const calendar = await fetchFeatures().then((f) => f.calendar, () => false);
    const xml = buildSitemap([...(await (paths ??= prerenderPaths())), ...(calendar ? ["/calendar"] : [])]);
    await writeFile(path.join(reactRouterConfig.buildDirectory, "client", "sitemap.xml"), xml);
  },
} satisfies Config;
