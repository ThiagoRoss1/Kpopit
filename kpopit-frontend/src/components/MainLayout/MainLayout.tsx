import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import NavBar from "../NavBar/NavBar";
import Footer from "../Footer/Footer";
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
        <div className="min-h-full bg-transparent text-foreground selection:bg-pink-800">
            <NavBar />

            <main className="flex-1 max-w-360 mx-auto px-4 md:px-25 w-full">
                <Outlet />
            </main>

            <Footer />
        </div>
    )
}

export default MainLayout;