//import React from "react";
import type { GuessedIdolData } from "../../interfaces/gameInterfaces";
import GlassSurface from "../GlassSurface";
import trophyIcon from "../../assets/icons/trophy.svg";
import InstagramLogo from "../../assets/icons/instagram.svg";
import TwitterLogo from "../../assets/icons/twitter.svg";
import { X } from 'lucide-react';

interface VictoryCardSmallProps {
    onClose?: () => void;
    cardInfo: GuessedIdolData;
    attempts: number;
    nextReset: () => { timeRemaining: number | null; formattedTime: string; };
}

const VictoryCardSmall = (props: VictoryCardSmallProps) => {
    const { cardInfo, attempts, nextReset, onClose } = props;


return (
    <GlassSurface
        width={350}
        height={588}
        borderRadius={50}
        backgroundOpacity={0.1}
        borderWidth={0.04}
        brightness={50}
        opacity={0.93}
        blur={11}
        displace={2}
        saturation={1}
        distortionScale={-180}
        redOffset={0}
        greenOffset={10}
        blueOffset={20}
        xChannel="R"
        yChannel="G"
        mixBlendMode="normal" 
        className="mb-10 sm:w-0.5 will-change-transform"
    
    >
    <div className="relative flex flex-col items-center justify-start w-full sm:w-[350px] sm:h-[588px] bg-radial brightness-115">
                            
                {/* Icons Container */}
                <div className="relative w-full sm:h-25 mb-2">
                    <div className="absolute flex items-center justify-center top-0 right-4 sm:w-10 sm:h-10 rounded-full bg-transparent mt-2.5">
                        <button className="flex items-center justify-center hover:scale-115 w-full h-full transform duration-500 hover:brightness-110 transform-gpu" onClick={onClose}>
                            <X size={20} color="white" strokeWidth={3} absoluteStrokeWidth className="sm:w-5 sm:h-5 opacity-50 hover:opacity-100 transform duration-500 transform-gpu" />
                        </button>
                    </div>
                    
                    <div className="absolute flex items-center justify-center top-0 left-1/2 transform -translate-x-1/2 sm:w-16 sm:h-16 rounded-full mt-7.5">
                        <div className="hover:scale-105 transform duration-1000">
                            <img src={trophyIcon} alt="Trophy" className="w-8 h-8 sm:w-12 sm:h-12" draggable={false}/>
                        </div>
                        
                    </div>

                    </div>

                    {/* Text Container */}
                    <div className="w-full px-8 sm:px-[52px] mb-3">
                        <div className="flex flex-col items-center text-center gap-3 max-w-[280px] mx-auto hover:cursor-default">
                            <h2 className="relative font-bold text-lg sm:text-[24px] flex items-center justify-center">
                                <span className="bg-linear-to-r from-[#b43777] to-[#ce757a] bg-clip-text text-transparent drop-shadow-xl/50 brightness-105">
                                    Congratulations!
                                </span>
                                 <span className="ml-1 drop-shadow-lg">🎊</span>
                            </h2>
                            <p className="font-semibold sm:text-[18px] leading-tight">
                                <span 
                                className="bg-white text-transparent bg-clip-text drop-shadow-xl/50">
                                    You guessed it in 
                                </span> <span 
                                className="bg-[#ce757a] bg-clip-text text-transparent drop-shadow-xl/50 brightness-120 hover:brightness-150 hover:cursor-default">
                                    {`${attempts} ${attempts === 1 ? "try" : "tries"}!`}
                                </span>
                            </p>
                        </div>       
                    </div>

                    {/* Idol Container */}
                    <div className="flex w-full items-center justify-center sm:h-[100px] mb-4">
                        <div className="relative flex items-center justify-center bg-white/2 sm:w-80 sm:h-24 sm:p-5 rounded-[20px]
                        hover:scale-105 hover:bg-black/70 hover:brightness-110 hover:cursor-default transform duration-300 transform-gpu"> {/* Maybe shadow-2xl or lg */}

                            <div className="absolute left-5 flex items-center justify-center sm:h-20 sm:w-20 bg-transparent rounded-[20px] hover:scale-110 hover:rotate-4 transition-transform duration-500 will-change-transform transform-gpu">
                                <img src={`${import.meta.env.VITE_API_URL}${cardInfo.image_path}`} alt="Idol" className="w-full h-full rounded-[20px] object-cover object-top transform-gpu" draggable={false} />
                            </div>

                            <div className="ml-20 flex flex-col text-center items-center justify-center w-full gap-0.5">
                                <p className="font-bold text-base sm:text-[22px] bg-linear-to-b from-[#b43777] to-[#ce757a] shadow-2xl drop-shadow-2xl text-transparent bg-clip-text transform-gpu backface-visibility-hidden">
                                    {cardInfo.artist_name}
                                </p>
                                <p className="text-base sm:text-[16px] leading-tight bg-linear-to-b from-[#ce757a] to-white brightness-105 text-transparent bg-clip-text">
                                    ({cardInfo.groups.join(", ")|| "Soloist"})
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Container */}
                    <div className="flex w-full items-center justify-center sm:h-20 mb-4">
                        <div className="flex flex-row items-center justify-between sm:w-80 sm:h-20">
                            <div className="relative flex items-center justify-center text-center bg-white/2 sm:w-36 sm:h-20 rounded-[20px] 
                            hover:scale-105 hover:bg-black/60 hover:brightness-110 hover:cursor-default transform duration-300 shadow-2xl transform-gpu">
                                <div className="flex flex-col items-center justify-center text-center gap-0.5">
                                    <p className="font-bold sm:text-[18px] text-[#ce757a] brightness-105">
                                        {attempts}
                                    </p>
                                    <p className="text-base sm:text-[16px] leading-tight bg-linear-to-b from-white to-[#ce757a] brightness-105 
                                    text-transparent bg-clip-text">
                                        {`${attempts === 1 ? "Attempt" : "Attempts"}`}
                                    </p>
                                </div>
                            </div>

                            <div className="relative flex items-center justify-center text-center bg-white/2 sm:w-36 sm:h-20 rounded-[20px] 
                            hover:scale-105 hover:bg-black/60 hover:brightness-110 hover:cursor-default transform duration-300 shadow-2xl transform-gpu">
                                <div className="flex flex-col items-center justify-center text-center gap-0.5">
                                    <p className="font-bold sm:text-[18px] text-[#ce757a] brightness-105">
                                        3
                                    </p>
                                    <p className="text-base sm:text-[16px] leading-tight bg-linear-to-b from-white to-[#ce757a] brightness-105 
                                    text-transparent bg-clip-text">
                                        On working... (Streak)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Share Container */}
                    <div className="flex w-full items-center justify-center sm:h-29 mb-5">
                        <div className="flex flex-col items-center sm:w-80 sm:h-29">
                            <button className="relative top-0 flex items-center justify-center text-center bg-black/80 sm:w-80 sm:h-13 rounded-2xl mb-4
                            hover:scale-105 hover:brightness-110 hover:bg-black/0 transform duration-300 shadow-2xl hover:shadow-[0px] hover:cursor-pointer transform-gpu" 
                            onClick={() => {console.log("Success")}}>
                                <div className="flex items-center justify-center text-center">
                                    <p className="text-base font-bold sm:text-[20px] leading-tight bg-linear-to-r from-[#b43777] to-[#ce757a] brightness-105
                                    text-transparent bg-clip-text transform-gpu">
                                        Share Results
                                    </p>
                                </div>
                            </button>

                            <div className="flex flex-row items-center justify-center text-center sm:w-80 sm:h-12 gap-6">
                                <button className="relative left-0 items-center text-center bg-linear-to-r from-black/70 to-black/30 sm:w-12 sm:h-12 rounded-[20px] 
                                hover:scale-110 hover:brightness-110 hover:cursor-pointer hover:rotate-3 hover:bg-black transform duration-300 transform-gpu">
                                    <div className="flex w-full h-full items-center justify-center text-center brightness-100 hover:brightness-110 transform duration-300">
                                        <img src={TwitterLogo} alt="Twt" className="w-6 h-6 sm:w-9 sm:h-9" draggable={false} />
                                    </div>
                                </button>

                                <button className="relative right-0 items-center text-center bg-linear-to-r from-black/30 to-black/70 sm:w-12 sm:h-12 rounded-[20px]
                                hover:scale-110 hover:brightness-110 hover:cursor-pointer hover:-rotate-3 hover:bg-black transform duration-300 transform-gpu">
                                    <div className="flex w-full h-full items-center justify-center text-center brightness-100 hover:brightness-110">
                                        <img src={InstagramLogo} alt="Insta" className="w-6 h-6 sm:w-9 sm:h-9" draggable={false} />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Next idol Container */}
                    <div className="flex w-full items-center justify-center sm:h-5">
                        <div className="flex flex-row items-center justify-center text-center sm:w-48 sm:h-5 gap-1 hover:cursor-default">
                            <p className="text-base text-[16px] text-[#ce757a] brightness-105">
                                Next idol in 
                            </p>
                            <p className="text-base font-bold text-[16px] text-white brightness-105">
                                {nextReset().formattedTime}
                            </p>
                        </div>
                    </div>
 
    </div>
    </GlassSurface>
)};

export default VictoryCardSmall;