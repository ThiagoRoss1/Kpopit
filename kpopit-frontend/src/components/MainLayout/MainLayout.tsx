import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import NavBar from "../NavBar/NavBar";
import { getUserAnalytics } from "../../services/api";

const MainLayout = () => {
    useEffect(() => {
        // Track only once per session (tab/window)
        if (!sessionStorage.getItem('kpopit_session_tracked')) {
            getUserAnalytics()
                .then(() => {
                    sessionStorage.setItem('kpopit_session_tracked', 'true');
                });
        }
    }, []);

    return (
        <div className="min-h-screen bg-transparent text-foreground selection:bg-pink-800">
            <NavBar />

            <main className="max-w-360 mx-auto px-4 md:px-25 w-full min-h-[calc(100vh-60px)]">
                <Outlet />
            </main>
        </div>
    )
}

export default MainLayout;