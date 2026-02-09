//import React from "react";
import type {  FeedbackData, GuessedIdolData, GuessResponse, UserStats } from "../../interfaces/gameInterfaces";
import { useIsMobile, isSafari, isGeckoEngine } from "../../hooks/useIsDevice";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import GlassSurface from "../GlassSurface";
import trophyIcon from "../../assets/icons/trophy.svg";
import TwitterLogo from "../../assets/icons/twitter.svg";
import { X, Download } from 'lucide-react';

interface VictoryCardSmallProps<T = FeedbackData> {
    onClose?: () => void;
    cardInfo: GuessedIdolData;
    guesses?: GuessResponse<T>[];
    attempts: number;
    stats: UserStats | undefined;
    userRank?: number | null;
    userScore?: number | null;
    nextReset: () => { timeRemaining: number | null; formattedTime: string; };
    gameMode: 'classic' | 'blurry' | null;
    wonWithHardMode?: boolean;
    wonWithoutColors?: boolean;
}

const VictoryCardSmall = <T = FeedbackData, >(props: VictoryCardSmallProps<T>) => {
    const { guesses, cardInfo, attempts, stats, userRank, userScore, nextReset, onClose, gameMode, wonWithHardMode, wonWithoutColors } = props;

    const [copied, setCopied] = useState<boolean>(false);
    const [downloaded, setDownloaded] = useState<boolean>(false);

    const isOnMobile = useIsMobile();

    const getStatusEmoji = (status: string) => {
    switch (status) {
        case "correct":
            return "🟩";
        case "partial":
            return "🟨";
        default:
            return "🟥";
        }
    }

    const textToCopyCategories = (guesses: GuessResponse[], attempts?: number) => {
        const header = `I found today's #KpopIt Idol in ${attempts} ${attempts === 1 ? "attempt" : "attempts"}! 🎤\n\n`;
        const body = [...guesses].reverse().map(guess => {

        return categories.map(category  => getStatusEmoji(guess.feedback[category]?.status)).join('');
        }).join('\n');

        const siteLink = `\n\n${window.location.href}`;

        return header + body + siteLink;
    };

    const textToCopyCategoriesBlurry = (attempts?: number) => {
        const header = `I found today's #KpopIt Blurry Idol in ${attempts} ${attempts === 1 ? "attempt" : "attempts"}! 🎤\n\n`;
        const bodyHardmode = `Hardmode ${wonWithHardMode ? "✅" : "❌"}\n`;
        const bodyGrayscale = `Grayscale ${wonWithoutColors ? "✅" : "❌"}`;
        const siteLink = `\n\n${window.location.href}`;

        return header + bodyHardmode + bodyGrayscale + siteLink;
        
    };

    const categories = ["groups", "companies", "nationality", "birth_date", "idol_debut_year", "height", "position"] as const;

    const handleCopy = () => {
        if (gameMode === 'blurry')
            navigator.clipboard.writeText(textToCopyCategoriesBlurry(attempts));
        else {
            navigator.clipboard.writeText(textToCopyCategories(guesses as GuessResponse<FeedbackData>[], attempts));
        }

        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
    }

    const textToCopy = (attempts: number, stats: UserStats | undefined, userRank?: number | null, userScore?: number | null) => {
        const header = `I found today's #KpopIt ${gameMode === 'blurry' ? 'blurry ' : ''}Idol in ${attempts} ${attempts === 1 ? "attempt" : "attempts"}! 🎤\n\n`;
        const body = `My statistics:\nPosition: ${userRank}\nScore: ${userScore?.toFixed(2)}\nStreak: ${stats?.current_streak}`;
        const siteLink = `\n\n${window.location.href}`;

        return header + body + siteLink;
    };

    const shareOnTwitter = (attempts: number, stats: UserStats | undefined, userRank?: number | null, userScore?: number | null) => {
        const text = encodeURIComponent(textToCopy(attempts, stats, userRank, userScore));
        const twitterWebIntentUrl = `https://twitter.com/intent/tweet?text=${text}`;

        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
            const twitterAppUrl = `twitter://post?message=${text}`;
            const now = Date.now();
            window.location.href = twitterAppUrl;
            setTimeout(() => {
                if (Date.now() - now < 1000) {
                    window.open(twitterWebIntentUrl, '_blank', "noopener,noreferrer");
                }
            }, 800);
        } else {
            window.open(twitterWebIntentUrl, "_blank", "noopener,noreferrer");
        };
    };

    const handleWip = () => {
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 1000);
    }

    const content = (
        <div className="relative flex flex-col items-center justify-start max-xxs:w-[320px] max-xxs:h-150 xxs:w-85 xxs:h-142.5 xs:w-87.5 xs:h-147 sm:w-87.5 sm:h-147 bg-radial brightness-115">
                            
                {/* Icons Container */}
                <div className="relative w-full h-25 sm:h-25 mb-2">
                    <div className="absolute flex items-center justify-center top-0 right-4 w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-transparent mt-2.5">
                        <button className="flex items-center justify-center hover:scale-115 w-full h-full transform duration-500 hover:brightness-110 transform-gpu hover:cursor-pointer" onClick={onClose}>
                            <X size={20} color="white" strokeWidth={3} absoluteStrokeWidth className="w-5 h-5 sm:w-5 sm:h-5 opacity-50 hover:opacity-100 transform duration-500 transform-gpu" />
                        </button>
                    </div>
                    
                    <div className="absolute flex items-center justify-center top-0 left-1/2 transform -translate-x-1/2 w-16 h-16 sm:w-16 sm:h-16 rounded-full mt-7.5">
                        <div className="hover:scale-105 transform duration-1000">
                            <img src={trophyIcon} alt="Trophy" className="w-12 h-12 sm:w-12 sm:h-12" draggable={false}/>
                        </div>
                        
                    </div>

                    </div>

                    {/* Text Container */}
                    <div className="w-full px-13 sm:px-13 mb-3">
                        <div className="flex flex-col items-center text-center gap-3 max-w-70 mx-auto hover:cursor-default">
                            <h2 className="relative font-bold text-lg text-[24px] sm:text-[24px] flex items-center justify-center">
                                <span className="bg-linear-to-r from-[#b43777] to-[#ce757a] bg-clip-text text-transparent drop-shadow-xl/50 brightness-105">
                                    Congratulations!
                                </span>
                                 <span className="ml-1 drop-shadow-lg">🎊</span>
                            </h2>
                            <span className="font-semibold text-[18px] sm:text-[18px] leading-tight">
                                <span 
                                className="bg-white text-transparent bg-clip-text drop-shadow-xl/50">
                                    You guessed it in 
                                </span> <span 
                                className="bg-[#ce757a] bg-clip-text text-transparent drop-shadow-xl/50 brightness-120 hover:brightness-150 hover:cursor-default">
                                    {`${attempts} ${attempts === 1 ? "try" : "tries"}!`}
                                </span>
                            </span>
                        </div>       
                    </div>

                    {/* Idol Container */}
                    <div className="flex w-full items-center justify-center h-25 sm:h-25 mb-4">
                        <div className={`relative flex items-center justify-center ${isOnMobile ? "bg-black/80" : "bg-black/70"} max-xxs:w-75 max-xxs:h-24 xxs:w-80 xxs:h-24 p-5 sm:w-80 sm:h-24 sm:p-5 rounded-[20px]
                        hover:scale-105 hover:bg-black hover:brightness-110 hover:cursor-default transform duration-300 transform-gpu`}> {/* Maybe shadow-2xl or lg */}

                            <div className="absolute left-5 flex items-center justify-center h-20 w-20 sm:h-20 sm:w-20 bg-transparent rounded-[20px] hover:scale-110 hover:rotate-4 transition-transform duration-500 will-change-transform transform-gpu">
                                <img src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${cardInfo.image_path}`} alt="Idol" className="w-20 h-20 sm:w-full sm:h-full rounded-[20px] object-cover object-top transform-gpu" draggable={false} />
                            </div>

                            <div className="ml-20 flex flex-col text-center items-center justify-center w-full gap-0.5">
                                <p className="font-bold text-[20px] sm:text-[22px] bg-linear-to-b from-[#b43777] to-[#ce757a] shadow-2xl drop-shadow-2xl text-transparent bg-clip-text transform-gpu backface-visibility-hidden">
                                    {cardInfo.artist_name}
                                </p>
                                <p className="text-base sm:text-[16px] leading-tight bg-linear-to-b from-[#ce757a] to-white brightness-105 text-transparent bg-clip-text">
                                    {cardInfo.groups && cardInfo.groups.length > 0 ? `(${cardInfo.groups.join(", ")})` : ""}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Container */}
                    <div className="flex w-full items-center justify-center h-20 sm:h-20 mb-4">
                        <div className="flex flex-row items-center justify-between max-xxs:px-3 xxs:px-0 w-80 h-20 sm:w-80 sm:h-20">
                            <div className={`relative flex items-center justify-center text-center ${isOnMobile ? "bg-black/80" : "bg-black/70"} max-xxs:w-30 max-xxs:h-20 xxs:w-36 xxs:h-20 sm:w-36 sm:h-20 rounded-[20px] 
                            hover:scale-105 hover:bg-black hover:brightness-110 hover:cursor-default transform duration-300 shadow-2xl transform-gpu`}>
                                <div className="flex flex-col items-center justify-center text-center gap-0.5">
                                    <p className="font-bold text-base sm:text-[18px] text-[#ce757a] brightness-105">
                                        {attempts}
                                    </p>
                                    <p className="text-base sm:text-[16px] leading-tight bg-linear-to-b from-white to-[#ce757a] brightness-105 
                                    text-transparent bg-clip-text">
                                        {`${attempts === 1 ? "Attempt" : "Attempts"}`}
                                    </p>
                                </div>
                            </div>

                            <div className={`relative flex items-center justify-center text-center ${isOnMobile ? "bg-black/80" : "bg-black/70"} max-xxs:w-30 max-xxs:h-20 xxs:w-36 xxs:h-20 sm:w-36 sm:h-20 rounded-[20px] 
                            hover:scale-105 hover:bg-black hover:brightness-110 hover:cursor-default transform duration-300 shadow-2xl transform-gpu`}>
                                <div className="flex flex-col items-center justify-center text-center gap-0.5">
                                    <span className="font-bold text-base sm:text-[18px] text-[#ce757a] brightness-105">
                                        {stats?.current_streak}
                                    </span>
                                    <span className="text-base sm:text-[16px] leading-tight bg-linear-to-b from-white to-[#ce757a] brightness-105 
                                    text-transparent bg-clip-text">
                                        Streak
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Share Container */}
                    <div className="flex w-full items-center justify-center h-29 sm:h-29 mb-5">
                        <div className="flex flex-col items-center w-80 h-29 sm:w-80 sm:h-29">
                            <button className="relative top-0 flex items-center justify-center text-center bg-black max-xxs:w-75 max-xxs:h-13 xxs:w-80 xxs:h-13 sm:w-80 sm:h-13 rounded-2xl mb-4
                            hover:scale-105 hover:brightness-110 hover:bg-black/0 transform duration-300 shadow-2xl hover:shadow-[0px] hover:cursor-pointer transform-gpu" 
                            onClick={() => handleCopy()}>
                                <div className="flex items-center justify-center text-center">
                                    <span className="text-[18px] font-bold sm:text-[20px] leading-tight bg-linear-to-r from-[#b43777] to-[#ce757a] brightness-105
                                    text-transparent bg-clip-text transform-gpu">
                                        Copy Results
                                    </span>
                                </div>
                            </button>
                            <AnimatePresence>
                                {copied && (
                                    <motion.div 
                                        key="copy-notification"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                        exit={{ opacity: 0, y: 20 }}
                                        className="absolute flex max-xxs:bottom-46 max-xxs:left-19 xxs:bottom-44 xs:bottom-48 xxs:left-22 justify-center items-center w-44 h-7 sm:w-44 sm:h-7">
                                            <div className="flex justify-center items-center bg-transparent w-42 h-7 sm:w-42 sm:h-7 rounded-xl border border-[#ce757a]
                                            shadow-[0_0_10px_2px_rgba(206,117,122,0.25),0_0_10px_2px_rgba(206,117,122,0.25)]">
                                                <span className="relative font-medium text-base leading-tight bg-linear-to-r from-[#b43777] to-[#ce757a] brightness-105
                                                text-transparent bg-clip-text drop-shadow-lg">
                                                    Results Copied!
                                                </span>
                                            </div>
                                    </motion.div>                   
                                )}
                            </AnimatePresence>

                            <div className="flex flex-row items-center justify-center text-center w-80 h-12 sm:w-80 sm:h-12 gap-6">
                                <button className={`relative left-0 items-center text-center bg-linear-to-r ${isOnMobile ? "from-black/90 to-black/50" : "from-black/90 to-black/30"} w-12 h-12 sm:w-12 sm:h-12 rounded-[20px] 
                                hover:scale-110 hover:brightness-110 hover:cursor-pointer hover:rotate-3 hover:bg-black transform duration-300 transform-gpu`}
                                onClick={() => shareOnTwitter(attempts, stats, userRank, userScore)}>
                                    <div className="flex w-full h-full items-center justify-center text-center brightness-100 hover:brightness-110 transform duration-300">
                                        <img src={TwitterLogo} alt="Twt" className="w-8 h-8 sm:w-9 sm:h-9" draggable={false} />
                                    </div>
                                </button>

                                <button className={`relative right-0 items-center text-center bg-linear-to-r ${isOnMobile ? "from-black/90 to-black/50" : "from-black/30 to-black/90"} w-12 h-12 sm:w-12 sm:h-12 rounded-[20px]
                                hover:scale-110 hover:brightness-110 hover:cursor-pointer hover:-rotate-3 hover:bg-black transform duration-300 transform-gpu`}>
                                    <div className="flex w-full h-full items-center justify-center text-center brightness-100 hover:brightness-110"
                                    onClick={() => handleWip()}>
                                        <Download size={30} color="#ce757a" className="w-8 h-8 sm:w-9 sm:h-9" />
                                        {/* <img src={InstagramLogo} alt="Insta" className="w-8 h-8 sm:w-9 sm:h-9" draggable={false} /> */}
                                    </div>
                                </button>
                                <AnimatePresence>
                                {downloaded && (
                                    <motion.div 
                                        key="download-notification"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                        exit={{ opacity: 0, y: 20 }}
                                        className="absolute flex max-xxs:bottom-28 max-xxs:left-27 xxs:bottom-26 xs:bottom-30 xxs:left-30 justify-center items-center w-44 h-7 sm:w-44 sm:h-7">
                                            <div className="flex justify-center items-center bg-transparent w-42 h-7 sm:w-42 sm:h-7 rounded-xl border border-[#ce757a]
                                            shadow-[0_0_10px_2px_rgba(206,117,122,0.25),0_0_10px_2px_rgba(206,117,122,0.25)]">
                                                <span className="relative font-medium text-base leading-tight bg-linear-to-r from-[#b43777] to-[#ce757a] brightness-105
                                                text-transparent bg-clip-text drop-shadow-lg">
                                                    Work in progress!
                                                </span>
                                            </div>
                                    </motion.div>                   
                                )}
                            </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Next idol Container */}
                    <div className="flex w-full items-center justify-center h-5 sm:h-5">
                        <div className="flex flex-row items-center justify-center text-center w-48 h-5 sm:w-48 sm:h-5 gap-1 hover:cursor-default">
                            <p className="text-base text-[16px] text-[#ce757a] brightness-105">
                                Next idol in 
                            </p>
                            <p className="text-base font-bold text-[16px] text-white brightness-105">
                                {nextReset().formattedTime}
                            </p>
                        </div>
                    </div>
 
    </div>
    )

return (
    <>    
    {!isOnMobile && !isSafari && !isGeckoEngine ? (
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
            {content}   
        </GlassSurface>
    ) : (
        <div className="relative flex flex-col w-full h-fit bg-gray-900 rounded-[50px] border border-white">
            {content}
        </div>
    )}
    </>

)};

export default VictoryCardSmall;