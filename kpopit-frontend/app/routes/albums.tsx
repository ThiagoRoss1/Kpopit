import { useLoaderData, type ClientLoaderFunctionArgs } from "react-router";
import AlbumsList from "../../src/pages/Albums/AlbumsList";
import HeldData from "../../src/components/Loading/HeldData";
import PageLoader from "../../src/components/Loading/PageLoader";
import { loadAlbumsList } from "../../src/pages/Albums/albumsData";
import { holdForData } from "../../src/utils/holdNavigation";
import type { AlbumsPageItem } from "../../src/interfaces/gameInterfaces";
import { orNothing, fetchAlbumsPage } from "../prerender-api";

export const handle = { puff: true };

// Build time only: the list is baked into the prerendered page (same flow as /idols).
export async function loader() {
  return { albums: await orNothing(fetchAlbumsPage()) };
}

// Client navigations: the cached list, else the prerendered .data, else the API; held up to 200 ms.
export async function clientLoader({ serverLoader }: ClientLoaderFunctionArgs) {
  const snapshot = async () => {
    const { albums } = (await serverLoader()) as { albums: AlbumsPageItem[] | null };
    if (!albums) throw new Error("No build-time data");
    return albums;
  };
  return { held: await holdForData(loadAlbumsList(snapshot)) };
}

export function HydrateFallback() {
  return <PageLoader />;
}

export default function AlbumsRoute() {
  const data = useLoaderData<typeof loader | typeof clientLoader>();
  const held = "albums" in data ? (data.albums && { ready: true as const, value: data.albums }) : data.held;
  return (
    <HeldData data={held} message="Loading albums..." errorMessage="Error fetching albums.">
      {(albums) => <AlbumsList initialAlbums={albums} />}
    </HeldData>
  );
}
