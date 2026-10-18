import { useLoaderData, type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from "react-router";
import IdolProfile from "../../src/pages/Idols/IdolProfile";
import HeldData from "../../src/components/Loading/HeldData";
import PageLoader from "../../src/components/Loading/PageLoader";
import { loadIdolProfile } from "../../src/pages/Idols/idolsData";
import { holdForData } from "../../src/utils/holdNavigation";
import type { IdolProfileData } from "../../src/interfaces/gameInterfaces";
import { orNothing, fetchIdolProfile } from "../prerender-api";

// Build time only: each prerendered idol page gets its profile baked in.
export async function loader({ params }: LoaderFunctionArgs) {
  return { profile: await orNothing(fetchIdolProfile(Number(params.id))) };
}

// Client navigations: the cached profile, else the prerendered .data, else the API (idols added after
// the build); held up to 200 ms.
export async function clientLoader({ params, serverLoader }: ClientLoaderFunctionArgs) {
  const snapshot = async () => {
    const { profile } = (await serverLoader()) as { profile: IdolProfileData | null };
    if (!profile) throw new Error("No build-time data");
    return profile;
  };
  return { held: await holdForData(loadIdolProfile(params.id ?? "", snapshot)) };
}

// A path that wasn't prerendered (an idol added after the build) opens from the SPA fallback: the
// layout renders and the content area keeps the loader while this first load runs.
export function HydrateFallback() {
  return <PageLoader />;
}

export default function IdolRoute() {
  const data = useLoaderData<typeof loader | typeof clientLoader>();
  // The prerendered page's profile counts as held data that arrived in time.
  // None (preview build with the API down): the page loads its own.
  const held = "profile" in data ? (data.profile && { ready: true as const, value: data.profile }) : data.held;
  return (
    <HeldData data={held} message="Loading Idol Profile Data..." errorMessage="Error fetching idol profile data.">
      {(profile) => <IdolProfile initialProfile={profile} />}
    </HeldData>
  );
}
