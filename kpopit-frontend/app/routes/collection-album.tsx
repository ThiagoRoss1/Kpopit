import { useLoaderData, type ClientLoaderFunctionArgs } from "react-router";
import CollectionAlbum from "../../src/pages/Collection/CollectionAlbum";
import HeldData from "../../src/components/Loading/HeldData";
import FeatureGate from "../../src/components/FeatureGate";
import NotFound from "../../src/pages/NotFound/NotFound";
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
  // Off in this build or on the backend (/api/features): the 404, like every disabled feature.
  if (!ENABLED) return <NotFound />;
  return (
    <FeatureGate flag="collection">
      <HeldData data={held} message="Loading Kpopit..." errorMessage="Error loading the album.">
        {() => <CollectionAlbum />}
      </HeldData>
    </FeatureGate>
  );
}
