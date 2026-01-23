import DroplistBase from "./DroplistBase";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import type { DropLink } from "./navigation";

interface ButtonsDroplistProps {
    buttonName: string;
    items: DropLink[];
}

const ButtonsDroplist = (props: ButtonsDroplistProps) => {
    const { buttonName, items } = props;

    const [isOpen, setIsOpen] = useState<boolean>(false);

    return (
        <>
            <div className="relative">
                <button 
                    className="flex items-center text-white bg-transparent rounded-xl justify-center gap-1 
                    hover:text-pink-500 hover:cursor-pointer transition-all duration-200"
                    onClick={() => setIsOpen(true)}    
                    >
                    <span className="text-white text-base">{buttonName} <ChevronDown className="w-4 h-4" /></span>
                </button>

                <DroplistBase isOpen={isOpen} onClose={() => setIsOpen(false)}>
                    {items.map((item) => ( 
                        <Link 
                            key={item.path}
                            to={item.path}
                            className="flex text-white text-base px-4 py-2 gap-2 hover:bg-pink-500/20 transition-all"
                            onClick={() => setIsOpen(false)}
                            >
                            {item.icon && <img src={item.icon} alt={`${item.label} icon`} className="w-4 h-4" />}
                            {item.label}
                        </Link>
                    ))}
                </DroplistBase>
            </div>
        </>
    )
}

export default ButtonsDroplist;