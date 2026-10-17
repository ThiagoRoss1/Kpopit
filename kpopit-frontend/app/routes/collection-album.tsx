import { Navigate } from "react-router";
import CollectionAlbum from "../../src/pages/Collection/CollectionAlbum";

export default function CollectionAlbumRoute() {
  return import.meta.env.VITE_COLLECTION_ENABLED === "true" ? <CollectionAlbum /> : <Navigate to="/" replace />;
}
