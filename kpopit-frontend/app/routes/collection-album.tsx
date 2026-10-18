import { Navigate, useLoaderData, type ClientLoaderFunctionArgs } from "react-router";
import CollectionAlbum from "../../src/pages/Collection/CollectionAlbum";
import HeldData from "../../src/components/Loading/HeldData";
import { loadCollectionAlbum, loadCollectionsList } from "../../src/pages/Collection/collectionData";
import { holdForData } from "../../src/utils/holdNavigation";

const ENABLED = import.meta.env.VITE_COLLECTION_ENABLED === "true";

// The album and the list it is named from, held up to 200 ms together; null while the session is
// unknown or the id is invalid (the page handles those itself).
export async function clientLoader({ params }: ClientLoaderFunctionArgs) {
  const id = Number(params.collectionId);
  const album = ENABLED && Number.isInteger(id) && id > 0 ? loadCollectionAlbum(id) : null;
  const list = album ? loadCollectionsList() : null;
  return { held: album && list ? await holdForData(Promise.all([album, list])) : null };
}

export default function CollectionAlbumRoute() {
  const { held } = useLoaderData<typeof clientLoader>();
  if (!ENABLED) return <Navigate to="/" replace />;
  return (
    <HeldData data={held} message="Loading Kpopit..." errorMessage="Error loading the album.">
      {() => <CollectionAlbum />}
    </HeldData>
  );
}
