import { Link, useLocation } from "react-router-dom";
import ButtonsDroplist from "./ButtonsDroplist";
import { GAMES_LINKS, IDOLS_LINKS } from "./navigation";

export type GameMode = "classic" | "blurry" | "popIt";
const MODES: GameMode[] = ["classic", "blurry"];


const NavBar = () => {
    const location = useLocation();
    const path = location.pathname;
    const currentPage = path === "/" ? "" : MODES.find(m => path.includes(m)) || "classic";

    return (
        <nav className="sticky top-0 z-50 w-full h-15 border-b border-[#FF3399]/40 bg-black/50 backdrop-blur-xl">
            <div className="max-w-360 mx-auto px-0 h-full flex items-center justify-between">

                {/* Logo - Left part */}
                <div className="flex items-center hover:scale-105 active:scale-95 ease-[cubic-bezier(0.34,1.56,0.64,1)] transition-all duration-300 transform-gpu">
                    <Link 
                        to="/"
                        className="flex items-center gap-1 hover:opacity-80 transition-opacity duration-300"
                    >
                        <img 
                            src="/kpopit-icon.png"
                            alt="Kpopit logo"
                            className="w-12 h-12 object-contain"
                            draggable={false}
                        />

                        <span className="text-[#FF3399] text-2xl [text-shadow:1.6px_1.5px_5px_#FF3399]">• {currentPage}</span>
                    </Link>
                </div>

                {/* Buttons - Center-right part */}
                <div className="flex items-center gap-4">
                    {/* Games */}
                    <ButtonsDroplist
                        buttonName="Games" 
                        items={GAMES_LINKS} 
                        className="bg-white/0 w-26 h-12"
                        dropdownClassName=""
                    />
                    {/* Idols */}
                    <ButtonsDroplist
                        buttonName="Idols"
                        items={IDOLS_LINKS}
                        className="bg-white/0 w-23 h-12"
                        dropdownClassName=""
                    />
                    {/* Contact */}
                    <Link
                        to=""
                        className="flex items-center justify-center rounded-3xl hover:cursor-pointer hover:scale-105 hover:bg-[#b43777] transition-all duration-300 transform-gpu
                        bg-white/0 w-25 h-12"
                    >
                        <span className="flex flex-row text-white text-base gap-1">Contact</span>
                    </Link>
                </div>
            </div>
        </nav>
    )
}

export default NavBar;
