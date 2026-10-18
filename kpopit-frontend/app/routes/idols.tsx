import { useLoaderData, type ClientLoaderFunctionArgs } from "react-router";
import IdolsList from "../../src/pages/Idols/IdolsList";
import HeldData from "../../src/components/Loading/HeldData";
import PageLoader from "../../src/components/Loading/PageLoader";
import { loadIdolsList } from "../../src/pages/Idols/idolsData";
import { holdForData } from "../../src/utils/holdNavigation";
import type { IdolsPageData } from "../../src/interfaces/gameInterfaces";
import { orNothing, fetchIdolsPage } from "../prerender-api";

// Build time only: the list is baked into the prerendered page.
export async function loader() {
  return { idols: await orNothing(fetchIdolsPage()) };
}

// Client navigations: the cached list, else the prerendered .data, else the API; held up to 200 ms.
export async function clientLoader({ serverLoader }: ClientLoaderFunctionArgs) {
  const snapshot = async () => {
    const { idols } = (await serverLoader()) as { idols: IdolsPageData[] | null };
    if (!idols) throw new Error("No build-time data");
    return idols;
  };
  return { held: await holdForData(loadIdolsList(snapshot)) };
}

// A path that wasn't prerendered (an idol added after the build) opens from the SPA fallback: the
// layout renders and the content area keeps the loader while this first load runs.
export function HydrateFallback() {
  return <PageLoader />;
}

export default function IdolsRoute() {
  const data = useLoaderData<typeof loader | typeof clientLoader>();
  // The prerendered page's list counts as held data that arrived in time.
  // None (preview build with the API down): the page loads its own.
  const held = "idols" in data ? (data.idols && { ready: true as const, value: data.idols }) : data.held;
  return (
    <HeldData data={held} message="Loading Idols Data..." errorMessage="Error fetching idols data.">
      {(idols) => <IdolsList initialIdols={idols} />}
    </HeldData>
  );
}
