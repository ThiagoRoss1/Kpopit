import { Loader2 } from "lucide-react";

interface StatsCardProps {
    label: string;
    value: number;
    gameMode: string | null;
    sub: string;
    fadeKey: string;
    actualCard: string;
    isLoading?: boolean;
}

const StatsCard = ({ label, value, gameMode, sub, fadeKey, actualCard, isLoading }: StatsCardProps) => (
    <article
        role="listitem"
        className={`flex flex-col gap-1 min-w-0 h-27.5 xs:h-34 sm:h-27.5 px-4 sm:px-4 py-1.5 sm:py-2
        bg-[#111111] rounded-lg justify-center max-sm:items-center sm:items-start
        border-neon-pink ${actualCard === 'currentStreak' ? 'border-t-2 border-l-2 border-r-2 sm:border-r-0 sm:border-t-2 sm:border-l-2' :
            actualCard === 'maxStreak' ? 'border-l-2 border-r-2 sm:border-l-0 sm:border-t-2 sm:border-r-0' :
             actualCard === 'wins' ? 'border-l-2 border-r-2 sm:border-l-0 sm:border-r-2 sm:border-t-2' : ''}`}
    >
        <div className="flex items-center max-sm:justify-center sm:justify-start gap-2 w-full min-w-0 h-5 xs:h-auto xs:min-h-5 sm:h-5">
            <span className="flex items-center gap-1.5 min-w-0 overflow-hidden xs:overflow-visible sm:overflow-hidden">
                <span className="font-sans max-xs:text-[12px] xs:text-sm sm:text-[10px] lg:text-[12px] text-[#888] tracking-[1.5px] uppercase font-black min-w-0">
                    {label}
                </span>

                {gameMode && (
                    <span
                        aria-live="polite"
                        className="font-mono max-xs:text-[12px] xs:text-sm sm:text-[10px] lg:text-[12px] tracking-[1.5px] font-bold uppercase whitespace-nowrap shrink-0
                        text-neon-pink bg-neon-pink/8 border border-neon-pink/40
                        rounded px-1.5 py-px leading-tight"
                    >
                        {gameMode}
                    </span>
                )}
            </span>
        </div>

        <div
            key={fadeKey}
            className="stat-value-fade-in mt-1.5 text-3xl font-bold text-white tracking-[0.3px] leading-none
            [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]"
        >
            {isLoading ? (
                <Loader2 className="w-7.5 h-7.5 animate-spin text-white" />
            ) : (
                value
            )}
        </div>

        <div className="font-sans max-xs:text-[12px] xs:text-sm sm:text-[10px] lg:text-[12px] text-[#666] mt-1 min-w-0 max-w-full">
            {sub}
        </div>
    </article>
);

export default StatsCard;
