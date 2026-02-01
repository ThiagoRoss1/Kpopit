import DroplistBase from "./DroplistBase";
import { useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import type { DropLink } from "./navigation";

interface ButtonsDroplistProps {
    buttonName: string;
    items: DropLink[];
    className?: string;
    dropdownClassName?: string;
}

const ButtonsDroplist = (props: ButtonsDroplistProps) => {
    const { buttonName, items, className, dropdownClassName } = props;

    const [isOpen, setIsOpen] = useState<boolean>(false);

    const containerRef = useRef<HTMLDivElement>(null);

    const isGrid = buttonName === "Games";

    const location = useLocation();
    
    return (
            <div className="relative" ref={containerRef}>
                <button 
                    className={`flex items-center justify-center rounded-3xl hover:cursor-pointer hover:scale-105 hover:bg-[#b43777] transition-all duration-300 transform-gpu ${className || ""}`}
                    onClick={() => setIsOpen(!isOpen)}    
                    >
                    <span className="flex flex-row text-white max-xxs:text-[14px] xxs:text-[14px] xs:text-[14px] sm:text-base gap-1 sm:gap-1.5 text-center items-center justify-center">{buttonName} <ChevronDown className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" /></span>
                </button>

                <DroplistBase isOpen={isOpen} onClose={() => setIsOpen(false)} containerRef={containerRef} className={`${isGrid ? "max-xxs:w-45 xxs:w-55 xm:w-65 sm:w-80 lg:w-100" : "w-50"} h-auto`}>
                    <div className={`flex ${isGrid ? "grid grid-cols-1 lg:grid-cols-2" : "flex flex-col"} gap-2 p-2`}> {/* hover aumenta */}
                        {items.map((item) => { 
                            const isPath = location.pathname.includes(item.path);

                            if (item.isWip) {
                                {/* WIP Item */}
                                return (
                                    <div
                                        key={item.path}
                                        className={`relative flex w-full items-center text-white/40 max-xxs:text-[14px] xxs:text-[14px] xs:text-[14px] sm:text-base rounded-xl h-15 sm:h-17 px-2 sm:px-4 gap-4 sm:gap-4 
                                        hover:bg-[#FF3399]/20 cursor-default select-none ${dropdownClassName || ""}
                                        ${isPath ? "bg-white/10" : ""}`}>
                                            {item.icon && <img src={item.icon} alt={`${item.label} icon`} className="grayscale w-9 h-9 sm:w-10 sm:h-10" />}
                                            <span className="italic">{item.label}</span>
                                        </div>
                                );
                            }
                            {/* Regular Item */}
                            return (
                                <Link 
                                    key={item.path}
                                    to={item.path}
                                    className={`relative flex w-full items-center text-white max-xxs:text-[14px] xxs:text-base xs:text-base xm:text-lg sm:text-xl rounded-xl h-15 sm:h-17 px-4 gap-2 hover:bg-[#FF3399]/80 
                                    transition-[flex,background-color,transform]  ${dropdownClassName || ""} 
                                    ${isPath ? "bg-white/10" : ""}`}
                                    onClick={() => setIsOpen(false)}
                                    >
                                    {item.icon && <img src={item.icon} alt={`${item.label} icon`} className="w-8 h-8 sm:w-10 sm:h-10" />}
                                    <span className="font-normal">
                                        {isPath && (
                                        <span className="text-[#FF3399] [text-shadow:1px_1px_10px_#FF3399,1px_1px_10px_#FF3399] pr-1">• </span>
                                        )}
                                            <span className="[text-shadow:1.2px_1.6px_2.0px_rgba(255,51,153,1)]">{item.label}</span>
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </DroplistBase>
            </div>
    )
}

export default ButtonsDroplist;