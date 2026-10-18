/// <reference types="node" />
import type { IdolProfileData, IdolsPageData } from "../src/interfaces/gameInterfaces";

// Build-time reads for the prerender (react-router.config.ts and route loaders). Defaults to the
// local backend; point PRERENDER_API_URL at another API explicitly, never by default.
const API_URL = (process.env.PRERENDER_API_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");

// Vercel preview deploys may point at a dev backend that is off: they build without the idol pages,
// which the SPA fallback then serves. Production, CI and local builds fail instead.
export const LENIENT_PRERENDER = process.env.VERCEL_ENV === "preview";

// A production deploy can't use the local default; stop before building, with just the fix.
export function requirePrerenderApi() {
  if (process.env.VERCEL_ENV === "production" && !process.env.PRERENDER_API_URL) {
    console.error("Prerender: PRERENDER_API_URL is not set for Production on Vercel. Set it to the API base URL (no /api) and redeploy.");
    process.exit(1);
  }
}

async function get<T>(path: string): Promise<T> {
  const url = `${API_URL}/api${path}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`Prerender: cannot reach ${url}. Start the backend or set PRERENDER_API_URL.`, { cause: err });
  }
  if (!res.ok) throw new Error(`Prerender: GET ${url} returned HTTP ${res.status}.`);
  return (await res.json()) as T;
}

// Route loaders: on a lenient build with the API down, no build-time data (the page fetches its own).
export async function orNothing<T>(read: Promise<T>): Promise<T | null> {
  if (!LENIENT_PRERENDER) return read;
  return read.catch(() => null);
}

export const fetchIdolsPage = () => get<IdolsPageData[]>("/idols-page");

export const fetchIdolProfile = (id: number) => get<IdolProfileData>(`/idols-page/${id}`);
