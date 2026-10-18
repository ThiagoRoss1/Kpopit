import { useLoaderData, type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from "react-router";
import IdolProfile from "../../src/pages/Idols/IdolProfile";
import HeldData from "../../src/components/Loading/HeldData";
import PageLoader from "../../src/components/Loading/PageLoader";
import { loadIdolProfile } from "../../src/pages/Idols/idolsData";
import { holdForData } from "../../src/utils/holdNavigation";
import type { IdolProfileData } from "../../src/interfaces/gameInterfaces";
import { fetchIdolProfile } from "../prerender-api";

// Build time only: each prerendered idol page gets its profile baked in.
export async function loader({ params }: LoaderFunctionArgs) {
  return { profile: await fetchIdolProfile(Number(params.id)) };
}

// Client navigations: the cached profile, else the prerendered .data, else the API (idols added after
// the build); held up to 200 ms.
export async function clientLoader({ params, serverLoader }: ClientLoaderFunctionArgs) {
  const snapshot = async () => ((await serverLoader()) as { profile: IdolProfileData }).profile;
  return { held: await holdForData(loadIdolProfile(params.id ?? "", snapshot)) };
}

// A path that wasn't prerendered (an idol added after the build) opens from the SPA fallback: the
// layout renders and the content area keeps the loader while this first load runs.
export function HydrateFallback() {
  return <PageLoader />;
}

export default function IdolRoute() {
  const data = useLoaderData<typeof loader | typeof clientLoader>();
  if ("profile" in data) return <IdolProfile initialProfile={data.profile} />;
  return (
    <HeldData data={data.held} message="Loading Idol Profile Data..." errorMessage="Error fetching idol profile data.">
      {(profile) => <IdolProfile initialProfile={profile} />}
    </HeldData>
  );
}
