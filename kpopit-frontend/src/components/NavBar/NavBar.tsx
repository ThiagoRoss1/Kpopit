import { Link, useLocation } from "react-router-dom";
import KpopitLogo from "../../../public/kpopit-icon.png";
import ButtonsDroplist from "./ButtonsDroplist";
import { GAMES_LINKS } from "./navigation";

export type GameMode = "classic" | "blurry" | "popIt";
const MODES: GameMode[] = ["classic", "blurry"];


const NavBar = () => {
    const location = useLocation();
    const path = location.pathname;
    const currentPage = path === "/" ? "popIt" : MODES.find(m => path.includes(m)) || "classic";

    return (
        <nav className="sticky top-0 z-50 w-full h-20 border-b border-pink-500 bg-black/20 backdrop-blur-xl">
            <div className="max-w-360 mx-auto px-0 h-full flex items-center justify-between">
                <div className="flex items-center">
                    <Link 
                        to="/"
                        className="flex items-center gap-1 hover:opacity-80 transition-opacity duration-300"
                    >
                        <img 
                            src={KpopitLogo}
                            alt={"Kpopit logo"}
                            className="w-15 h-15 object-contain"
                            draggable={false}
                        />

                        <span className="text-[#FF3399] text-2xl [text-shadow:1.6px_1.5px_5px_#FF3399]">• {currentPage}</span>
                    </Link>
                </div>

                <div className="flex items-center">
                    <ButtonsDroplist buttonName="Games" items={GAMES_LINKS} />
                </div>
            </div>
        </nav>
    )
}

export default NavBar;
