import { useState } from "react";
import { X } from "lucide-react";
type NoticeVariant = "info" | "warning";

interface GlobalNoticeProps {
    variant?: NoticeVariant;
    children: React.ReactNode;
}

const GlobalNotices = (props: GlobalNoticeProps) => {
    const { variant = "info", children } = props;

    const [isVisible, setIsVisible] = useState<boolean>(true);
    
    return (
        <>
        {isVisible && (
        <div className={`w-full bg-transparent mt-2 py-2 px-4`}>
            <div className={`w-full lg:w-200 
                ${variant === "info" ? "bg-white/10" : "bg-gray-400"} shadow-[0_4px_6px_rgba(0,0,0,0.4)] rounded-lg mx-auto h-10 
                flex items-center justify-between px-2 sm:px-2`}>
                <span className="max-sxs:text-[10px] xxs:text-[12px] zm:text-[14px] sm:text-lg text-white [text-shadow:1.2px_1.6px_2.0px_rgba(24,24,24,1)]">
                    {children}
                </span>
                <button 
                    className="flex items-center justify-center rounded-full bg-white/20 shrink w-6 h-6 sm:w-8 sm:h-8
                    hover:scale-105 hover:brightness-110 hover:cursor-pointer shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-200 transform-gpu"
                    onClick={() => setIsVisible(!isVisible)}
                >
                    <X size={16} color="white" className="sm:5 h:5" />
                </button>
            </div>
        </div>
        )}
        </>
    )
}

export default GlobalNotices;