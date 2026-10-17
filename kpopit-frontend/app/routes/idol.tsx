import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import IdolProfile from "../../src/pages/Idols/IdolProfile";
import { fetchIdolProfile } from "../prerender-api";

// Build time only: each prerendered idol page gets its profile baked in.
export async function loader({ params }: LoaderFunctionArgs) {
  return { profile: await fetchIdolProfile(Number(params.id)) };
}

// Client navigations (and idols added after the build) fetch the live profile in the page.
export async function clientLoader() {
  return null;
}

export default function IdolRoute() {
  const data = useLoaderData<typeof loader | typeof clientLoader>();
  return <IdolProfile initialProfile={data?.profile} />;
}
