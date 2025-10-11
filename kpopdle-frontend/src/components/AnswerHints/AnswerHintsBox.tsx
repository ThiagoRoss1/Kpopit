import { motion } from "motion/react";
import { useState } from "react";
import React from "react";

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
    const CARD1 = 6;
    const CARD2 = 10;

    const [isFlipped1, setIsFlipped1] = useState(false);
    const [isFlipped2, setIsFlipped2] = useState(false);

    const canFlipCard1 = attempts >= CARD1;
    const canFlipCard2 = attempts >= CARD2;

    const getHintText = (attempts: number, cardThreshold: number) => {
        const remaining = cardThreshold - attempts;
        if (attempts >= cardThreshold) return "Click to reveal the hint!";

        return (
            <React.Fragment>
                 Guess <span className="text-[22px] text-[#d86da4] text-center">{remaining}</span> more {remaining === 1 ? "idol" : "idols"} to reveal the hint
            </React.Fragment>
        )
    }

    return (
        <div className="w-full h-fit max-w-full sm:w-lg sm:h-32 mx-auto 
        flex flex-row items-center justify-center gap-6 rounded-[15px] bg-gradient-to-b from-white/0 to-[#b4b4b4]/0 perspective-distant">

            {/* Box 1 */}
            <div className= "relative perspective-distant">
                <motion.div
                    animate={canFlipCard1 ? isFlipped1 ? { rotateY: -180 } : { rotateY: 0 } : {}}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    onClick={() => {
                        if (!isFlipped1 && canFlipCard1) setIsFlipped1(true);
                    }}
                    className={`transform-3d transform-gpu ${canFlipCard1 && !isFlipped1 ? "hover:cursor-pointer" : "hover:cursor-default"}`}
                >
                    {/* Box 1 Back */}
                    <div className="relative sm:w-56 sm:h-32 border border-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center text-center backface-hidden">
                        <div className="flex flex-col gap-2 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]">
                            <h3 className="relative font-bold text-[20px] text-[#b43777]">
                                Hint 1
                            </h3>
                            <span className="text-white text-base px-4">
                                {getHintText(attempts, CARD1)}
                            </span>
                        </div>
                    </div>

                    {/* Box 1 Front */}
                    <div className="absolute inset-0 -rotate-y-180 backface-hidden sm:w-56 sm:h-32 border border-white/20 rounded-2xl backdrop-blur-md 
                    flex items-center justify-center text-center">
                        <div className="flex flex-col gap-4 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]">
                            <h3 className="relative font-bold text-[20px] text-[#b43777]">
                                Member Count
                            </h3>
                            <span className="text-white text-2xl">
                                {memberCountDisplay}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Box 2 */}
            <div className="relative perspective-distant">
                <motion.div
                    animate={canFlipCard2 ? isFlipped2 ? { rotateY: -180 } : { rotateY: 0 } : {}}
                    transition={{ duration: 0.8, ease: "easeInOut"}}
                    onClick={() => {
                        if (!isFlipped2 && canFlipCard2) setIsFlipped2(true);
                    }}
                    className={`transform-3d transform-gpu ${canFlipCard2 && !isFlipped2 ? "hover:cursor-pointer" : "hover:cursor-default"}`}
                >
                    {/* Box 2 Back */}
                    <div className="relative sm:w-56 sm:h-32 border border-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center text-center backface-hidden">
                        <div className="flex flex-col gap-2 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]">
                            <h3 className="relative font-bold text-[20px] text-[#b43777] drop-shadow-lg">
                                Hint 2
                            </h3>
                            <span className="text-white text-base px-4">
                                {getHintText(attempts, CARD2)}
                            </span>
                        </div>
                    </div>

                    {/* Box 2 Front */}
                    <div className="absolute inset-0 -rotate-y-180 backface-hidden sm:w-56 sm:h-32 border border-white/20 rounded-2xl backdrop-blur-md 
                    flex items-center justify-center text-center">
                        <div className="flex flex-col gap-4 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]">
                            <h3 className="relative font-bold text-[20px] text-[#b43777]">
                                Group(s)
                            </h3>
                            <span className="text-white text-[20px]">
                                {groupsDisplay.join(", ")}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>
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