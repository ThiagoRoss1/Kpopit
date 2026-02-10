import "./guessgrid.css";
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
            return "79, 255, 176";
            
        case "incorrect":
            return "253, 92, 99";
        
        default:
            return "128, 128, 128";
    }
};

const GuessRow = (props: GuessRowProps) => {
    const { guess, isLatest, isAnimated, onIdolAnimated, onAnimationComplete } = props;

    const [hasAnimated, setHasAnimated] = useState(isAnimated);

    const idolId = guess.guessed_idol_data.idol_id;
    const shouldAnimate = isLatest && !hasAnimated;

    const statusColorRgb = useMemo(() => {
        return getStatusColor(guess.guess_correct ? "correct" : "incorrect");
    }, [guess.guess_correct]);

    const handleAnimationEnd = useCallback(() => {
        if (shouldAnimate) {
            onIdolAnimated(idolId);
            setHasAnimated(true);
        }
        onAnimationComplete?.();
    }, [shouldAnimate, onIdolAnimated, idolId, onAnimationComplete]);

    useEffect(() => {
        if (!isLatest && !isAnimated) {
                onIdolAnimated(idolId);
        };
    }, [isLatest, isAnimated, idolId, onIdolAnimated]);

    return (
        <div 
            style={{'--status-bg-color': statusColorRgb} as React.CSSProperties}
            className={`guess-card-color-container ${shouldAnimate ? 'guess-card-color-fade' : ''} flex items-center justify-center 
            max-xxs:w-70 xxs:w-80 xm:w-100 sm:w-100 max-xxs:h-16 xxs:h-18 xm:h-20 sm:h-20
            gap-2 px-0 rounded-[20px] border border-white/60 overflow-hidden relative group
            transition-all duration-1000`}>

            {/* Photo and name */}
            <div className="relative flex items-center justify-start gap-2 w-full h-fit">
                <img
                    src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${guess.guessed_idol_data.image_path}?v=${guess.guessed_idol_data.image_version}`}
                    alt="Idol image"
                    className={`${shouldAnimate ? 'guess-photo-enter' : ''} 
                    max-xxs:w-16 xxs:w-18 xm:w-20 max-xxs:h-16 xxs:h-18 xm:h-20 sm:w-20 sm:h-20 hover:w-full hover:border-0 hover:cursor-pointer transition-all duration-300 transform-gpu
                    object-cover rounded-[20px] border-r-4 border-b-4 border-black/30`} // object-[center_X%] per photo
                    onAnimationEnd={shouldAnimate ? handleAnimationEnd : undefined}
                    draggable={false}
                />
                
                <div className={`name-container ${shouldAnimate ? 'name-reveal' : ''}`}>
                    <span 
                        className="text-white max-xxs:text-sm xxs:text-base sm:text-xl whitespace-nowrap [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]
                        font-semibold border-b-0 border-white"
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

