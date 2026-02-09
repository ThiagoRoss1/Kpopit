import { Link } from "react-router-dom";
import { useSharedGameData } from "../../hooks/useSharedGameData";
import { Info } from "lucide-react";
import XLogo from "../../assets/icons/x-logo.svg";

const Footer = () => {

    const { isMobile } = useSharedGameData();

    return (
        <div className={`w-full flex flex-col items-center justify-center ${isMobile ? "mt-12" : "mt-4"} mb-0 gap-1`}>
            <div className="w-full flex flex-row items-center justify-center gap-3">
            <button
            className="flex items-center justify-center max-xxs:w-10 max-xxs:h-10 xxs:w-10 xxs:h-10 xs:w-10 xs:h-10 sm:w-10 sm:h-10 bg-black rounded-full hover:scale-110 hover:brightness-110 hover:cursor-pointer
            transition-all duration-300 transform-gpu" onClick={() => window.open("https://x.com/TgoRoss1", "_blank")}>
                <img src={XLogo} alt="X" className="max-xxs:w-7.5 max-xxs:h-7.5 xxs:w-7.5 xxs:h-7.5 xs:w-7.5 xs:h-7.5 sm:w-7.5 sm:h-7.5 items-center justify-center" draggable={false} />
            </button>
            
            <Link 
                to="/contact"
                className="flex items-center justify-center max-xxs:w-10 max-xxs:h-10 xxs:w-10 xxs:h-10 xs:w-10 xs:h-10 sm:w-10 sm:h-10 bg-white rounded-full hover:scale-110 hover:brightness-110 hover:cursor-pointer
                transition-all duration-300 transform-gpu"
                aria-label="Contact"
            >
                <Info className="max-xxs:w-10 max-xxs:h-10 xxs:w-10 xxs:h-10 xs:w-10 xs:h-10 sm:w-10 sm:h-10" />

            </Link>
            </div>

            <div className="w-full flex items-center justify-center">
                <Link to="/privacy-policy">
                    <span className="normal-font font-bold text-white max-xxs:text-[14px] xxs:text-[14px] xs:text-base sm:text-base hover:underline">Privacy Policy</span>
                </Link>
                </div>
        </div>
    )

}

export default Footer;