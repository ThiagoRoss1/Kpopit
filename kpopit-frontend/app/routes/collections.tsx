import { Navigate } from "react-router";
import Collections from "../../src/pages/Collection/Collections";

export default function CollectionsRoute() {
  return import.meta.env.VITE_COLLECTION_ENABLED === "true" ? <Collections /> : <Navigate to="/" replace />;
}
