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
        <nav className="sticky top-0 z-50 w-full sm:w-full h-12 sm:h-15 border-b border-[#FF3399]/40 bg-black/50 backdrop-blur-xl">
            <div className="max-w-full sm:max-w-360 mx-auto px-2 sm:px-0 h-full flex items-center justify-between">

                {/* Logo - Left part */}
                <div className="flex items-center hover:scale-105 active:scale-95 ease-[cubic-bezier(0.34,1.56,0.64,1)] transition-all duration-300 transform-gpu">
                    <Link 
                        to="/"
                        className="flex items-center gap-1 hover:opacity-80 transition-opacity duration-300"
                    >
                        <img 
                            src="/kpopit-icon.png"
                            alt="Kpopit logo"
                            className="max-xxs:w-7 max-xxs:h-7 xxs:w-8 xxs:h-8 xs:w-9 xs:h-9 sm:w-12 sm:h-12 object-contain"
                            draggable={false}
                        />

                        <span className="text-[#FF3399] max-xxs:text-[12px] xxs:text-[14px] xs:text-base xm:text-lg sm:text-xl whitespace-nowrap [text-shadow:2px_2px_0px_rgba(0,0,0,0.5),0px_0px_6px_#FF3399] transform-gpu">• {currentPage}</span>
                    </Link>
                </div>

                {/* Buttons - Center-right part */}
                <div className="flex items-center gap-1 sm:gap-4">
                    {/* Games */}
                    <ButtonsDroplist
                        buttonName="Games" 
                        items={GAMES_LINKS} 
                        className="bg-white/0 max-xxs:w-19 max-xxs:h-10 xxs:w-20 xxs:h-10 sm:w-26 sm:h-12"
                        dropdownClassName=""
                    />
                    {/* Idols */}
                    <ButtonsDroplist
                        buttonName="Idols"
                        items={IDOLS_LINKS}
                        className="bg-white/0 max-xxs:w-16 max-xxs:h-10 xxs:w-18 xxs:h-10 sm:w-23 sm:h-12"
                        dropdownClassName=""
                    />
                    {/* Contact */}
                    <Link
                        to="/contact"
                        className="flex items-center justify-center rounded-3xl hover:cursor-pointer hover:scale-105 hover:bg-[#b43777] transition-all duration-300 transform-gpu
                        bg-white/0 max-xxs:w-16 max-xxs:h-10 xxs:w-19 xxs:h-10 xs:w-22 xs:h-10 sm:w-25 sm:h-12"
                    >
                        <span className="flex flex-row text-white max-xxs:text-[14px] xxs:text-[14px] xs:text-[14px] sm:text-base gap-1">Contact</span>
                    </Link>
                </div>
            </div>
        </nav>
    )
}

export default NavBar;
