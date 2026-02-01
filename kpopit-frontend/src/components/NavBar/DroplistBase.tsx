import "./droplist.css";
import { useEffect } from "react";

interface DroplistBaseProps {
    isOpen?: boolean;
    onClose: () => void;
    children?: React.ReactNode;
    containerRef: React.RefObject<HTMLDivElement | null>;
    className?: string;
}

const DroplistBase = (props: DroplistBaseProps) => {
    const { isOpen, onClose, children, containerRef, className } = props;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose, containerRef]);

    return (
        <div 
            data-state={isOpen ? "open" : "closed"}
            className={`droplist-base absolute top-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-3 z-50 bg-black/80 border border-white/10 rounded-2xl  
            backdrop-blur-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5),0_0_20px_rgba(255,255,255,0.2)] ${className || ""}`}>

                {children}
        </div>
    )
}

export default DroplistBase;