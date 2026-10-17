import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import NavBar from "../NavBar/NavBar";
import Footer from "../Footer/Footer";
import { Link } from "react-router-dom";
import { getUserAnalytics } from "../../services/api";
import GlobalNotices from "../GlobalNotices/GlobalNotices";
import { useHydrated } from "../../hooks/useHydrated";

const MainLayout = () => {
    useEffect(() => {
        // Track only once per session (tab/window)
        if (!sessionStorage.getItem('kpopit_analytics_tracked')) {
            getUserAnalytics()
                .then(() => {
                    sessionStorage.setItem('kpopit_analytics_tracked', 'true');
                });
        }
    }, []);

    // The closed flag lives in sessionStorage, so the notice appears only after hydration.
    const hydrated = useHydrated();
    const [isNoticeClosed, setIsNoticeClosed] = useState(() =>
        typeof window !== "undefined" && !!sessionStorage.getItem('kpopit_notice_closed'));
    const isNoticeVisible = hydrated && import.meta.env.VITE_GLOBAL_NOTICE === "true" && !isNoticeClosed;

    const handleNoticeClose = () => {
        setIsNoticeClosed(true);
        sessionStorage.setItem('kpopit_notice_closed', 'true');
    }

    return (
        <div className="min-h-screen flex flex-col bg-transparent text-foreground selection:bg-pink-800">
            <NavBar />
            
            {/* Notices */}
            {import.meta.env.VITE_GLOBAL_NOTICE === "true" && 
                <GlobalNotices 
                    variant="info"
                    onClose={handleNoticeClose}
                    visible={isNoticeVisible}
                >
                    <span>Idols page is now available!{" "}
                        <Link to="/idols"
                        className="text-neon-pink underline font-bold hover:brightness-125"
                        onClick={handleNoticeClose}
                        >
                            Check here
                        </Link>
                    </span>
                </GlobalNotices>
            }

            <main className="flex-1 w-full px-2 sm:px-4 lg:px-4">
                <Outlet />
            </main>

            <Footer />
        </div>
    )
}

export default MainLayout;