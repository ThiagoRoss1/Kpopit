import "./IdolProfile.css";
import type { LucideIcon } from "lucide-react";

interface InfoItemProps {
    icon: LucideIcon;
    label: string;
    value: React.ReactNode;
    size?: "small" | "large";
    index?: number;
    shouldStagger?: boolean;
}

const InfoItem = (props: InfoItemProps) => {
    const { icon: Icon, label, value, size, index = 0, shouldStagger } = props;

    return (
        <div 
            className={`fill-mode-forwards ${shouldStagger ? "infos-enter" : ""} flex flex-col h-full w-full justify-center 
            ${size === "small" ? "items-start" : "items-center"} gap-2 py-5 bg-[#252525] rounded-3xl border border-white/5`}
            style={shouldStagger ? { animationDelay: `${0.8 + index * 0.1}s` } : undefined}>
                <div className="flex items-center flex-row gap-3 px-2 xl:px-4">
                    <div className="flex w-8 lg:w-10 h-8 lg:h-10 rounded-[10px] bg-[#1f1f1f] overflow-hidden justify-center items-center">
                        <Icon className="text-neon-pink w-6 h-6 lg:w-7 lg:h-7" size={20} />
                    </div>

                    <span className="font-sans font-bold text-base opacity-80 text-white">
                        {label}
                    </span>
                </div>
            
            <span className={`flex font-sans font-bold text-2xl text-white px-5 xl:px-8 gap-2 max-xl:truncate
                [text-shadow:2px_2px_2px_rgba(0,0,0,0.8)] ${typeof value === "string" && value.length > 20 && size === "small" ?
                "text-lg xl:text-xl" : "text-xl lg:text-[22px] xl:text-2xl"} leading-tight`}>
                {value || "N/A"}
            </span>
        </div>
    )
}

export default InfoItem;