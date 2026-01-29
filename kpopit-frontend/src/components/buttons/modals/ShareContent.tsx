import { useState } from "react";
import type { GuessResponse } from '../../../interfaces/gameInterfaces';
import { Copy } from "lucide-react";
import Twitter from "../../../assets/icons/twitter-white.svg";
import { AnimatePresence, motion } from "motion/react";

interface ShareContentProps {
    guesses: GuessResponse[];
    hasWon: boolean;
    attempts?: number;
    gameMode: 'classic' | 'blurry' | null;
    wonWithHardMode?: boolean;
    wonWithoutColors?: boolean;
}

const ShareText = (props: ShareContentProps) => {
    const { guesses, hasWon, attempts, gameMode, wonWithHardMode, wonWithoutColors } = props;

    const [copied, setCopied] = useState<boolean>(false);
    
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

    const textToCopy = (guesses: GuessResponse[], attempts?: number) => {
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
        if (gameMode === 'blurry') {
            navigator.clipboard.writeText(textToCopyCategoriesBlurry(attempts));
        }
        else {
        navigator.clipboard.writeText(textToCopy(guesses, attempts));
        }

        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    const shareOnTwitter = (guesses: GuessResponse[], attempts?: number) => {
        const text = gameMode === 'blurry'
        ? encodeURIComponent(textToCopyCategoriesBlurry(attempts))
        : encodeURIComponent(textToCopy(guesses, attempts));
        const twitterWebIntentUrl = `https://twitter.com/intent/tweet?text=${text}`;

        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
            const twitterAppUrl = `twitter://post?message=${text}`;
            const now = Date.now();
            window.location.href = twitterAppUrl;
            setTimeout(() => {
                if (Date.now() - now < 1000) {
                    window.open(twitterWebIntentUrl, "_blank", "noopener,noreferrer");
                }
            }, 800);
        } else {
            window.open(twitterWebIntentUrl, "_blank", "noopener,noreferrer");
        };
    }

    return (
        <div className="w-full">
            {hasWon ? (
            <div className="w-full flex justify-center items-center mt-1">
                <div className="flex flex-col justify-center items-center">
                    <span className="text-xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.35)]">
                        {`I found today's #KpopIt Idol in ${attempts} ${attempts === 1 ? "attempt" : "attempts"}! 🎤`}
                    </span>
                </div>
                
            </div>
            ) : !hasWon && attempts === 0 ? (
                <div className="w-full flex justify-center items-center mt-1">
                    <div className="flex flex-col justify-center items-center">
                        <span className="text-xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.35)]">
                            Make your first guess to start today's challenge!
                        </span>
                    </div>
                </div>
            ) : (
                <div className="w-full flex justify-center items-center mt-1">
                    <div className="flex flex-col justify-center items-center">
                        <span className="text-xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.35)]">
                            Discover today's idol to share your results!
                        </span>
                    </div>
                </div>
            )}
            
            <div className="w-full flex flex-col justify-center items-center mt-3">
                {gameMode === 'blurry' ? (
                    <div className={`w-85 flex flex-col justify-center items-center ${guesses.length > 0 ? 
                        "bg-black/20 border border-white/10" : "bg-black/0 border-0"} gap-1 rounded-3xl p-3`}>
                            {hasWon ? (
                            <>
                                <span className="text-2xl">Hardmode {wonWithHardMode ? "✅" : "❌"}</span>
                                <span className="text-2xl">Grayscale {wonWithoutColors ? "✅" : "❌"}</span>
                            </>
                            ) : null}
                        </div>
                ) :
                <div className={`w-85 flex flex-col justify-center items-center ${guesses.length > 0 ? "bg-black/20 border border-white/10" : "bg-black/0 border-0"} gap-1 rounded-3xl p-3`}>
                {[...guesses].reverse().map((guess, index) => (
                    <div key={index} className="flex flex-row justify-center items-center cursor-default">
                        {categories.map((category) => (
                            <span key={category} className="text-3xl rounded-2xl">{getStatusEmoji(guess.feedback[category]?.status)}</span>
                        ))}
                    </div>
                ))}
                </div>
                }
            </div>

            <div className="w-full">
                <div className="flex flex-row justify-center items-center gap-10 mt-3">
                    <button className={`w-30 h-12 sm:w-30 sm:h-12 bg-black/40 rounded-2xl flex items-center justify-center ${hasWon ? "hover:bg-black/70 hover:cursor-pointer hover:scale-105 firefox:hover:scale-100" : "cursor-normal" } transition-all duration-300 transform-gpu`}
                        type='button'      
                        onClick={(() => {
                            if (hasWon) {
                                handleCopy();
                            }
                        })}>
                        <div className='relative flex flex-row items-center justify-center gap-2'>
                            <Copy className='w-6 h-6 sm:w-6 sm:h-6' />
                            <span className='text-base'>Copy</span>
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
                                className="absolute flex bottom-18 max-xxs:left-9 xxs:left-14 xs:left-20 sm:bottom-18 sm:left-72 justify-center items-center w-27 h-7 sm:w-27 sm:h-7">
                                    <div className="flex justify-center items-center bg-[#242424] w-25 h-7 sm:w-25 sm:h-7 rounded-xl border border-white
                                    shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)]">
                                        <span className="relative font-medium text-base text-white drop-shadow-lg
                                        [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(255,255,255,2.55)]">
                                            Copied!
                                        </span>
                                    </div>
                            </motion.div>                   
                        )}
                    </AnimatePresence>

                    <button className={`w-30 h-12 sm:w-30 sm:h-12 bg-black/40 rounded-2xl flex items-center justify-center ${hasWon ? "hover:bg-black/70 hover:cursor-pointer hover:scale-105 firefox:hover:scale-100" : "cursor-normal" } transition-all duration-300 transform-gpu`}
                        type='button'  
                        onClick={(() => {
                            if (hasWon) {
                                shareOnTwitter(guesses, attempts);
                            }
                        })}>
                        <div className='relative flex flex-row items-center justify-center gap-2'>
                            <img src={Twitter} alt="Twitter" className='w-6 h-6 sm:w-6 sm:h-6' />
                            <span className='text-base'>Share</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ShareText;
                        

