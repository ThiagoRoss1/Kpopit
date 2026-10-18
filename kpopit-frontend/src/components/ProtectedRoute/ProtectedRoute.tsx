import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import PageLoader from "../Loading/PageLoader";

const ProtectedRoute = () => {
    const { isAuthenticated, isLoading } = useAuth();

    // The session is still being restored: the loader, not an empty page.
    if (isLoading) return <PageLoader />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <Outlet />;
};

export default ProtectedRoute;
