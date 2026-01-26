import { Outlet } from "react-router-dom";
import NavBar from "../NavBar/NavBar";

const MainLayout = () => {
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