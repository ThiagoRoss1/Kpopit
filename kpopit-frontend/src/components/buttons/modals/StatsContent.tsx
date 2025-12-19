import type { UserStats } from "../../../interfaces/gameInterfaces.ts";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

interface StatsContentProps {
    stats: UserStats | undefined;
    onSubmitTransferData: () => void;
}

const StatsText = (props: StatsContentProps) => {
    const { stats, onSubmitTransferData } = props;

    const [copied, setCopied] = useState<boolean>(false);

    const siteLink = `\n\n${window.location.href}`;

    const textToCopy = `
    My #KpopIt statistics:
    🥇 Games won: ${stats?.wins_count}
    🤓 Average guesses: ${stats?.average_guesses.toFixed(2)}
    🎯 One shots: ${stats?.one_shot_wins}
    🔥 Current streak: ${stats?.current_streak}
    🚀 Max streak: ${stats?.max_streak}
    ${siteLink}`;
    
    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy.trim().split('\n').map(line => line.trim()).join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }   

    return (
        <div className="w-full bg-transparent px-2 sm:px-10 mt-5 mb-5">
            <div className="w-full grid grid-cols-2 justify-center items-center gap-x-6 sm:gap-x-16 gap-y-6">
                {/* Games won */}
                <div className="flex flex-col justify-center items-center p-4 gap-3 rounded-2xl border-2 border-white h-28 sm:h-28 
                backface-hidden shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)] bg-black/50
                hover:scale-105 hover:brightness-110 hover:bg-black hover:rotate-1 hover:cursor-default transition-all duration-500 transform-gpu">
                    <h3 className="relative font-bold max-xxs:text-base xxs:text-lg xs:text-xl sm:text-2xl text-[#b43777] drop-shadow-lg 
                    [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">Games won</h3>
                    <span className="max-xxs:text-2xl xxs:text-2xl xs:text-3xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.55)]">{stats?.wins_count}</span>
                </div>

                {/* Average guesses */}
                <div className="flex flex-col justify-center items-center p-4 gap-3 rounded-2xl border-2 border-white h-28 sm:h-28 
                backface-hidden shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)] bg-black/50
                hover:scale-105 hover:brightness-110 hover:bg-black hover:-rotate-1 hover:cursor-default transition-all duration-500 transform-gpu">
                    <h3 className="relative font-bold max-xxs:text-[11px] xxs:text-[12px] xs:text-base sm:text-2xl text-[#b43777] drop-shadow-lg 
                    [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">Average Guesses</h3>
                    <span className="max-xxs:text-2xl xxs:text-2xl xs:text-3xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.55)]">{stats?.average_guesses.toFixed(2)}</span>
                </div>

                {/* Current streak */}
                <div className="flex flex-col justify-center items-center p-4 gap-3 rounded-2xl border-2 border-white h-28 sm:h-28 
                backface-hidden shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)] bg-black/50
                hover:scale-105 hover:brightness-110 hover:bg-black hover:rotate-1 hover:cursor-default transition-all duration-500 transform-gpu">
                    <h3 className="relative font-bold max-xxs:text-[12px] xxs:text-[14px] xs:text-[18px] sm:text-2xl text-[#b43777] drop-shadow-lg 
                    [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">Current Streak</h3>
                    <span className="max-xxs:text-2xl xxs:text-2xl xs:text-3xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.55)]">{stats?.current_streak}</span>
                </div>

                {/* Max streak */}
                <div className="flex flex-col justify-center items-center p-4 gap-3 rounded-2xl border-2 border-white h-28 sm:h-28 
                backface-hidden shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)] bg-black/50
                hover:scale-105 hover:brightness-110 hover:bg-black hover:-rotate-1 hover:cursor-default transition-all duration-500 transform-gpu">
                    <h3 className="relative font-bold max-xxs:text-base xxs:text-lg xs:text-xl sm:text-2xl text-[#b43777] drop-shadow-lg 
                    [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">Max Streak</h3>
                    <span className="max-xxs:text-2xl xxs:text-2xl xs:text-3xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.55)]">{stats?.max_streak}</span>
                </div>
            </div>

                {/* One shot wins */}
                <div className="flex flex-col justify-center items-center p-4 gap-3 rounded-2xl border-2 border-white h-28 sm:h-28 
                backface-hidden shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)] bg-black/50
                hover:scale-105 hover:brightness-110 hover:bg-black hover:-translate-y-2 hover:cursor-default transition-all duration-500 transform-gpu mt-6">
                    <h3 className="relative font-bold max-xxs:text-base xxs:text-lg xs:text-xl sm:text-2xl text-[#b43777] drop-shadow-lg 
                    [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">One Shot Wins</h3>
                    <span className="max-xxs:text-2xl xxs:text-2xl xs:text-3xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.55)]">{stats?.one_shot_wins}</span>
                </div>   

                <div className="flex justify-between max-xxs:px-2 xxs:px-4 xs:px-10 items-center mt-6">
                    {/* Transfer Data Button */}
                    <button 
                        onClick={onSubmitTransferData}
                        type="button"
                        className="bg-transparent max-xxs:w-30 max-xxs:h-16 xxs:w-35 xxs:h-16 sm:w-60 sm:h-16 rounded-2xl border-2 border-white
                        backface-hidden shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)]
                        hover:scale-105 hover:brightness-110 hover:bg-[#242424] hover:cursor-pointer transition-all duration-500 transform-gpu">
                        <span className="relative font-bold max-xxs:text-[14px] xxs:text-base sm:text-[20px] text-[#b43777] drop-shadow-lg
                        [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">
                            Transfer data
                        </span>
                    </button>

                    {/* Copy Button */}
                    <button
                        onClick={() => handleCopy()}
                        className="bg-transparent max-xxs:w-30 max-xxs:h-16 xxs:w-35 xxs:h-16 sm:w-60 sm:h-16 rounded-2xl border-2 border-white
                        backface-hidden shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)]
                        hover:scale-105 hover:brightness-110 hover:bg-[#242424] hover:cursor-pointer transition-all duration-500 transform-gpu">
                        <span className="relative font-bold text-base sm:text-[20px] text-[#b43777] drop-shadow-lg
                        [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">
                            Copy
                        </span>
                    </button>
                    <AnimatePresence>
                        {copied && (
                            <motion.div 
                                key="copy-notification"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                exit={{ opacity: 0, y: 20 }}
                                className="absolute flex bottom-26 max-xxs:left-32 xxs:left-34 xs:left-43 sm:bottom-28 sm:left-127 justify-center items-center w-60 h-7 sm:w-60 sm:h-7">
                                    <div className="flex justify-center items-center bg-[#242424] w-40 h-7 sm:w-48 sm:h-7 rounded-xl border border-white
                                    shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)]">
                                        <span className="relative font-medium text-[14px] sm:text-base text-[#b43777] drop-shadow-lg
                                        [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(180,55,119,2.55)]">
                                            Copied to clipboard!
                                        </span>
                                    </div>
                            </motion.div>                   
                        )}
                    </AnimatePresence>
                </div>    
        </div>
    )
}

export default StatsText;