import React from "react";
import { useEffect, useRef } from "react";
import type { GuessedIdolData, FeedbackData, GuessResponse } from "../../../interfaces/gameInterfaces"
import VictoryCardBigBlurry from "./VictoryCardBigBlurry";

interface BlurryVictoryCardHudProps {
    cardInfo: GuessedIdolData;
    guesses: GuessResponse<Partial<FeedbackData>>[];
    attempts: number;
    idol_blur_image: string;
    yesterdayIdol: string;
    yesterdayIdolImage?: string | null;
    userPosition?: number | null;
    userRank?: number | null;
    userScore?: number | null;
    nextReset: () => { timeRemaining: number | null; formattedTime: string; };
}

const VictoryCardHudBlurry = (props: BlurryVictoryCardHudProps) => {
    const { cardInfo, attempts, idol_blur_image, yesterdayIdol, yesterdayIdolImage, userPosition, userRank, userScore, nextReset } = props;

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
                <VictoryCardBigBlurry 
                    cardInfo={cardInfo}
                    attempts={attempts}
                    idol_blur_image={idol_blur_image}
                    yesterdayIdol={yesterdayIdol}
                    yesterdayIdolImage={yesterdayIdolImage ?? undefined}
                    userPosition={userPosition}
                    userRank={userRank}
                    userScore={userScore}
                    nextReset={nextReset}
                    onShareClick={() => {}}
                />
            </div>
        </React.Fragment>

    )
}

export default VictoryCardHudBlurry;