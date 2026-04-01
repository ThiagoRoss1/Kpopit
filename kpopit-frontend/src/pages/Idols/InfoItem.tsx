import type { LucideIcon } from "lucide-react";

interface InfoItemProps {
    icon: LucideIcon;
    label: string;
    value: React.ReactNode;
}

const InfoItem = (props: InfoItemProps) => {
    const { icon: Icon, label, value } = props;

    return (
        <div className="flex flex-col justify-start items-start gap-2 py-5 bg-[#252525] rounded-3xl border border-white/5">
            <div className="flex items-center flex-row gap-3 px-4">
                <div className="flex w-10 h-10 rounded-[10px] bg-[#1f1f1f] overflow-hidden justify-center items-center">
                    <Icon className="text-neon-pink w-7 h-7" size={20} />
                </div>

                <span className="font-sans font-bold text-base opacity-80 text-white">
                    {label}
                </span>
            </div>
            
            <span className="flex font-sans font-bold text-2xl text-white px-8 gap-2 [text-shadow:2px_2px_2px_rgba(0,0,0,0.8)]">
                {value || "N/A"}
            </span>
        </div>
    )
}

export default InfoItem;