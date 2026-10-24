// sitemap.xml for the build, from the prerendered paths (react-router.config.ts buildEnd).
import { SITE_URL } from "../src/utils/site";

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Daily games change every day; the rest changes rarely. */
const changefreq = (path: string) => (["/", "/classic", "/blurry", "/pixelated"].includes(path) ? "daily" : "weekly");

// No <lastmod>: the only date at hand is the build date, which would mark every page as changed on each deploy.
export function buildSitemap(paths: string[]): string {
  const urls = [...new Set(paths)]
    .filter((path) => path.startsWith("/") && !path.endsWith("/preview"))
    .map((path) => [
      "  <url>",
      `    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>`,
      `    <changefreq>${changefreq(path)}</changefreq>`,
      "  </url>",
    ].join("\n"));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
