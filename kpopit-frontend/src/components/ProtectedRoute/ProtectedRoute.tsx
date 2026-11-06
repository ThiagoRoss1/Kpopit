import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import PageLoader from "../Loading/PageLoader";

// As a layout it renders the child route; wrapped around a page it renders that page.
const ProtectedRoute = ({ children }: { children?: ReactNode }) => {
    const { isAuthenticated, isLoading } = useAuth();

    // The session is still being restored: the loader, not an empty page.
    if (isLoading) return <PageLoader tone="dark" />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children ?? <Outlet />;
};

export default ProtectedRoute;
