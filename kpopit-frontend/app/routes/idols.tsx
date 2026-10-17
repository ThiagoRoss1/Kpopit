import { useLoaderData } from "react-router";
import IdolsList from "../../src/pages/Idols/IdolsList";
import { fetchIdolsPage } from "../prerender-api";

// Build time only: the list is baked into the prerendered page.
export async function loader() {
  return { idols: await fetchIdolsPage() };
}

// Client navigations skip the build-time data; the page fetches the live list itself.
export async function clientLoader() {
  return null;
}

export default function IdolsRoute() {
  const data = useLoaderData<typeof loader | typeof clientLoader>();
  return <IdolsList initialIdols={data?.idols} />;
}
