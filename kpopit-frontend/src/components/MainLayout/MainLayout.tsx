import { useEffect, useState } from "react";
import { Outlet, useMatches } from "react-router";
import NavBarV2 from "../NavBarV2/NavBarV2";
import Footer from "../Footer/Footer";
import { Link } from "react-router";
import { getUserAnalytics } from "../../services/api";
import GlobalNotices from "../GlobalNotices/GlobalNotices";
import { useHydrated } from "../../hooks/useHydrated";
import { useFeatures } from "../../hooks/useFeatures";
import type { Features } from "../../utils/features";

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

    // Puff Pop pages (route handle { puff: true }, or a feature flag's name for pages that are
    // Puff Pop only while it is on) paint their own ground and follow the saved theme; the older
    // pages keep their dark look with the navbar forced to night.
    const { features } = useFeatures();
    const matches = useMatches();
    const puff = matches.some((match) => {
        const flag = (match.handle as { puff?: boolean | keyof Features } | undefined)?.puff;
        return flag === true || (typeof flag === "string" && features[flag]);
    });
    // An old page with a light look (Pixelated) keeps the navbar in Day until it is redesigned.
    const navTheme = matches.map((match) => (match.handle as { navTheme?: "day" } | undefined)?.navTheme).find(Boolean);

    return (
        <div className={`min-h-screen flex flex-col text-foreground selection:bg-pink-800 ${puff ? "bg-(--ground)" : "bg-transparent"}`}>
            <NavBarV2 forceTheme={puff ? undefined : navTheme ?? "night"} />
            
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

            <main className={puff ? "flex-1 w-full flex flex-col" : "flex-1 w-full px-2 sm:px-4 lg:px-4"}>
                <Outlet />
            </main>

            <Footer />
        </div>
    )
}

export default MainLayout;