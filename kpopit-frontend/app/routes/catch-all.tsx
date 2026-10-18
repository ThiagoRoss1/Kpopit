import { Navigate } from "react-router";

// Unknown paths go home.
export default function CatchAll() {
  return <Navigate to="/" replace />;
}
