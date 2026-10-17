/// <reference types="node" />
import type { IdolProfileData, IdolsPageData } from "../src/interfaces/gameInterfaces";

// Build-time reads for the prerender (react-router.config.ts and route loaders). Defaults to the
// local backend; point PRERENDER_API_URL at another API explicitly, never by default.
const API_URL = (process.env.PRERENDER_API_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");

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

export const fetchIdolsPage = () => get<IdolsPageData[]>("/idols-page");

export const fetchIdolProfile = (id: number) => get<IdolProfileData>(`/idols-page/${id}`);
