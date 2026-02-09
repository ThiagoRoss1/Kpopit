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
        <div className="min-h-screen flex flex-col bg-transparent text-foreground selection:bg-pink-800">
            <NavBar />

            <main className="flex-1 max-w-screen-2xl mx-auto px-2 sm:px-4 lg:px-8 w-full">
                <Outlet />
            </main>

            <Footer />
        </div>
    )
}

export default MainLayout;