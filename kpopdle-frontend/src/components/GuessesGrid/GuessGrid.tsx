// Guesses Grid component
import React, { useState, useEffect } from "react";
import type {
  IdolListItem,
  GuessResponse,
} from "../../interfaces/gameInterfaces";
import ArrowUp from "../../assets/icons/arrow-fat-line-up-fill.svg";
import ArrowDown from "../../assets/icons/arrow-fat-line-down-fill.svg";
import { motion } from "motion/react";
import { useDateLocale } from "../../hooks/useDateLocale";

interface GuessesGridProps {
  guesses: GuessResponse[];
  allIdols: IdolListItem[];
  onAllAnimationsComplete: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "correct":
      return "bg-[#4FFFB0] shadow-[0_0_10px_2px_rgba(79,255,176,0.15),0_0_10px_2px_rgba(79,255,176,0.15)] backdrop-blur-md";

    case "partial":
        return "bg-[#f3e563] shadow-[0_0_10px_2px_rgba(243,229,99,0.15),0_0_10px_2px_rgba(243,229,99,0.15)] backdrop-blur-md";

    case "incorrect":
      return "bg-[#fd5c63] shadow-[0_0_10px_2px_rgba(253,92,99,0.15),0_0_10px_2px_rgba(253,92,99,0.15)] backdrop-blur-md";

    case "higher":
      return "bg-[#fd5c63] shadow-[0_0_10px_2px_rgba(253,92,99,0.15),0_0_10px_2px_rgba(253,92,99,0.15)] backdrop-blur-md";

    case "lower":
      return "bg-[#fd5c63] shadow-[0_0_10px_2px_rgba(253,92,99,0.15),0_0_10px_2px_rgba(253,92,99,0.15)] backdrop-blur-md";

