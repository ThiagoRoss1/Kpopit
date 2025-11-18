//import React from "react";
import type { GuessedIdolData, YesterdayIdol } from "../../interfaces/gameInterfaces";
import TargetAttempt from "../../assets/icons/target.svg";
import RankPosition from "../../assets/icons/ranking-fill.svg";
import PositionTrend from "../../assets/icons/trending-up.svg";
import { Share2 } from "lucide-react";

interface VictoryCardBigProps {
    cardInfo: GuessedIdolData;
    idolActiveGroup?: string[] | null;
    attempts: number;
    yesterdayIdol: string;
    yesterdayIdolGroup?: string[] | null;
    yesterdayIdolImage?: YesterdayIdol["image_path"];
    userPosition?: number | null;
    userRank?: number | null;
    userScore?: number | null;
    nextReset: () => { timeRemaining: number | null; formattedTime: string; };
    onShareClick?: () => void;
}

const VictoryCardBig = (props: VictoryCardBigProps) => {
    const { cardInfo, idolActiveGroup, attempts, yesterdayIdol, yesterdayIdolGroup, yesterdayIdolImage, userPosition, userRank, userScore, nextReset, onShareClick } = props;

    const activeGroup = idolActiveGroup && idolActiveGroup.length > 0 ? idolActiveGroup : "Soloist";
    const yesterdayGroup = yesterdayIdolGroup && yesterdayIdolGroup.length > 0 ? yesterdayIdolGroup : "Soloist";

return (
    <div className="relative flex flex-col items-center justify-start w-full sm:w-[628px] sm:h-fit rounded-3xl border-2 border-white/50 
    bg-radial from-[#db3189]/0 to-black/84 mb-10 text-white shadow-[2px_2px_10px_2px_rgba(0,0,0,0.25)]">

        <div className="relative w-full items-center justify-center text-center mt-10 mb-2">
            <span className="text-2xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(255,255,255,0.6)]">Congratulations!</span>
        </div>

        {/* Idol Container */}
        <div className="relative w-full sm:h-[250px] mt-0 mb-5 sm:rounded-t-3xl flex items-center justify-center bg-transparent">
            <div className="absolute flex items-center justify-center sm:w-35 sm:h-35 rounded-[50px] top-5 border-2 border-white/80 
            hover:border-white hover:scale-120 hover:rotate-6 transform duration-1000 will-change-transform 
            shadow-[0_0_20px_4px_rgba(255,255,255,0.1),0_0_40px_10px_rgba(255,255,255,0.1)]">
                <img src={`${import.meta.env.VITE_API_URL}${cardInfo.image_path}`} alt="Idol" className="w-20 h-20 sm:w-34 sm:h-34 rounded-[50px] object-cover object-top transform-gpu" />
            </div>

            <div className="absolute flex flex-col items-center justify-center sm:w-[580px] sm:max-h-20 mt-44">
                <span className="text-base sm:text-[22px]">
                    Today's Idol was <span className="font-bold bg-linear-to-r from-[#db3189] via-[#e44d86] to-[#ec5e65] text-transparent bg-clip-text sm:text-[22px] brightness-105">
                        {cardInfo.artist_name}
                    </span> <span className="font-bold bg-linear-to-r from-[#ec5e65] via-[#e44d86] to-[#db3189] text-transparent bg-clip-text sm:text-[22px] brightness-105">
                            ({activeGroup})
                        </span>
                </span>

                <span className="text-base sm:text-[18px] mt-2">
                    You were the <span className="font-bold bg-linear-to-r from-[#db3189] via-[#e44d86] to-[#ec5e65] text-transparent bg-clip-text brightness-110">
                        {`${userPosition}${userPosition === 1 ? "st" : userPosition === 2 ? "nd" : userPosition === 3 ? "rd" : "th"}`}
                    </span> fan to guess correctly!
                </span>
            </div>
        </div>

        {/* Stats Container */}
        <div className="relative w-full sm:h-25 mb-5 px-6">
            <div className="relative grid grid-cols-3 gap-5">
                    <div className="relative flex flex-col items-center justify-start text-center sm:w-45 sm:h-25 bg-linear-to-br from-[#db3189] to-[#511061] 
                    gap-0.5 rounded-[20px]">
                    <img src={TargetAttempt} alt="M" className="sm:w-6 sm:h-6 mt-2" />
                    <span className="text-[22px] font-bold">
                        {attempts}
                    </span>
                    <p className="text-[14px] font-semibold">
                        {`${attempts === 1 ? "Attempt" : "Attempts"}`}
                    </p>
                </div>

                    <div className="relative flex flex-col items-center justify-start text-center sm:w-45 sm:h-25 bg-linear-to-br from-[#7a4de4] to-[#1f2686] 
                    gap-0.5 rounded-[20px]">
                    <img src={RankPosition} alt="P" className="sm:w-6 sm:h-6 mt-2" />
                    <span className="text-[22px] font-bold">
                        {userRank}
                    </span>
                    <span className="text-[14px] font-semibold">
                        Position
                    </span>
                </div>

                    <div className="relative flex flex-col items-center justify-start text-center sm:w-45 sm:h-25 bg-linear-to-br from-[#ec5e65] to-[#802256] 
                    gap-0.5 rounded-[20px]">
                    <img src={PositionTrend} alt="S" className="sm:w-6 sm:h-6 mt-2" />
                    <span className="text-[22px] font-bold">
                        {userScore?.toFixed(2)}
                    </span>
                    <span className="text-[14px] font-semibold">
                        Score
                    </span>
                </div>
            </div>
        </div>

        {/* Next idol container */}
        <div className="relative w-full sm:h-50 mb-5 px-6">
            <div className="relative w-full h-full items-center justify-center text-center bg-linear-to-r from-gray-600 to-gray-900 
            shadow-[0_0_4px_2px_rgba(0,0,0,0.2),inset_2px_2px_4px_2px_rgba(0,0,0,0.2)] border border-white/35 py-4 rounded-[20px]
            hover:scale-102 hover:brightness-110 hover:bg-linear-to-r transition-all duration-500 transform-gpu">
                <div className="relative w-full h-full flex flex-col items-center justify-between gap-1">
                    <span className="text-2xl font-bold select-none">
                        Yesterday idol was
                    </span>

                    <div className="flex flex-row w-full h-full items-center justify-start ml-20 gap-6">
                        <img src={`${import.meta.env.VITE_API_URL}${yesterdayIdolImage}`} alt="Idol" className="sm:w-28 sm:h-28 rounded-[50px] object-cover object-center hover:scale-105 
                        select-none transition-transform duration-500 will-change-transform transform-gpu" />

                        <div className="text-2xl font-semibold select-none transform-gpu">
                            <span className="bg-linear-to-r from-[#db3189] via-[#e44d86] to-[#ec5e65] text-transparent bg-clip-text brightness-105">
                                {yesterdayIdol}
                            </span> <span className="bg-linear-to-r from-[#ec5e65] via-[#e44d86] to-[#db3189] text-transparent bg-clip-text text-2xl brightness-105">
                                ({yesterdayGroup})
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex w-full h-full items-center justify-center">
                        <p className="text-[14px]">
                            Next idol in {nextReset().formattedTime}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Share Container + Opens small card */}
        <div className="relative w-full sm:h-14 mb-5 px-6">
            <button 
                className="relative w-full h-full items-center justify-center text-center bg-linear-to-b from-[#b43777] to-transparent border border-white/60 
                rounded-xl hover:brightness-105 hover:scale-105 hover:cursor-pointer transition-transform duration-500 transform-gpu" 
                onClick={() => onShareClick?.()}
            >
                <div className="relative flex flex-row w-full h-full items-center justify-center text-center gap-3">
                    <Share2 className="sm:w-6 sm:h-6" />
                    <span className="text-[20px]">Share Results</span>
                </div>
            </button>
        </div>

        {/* Other Game Modes */}
        <div className="relative w-full sm:h-28 mb-5 px-6">
            <div className="relative flex flex-col w-full h-full items-start justify-start text-center gap-1 mt-4">
                <span className="drop-shadow-2xl">Other Game Modes</span>
                
                <div className="relative flex w-full sm:h-17 items-center justify-start text-center px-3.5 bg-transparent 
                border border-white/20 rounded-xl hover:text-white/20 hover:border-white/10 transition-all duration-300">
                    <span className="text-[16px] font-semibold transition-all duration-300">
                        soon...
                    </span>
                </div>
            </div>
        </div>
    </div>
)};

export default VictoryCardBig;

