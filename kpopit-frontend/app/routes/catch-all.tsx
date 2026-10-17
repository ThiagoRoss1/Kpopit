import { lazy, Suspense } from "react";
import { Navigate, useLocation } from "react-router";

const ADMIN_ROUTE = import.meta.env.VITE_ADMIN_ROUTE;

// With the flag off this whole branch is constant-folded away, so the admin code isn't built.
const Admin = ADMIN_ROUTE && import.meta.env.VITE_ADMIN_ENABLED === "true"
  ? lazy(() => import("../../src/pages/admin/admin"))
  : null;

export default function CatchAll() {
  const { pathname } = useLocation();
  if (Admin && pathname === ADMIN_ROUTE) {
    return (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    );
  }
  return <Navigate to="/" replace />;
}
