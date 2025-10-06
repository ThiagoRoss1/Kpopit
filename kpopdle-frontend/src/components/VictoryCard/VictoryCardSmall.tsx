//import React from "react";
import type { GuessedIdolData } from "../../interfaces/gameInterfaces";

interface VictoryCardSmallProps {
    onClose?: () => void;
    cardInfo: GuessedIdolData;
    attempts: number;
    nextReset: () => { timeRemaining: number | null; formattedTime: string; };
}

const VictoryCardSmall = (props: VictoryCardSmallProps) => {
    const { cardInfo, attempts, nextReset, onClose } = props;



return (
    <div className="relative flex flex-col items-center justify-start w-full sm:w-[350px] sm:h-[588px] bg-white/50 rounded-[50px]">
                
                {/* Icons Container */}
                <div className="relative w-full sm:h-25 mb-3">
                    <div className="absolute flex items-center justify-center top-0 right-4 sm:w-10 sm:h-10 rounded-full bg-white/20 mt-2.5">
                        <button className="flex items-center justify-center" onClick={onClose}>
                            <img src="/icons/close-icon.png" alt="Close" className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="absolute flex items-center justify-center top-0 left-1/2 transform -translate-x-1/2 sm:w-16 sm:h-16 rounded-full bg-amber-800 mt-7.5">
                        <img src="/icons/trophy-icon.png" alt="Trophy" className="w-8 h-8 sm:w-12 sm:h-12" />
                    </div>

                    </div>

                    {/* Text Container */}
                    <div className="w-full px-8 sm:px-[52px] mb-3">
                        <div className="flex flex-col items-center text-center gap-4 max-w-[280px] mx-auto">
                            <h2 className="font-bold text-lg sm:text-[20px]">
                                Congratulations! 🎊
                            </h2>
                            <p className="text-base sm:text-[16px] leading-tight">
                                {`You guessed it in ${attempts} ${attempts === 1 ? "try" : "tries"}!`}
                            </p>
                        </div>       
                    </div>

                    {/* Idol Container */}
                    <div className="flex w-full items-center justify-center sm:h-[100px] mb-4">
                        <div className="relative flex items-center justify-center bg-[#a8a8a8]/60 sm:w-80 sm:h-24 sm:p-5 rounded-[20px]">

                            <div className="absolute left-5 flex items-center justify-center sm:h-16 sm:w-16 bg-[#d9d9d9] rounded-[20px]">
                                <img src="/icons/idol-placeholder.png" alt="Idol" className="w-8 h-8 sm:w-12 sm:h-12" />
                            </div>

                            <div className="flex flex-col text-center items-center justify-center w-full gap-0.5">
                                <p className="font-bold text-base sm:text-[20px]">
                                    {cardInfo.artist_name}
                                </p>
                                <p className="text-base sm:text-[16px] leading-tight">
                                    {cardInfo.groups.join(", ") || "Soloist"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Container */}
                    <div className="flex w-full items-center justify-center sm:h-20 mb-4">
                        <div className="flex flex-row items-center justify-between sm:w-80 sm:h-20">
                            <div className="relative flex items-center justify-center text-center bg-[#b4b4b4]/60 sm:w-36 sm:h-20 rounded-[20px]">
                                <div className="flex flex-col items-center justify-center text-center gap-0.5">
                                    <p className="font-bold sm:text-[18px]">
                                        {attempts}
                                    </p>
                                    <p className="text-base sm:text-[16px] leading-tight">
                                        {`${attempts === 1 ? "Attempt" : "Attempts"}`}
                                    </p>
                                </div>
                            </div>

                            <div className="relative flex items-center justify-center text-center bg-[#b4b4b4]/60 sm:w-36 sm:h-20 rounded-[20px]">
                                <div className="flex flex-col items-center justify-center text-center gap-0.5">
                                    <p className="font-bold sm:text-[18px]">
                                        3
                                    </p>
                                    <p className="text-base sm:text-[16px] leading-tight">
                                        On working... (Streak)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Share Container */}
                    <div className="flex w-full items-center justify-center sm:h-29 mb-5">
                        <div className="flex flex-col items-center sm:w-80 sm:h-29">
                            <button className="relative top-0 flex items-center justify-center text-center bg-[#9f9f9f]/60 sm:w-80 sm:h-13 rounded-[16px] mb-4" onClick={() => {console.log("Success")}}>
                                <div className="flex items-center justify-center text-center">
                                    <p className="text-base font-bold sm:text-[20px] leading-tight">
                                        Share Results
                                    </p>
                                </div>
                            </button>

                            <div className="flex flex-row items-center justify-center text-center sm:w-80 sm:h-12 gap-6">
                                <button className="relative left-0 items-center text-center bg-[#747474]/60 sm:w-12 sm:h-12 rounded-[20px]">
                                    <div className="flex items-center justify-center text-center">
                                        <img src="/icons/twitter-icon.png" alt="Twt" className="w-6 h-6 sm:w-9 sm:h-9" />
                                    </div>
                                </button>

                                <button className="relative right-0 items-center text-center bg-[#747474]/60 sm:w-12 sm:h-12 rounded-[20px]">
                                    <div className="flex items-center justify-center text-center">
                                        <img src="/icons/instagram-icon.png" alt="Insta" className="w-6 h-6 sm:w-9 sm:h-9" />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Next idol Container */}
                    <div className="flex w-full items-center justify-center sm:h-5">
                        <div className="flex flex-row items-center justify-center text-center sm:w-48 sm:h-5 gap-1">
                            <p className="text-base text-[16px]">
                                Next idol in 
                            </p>
                            <p className="text-base font-bold text-[16px]">
                                {nextReset().formattedTime}
                            </p>
                        </div>
                    </div>
    </div>
)};

export default VictoryCardSmall;