//import React from "react";
import React from "react";
import { useEffect, useState, useRef } from "react";
import type { GuessedIdolData, GuessResponse, UserStats } from "../../interfaces/gameInterfaces";
import { motion } from "motion/react";
import VictoryCardSmall from "./VictoryCardSmall.tsx";
import VictoryCardBig from "./VictoryCardBig.tsx";

interface GameMode {
    id: string;
    name: string;
    path: string;
    won?: boolean;
    photoSpecs?: string;
}

interface VictoryCardHudProps {
    cardInfo: GuessedIdolData;
    guesses: GuessResponse[]
    attempts: number;
    yesterdayIdol: string;
    yesterdayIdolGroup?: string[] | null;
    yesterdayIdolImage?: string | null;
    yesterdayIdolImageVersion?: string | null;
    idolActiveGroup?: string[] | null;
    userPosition?: number | null;
    userRank?: number | null;
    userScore?: number | null;
    stats: UserStats | undefined;
    nextReset: () => { timeRemaining: number | null; formattedTime: string; };
    otherGameModes?: GameMode[];
}

const VictoryCardHud = (props: VictoryCardHudProps) => {
    const { cardInfo, guesses, attempts, nextReset, yesterdayIdol, yesterdayIdolGroup, yesterdayIdolImage, yesterdayIdolImageVersion, idolActiveGroup, userPosition, userRank, userScore, stats, otherGameModes } = props;
    
    const [showSmallModal, setShowSmallModal] = useState(false);
    const bigCardRef = useRef<HTMLDivElement>(null);
    

    useEffect(() => {
        const scrollToBigCard = () => {
            if (bigCardRef.current) {
                const cardPosition = bigCardRef.current.getBoundingClientRect().top + window.scrollY;
                const offset = window.innerHeight / 2 - bigCardRef.current.offsetHeight / 2;
                const targetPosition = cardPosition - offset;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        };

        const timer = setTimeout(scrollToBigCard, 300);
        return () => clearTimeout(timer);
    }, []);

return (
    <React.Fragment>
        <div ref={bigCardRef}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ 
                    duration: 0.6,
                    ease: "easeOut",
                    delay: 0.2
                }}
            >
                <VictoryCardBig
                    cardInfo={cardInfo}
                    attempts={attempts}
                    nextReset={nextReset}
                    yesterdayIdol={yesterdayIdol}
                    yesterdayIdolGroup={yesterdayIdolGroup ?? null}
                    yesterdayIdolImage={yesterdayIdolImage ?? undefined}
                    yesterdayIdolImageVersion={yesterdayIdolImageVersion ?? undefined}
                    userPosition={userPosition}
                    userRank={userRank}
                    userScore={userScore}
                    idolActiveGroup={idolActiveGroup ?? null}
                    onShareClick={() => setShowSmallModal(true)}
                    otherGameModes={otherGameModes}
                />
            </motion.div>
        </div>

        {showSmallModal && (
            <motion.div 
                className="fixed inset-0 z-50 bg-black/10 flex items-center justify-center"
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ duration: 0.3 }}
                onClick={() => setShowSmallModal(false)}
            >
                <div className="flex items-center justify-center w-full sm:max-w-92.5 mx-auto p-4">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0, y: 90 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }} 
                        transition={{ 
                            duration: 0.4,
                            ease: [0.34, 1.56, 0.64, 1]
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <VictoryCardSmall 
                            cardInfo={cardInfo}
                            guesses={guesses}
                            attempts={attempts}
                            stats={stats}
                            userRank={userRank}
                            userScore={userScore}
                            nextReset={nextReset}
                            onClose={() => setShowSmallModal(false)}
                            gameMode={"classic"}
                        />
                    </motion.div>
                </div>
            </motion.div>
        )}
    </React.Fragment>
       
)};

export default VictoryCardHud;
