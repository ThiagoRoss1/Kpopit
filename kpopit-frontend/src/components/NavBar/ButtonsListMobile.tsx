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
        if (!isOpen) {
        setActiveSection(null)
        }
    }, [isOpen]);

    return (
        <div 
            className="fixed inset-0 z-50 w-full h-screen top-20 flex items-start justify-center bg-black/90 backdrop-blur-3xl md:hidden overflow-y-auto pb-40"
        >
            <ul 
                className="flex flex-col items-center justify-start gap-4 w-120 h-fit bg-white/10 rounded-2xl py-6 px-4"
                ref={containerRef}
            >
                {/* Home */}
                <li className="flex w-full h-20 bg-[#FF3399] rounded-2xl items-center justify-center text-center text-white">
                    <Link
                        to="/" onClick={onClose} className={text}>
                            <span className={text}>Home</span>
                    </Link>
                </li>
                {/* Games Section */}
                <li className="flex w-full flex-col items-center justify-center">
                    <button
                        className={`w-full h-20 rounded-2xl bg-black text-white transition-all duration-300 transform-gpu ${activeSection === "games" ? "bg-white/20 scale-102" : ""}`}
                        onClick={() => setActiveSection((prev) => prev === "games" ? null : "games")}
                    >
                        <span className={`flex flex-row items-center justify-center gap-4 ${text}`}>Games <ChevronDown className={`w-8 h-8 transition-all duration-300 transform-gpu ${activeSection === "games" ? "rotate-180" : ""}`} /></span>
                    </button>

                    {activeSection === "games" && (
                        <ul className="flex flex-col mobile-list-enter w-full rounded-2xl gap-2 bg-black/40 border-b border-[#FF3399] mt-4 mb-2 text-white p-4">
                            {GAMES_LINKS.map((game) => {
                                const isPath = location.pathname.includes(game.path);
                                
                                if (game.isWip) {
                                    return (
                                        <li 
                                            key={game.path}
                                            className="flex w-full h-20 bg-black/40 rounded-2xl items-center px-4 gap-3 cursor-default"
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
                                        className={`flex w-full h-20 rounded-2xl items-center justify-center px-4 gap-3 hover:bg-[#FF3399]/80 transition-colors ${
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
                    )}
                </li>

                {/* Idols Section */}
                <li className="w-full flex flex-col items-center justify-center list-none">
                    <button
                        className={`w-full h-20 rounded-2xl bg-black text-white transition-all duration-300 transform-gpu ${activeSection === "idols" ? "bg-white/20 scale-102" : ""}`}
                        onClick={() => setActiveSection((prev) => prev === "idols" ? null : "idols")}
                    >
                        <span className={`flex flex-row items-center justify-center gap-4 ${text}`}>Idols <ChevronDown className={`w-8 h-8 transition-all duration-300 transform-gpu ${activeSection === "idols" ? "rotate-180" : ""}`} /></span>
                    </button>

                    {activeSection === "idols" && (
                        <ul className="flex flex-col w-full mobile-list-enter rounded-2xl mt-2 mb-2 text-white gap-2 p-2">
                            {IDOLS_LINKS.map((idol) => {
                                const isPath = location.pathname.includes(idol.path);
                                
                                if (idol.isWip) {
                                    return (
                                        <li 
                                            key={idol.path}
                                            className="flex w-full h-20 bg-black/40 rounded-2xl items-center px-4 gap-3 cursor-default"
                                        >
                                            {idol.icon && (
                                                <img 
                                                    src={idol.icon} 
                                                    alt={`${idol.label} icon`} 
                                                    className="grayscale w-9 h-9"
                                                />
                                            )}
                                            <span className="text-white/40 italic text-lg">{idol.label}</span>
                                        </li>
                                    );
                                }

                                return (
                                    <li 
                                        key={idol.path}
                                        className={`flex w-full h-20 rounded-2xl items-center px-4 gap-3 hover:bg-[#FF3399]/80 transition-colors ${
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
                    )}
                </li>

                {/* Contact */}
                <li className="w-full flex items-center justify-center list-none">
                    <Link
                        to="/contact" 
                        onClick={onClose} 
                        className={`flex w-full h-20 bg-[#ff3399] rounded-2xl items-center justify-center text-center ${text}`}>
                            <span className={text}>Contact</span>
                    </Link>
                </li>
            </ul>
        </div>
    )
}







export default ButtonsListMobile;