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
            ${size === "small" ? "items-start" : "items-start md:items-center"} gap-2 py-5 bg-[#252525]/50 rounded-3xl border border-white/10 shadow-[4px_4px_40px_1px_rgba(0,0,0,0.1),inset_0_4px_8px_rgba(0,0,0,0.25)]
            w-full min-h-25 lg:min-h-30`}
            style={shouldStagger ? { animationDelay: `${0.8 + index * 0.1}s` } : undefined}>
                <div className="flex items-center flex-row gap-3 px-2 xl:px-4">
                    <div className="flex w-8 lg:w-10 h-8 lg:h-10 rounded-[10px] bg-[#1f1f1f] overflow-hidden justify-center items-center">
                        <Icon className="text-neon-pink w-6 h-6 lg:w-7 lg:h-7" size={20} />
                    </div>

                    <span className="font-sans font-bold text-base opacity-80 text-white max-md:wrap-anywhere">
                        {label}
                    </span>
                </div>
            
            <span className={`flex font-sans font-bold text-white px-5 xl:px-8 gap-2 max-md:wrap-anywhere lg:truncate
                [text-shadow:2px_2px_2px_rgba(0,0,0,0.8)] ${typeof value === "string" && value.length > 20 && size === "small" ?
                "text-lg xl:text-xl" : typeof value === "string" && value.length > 30 && size === "large" ? "max-zm:text-lg text-[clamp(1.125rem,3vw,1.25rem)] sm:text-xl lg:text-[22px] xl:text-2xl" : "text-xl lg:text-[22px] xl:text-2xl"} leading-tight`}>
                {value || "N/A"}
            </span>
        </div>
    )
}

export default InfoItem;