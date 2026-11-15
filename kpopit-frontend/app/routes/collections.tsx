import { useLoaderData } from "react-router";
import Collections from "../../src/pages/Collection/Collections";
import HeldData from "../../src/components/Loading/HeldData";
import FeatureGate from "../../src/components/FeatureGate";
import NotFound from "../../src/pages/NotFound/NotFound";
import { loadCollectionsList } from "../../src/pages/Collection/collectionData";
import { holdForData } from "../../src/utils/holdNavigation";

const ENABLED = import.meta.env.VITE_COLLECTION_ENABLED === "true";

// Held up to 200 ms; null while the session is unknown (the page then waits for it itself).
export async function clientLoader() {
  const list = ENABLED ? loadCollectionsList() : null;
  return { held: list ? await holdForData(list) : null };
}

export default function CollectionsRoute() {
  const { held } = useLoaderData<typeof clientLoader>();
  // Off in this build or on the backend (/api/features): the 404, like every disabled feature.
  if (!ENABLED) return <NotFound />;
  return (
    <FeatureGate flag="collection">
      <HeldData data={held} message="Loading Kpopit..." errorMessage="Error loading your collections.">
        {() => <Collections />}
      </HeldData>
    </FeatureGate>
  );
}
