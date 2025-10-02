//import React from "react";
import type { GuessedIdolData } from "../../interfaces/gameInterfaces";

interface VictoryCardHudProps {
    onClose?: () => void;
    cardinfo: GuessedIdolData;
    attempts: number;
    yesterdayidol: string;
    nextreset: () => { timeRemaining: number | null; formattedTime: string; };
}

const VictoryCardHudProps = (props: VictoryCardHudProps) => {
    const { attempts, nextreset, onClose } = props;



return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center">
        <div className="min-h-screen flex items-center justify-center w-full sm:max-w-[370px] sm:max-h-[608px] mx-auto pt-20 pb-20">
            <div className="relative flex flex-col items-center justify-start w-full sm:w-[350px] sm:h-[588px] bg-white/50 rounded-4xl pt-2.5">
                
                {/* Icons Container */}
                <div className="relative w-full h-26 mb-3 border border-white">
                    <div className="absolute flex items-center justify-center top-0 right-4 sm:w-10 sm:h-10 rounded-full bg-white/20">
                        <button className="flex items-center justify-center" onClick={onClose}>
                            <img src="/icons/close-icon.png" alt="Close" className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="absolute flex items-center justify-center top-0 left-1/2 transform -translate-x-1/2 sm:w-16 sm:h-16 rounded-full bg-amber-800 mt-8">
                        <img src="/icons/trophy-icon.png" alt="Trophy" className="w-8 h-8" />
                    </div>

                    </div>

                    {/* Text Container */}
                    <div className="w-full border border-white px-8 sm:px-[52px]">
                        <div className="flex flex-col items-center text-center gap-4 max-w-[280px] mx-auto">
                            <h2 className="font-bold text-lg sm:text-[20px]">
                                Congratulations! 🎊
                            </h2>
                            <p className="text-base sm:text-[16px] leading-tight">
                                You guessed it in {attempts} tries!
                            </p>
                            <p>{nextreset().formattedTime}</p>

                        </div>
                        
                    </div>


                
            

            </div>

        </div>
    </div>


)};



{/* <div>    bg-black/20 backdrop-blur-sm
        <form>
            <ul>
                <li>{cardinfo.artist_name}</li>
                <li>Congratulations!</li>
                <li>Attempts: {attempts}!</li>
                <li>Yesterday's Idol: {yesterdayidol}</li>
            </ul>
        </form>
    </div> */}















export default VictoryCardHudProps;