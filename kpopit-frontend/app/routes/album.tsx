import { useLoaderData, useParams, type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { isAxiosError } from "axios";
import AlbumPage from "../../src/pages/Albums/AlbumPage";
import HeldData from "../../src/components/Loading/HeldData";
import PageLoader from "../../src/components/Loading/PageLoader";
import { loadAlbum } from "../../src/pages/Albums/albumsData";
import { holdForData } from "../../src/utils/holdNavigation";
import type { AlbumPageData } from "../../src/interfaces/gameInterfaces";
import { orNothing, fetchAlbum } from "../prerender-api";

export const handle = { puff: true };

// Build time only: each prerendered album page gets its data baked in.
export async function loader({ params }: LoaderFunctionArgs) {
  return { album: await orNothing(fetchAlbum(Number(params.id))) };
}

// Client navigations: the cached album, else the prerendered .data, else the API; held up to 200 ms.
export async function clientLoader({ params, serverLoader }: ClientLoaderFunctionArgs) {
  const snapshot = async () => {
    const { album } = (await serverLoader()) as { album: AlbumPageData | null };
    if (!album) throw new Error("No build-time data");
    return album;
  };
  // An unknown album isn't an error to retry: the page then asks once more and shows the 404.
  const album = loadAlbum(params.id ?? "", snapshot).catch((err) => {
    if (isAxiosError(err) && err.response?.status === 404) return undefined;
    throw err;
  });
  return { held: await holdForData(album) };
}

export function HydrateFallback() {
  return <PageLoader />;
}

export default function AlbumRoute() {
  const params = useParams();
  const data = useLoaderData<typeof loader | typeof clientLoader>();
  const held = "album" in data ? (data.album && { ready: true as const, value: data.album }) : data.held;
  return (
    <HeldData data={held} message="Loading album..." errorMessage="Error fetching this album.">
      {(album) => <AlbumPage id={params.id ?? ""} initialAlbum={album} />}
    </HeldData>
  );
}
