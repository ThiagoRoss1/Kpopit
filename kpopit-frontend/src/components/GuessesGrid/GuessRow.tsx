import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import type { GuessResponse } from "../../interfaces/gameInterfaces";
import ArrowUp from "../../assets/icons/arrow-fat-line-up-fill.svg";
import ArrowDown from "../../assets/icons/arrow-fat-line-down-fill.svg";
import { useDateLocale } from "../../hooks/useDateLocale";
import { formatCompanyName } from "../../utils/formatters";
import { getNationalityFlag } from "../../utils/getFlags";
import { useIsMobile } from "../../hooks/useIsDevice";

interface GuessRowProps {
    guess: GuessResponse;
    isLatest: boolean;
    isAnimated: boolean;
    onIdolAnimated: (idolId: number) => void;
    onAnimationComplete?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "correct":
      return "bg-[#4FFFB0] shadow-[0_0_10px_4px_rgba(79,255,176,0.15)]";

    case "partial":
        return "bg-[#f3e563] shadow-[0_0_10px_4px_rgba(243,229,99,0.15)]";

    case "incorrect":
      return "bg-[#fd5c63] shadow-[0_0_10px_4px_rgba(253,92,99,0.15)]";

    case "higher":
      return "bg-[#fd5c63] shadow-[0_0_10px_4px_rgba(253,92,99,0.15)]";

    case "lower":
      return "bg-[#fd5c63] shadow-[0_0_10px_4px_rgba(253,92,99,0.15)]";

    default:
      return "bg-gray-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "higher":
      return ArrowDown;
    
    case "lower":
      return ArrowUp;
  }
}

const getPositionColor = (position: string) => {
  switch (position) {
    case "correct_items":
      return "text-[#4FFFB0]";

    case "incorrect_items":
      return "text-white";

    default:
      return "text-white";
  }
}

