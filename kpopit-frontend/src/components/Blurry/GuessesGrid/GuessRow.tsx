import "./guessgrid.css";
import React, { useState, useEffect } from "react";
import type { FeedbackData, GuessResponse } from "../../../interfaces/gameInterfaces";

interface GuessRowProps {
    guess: GuessResponse<Partial<FeedbackData>>;
    isLatest: boolean;
    isAnimated: boolean;
    onIdolAnimated: (idolId: number) => void;
    onAnimationComplete?: () => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case "correct":
            return "bg-[#4FFFB0]";
            
        case "incorrect":
            return "bg-[#fd5c63]";
        
        default:
            return "bg-gray-300";
    }
};

const GuessRow = (props: GuessRowProps) => {
    const { guess, isLatest, isAnimated, onIdolAnimated, onAnimationComplete } = props;

    const [hasAnimated, setHasAnimated] = useState(isAnimated);

    const idolId = guess.guessed_idol_data.idol_id;
    const shouldAnimate = isLatest && !hasAnimated;

    const handleAnimationEnd = () => {
        if (shouldAnimate) {
            onIdolAnimated(idolId);
            setHasAnimated(true);
        }
        onAnimationComplete?.();
    }

    useEffect(() => {
        if (!isLatest && !isAnimated) {
                onIdolAnimated(idolId);
        };
    }, [isLatest, isAnimated, idolId, onIdolAnimated]);

    return (
        <div className={`${getStatusColor(guess.guess_correct ? "correct" : "incorrect")} 
        flex sm:w-100 sm:h-20 items-center justify-center gap-2 px-0 rounded-[20px] border border-white/60
        overflow-hidden relative group`}>

            {/* Photo and name */}
            <div className="relative flex items-center justify-start gap-2 w-full h-fit">
                <img
                    src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${guess.guessed_idol_data.image_path}`}
                    alt="Idol image"
                    className={`${shouldAnimate ? 'guess-photo-enter' : ''} 
                    sm:w-20 sm:h-20 hover:w-full hover:border-0 hover:cursor-pointer transition-all duration-300 transform-gpu
                    object-cover rounded-[20px] border-r-4 border-b-4 border-black/30`}
                    onAnimationEnd={shouldAnimate ? handleAnimationEnd : undefined}
                    draggable={false}
                />
                
                <div className={`name-container ${shouldAnimate ? 'name-reveal' : ''}`}>
                    <span 
                        className="text-white text-xl whitespace-nowrap"
                        onAnimationEnd={shouldAnimate ? handleAnimationEnd : undefined}
                        >
                        {guess.guessed_idol_data.artist_name}
                    </span>
                </div>
            </div>
        </div>
    )

    


}


export default React.memo(GuessRow, (prev, next) => {
    return prev.guess.guessed_idol_data.idol_id === next.guess.guessed_idol_data.idol_id &&
    prev.isLatest === next.isLatest && prev.isAnimated === next.isAnimated;
});

