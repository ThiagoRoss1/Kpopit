import "./droplist.css";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { GAMES_LINKS, IDOLS_LINKS } from "./navigation";
import { ChevronDown } from "lucide-react";


interface ButtonsListMobileProps {
    isOpen?: boolean;
    onClose: () => void;
}

const ButtonsListMobile = (props: ButtonsListMobileProps) => {
    const { isOpen, onClose } = props;

    const [isRendered, setIsRendered] = useState(isOpen);

    const [activeSection, setActiveSection] = useState<null | "games" | "idols">(null);

    const containerRef = useRef<HTMLUListElement>(null);
    const location = useLocation();

    const text = "text-white max-xxs:text-[12px] xxs:text-[14px] xs:text-base xm:text-lg sm:text-xl whitespace-nowrap [text-shadow:2px_2px_0px_rgba(0,0,0,0.5)]";

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            if (isOpen && containerRef.current && !containerRef.current.contains(target) && !target.closest("#mobile-menu-button")) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose, containerRef]);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
        } else {
            const timer = setTimeout(() => {
                setIsRendered(false);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isRendered) return null;

    return (
        <div 
            className={`fixed inset-0 -z-100 w-full h-screen flex items-start justify-center bg-black/90 backdrop-blur-3xl md:hidden overflow-y-auto pb-40
            transition-opacity duration-500 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
            <ul 
                className={`flex flex-col ${isOpen ? "mobile-navbar-enter" : "mobile-navbar-exit"} items-center justify-start gap-4 max-xxs:w-75 xxs:w-90 xs:w-100 sm:w-100 h-fit bg-white/10 border border-white/20 rounded-2xl mt-20 py-6 px-8`}
                ref={containerRef}
            >
                {/* Home */}
                <li className="flex w-full max-xxs:h-12 xxs:h-14 xs:h-16 bg-linear-to-r from-[#FF3399] to-[#df4a83] rounded-2xl items-center justify-center text-center text-white">
                    <Link
                        to="/" onClick={onClose} className={`flex w-full h-full items-center justify-center rounded-2xl text-center ${text}`}>
                            <span className={text}>Home</span>
                    </Link>
                </li>
                {/* Games Section */}
                <li className="flex w-full flex-col items-center justify-center">
                    <button
                        className={`w-full max-xxs:h-12 xxs:h-14 xs:h-16 rounded-2xl bg-black text-white transition-transform duration-300 transform-gpu ${activeSection === "games" ? "bg-white/20 scale-105 border border-white/60" : ""}`}
                        onClick={() => setActiveSection((prev) => prev === "games" ? null : "games")}
                    >
                        <span className={`flex flex-row items-center justify-center gap-4 ${text}`}>Games <ChevronDown className={`w-8 h-8 transition-all duration-300 transform-gpu ${activeSection === "games" ? "rotate-180" : ""}`} /></span>
                    </button>

                    {/* Games List */}
                    <ul className={`flex flex-col w-full rounded-2xl gap-2 text-white border-b
                    transition-all duration-300 ease-in-out overflow-hidden transform-gpu
                    ${activeSection === "games"
                        ? "max-h-150 opacity-100 bg-black/40 border-[#FF3399] mt-4 mb-2 p-4"
                        : "max-h-0 opacity-0 mt-0 p-0 border-transparent"}
                    `}>
                        {GAMES_LINKS.map((game) => {
                            const isPath = location.pathname.includes(game.path);
                            
                            if (game.isWip) {
                                return (
                                    <li 
                                        key={game.path}
                                        className="flex w-full max-xxs:h-12 xxs:h-14 xs:h-16 bg-black/40 rounded-2xl items-center px-4 gap-3 cursor-default"
                                    >
                                        {game.icon && (
                                            <img 
                                                src={game.icon} 
                                                alt={`${game.label} icon`} 
                                                className="grayscale w-9 h-9"
                                            />
                                        )}
                                        <span className="text-white/40 italic text-sm">{game.label}</span>
                                    </li>
                                );
                            }

                            return (
                                <li 
                                    key={game.path}
                                    className={`flex w-full max-xxs:h-12 xxs:h-14 xs:h-16 rounded-2xl items-center justify-center px-4 gap-3 hover:bg-[#FF3399]/80 transition-colors ${
                                        isPath ? "bg-white/10" : "bg-black/0"
                                    }`}
                                >
                                    <Link 
                                        to={game.path} 
                                        onClick={onClose} 
                                        className="flex items-center justify-center gap-3 w-full"
                                    >
                                        {game.icon && (
                                            <img 
                                                src={game.icon} 
                                                alt={`${game.label} icon`} 
                                                className="w-9 h-9"
                                            />
                                        )}
                                        <span className={text}>
                                            {isPath && (
                                                <span className="text-[#FF3399] [text-shadow:1px_1px_10px_#FF3399,1px_1px_10px_#FF3399] pr-1">• </span>
                                            )}
                                            <span className="[text-shadow:1.2px_1.6px_2.0px_rgba(255,51,153,1)]">{game.label}</span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </li>

                {/* Idols Section */}
                <li className="w-full flex flex-col items-center justify-center list-none">
                    <button
                        className={`w-full max-xxs:h-12 xxs:h-14 xs:h-16 rounded-2xl bg-black text-white transition-transform duration-300 transform-gpu ${activeSection === "idols" ? "bg-white/20 scale-105 border border-white/60" : ""}`}
                        onClick={() => setActiveSection((prev) => prev === "idols" ? null : "idols")}
                    >
                        <span className={`flex flex-row items-center justify-center gap-4 ${text}`}>Idols <ChevronDown className={`w-8 h-8 transition-all duration-300 transform-gpu ${activeSection === "idols" ? "rotate-180" : ""}`} /></span>
                    </button>

                    {/* Idols List */}
                    <ul className={`flex flex-col w-full rounded-2xl gap-2 text-white border-b
                        transition-all duration-300 ease-in-out overflow-hidden transform-gpu
                        ${activeSection === "idols" 
                            ? "max-h-150 opacity-100 border-[#FF3399] mt-2 mb-2 p-2"
                            : "max-h-0 opacity-0 mt-0 mb-0 p-0 border-transparent"}
                    `}>
                        {IDOLS_LINKS.map((idol) => {
                            const isPath = location.pathname.includes(idol.path);
                            
                            if (idol.isWip) {
                                return (
                                    <li 
                                        key={idol.path}
                                        className="flex w-full max-xxs:h-12 xxs:h-14 xs:h-16 bg-black/40 rounded-2xl items-center px-4 gap-3 cursor-default"
                                    >
                                        {idol.icon && (
                                            <img 
                                                src={idol.icon} 
                                                alt={`${idol.label} icon`} 
                                                className="grayscale w-9 h-9"
                                            />
                                        )}
                                        <span className="text-white/40 italic max-xxs:text-sm xxs:text-base xs:text-lg">{idol.label}</span>
                                    </li>
                                );
                            }

                            return (
                                <li 
                                    key={idol.path}
                                    className={`flex w-full max-xxs:h-12 xxs:h-14 xs:h-16 rounded-2xl items-center px-4 gap-3 hover:bg-[#FF3399]/80 transition-colors ${
                                        isPath ? "bg-white/10" : "bg-black/80"
                                    }`}
                                >
                                    <Link 
                                        to={idol.path} 
                                        onClick={onClose}
                                        className="flex items-center gap-3 w-full"
                                    >
                                        {idol.icon && (
                                            <img 
                                                src={idol.icon} 
                                                alt={`${idol.label} icon`} 
                                                className="w-9 h-9"
                                            />
                                        )}
                                        <span className={text}>
                                            {isPath && (
                                                <span className="text-[#FF3399] [text-shadow:1px_1px_10px_#FF3399,1px_1px_10px_#FF3399] pr-1">• </span>
                                            )}
                                            <span className="[text-shadow:1.2px_1.6px_2.0px_rgba(255,51,153,1)]">{idol.label}</span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </li>

                {/* Contact */}
                <li className="w-full flex items-center justify-center list-none">
                    <Link
                        to="/contact" 
                        onClick={onClose} 
                        className={`flex w-full max-xxs:h-12 xxs:h-14 xs:h-16 bg-linear-to-r from-[#FF3399] to-[#df4a83] rounded-2xl items-center justify-center text-center ${text}`}>
                            <span className={text}>Contact</span>
                    </Link>
                </li>
            </ul>
        </div>
    )
}







export default ButtonsListMobile;