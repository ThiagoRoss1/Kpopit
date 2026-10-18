import { Navigate } from "react-router";
import PageLoader from "../../src/components/Loading/PageLoader";

// Unknown paths go home; the loader fills the moment before the redirect.
export default function CatchAll() {
  return (
    <>
      <PageLoader />
      <Navigate to="/" replace />
    </>
  );
}
