//import React from "react";
import type { GuessedIdolData, YesterdayIdol } from "../../interfaces/gameInterfaces";

interface VictoryCardBigProps {
    cardInfo: GuessedIdolData;
    idolActiveGroup?: string[] | null;
    attempts: number;
    yesterdayIdol: string;
    yesterdayIdolGroup?: string[] | null;
    yesterdayIdolImage?: YesterdayIdol["image_path"];
    nextReset: () => { timeRemaining: number | null; formattedTime: string; };
    onShareClick?: () => void;
}

const VictoryCardBig = (props: VictoryCardBigProps) => {
    const { cardInfo, idolActiveGroup, attempts, yesterdayIdol, yesterdayIdolGroup, yesterdayIdolImage, nextReset, onShareClick } = props;

    const activeGroup = idolActiveGroup && idolActiveGroup.length > 0 ? idolActiveGroup : "Soloist";
    const yesterdayGroup = yesterdayIdolGroup && yesterdayIdolGroup.length > 0 ? yesterdayIdolGroup : "Soloist";

return (
    <div className="relative flex flex-col items-center justify-start w-full sm:w-[628px] sm:h-[812px] rounded-3xl bg-white/50 mb-10">

        {/* Idol Container */}
        <div className="relative w-full sm:h-[250px] mt-0 mb-5 bg-[#b7b7b7]/50 sm:rounded-t-3xl flex items-center justify-center">
            <div className="absolute flex items-center justify-center sm:w-31 sm:h-31 rounded-[50px] top-5 border-2 border-white hover:scale-120 hover:rotate-6 transform duration-1000 will-change-transform">
                <img src={`http://127.0.0.1:5000${cardInfo.image_path}`} alt="Idol" className="w-20 h-20 sm:w-30 sm:h-30 rounded-[50px] object-cover object-top transform-gpu" />
            </div>

            <div className="absolute flex flex-col items-center justify-center sm:w-[580px] sm:max-h-[80px] mt-40">
                <p className="text-base sm:text-[20px]">
                    Today's Idol was <span className="font-bold">
                        {cardInfo.artist_name}
                    </span> <span>
                            ({activeGroup})
                        </span>
                </p>

                <p className="text-base sm:text-[18px] mt-5">
                    You were the 115th fan to guess correctly!
                </p>
            </div>
        </div>

        {/* Stats Container */}
        <div className="relative w-full sm:h-25 mb-5 px-6">
            <div className="relative grid grid-cols-3 gap-5">
                <div className="relative flex flex-col items-center justify-start text-center sm:w-45 sm:h-25 bg-[#949494]/50 gap-1 rounded-[20px]">
                    <img src="/icons/mark.png" alt="M" className="sm:w-5 sm:h-5 border border-amber-950 mt-2" />
                    <p className="text-[20px] font-bold">
                        {attempts}
                    </p>
                    <p className="text-[16px] font-semibold">
                        {`${attempts === 1 ? "Attempt" : "Attempts"}`}
                    </p>
                </div>

                <div className="relative flex flex-col items-center justify-start text-center sm:w-45 sm:h-25 bg-[#949494]/50 gap-1 rounded-[20px]">
                    <img src="/icons/position.png" alt="P" className="sm:w-5 sm:h-5 border border-amber-950 mt-2" />
                    <p className="text-[20px] font-bold">
                        2 (ow....)
                    </p>
                    <p className="text-[16px] font-semibold">
                        Position
                    </p>
                </div>

                <div className="relative flex flex-col items-center justify-start text-center sm:w-45 sm:h-25 bg-[#949494]/50 gap-1 rounded-[20px]">
                    <img src="/icons/score.png" alt="S" className="sm:w-5 sm:h-5 border border-amber-950 mt-2" />
                    <p className="text-[20px] font-bold">
                        67 (ow....)
                    </p>
                    <p className="text-[16px] font-semibold">
                        Score
                    </p>
                </div>
            </div>
        </div>

        {/* Next idol container */}
        <div className="relative w-full sm:h-50 mb-5 px-6">
            <div className="relative w-full h-full items-center justify-center text-center bg-[#afafaf]/50 py-4 rounded-[20px]">
                <div className="relative w-full h-full flex flex-col items-center justify-between gap-1">
                    <p className="text-2xl font-bold hover:scale-105 
                        select-none transition-transform duration-500">
                        Yesterday idol was
                    </p>

                    <div className="flex flex-row w-full h-full items-center justify-start ml-20 gap-6">
                        <img src={`http://127.0.0.1:5000${yesterdayIdolImage}`} alt="Idol" className="sm:w-28 sm:h-28 rounded-[15px] object-cover object-center hover:scale-105 
                        select-none transition-transform duration-500 will-change-transform transform-gpu" />

                        <p className="text-2xl font-semibold hover:scale-105 select-none transition-transform duration-500">
                            <span className="text-blue-600">
                                {yesterdayIdol}
                            </span> <span className="font-semibold text-2xl">({yesterdayGroup})</span>
                        </p>
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
        <div className="relative w-full sm:h-[50px] mb-5 px-6">
            <button 
                className="relative w-full h-full items-center justify-center text-center bg-[#696969]/50 rounded-[12px]
                hover:brightness-105 hover:scale-105 hover:cursor-pointer transition-transform duration-500" 
                onClick={() => onShareClick?.()}
            >
                <div className="relative flex flex-row w-full h-full items-center justify-center text-center gap-2">
                    <img src="/icons/share.png" alt="S" className="w-6 h-6" />
                    <span>Share Result</span>
                </div>
            </button>
        </div>

        {/* Other Game Modes */}
        <div className="relative w-full sm:h-28 mb-5 px-6">
            <div className="relative flex flex-col w-full h-full items-start justify-start text-center gap-5">
                <p>Other Game Modes</p>
                
                <div className="relative flex w-full sm:h-17 items-center justify-start text-center px-3.5 bg-[#686868]/50 rounded-[12px]">
                    <p className="text-[16px] font-semibold">
                        soon...
                    </p>
                </div>
            </div>
        </div>
    </div>
)};

export default VictoryCardBig;

