import { Navigate, useLoaderData } from "react-router";
import Collections from "../../src/pages/Collection/Collections";
import HeldData from "../../src/components/Loading/HeldData";
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
  if (!ENABLED) return <Navigate to="/" replace />;
  return (
    <HeldData data={held} message="Loading Kpopit..." errorMessage="Error loading your collections.">
      {() => <Collections />}
    </HeldData>
  );
}
