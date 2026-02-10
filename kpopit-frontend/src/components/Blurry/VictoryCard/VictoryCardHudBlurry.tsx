import "./victorycard.css";
import React from "react";
import { useEffect, useState, useRef } from "react";
import type { GuessedIdolData, FeedbackData, GuessResponse, UserStats } from "../../../interfaces/gameInterfaces"
import VictoryCardBigBlurry from "./VictoryCardBigBlurry";
import VictoryCardSmall from "../../VictoryCard/VictoryCardSmall";

interface GameMode {
    id: string;
    name: string;
    path: string;
    won?: boolean;
    photoSpecs?: string;
}

interface BlurryVictoryCardHudProps {
    cardInfo: GuessedIdolData;
    guesses: GuessResponse<Partial<FeedbackData>>[];
    attempts: number;
    idol_blur_image: string;
    idol_blur_image_version: string;
    yesterdayIdol: string;
    yesterdayIdolImage?: string | null;
    yesterdayIdolImageVersion?: string | null;
    userPosition?: number | null;
    userRank?: number | null;
    userScore?: number | null;
    nextReset: () => { timeRemaining: number | null; formattedTime: string; };
    stats: UserStats | undefined;
    otherGameModes?: GameMode[];
    wonWithHardMode?: boolean;
    wonWithoutColors?: boolean;
}

const VictoryCardHudBlurry = (props: BlurryVictoryCardHudProps) => {
    const { cardInfo, guesses, attempts, idol_blur_image, idol_blur_image_version, yesterdayIdol, yesterdayIdolImage, yesterdayIdolImageVersion, userPosition, userRank, userScore, nextReset, stats, otherGameModes, wonWithHardMode, wonWithoutColors } = props;

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
                <div className="bigCardEntry">
                    <VictoryCardBigBlurry 
                        cardInfo={cardInfo}
                        attempts={attempts}
                        idol_blur_image={idol_blur_image}
                        idol_blur_image_version={idol_blur_image_version}
                        yesterdayIdol={yesterdayIdol}
                        yesterdayIdolImage={yesterdayIdolImage ?? undefined}
                        yesterdayIdolImageVersion={yesterdayIdolImageVersion ?? undefined}
                        userPosition={userPosition}
                        userRank={userRank}
                        userScore={userScore}
                        nextReset={nextReset}
                        onShareClick={() => setShowSmallModal(true)}
                        otherGameModes={otherGameModes}
                    />
                </div>
            </div>

            {showSmallModal && (
                 <div 
                    className="fixed background-fade-in inset-0 z-50 bg-black/10 
                    flex items-center justify-center"
                    onClick={() => setShowSmallModal(false)}
                    >
                    <div className="flex items-center justify-center w-full sm:max-w-92.5 mx-auto p-4">
                        <div 
                            className="cardEntry"
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
                                gameMode={"blurry"}
                                wonWithHardMode={wonWithHardMode}
                                wonWithoutColors={wonWithoutColors}
                            />
                        </div>
                    </div>
                </div>
            )}
        </React.Fragment>

    )
}

export default VictoryCardHudBlurry;