const GuessRow = (props: GuessRowProps) => {
    const { guess, isLatest, isAnimated, onIdolAnimated, onAnimationComplete } = props;

    const isMobile = useIsMobile();

    const { formatBirthDate } = useDateLocale();
    const [currentColumn, setCurrentColumn] = useState(0);
    const [isPressed, setIsPressed] = useState(false);

    const idolId = guess.guessed_idol_data.idol_id;
    const isStatic = isAnimated || !isLatest;
    const MotionTag = (isStatic ? "div" : motion.div) as React.ElementType;

    useEffect(() => {
        if (isStatic) return;
        const time = setTimeout(() => setCurrentColumn(1), 50);
        return () => clearTimeout(time);
    }, [isStatic]);

    useEffect(() => {
        if (!isLatest && !isAnimated) {
            onIdolAnimated(idolId);
        }
    }, [isLatest, isAnimated, idolId, onIdolAnimated, isStatic]);

    const getMotionProps = (columnIndex: number, nextColumnIndex?: number) => {
        if (isStatic) return {};

        return {
            initial: { rotateY: 90, opacity: 0 },
            animate: currentColumn >= columnIndex ? { rotateY: 0, opacity: 1 } : {},
            transition: { duration: 0.8, ease: [0.42, 0, 0.58, 1] },
            onAnimationComplete: () => {
                if (nextColumnIndex && currentColumn === columnIndex) setCurrentColumn(nextColumnIndex);
                if (columnIndex === 7) {
                    onIdolAnimated(idolId);
                    if (guess.guess_correct && onAnimationComplete) {
                        onAnimationComplete();
                    }
                }
            }
        };
    };

    const colorClasses = (attribute: string, itemValue: string) => {
        const fieldFeedback = guess.feedback[attribute as keyof typeof guess.feedback];
    
        if (!fieldFeedback) return "";
        
        const isCorrect = fieldFeedback.status !== "correct" && fieldFeedback.correct_items?.includes(itemValue);
        const isIncorrect = fieldFeedback.status !== "correct" && fieldFeedback.incorrect_items?.includes(itemValue);
    
        return getPositionColor(isCorrect ? "correct_items" : isIncorrect ? "incorrect_items" : "");
    };

    // Mobile tap effect
    const handleTouchStart = () => setIsPressed(true);
    const handleTouchEnd = () => setIsPressed(false);

    return (
        <React.Fragment>
            {/* Idol Image and Name */}
            <MotionTag
                {...(!isStatic ? {
                    initial: { scale: 0.8, opacity: 0 },
                    animate: { scale: 1, opacity: 1 },
                    transition: { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }
                } : {})}      
                    className={`relative bg-[#ffffff] shadow-[0_0_10px_2px_rgba(255,255,255,0.1),0_0_10px_2px_rgba(255,255,255,0.1)] w-20 h-20 sm:h-28 sm:w-28 rounded-2xl sm:rounded-[18px] 
                    flex flex-col items-center justify-center text-center border-2 border-white transform-gpu overflow-hidden
                    ${isStatic ? `hover:brightness-110 hover:cursor-default transition-transform duration-300 ${isPressed ? "scale-105 brightness-110": "hover:scale-105"}` : ""}`}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}   
                    >
                    <img
                        src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${guess.guessed_idol_data.image_path}?v=${guess.guessed_idol_data.image_version}`}
                        alt="Idol"
                        className="w-20 h-20 sm:w-28 sm:h-28 object-cover select-none" // object-cover kinda bugged (#TODO - fix later)
                        draggable={false}
                        style={{ 
                        transform: 'translate3d(0, 0, 0)',
                        backfaceVisibility: 'hidden',      
                        imageRendering: 'crisp-edges'
                        }}
                        loading={isMobile ? "lazy" : "eager"}
                    />
                    <span className="font-light absolute bottom-0.5 text-[9px] sm:text-[13px] text-white [text-shadow:0.6px_1.6px_4px_rgba(0,0,0,1),1px_1px_2px_rgba(0,0,0,0.9),2px_2px_4px_rgba(0,0,0,0.8)] px-1">
                        {guess.guessed_idol_data.artist_name}
                        {guess.guessed_idol_data.active_group && guess.guessed_idol_data.active_group !== "Soloist" ? (
                        <span className="font-light text-[9px] sm:text-[13px] text-white [text-shadow:0.6px_1.6px_4px_rgba(0,0,0,1),1px_1px_2px_rgba(0,0,0,0.9),2px_2px_4px_rgba(0,0,0,0.8)]"> ({guess.guessed_idol_data.active_group})</span>
                        ) : null}
                    </span>
            </MotionTag>

            {/* Groups Column */}
            <MotionTag
                {...getMotionProps(1, 2)}
                className={`${getStatusColor(guess.feedback.groups?.status)} relative w-20 h-20 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
                text-center rounded-2xl sm:rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-110 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
                    <span className="text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8),1px_1px_2px_rgba(26,26,26,0.5)]">
                    {Array.isArray(guess.guessed_idol_data.groups)
                        ? guess.guessed_idol_data.groups.map((groups, index) => (
                        <React.Fragment key={index}>
                            <span className={colorClasses("groups", groups)}>{groups}</span>
                            <br/>
                        </React.Fragment>
                        )
                    )
                    : guess.guessed_idol_data.groups}
                    </span>
            </MotionTag>

            {/* Company Column */}
            <MotionTag
                {...getMotionProps(2, 3)}
                className={`${getStatusColor(guess.feedback.companies?.status)} relative w-20 h-20 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
                text-center rounded-2xl sm:rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-110 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
                    <span className="text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8),1px_1px_2px_rgba(26,26,26,0.5)]">
                    {Array.isArray(guess.guessed_idol_data.companies)
                        ? guess.guessed_idol_data.companies.map((companies, index) => (
                        <React.Fragment key={index}>
                            <span className={colorClasses("companies", companies)}>
                                {formatCompanyName(companies)}
                            </span>
                            <br />
                        </React.Fragment>
                        )
                    )
                    : guess.guessed_idol_data.companies}
                    </span>
            </MotionTag>

            {/* Nationality Column */}
            <MotionTag
                {...getMotionProps(3, 4)}
                className={`${getStatusColor(guess.feedback.nationality?.status)} relative w-20 h-20 sm:h-28 sm:w-28 ${guess.guessed_idol_data.nationality.length >= 3 ? "flex flex-row flex-wrap content-center" : "flex flex-col"} items-center justify-center 
                text-center rounded-2xl sm:rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-110 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
                    <div className={`${guess.guessed_idol_data.nationality.length >= 3 ? "flex flex-row flex-wrap content-center gap-1.5 sm:gap-2" : "flex flex-col gap-2 sm:gap-3"} items-center justify-center`}>
                    {Array.isArray(guess.guessed_idol_data.nationality)
                        ? guess.guessed_idol_data.nationality.map(
                            (nationality, index) => {
                            const flagSrc = getNationalityFlag(nationality);
                            const isCorrect = guess.feedback.nationality?.status !== "correct" && guess.feedback.nationality?.correct_items?.includes(nationality);
                            const borderColor = isCorrect ? "border-2 border-[#4FFFB0]" : "";

                            if (flagSrc) {
                                return (
                                    <img 
                                    key={index}
                                    src={flagSrc} 
                                    alt={nationality}
                                    className={`${guess.guessed_idol_data.nationality.length === 1 ? "w-9 sm:w-12" : guess.guessed_idol_data.nationality.length === 2 ? "w-8 sm:w-10" : "w-7 sm:w-9"} rounded-md object-cover shadow-[1.6px_1.6px_3px_rgba(26,26,26,0.8),1px_1px_2px_rgba(26,26,26,0.5)]
                                    ${borderColor}`} 
                                    draggable={false} 
                                    loading={isMobile ? "lazy" : "eager"}
                                    />
                                )
                            }             
                            return (
                                <span 
                                key={index}
                                className="text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8),1px_1px_2px_rgba(26,26,26,0.5)]">
                                    {nationality}
                                </span>
                            );
                            }
                        )
                        : guess.guessed_idol_data.nationality}
                    </div>
            </MotionTag>

            {/* Birth Date Column */}
            <MotionTag
            {...getMotionProps(4, 5)}
            className={`${getStatusColor(guess.feedback.birth_date?.status)} relative w-20 h-20 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-2xl sm:rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-110 hover:cursor-default transform-3d perspective-[1000px] transform-gpu firefox:isolate`}>
                {guess.feedback.birth_date?.status !== "correct" && (
                <img src={getStatusIcon(guess.feedback.birth_date?.status)}
                alt="Birth Date"
                className="w-20 h-20 sm:w-28 sm:h-28 object-cover"
                draggable={false} 
                loading={isMobile ? "lazy" : "eager"} />
                )}
                <span className="absolute text-center text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8),1px_1px_2px_rgba(26,26,26,0.5)] px-0.5">{formatBirthDate(guess.guessed_idol_data.birth_date)}</span>
            </MotionTag>

            {/* Debut Year Column */}
            <MotionTag
            {...getMotionProps(5, 6)}
            className={`${getStatusColor(guess.feedback.idol_debut_year?.status)} relative w-20 h-20 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-2xl sm:rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-110 hover:cursor-default transform-3d perspective-[1000px] transform-gpu firefox:isolate`}>
                {guess.feedback.idol_debut_year?.status !== "correct" && (
                <img src={getStatusIcon(guess.feedback.idol_debut_year?.status)}
                alt="Debut" 
                className="w-20 h-20 sm:w-28 sm:h-28 object-cover"
                draggable={false} 
                loading={isMobile ? "lazy" : "eager"} />
                )}
                <span className="absolute text-center text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8),1px_1px_2px_rgba(26,26,26,0.5)]">{guess.guessed_idol_data.idol_debut_year}</span>
            </MotionTag>

            {/* Height Column */}
            <MotionTag
            {...getMotionProps(6, 7)}
            className={`${getStatusColor(guess.feedback.height?.status)} relative w-20 h-20 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-2xl sm:rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-110 hover:cursor-default transform-3d perspective-[1000px] transform-gpu firefox:isolate`}>
                {guess.feedback.height?.status !== "correct" && (
                <img src={getStatusIcon(guess.feedback.height?.status)}
                alt="Height"
                className="w-20 h-20 sm:w-28 sm:h-28 object-cover"
                draggable={false}
                loading={isMobile ? "lazy" : "eager"} />
                )}
                <span className="absolute text-center text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8),1px_1px_2px_rgba(26,26,26,0.5)]">{guess.guessed_idol_data.height} cm</span>
            </MotionTag>

            {/* Position(s) Column */}
            <MotionTag
            {...getMotionProps(7)}
            className={`${getStatusColor(guess.feedback.position?.status)} relative w-20 h-20 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-2xl sm:rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-110 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
                <span className={`text-white ${guess.guessed_idol_data.position.length >= 6 ? "text-[8px] sm:text-[12px]" : "text-[10px] sm:text-[14px]" } font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8),1px_1px_2px_rgba(26,26,26,0.5)]`}>
                {Array.isArray(guess.guessed_idol_data.position)
                    ? guess.guessed_idol_data.position.map((position, index) => (
                        <React.Fragment key={index}>
                            <span className={colorClasses("position", position)}>{position}</span>
                            <br />
                        </React.Fragment>
                    )
                )
                : guess.guessed_idol_data.position}
                </span>
            </MotionTag>
        </React.Fragment>
    );
};

export default React.memo(GuessRow, (prev, next) => {
    return prev.guess.guessed_idol_data.idol_id === next.guess.guessed_idol_data.idol_id &&
    prev.isLatest === next.isLatest && prev.isAnimated === next.isAnimated;
});