    default:
      return "bg-gray-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-md";
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

const headers = [
  "Idol",
  "Group(s)",
  "Company",
  "Nationality",
  "Birth Date",
  "Debut Year",
  "Height",
  "Position(s)"
]

const GuessesGrid = (props: GuessesGridProps) => {
  const { guesses, onAllAnimationsComplete } = props; 
  const [animatingColumn, setAnimatingColumn] = useState<Map<number, number>>(new Map());
  const [animatedIdols, setAnimatedIdols] = useState<Set<number>>(new Set());

  const { formatBirthDate } = useDateLocale();

  useEffect(() => {
    const stored = localStorage.getItem("animatedIdols");
    if (stored) {
      const parsed = JSON.parse(stored) as number[];
      setAnimatedIdols(new Set(parsed));
    }
  }, []);

  const COL = {
    GROUPS: 2,
    COMPANY: 3,
    NATIONALITY: 4,
    BIRTH_DATE: 5,
    DEBUT_YEAR: 6,
    HEIGHT: 7,
  } as const;

  const colorClasses = (guess: GuessResponse, attribute: string, itemValue: string) => {
    const fieldFeedback = guess.feedback[attribute as keyof typeof guess.feedback];

    if (!fieldFeedback) return "";
    
    const isCorrect = fieldFeedback.status !== "correct" && fieldFeedback.correct_items?.includes(itemValue);
    const isIncorrect = fieldFeedback.status !== "correct" && fieldFeedback.incorrect_items?.includes(itemValue);

    return getPositionColor(isCorrect ? "correct_items" : isIncorrect ? "incorrect_items" : "");
  }
  
  useEffect(() => {
    if (guesses.length === 0) return;

      const latestGuess = guesses[guesses.length - 1];
      const latestIdolId = latestGuess.guessed_idol_data.idol_id;

      if (animatedIdols.has(latestIdolId)) {
        setAnimatingColumn(prev => {
          const updated = new Map(prev);
          updated.set(latestIdolId, 8);
          return updated;
        });
        return;
      }
       
      setAnimatingColumn(prev => {
        const updated = new Map(prev);

        guesses.forEach(guess => {
          const idolId = guess.guessed_idol_data.idol_id;

          if (idolId !== latestIdolId) {
            updated.set(idolId, 8);
          }
        });

        updated.set(latestIdolId, 0);

        return updated;
      });

      const timeout = setTimeout(() => {
        setAnimatingColumn(prev => {
          const updated = new Map(prev);
          updated.set(latestIdolId, 1);
          return updated;
      });
    }, 50);

    return () => clearTimeout(timeout);
      

      // TODO: Skip animation cache
  }, [guesses, animatedIdols]);

  return (
    guesses.length > 0 && (
    <div className="w-full h-fit sm:w-[1040px] mx-auto sm:flex items-center overflow-x-auto pb-4 sm:pb-0">
      <div className="grid grid-cols-8 gap-y-4 sm:gap-y-8 gap-x-1.5 sm:gap-x-2.5 p-2 sm:p-4 justify-items-center items-center w-max mx-auto">
        {headers.map((header) => (
          <div key={header} className="font-bold text-[12px] sm:text-[16px] text-pretty text-center text-white w-full h-fit pb-1 sm:pb-1 -mb-3 sm:-mb-5"> {/* see responsivity */}
            {header}
            <hr className="w-full h-fill sm:h-1 bg-white rounded-[20px] mt-2" />
          </div>
        ))}
        

        {/* <div className="columns-8 gap-2 w-full h-[2px] sm:h-[4px] justify-items-center items-center bg-amber-800"></div> */}
        
        {[...guesses].reverse().map((guess) => {
          const idolId = guess.guessed_idol_data.idol_id;
          const currentColumn = animatingColumn.get(idolId) || 0;

          return (
          <React.Fragment key={idolId}>

            {/* Idol Image and Name */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.01, ease: [0.34, 1.56, 0.64, 1] }}        
              className="relative bg-[#ffffff] shadow-[0_0_10px_2px_rgba(255,255,255,0.1),0_0_10px_2px_rgba(255,255,255,0.1)] w-18 h-18 sm:h-28 sm:w-28 rounded-2xl sm:rounded-[18px] 
              flex flex-col items-center justify-center text-center border-2 border-white hover:brightness-110 hover:cursor-default hover:scale-105 transition-transform duration-300
              transform-gpu overflow-hidden">
                <img
                  src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${guess.guessed_idol_data.image_path}`}
                  alt="Placeholder"
                  className="w-18 h-18 sm:w-28 sm:h-28 object-cover select-none" // object-cover kinda bugged (#TODO - fix later)
                  draggable={false}
                  style={{ 
                    transform: 'translate3d(0, 0, 0)',
                    backfaceVisibility: 'hidden',      
                    imageRendering: 'crisp-edges'
                  }}
                />
                <span className="font-light absolute bottom-0.5 text-[10px] sm:text-[14px] text-white [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">
                  {guess.guessed_idol_data.artist_name}
                  {guess.guessed_idol_data.active_group && guess.guessed_idol_data.active_group !== "Soloist" ? (
                    <span className="font-light text-[10px] sm:text-[14px] text-white [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]"> ({guess.guessed_idol_data.active_group})</span>
                  ) : null}
                </span>{" "}
            </motion.div>

            {/* Groups Column */}
            <motion.div 
            initial={{ rotateY: 90, opacity: 0 }}
            animate={currentColumn >= 1 ? { rotateY: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onAnimationComplete={() => {
              if (currentColumn === 1) {
                setAnimatingColumn(prev => new Map(prev).set(idolId, COL.GROUPS));
              }
            }}
            className={`${getStatusColor(guess.feedback.groups?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-2xl sm:rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-110 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
              <p className="text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">
                {Array.isArray(guess.guessed_idol_data.groups)
                  ? guess.guessed_idol_data.groups.map((groups, index) => {
                    const colorClass = colorClasses(guess, "groups", groups);
                    return (
                      <React.Fragment key={index}>
                        <span className={colorClass}>{groups}</span>
                        <br />
                      </React.Fragment>
                    );
                  })
                  : guess.guessed_idol_data.groups}
              </p>
            </motion.div>

            {/* Company Column */}
            <motion.div 
            initial={{ rotateY: 90, opacity: 0 }}
            animate={currentColumn >= 2 ? { rotateY: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onAnimationComplete={() => {
              if (currentColumn === 2) {
                setAnimatingColumn(prev => new Map(prev).set(idolId, COL.COMPANY));
              }
            }}
            className={`${getStatusColor(guess.feedback.companies?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-2xl sm:rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-110 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
              <p className="text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">
                {Array.isArray(guess.guessed_idol_data.companies)
                  ? guess.guessed_idol_data.companies.map((companies, index) => {
                    const colorClass = colorClasses(guess, "companies", companies);

                    return (
                      <React.Fragment key={index}>
                        <span className={colorClass}>{companies}</span>
                        <br />
                      </React.Fragment>
                    );
                  })
                  : guess.guessed_idol_data.companies}
              </p>
            </motion.div>

            {/* Nationality Column */}
            <motion.div 
            initial={{ rotateY: 90, opacity: 0 }}
            animate={currentColumn >= 3 ? { rotateY: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onAnimationComplete={() => {
              if (currentColumn === 3) {
                setAnimatingColumn(prev => new Map(prev).set(idolId, COL.NATIONALITY));
              }
            }}
            className={`${getStatusColor(guess.feedback.nationality?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-2xl sm:rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-110 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
              <p className="text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">
                {Array.isArray(guess.guessed_idol_data.nationality)
                  ? guess.guessed_idol_data.nationality.map(
                      (nationality, index) => (
                        <React.Fragment key={index}>
                          {nationality}
                          <br />
                        </React.Fragment>
                      )
                    )
                  : guess.guessed_idol_data.nationality}
              </p>
            </motion.div>

            {/* Birth Date Column */}
            <motion.div 
            initial={{ rotateY: 90, opacity: 0 }}
            animate={currentColumn >= 4 ? { rotateY: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onAnimationComplete={() => {
              if (currentColumn === 4) {
                setAnimatingColumn(prev => new Map(prev).set(idolId, COL.BIRTH_DATE));
              }
            }}
            className={`${getStatusColor(guess.feedback.birth_date?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-2xl sm:rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-110 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
              {guess.feedback.birth_date?.status !== "correct" && (
                <img src={getStatusIcon(guess.feedback.birth_date?.status)}
                alt="Birth Date"
                className="w-18 h-18 sm:w-28 sm:h-28 object-cover"
                draggable={false} />
              )}
              {/* TODO: Mudar no backend para birth date (dia / mes / ano) */}
              <span className="absolute text-center text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">{formatBirthDate(guess.guessed_idol_data.birth_date)}</span>
            </motion.div>

            {/* Debut Year Column */}
            <motion.div 
            initial={{ rotateY: 90, opacity: 0 }}
            animate={currentColumn >= 5 ? { rotateY: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onAnimationComplete={() => {
              if (currentColumn === 5) {
                setAnimatingColumn(prev => new Map(prev).set(idolId, COL.DEBUT_YEAR));
              }
            }}
            className={`${getStatusColor(guess.feedback.idol_debut_year?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-2xl sm:rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-110 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
              {guess.feedback.idol_debut_year?.status !== "correct" && (
                <img src={getStatusIcon(guess.feedback.idol_debut_year?.status)}
                alt="Debut" 
                className="w-18 h-18 sm:w-28 sm:h-28 object-cover"
                draggable={false} />
                )}
                <span className="absolute text-center text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">{guess.guessed_idol_data.idol_debut_year}</span>
            </motion.div>

            {/* Height Column */}
            <motion.div 
            initial={{ rotateY: 90, opacity: 0 }}
            animate={currentColumn >= 6 ? { rotateY: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onAnimationComplete={() => {
              if (currentColumn === 6) {
                setAnimatingColumn(prev => new Map(prev).set(idolId, COL.HEIGHT));
              }
            }}
            className={`${getStatusColor(guess.feedback.height?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-2xl sm:rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-110 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
              {guess.feedback.height?.status !== "correct" && (
                <img src={getStatusIcon(guess.feedback.height?.status)}
                alt="Height"
                className="w-18 h-18 sm:w-28 sm:h-28 object-cover"
                draggable={false} />
              )}
              <span className="absolute text-center text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">{guess.guessed_idol_data.height} cm</span>
            </motion.div>

            {/* Position(s) Column */}
            <motion.div 
            initial={{ rotateY: 90, opacity: 0 }}
            animate={currentColumn >= 7 ? { rotateY: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onAnimationComplete={() => {
              if (currentColumn === 7 ) {
                setAnimatedIdols(prev => {
                  const updated = new Set(prev);
                  updated.add(idolId);
                  localStorage.setItem("animatedIdols", JSON.stringify([...updated]));
                  return updated;
                });
                if (guess.guess_correct) {
                  onAllAnimationsComplete?.();
                }
              }
            }}
            className={`${getStatusColor(guess.feedback.position?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-2xl sm:rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-110 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
              <p className="text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">
                {Array.isArray(guess.guessed_idol_data.position)
                  ? guess.guessed_idol_data.position.map((position, index) => {
                    const colorClass = colorClasses(guess, "position", position);
                    return (
                      <React.Fragment key={index}>
                        <span className={colorClass}>{position}</span>
                        <br />
                      </React.Fragment>
                    );
                  })
                  : guess.guessed_idol_data.position}
              </p>
            </motion.div>
          </React.Fragment>
        )
        })}
      </div>
  </div>
  ));
};

export default GuessesGrid;
