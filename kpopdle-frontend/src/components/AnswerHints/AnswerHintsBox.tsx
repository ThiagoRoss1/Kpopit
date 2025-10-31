import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import React from "react";
import Mic from "../../assets/icons/mic-vocal.svg";
// import LockedIcon from "../../assets/icons/lock-key-fill.svg";
// import UnlockedIcon from "../../assets/icons/lock-key-open-fill.svg";

interface AnswerHintsBoxProps {
    memberCount: number | null;
    groups?: string[] | null;
    attempts: number;
}

const AnswerHintsBox = (props: AnswerHintsBoxProps) => {
    const {memberCount, groups, attempts} = props;

    const memberCountDisplay = memberCount ?? "Soloist"; // == memberCount !== null ? memberCount : "Soloist"; As i'm returning Null
    const groupsDisplay = groups && groups.length > 0 ? groups : ["Soloist"];

    // canReveal states
    const CARD1 = 2;
    const CARD2 = 3;

    const [isFlipped1, setIsFlipped1] = useState(() => {
        return localStorage.getItem("hint1Revealed") === "true";
    });

    const [isFlipped2, setIsFlipped2] = useState(() => {
        return localStorage.getItem("hint2Revealed") === "true";
    });

    const canFlipCard1 = attempts >= CARD1;
    const canFlipCard2 = attempts >= CARD2;

    const [showHint1, setShowHint1] = useState(() => {
        return localStorage.getItem("showHint1") === "true";
    });
    const [showHint2, setShowHint2] = useState(() => {
        return localStorage.getItem("showHint2") === "true";
    });

    const [colorize1, setColorize1] = useState(() => {
        return localStorage.getItem("colorize1") === "true";
    });
    const [colorize2, setColorize2] = useState(() => {
        return localStorage.getItem("colorize2") === "true";
    });

    useEffect(() => {
        if (isFlipped1) localStorage.setItem("hint1Revealed", "true");
        if (showHint1) localStorage.setItem("showHint1", "true");
        if (colorize1) localStorage.setItem("colorize1", "true");
    }, [isFlipped1, showHint1, colorize1]);

    useEffect(() => {
        if (isFlipped2) localStorage.setItem("hint2Revealed", "true");
        if (showHint2) localStorage.setItem("showHint2", "true");
        if (colorize2) localStorage.setItem("colorize2", "true");
    }, [isFlipped2, showHint2, colorize2]);

    const getHintText = (attempts: number, cardThreshold: number) => {
        const remaining = cardThreshold - attempts;
        if (attempts >= cardThreshold) return "Click to reveal the hint!";

        return (
            <React.Fragment>
                 Guess <span className="text-[22px] text-[#ce757a] font-bold text-center">{remaining}</span> more {remaining === 1 ? "idol" : "idols"} to reveal the hint
            </React.Fragment>
        )
    }

    return (
        <div className="w-full h-fit max-w-full sm:w-lg mx-auto flex justify-center items-center">
            <AnimatePresence mode="wait">
                {attempts === 0 ? (
                    <motion.div 
                        key="start-game"
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 0 }}
                        transition={{
                            duration: 0.5,
                            type:"spring",
                            stiffness: 200,
                            damping: 20
                        }}
                        className="w-full max-w-full sm:w-lg"
                    >
                        
                        <div className="relative z-10 w-full h-fit max-w-full sm:w-96 sm:h-30 mx-auto
                        flex flex-row items-center justify-center gap-4 rounded-[20px] bg-transparent shadow-[4px_4px_4px_1px_rgba(24,24,24,0.25),inset_0_4px_4px_rgba(24,24,24,0.25)] cursor-default">
                            <span className="relative flex flex-col text-2xl text-white text-center [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)] items-center justify-center gap-2">
                                <img src={Mic} alt="microphone" className="relative flex w-8 h-8 animate-pulse object-cover" draggable={false} />
                                <h2 className="text-[20px] font-light">
                                    Guess any idol to start the game!
                                </h2>
                                <p className="text-[12px] font-light">
                                    Hints grid will be unlocked after your first guess.
                                </p>
                            </span>
                        </div>                           
                    </motion.div>
                ) : (
                    <motion.div
                        key="hint-cards"
                        initial={{ scale:0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            duration: 0.3,
                            delay: 0.1,
                            type: "spring",
                            stiffness: 200,
                            damping: 20
                        }}
                        className="w-full h-fit max-w-full sm:w-lg sm:h-30 mx-auto 
                        flex flex-row items-center justify-between gap-4 rounded-[15px] bg-gradient-to-b from-white/0 to-[#b4b4b4]/0 perspective-distant">

            {/* Box 1 */}
            <div className= "relative perspective-distant">
                <motion.div
                    initial={ isFlipped1 ? { rotateY: -180 } : { rotateY: 0 } }
                    animate={canFlipCard1 ? isFlipped1 ? { rotateY: -180 } : { rotateY: 0 } : {}}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    onClick={() => {
                        if (!isFlipped1 && canFlipCard1) setIsFlipped1(true);
                    }}
                    className={`transform-3d transform-gpu ${canFlipCard1 && !isFlipped1 ? "hover:cursor-pointer" : "hover:cursor-default"}`}
                >
                    {/* Box 1 Back */}
                    <motion.div 
                        initial={{ scale: 0.9 }}
                        animate={canFlipCard1 ? { scale: 1 } : { scale: 0.9 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="relative sm:w-60 sm:h-30 border-2 border-white/50 rounded-2xl backdrop-blur-md flex items-center justify-center text-center 
                        backface-hidden shadow-[4px_4px_4px_1px_rgba(0,0,0,0.15),inset_0_4px_4px_0_rgba(0,0,0,0.15)]">
                            <div className="flex flex-col z-10 gap-2 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]">     
                                <h3 className="relative font-bold text-[20px] text-[#ce757a] drop-shadow-lg">
                                    Hint 1
                                </h3>
                                <span className="text-white text-base px-4">
                                    {getHintText(attempts, CARD1)}
                                </span>
                            </div>
                    </motion.div>

                    {/* Box 1 Front */}
                    <div className={`absolute inset-0 -rotate-y-180 backface-hidden sm:w-60 sm:h-30 border-2 border-white/50 rounded-2xl backdrop-blur-md 
                    flex items-center justify-center text-center shadow-[4px_4px_4px_1px_rgba(0,0,0,0.15),inset_0_4px_4px_0_rgba(0,0,0,0.15)] ${colorize1 ? "bg-black/80 transition-colors duration-2000" : ""}`}>
                        <div className="flex flex-col gap-3">
                            <h3 className="relative font-bold text-[22px] text-[#b43777] drop-shadow-lg 
                            [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">
                                Group Members
                            </h3>
                            <motion.span 
                                onClick={() => [setShowHint1(true), setColorize1(true)]}
                                animate={{
                                    filter: showHint1
                                        ? "blur(0px)"
                                        : "blur(8px)",
                                    scale: showHint1 ? 1 : 0.96,
                                }}
                                whileHover={!showHint1 ? { scale: 1.05 } : {}}
                                transition={{
                                    filter: {duration: 0.8, ease: "easeOut" },
                                    scale: { duration: 0.3, ease: "easeInOut" },
                                }}
                                className={`text-white text-3xl 
                                [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.25)] ${!showHint1 ? "cursor-pointer select-none transform-gpu": ""}`}>
                                    {memberCountDisplay}
                            </motion.span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Box 2 */}
            <div className="relative perspective-distant">
                <motion.div
                    initial= { isFlipped2 ? { rotateY: -180 } : { rotateY: 0 } }
                    animate={canFlipCard2 ? isFlipped2 ? { rotateY: -180 } : { rotateY: 0 } : {}}
                    transition={{ duration: 0.8, ease: "easeInOut"}}
                    onClick={() => {
                        if (!isFlipped2 && canFlipCard2) setIsFlipped2(true);
                    }}
                    className={`transform-3d transform-gpu ${canFlipCard2 && !isFlipped2 ? "hover:cursor-pointer" : "hover:cursor-default"}`}
                >
                    {/* Box 2 Back */}
                    <motion.div 
                        initial={{ scale: 0.9 }}
                        animate={canFlipCard2 ? { scale: 1 } : { scale: 0.9 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="relative sm:w-60 sm:h-30 border-2 border-white/50 rounded-2xl backdrop-blur-md flex items-center justify-center text-center 
                        backface-hidden shadow-[4px_4px_4px_1px_rgba(0,0,0,0.15),inset_0_4px_4px_0_rgba(0,0,0,0.15)]">
                            <div className="flex flex-col gap-2 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]">
                                <h3 className="relative font-bold text-[20px] text-[#ce757a] drop-shadow-lg">
                                    Hint 2
                                </h3>
                                <span className="text-white text-base px-4">
                                    {getHintText(attempts, CARD2)}
                                </span>
                            </div>
                    </motion.div>

                    {/* Box 2 Front */}
                    <div className={`absolute inset-0 -rotate-y-180 backface-hidden sm:w-60 sm:h-30 border-2 border-white/50 rounded-2xl backdrop-blur-md 
                    flex items-center justify-center text-center shadow-[4px_4px_4px_1px_rgba(0,0,0,0.15),inset_0_4px_4px_0_rgba(0,0,0,0.15)] ${colorize2 ? "bg-black/80 transition-colors duration-2000" : ""}`}>
                        <div className="flex flex-col gap-3">
                            <h3 className="relative font-bold text-[22px] text-[#b43777] 
                            [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">
                                {groupsDisplay.length > 1 ? "Groups" : "Group"}
                            </h3>
                            <motion.span 
                                onClick={() => [setShowHint2(true), setColorize2(true)]}
                                animate={{ 
                                    filter: showHint2
                                    ? "blur(0px)"
                                    : "blur(8px)",
                                    scale: showHint2 ? 1 : 0.96,
                                }}
                                whileHover={!showHint2 ? { scale: 1.05 } : {}}
                                transition={{
                                    filter: { duration: 0.8, ease: "easeOut" },
                                    scale: { duration: 0.3, ease: "easeInOut" },
                                }}
                                className={`text-white text-[24px] font-semibold 
                                [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.25)] ${!showHint2 ? "cursor-pointer select-none transform-gpu" : ""}`}>
                                    {groupsDisplay.join(", ")}
                            </motion.span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
        )}
        </AnimatePresence>
        </div>
    );
};

export default AnswerHintsBox;




// past boxes
                // {attempts >= 20 && (
                // <div>
                // {/* Box 1 */}
                // <div className="w-full h-fit sm:w-[196px] sm:h-[92px] border-t-2 border-solid border-white/20
                // rounded-[8px] backdrop-blur-md shadow-[4px_4px_4px_1px_rgba(0,0,0,0.25),inset_0_4px_4px_rgba(0,0,0,0.25)]
                // bg-gradient-to-b from-[#313131]/10 via-white/10 to-white/10 flex items-center justify-center">
                //     <p className="text-center">Member Count = {memberCountDisplay}</p>
                // </div>

                // {/* Box 2 */}
                // <div className="w-full h-fit sm:w-[196px] sm:h-[92px] border-t-2 border-solid border-white/20
                // rounded-[8px] backdrop-blur-md shadow-[4px_4px_4px_1px_rgba(0,0,0,0.25),inset_0_4px_4px_rgba(0,0,0,0.25)]
                // bg-gradient-to-b from-[#313131]/10 via-white/10 to-white/10 flex items-center justify-center">
                //     <p className="text-center">Groups = {groupsDisplay}</p>
                // </div>
                // </div>
                // )}