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

async function prerenderPaths() {
  let idols, albums;
  try {
    [idols, albums] = await Promise.all([fetchIdolsPage(), fetchAlbumsPage()]);
  } catch (err) {
    if (!LENIENT_PRERENDER) throw err;
    console.warn(`${(err as Error).message} Preview build: the idol pages load client-side; set PRERENDER_API_URL to a running API to prerender them.`);
    // React Router needs one prerendered path per route with a build-time loader: /idols is kept
    // (its loader returns nothing) and a placeholder stands in for the idol pages.
    return [...STATIC_PATHS, ...blogPaths(), "/idols/0/preview", "/albums", "/albums/0/preview"];
  }
  if (idols.length === 0) throw new Error("Prerender: the idol list is empty; check the build-time API database.");
  return [
    ...STATIC_PATHS, ...blogPaths(), "/albums",
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
