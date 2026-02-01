import type { GuessedIdolData, YesterdayIdol } from "../../../interfaces/gameInterfaces";
import { Link } from "react-router-dom";
import TargetAttempt from "../../../assets/icons/target.svg";
import RankPosition from "../../../assets/icons/ranking-fill.svg";
import PositionTrend from "../../../assets/icons/trending-up.svg";
import { Share2 } from "lucide-react";

interface GameMode {
    id: string;
    name: string;
    path: string;
    won?: boolean;
    photoSpecs?: string;
}

interface BlurryVictoryCardBigProps {
    cardInfo: GuessedIdolData;
    attempts: number;
    idol_blur_image: string;
    yesterdayIdol: string;
    yesterdayIdolImage?: YesterdayIdol["image_path"];
    userPosition?: number | null;
    userRank?: number | null;
    userScore?: number | null;
    nextReset: () => { timeRemaining: number | null; formattedTime: string; };
    onShareClick?: () => void;
    otherGameModes?: GameMode[];
}

const VictoryCardBigBlurry = (props: BlurryVictoryCardBigProps) => {
    const { cardInfo, attempts, idol_blur_image, yesterdayIdol, yesterdayIdolImage, userPosition, userRank, userScore, nextReset, onShareClick, otherGameModes } = props;

    return (
        <div className="relative flex flex-col items-center justify-start
        max-xxs:w-80 xxs:w-92 xs:w-100 xm:w-106 h-fit sm:w-157 sm:h-fit 
        rounded-3xl border-2 border-white/50 bg-black/50 mb-10 text-white 
        shadow-[2px_2px_10px_2px_rgba(0,0,0,0.25)]">

            <div className="relative w-full items-center justify-center text-center mt-10 mb-2">
                <span className="text-2xl sm:text-2xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(255,255,255,0.6)]">
                    Congratulations!
                </span>
            </div>

            {/* Idol Container */}
            <div className="relative w-full h-60 sm:h-62.5 mt-0 max-xxs:mb-0 xxs:mb-0 xs:mb-2 sm:mb-5 rounded-t-3xl sm:rounded-t-3xl flex items-center justify-center bg-transparent">
                <div className="absolute flex items-center justify-center max-xxs:w-24 max-xxs:h-24 xxs:w-27 xxs:h-27 xs:w-30 xs:h-30 sm:w-35 sm:h-35 rounded-[48px] sm:rounded-[50px] top-5 border-2 border-white/80 
                hover:border-white hover:scale-120 hover:rotate-6 transform duration-1000 will-change-transform 
                shadow-[0_0_20px_4px_rgba(255,255,255,0.1),0_0_40px_10px_rgba(255,255,255,0.1)]">
                    <img src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${cardInfo.image_path}`} alt="Idol" className="max-xxs:w-23 max-xxs:h-23 xxs:w-26 xxs:h-26 xs:w-29 xs:h-29 sm:w-34 sm:h-34 rounded-[48px] sm:rounded-[50px] object-cover object-top transform-gpu" draggable={false} />
                </div>

                <div className="absolute flex flex-col items-center justify-center w-full sm:w-145 max-h-20 sm:max-h-20 max-xxs:mt-32 xxs:mt-30 xs:mt-36 sm:mt-44">
                    <span className="max-xxs:text-base xxs:text-base xs:text-base xm:text-[18px] sm:text-[22px] text-center">
                        Today's Idol was <span className="font-bold bg-linear-to-r from-[#db3189] via-[#e44d86] to-[#ec5e65] text-transparent bg-clip-text max-xxs:text-base xxs:text-base xs:text-[18px] sm:text-[22px] brightness-105">
                            {cardInfo.artist_name}
                        </span>
                    </span>

                    <span className="max-xxs:text-[14px] xxs:text-[14px] xs:text-base sm:text-[18px] mt-2 text-center">
                        You were the <span className="font-bold bg-linear-to-r from-[#db3189] via-[#e44d86] to-[#ec5e65] text-transparent bg-clip-text brightness-110">
                            {`${userPosition}${userPosition === 1 ? "st" : userPosition === 2 ? "nd" : userPosition === 3 ? "rd" : "th"}`}
                        </span> fan to guess correctly!
                    </span>
                </div>
            </div>

            {/* Stats Container */}
            <div className="relative w-full h-25 sm:h-25 mb-10 px-4 sm:px-6">
                <div className="relative grid grid-cols-3 gap-5">
                    <div className="relative flex flex-col items-center justify-start text-center max-xxs:h-21.5 xxs:h-21.5 xs:w-27 xs:h-25 xm:w-29 xm:h-25 sm:w-45 sm:h-25 bg-linear-to-br from-[#db3189] to-[#511061] 
                        gap-0.5 rounded-[18px] sm:rounded-[20px]">
                        <img src={TargetAttempt} alt="M" className="max-xxs:w-4 max-xxs:h-4 xxs:w-5 xxs:h-5 xs:w-6 xs:h-6 sm:w-6 sm:h-6 mt-2" draggable={false} /> {/* w-27 */}
                        <span className="max-xxs:text-lg xxs:text-[20px] xs:text-[22px] font-bold">
                            {attempts}
                        </span>
                        <p className="max-xxs:text-[12px] xxs:text-[12px] xs:text-[14px] font-semibold">
                            {`${attempts === 1 ? "Attempt" : "Attempts"}`}
                        </p>
                    </div>

                    <div className="relative flex flex-col items-center justify-start text-center max-xxs:h-21.5 xxs:h-21.5 xs:w-27 xs:h-25 xm:w-29 xm:h-25 sm:w-45 sm:h-25 bg-linear-to-br from-[#7a4de4] to-[#1f2686] 
                        gap-0.5 rounded-[18px] sm:rounded-[20px]">
                        <img src={RankPosition} alt="P" className="max-xxs:w-4 max-xxs:h-4 xxs:w-5 xxs:h-5 xs:w-6 xs:h-6 sm:w-6 sm:h-6 mt-2" draggable={false} />
                        <span className="max-xxs:text-lg xxs:text-[20px] xs:text-[22px] font-bold">
                            {userRank}
                        </span>
                        <span className="max-xxs:text-[12px] xxs:text-[12px] xs:text-[14px] font-semibold">
                            Position
                        </span>
                    </div>

                    <div className="relative flex flex-col items-center justify-start text-center max-xxs:h-21.5 xxs:h-21.5 xs:w-27 xs:h-25 xm:w-29 xm:h-25 sm:w-45 sm:h-25 bg-linear-to-br from-[#ec5e65] to-[#802256] 
                        gap-0.5 rounded-[18px] sm:rounded-[20px]">
                        <img src={PositionTrend} alt="S" className="max-xxs:w-4 max-xxs:h-4 xxs:w-5 xxs:h-5 xs:w-6 xs:h-6 sm:w-6 sm:h-6 mt-2" draggable={false} />
                        <span className="max-xxs:text-lg xxs:text-[20px] xs:text-[22px] font-bold">
                            {userScore?.toFixed(2)}
                        </span>
                        <span className="max-xxs:text-[12px] xxs:text-[12px] xs:text-[14px] font-semibold">
                            Score
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Idol image */}
            <div className="relative flex flex-row items-center justify-center w-full h-64 mb-5">
                <div className="hidden absolute sm:flex items-center justify-center bg-transparent border-2 border-white
                w-fit h-64 sm:w-50 sm:h-64 rounded-[46px] overflow-hidden -rotate-8 z-0 left-40 opacity-30 mb-4">
                {/* hover:opacity-100 hover:z-30 hover:scale-105 transition-all duration-500 transform-gpu - see it later*/}
                    <img
                        src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${idol_blur_image}`}
                        alt={`Blurry image of ${cardInfo.artist_name}`}
                        draggable={false}
                        className="w-50 h-64 sm:w-50 sm:h-64 object-cover" 
                    />
                </div>

                <div className="absolute flex items-center justify-center bg-transparent border-2 border-white
                w-fit h-64 sm:w-50 sm:h-64 rounded-[46px] overflow-hidden z-20 mb-4
                hover:scale-110 hover:z-30 hover:brightness-110 hover:cursor-pointer transition-all duration-500 transform-gpu">
                    <img
                        src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${idol_blur_image}`}
                        alt={`Blurry image of ${cardInfo.artist_name}`}
                        draggable={false}
                        className="w-50 h-64 sm:w-50 sm:h-64 object-cover" 
                    />
                </div>

                <div className="hidden absolute sm:flex items-center justify-center bg-transparent border-2 border-white
                w-fit h-64 sm:w-50 sm:h-64 rounded-[46px] overflow-hidden rotate-8 z-0 right-40 opacity-30 mb-4">
                {/* hover:opacity-100 hover:z-30 hover:scale-105 transition-all duration-500 transform-gpu - see it later */}
                    <img
                        src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${idol_blur_image}`}
                        alt={`Blurry image of ${cardInfo.artist_name}`}
                        draggable={false}
                        className="w-50 h-64 sm:w-50 sm:h-64 object-cover" 
                    />
                </div>
            </div>
            
            {/* Yesterday's idol container */}
            {yesterdayIdol && yesterdayIdolImage && (
            <div className="relative w-full h-fit sm:h-50 mb-5 px-4 sm:px-6">
                <div className="relative w-full h-full items-center justify-center sm:text-center bg-linear-to-r from-gray-600 to-gray-900 
                shadow-[0_0_4px_2px_rgba(0,0,0,0.2),inset_2px_2px_4px_2px_rgba(0,0,0,0.2)] border border-white/35 py-2 sm:py-4 rounded-[20px] overflow-hidden
                hover:scale-102 hover:brightness-110 hover:bg-linear-to-r transition-all duration-500 transform-gpu">
                    <div className="relative w-full h-full flex flex-col items-center justify-between gap-1">
                        <span className="max-xxs:text-lg xxs:text-lg xs:text-xl sm:text-2xl font-bold select-none">
                            Yesterday idol was
                        </span>

                        <div className="flex flex-row w-full h-full items-center justify-start max-xxs:pr-0 pl-8 sm:pl-12 max-xxs:gap-2 xxs:gap-4 sm:gap-8">
                            <img src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${yesterdayIdolImage}`} alt="Idol" className="max-xxs:w-16 max-xxs:h-16 xxs:w-20 xxs:h-20 xs:w-22 xs:h-22 sm:w-28 sm:h-28 rounded-full sm:rounded-full object-cover object-center hover:scale-105 
                            select-none border-b-4 border-r-4 border-black/30 transition-transform duration-500 will-change-transform transform-gpu" draggable={false} />

                            <div className="max-xxs:text-lg xxs:text-xl xm:text-xl sm:text-2xl font-semibold select-none transform-gpu ml-4 sm:ml-0">
                                <span className="bg-linear-to-r from-[#db3189] via-[#e44d86] to-[#ec5e65] text-transparent bg-clip-text brightness-105">
                                    {yesterdayIdol}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex w-full h-full items-center justify-center">
                            <span className="max-xxs:text-[12px] xxs:text-[12px] xs:text-[14px] sm:text-base">
                                Next idol in {nextReset().formattedTime}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Share Container + Opens small card */}
            <div className="relative w-full h-12 sm:h-14 mb-5 px-4 sm:px-6">
                <button 
                    className="relative w-full h-full items-center justify-center text-center bg-linear-to-b from-transparent to-transparent border border-white/60 
                    rounded-xl hover:bg-black hover:brightness-105 hover:scale-105 hover:cursor-pointer transition-transform duration-500 transform-gpu" 
                    onClick={() => onShareClick?.()}
                >
                    <div className="relative flex flex-row w-full h-full items-center justify-center text-center gap-3">
                        <Share2 className="max-xxs:w-4 max-xxs:h-4 xxs:w-4 xxs:h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6" />
                        <span className="max-xxs:text-base xxs:text-base xs:text-[18px] sm:text-xl">Share Results</span>
                    </div>
                </button>
            </div>

            {/* Other Game Modes */}
            <div className="relative w-full sm:h-fit mb-5 px-4 sm:px-6">
                <div className="relative flex flex-col w-full h-full items-start justify-start text-center gap-1 mt-4">
                    <span className="text-[14px] sm:text-base drop-shadow-2xl">Other Game Modes</span>
                    
                    <div className="relative flex w-full h-fit sm:h-fit items-center justify-start text-center px-3.5 bg-transparent 
                    border border-white/60 rounded-xl transition-all duration-300">
                            {otherGameModes && otherGameModes.length > 0 ? (
                                otherGameModes.map((mode) => (
                                    <Link key={mode.id} to={mode.path}>
                                        <div 
                                            className={`flex w-16 h-16 mt-2 mb-2 rounded-2xl items-center justify-center 
                                        text-center border border-r-4 border-b-4 border-white/30
                                        hover:scale-105 hover:cursor-pointer active:scale-95 ease-[cubic-bezier(0.34,1.56,0.64,1)] transition-all duration-500 transform-gpu
                                        ${mode.won ? "opacity-50" : "opacity-100"}`}
                                        >
                                            <img
                                                src="/kpopit-icon.png"
                                                alt="Kpopit Icon"
                                                draggable={false}
                                                className="w-12 h-12 sm:w-12 sm:h-12 object-contain"
                                            />
                                            <span className="absolute text-white font-semibold text-sm [text-shadow:1px_1px_4px_rgba(0,0,0,0.7)]">{mode.name}</span>
                                        </div>
                                    </Link>
                                ))
                            ) : null}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default VictoryCardBigBlurry;