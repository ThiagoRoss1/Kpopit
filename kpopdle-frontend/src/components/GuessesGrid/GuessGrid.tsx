// Guesses Grid component
import React, { useState, useEffect } from "react";
import type {
  IdolListItem,
  GuessResponse,
} from "../../interfaces/gameInterfaces";
import ArrowUp from "../../assets/icons/arrow-fat-line-up-fill.svg";
import ArrowDown from "../../assets/icons/arrow-fat-line-down-fill.svg";
import { motion } from "motion/react";

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
  "Birth Year",
  "Debut Year",
  "Height",
  "Position(s)"
]

const GuessesGrid = (props: GuessesGridProps) => {
  const { guesses, onAllAnimationsComplete } = props; 
  const [animatingColumn, setAnimatingColumn] = useState<Map<number, number>>(new Map());
  const [animationEnd, setAnimationEnd] = useState<boolean>(false);

  const COL_GROUPS = 2;
  const COL_COMPANY = 3;
  const COL_NATIONALITY = 4;
  const COL_BIRTH_YEAR = 5;
  const COL_DEBUT_YEAR = 6;
  const COL_HEIGHT = 7;
  
  useEffect(() => {
    if (guesses.length > 0) {
      const latestGuess = guesses[guesses.length - 1];
      const idolId = latestGuess.guessed_idol_data.idol_id;
       
      setAnimatingColumn(prev => {
        const updated = new Map(prev);

        updated.forEach((_, id) => updated.set(id, 8));
        updated.set(idolId, 0);

        return updated;
      });

      setTimeout(() => {
        setAnimatingColumn(prev => new Map(prev).set(idolId, 1));
      }, 50);

      if (guesses.length >= 6 && !animationEnd) {
        setAnimationEnd(true);
      }
    }
  }, [guesses, animationEnd]);

  return (
    guesses.length > 0 && (
    <div className="w-full h-fit max-w-full sm:w-[960px] mx-auto sm:flex items-center overflow-x-auto">
      <div className="grid grid-cols-8 gap-4 p-4 justify-items-center items-center w-max mx-auto">
        {headers.map((header) => (
          <div key={header} className="font-bold text-[10px] sm:text-[16px] text-pretty text-center text-white w-full h-fit pb-1"> {/* see responsivity */}
            {header}
            <hr className="w-full h-fill sm:h-[4px] bg-white rounded-[20px] mt-2" />
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
              className="relative bg-[#ffffff] shadow-[0_0_10px_2px_rgba(255,255,255,0.1),0_0_10px_2px_rgba(255,255,255,0.1)] w-18 h-18 sm:h-28 sm:w-28 rounded-[18px] 
              flex flex-col items-center justify-center text-center border-2 border-white hover:brightness-120 hover:cursor-default hover:scale-105 transition-transform duration-300
              transform-gpu overflow-hidden">
                <img
                  src={`http://127.0.0.1:5000${guess.guessed_idol_data.image_path}`}
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
                </span>{" "}
            </motion.div>

            {/* Groups Column */}
            <motion.div 
            initial={{ rotateY: 90, opacity: 0 }}
            animate={currentColumn >= 1 ? { rotateY: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onAnimationComplete={() => {
              if (currentColumn === 1) {
                setAnimatingColumn(prev => new Map(prev).set(idolId, COL_GROUPS));
              }
            }}
            className={`${getStatusColor(guess.feedback.groups?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
              <p className="text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">
                {Array.isArray(guess.guessed_idol_data.groups)
                  ? guess.guessed_idol_data.groups.map((groups, index) => (
                      <React.Fragment key={index}>
                        {groups}
                        <br />
                      </React.Fragment>
                    ))
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
                setAnimatingColumn(prev => new Map(prev).set(idolId, COL_COMPANY));
              }
            }}
            className={`${getStatusColor(guess.feedback.companies?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
              <p className="text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">
                {Array.isArray(guess.guessed_idol_data.companies)
                  ? guess.guessed_idol_data.companies.map((companies, index) => (
                      <React.Fragment key={index}>
                        {companies}
                        <br />
                      </React.Fragment>
                    ))
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
                setAnimatingColumn(prev => new Map(prev).set(idolId, COL_NATIONALITY));
              }
            }}
            className={`${getStatusColor(guess.feedback.nationality?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
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

            {/* Birth Year Column */}
            <motion.div 
            initial={{ rotateY: 90, opacity: 0 }}
            animate={currentColumn >= 4 ? { rotateY: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onAnimationComplete={() => {
              if (currentColumn === 4) {
                setAnimatingColumn(prev => new Map(prev).set(idolId, COL_BIRTH_YEAR));
              }
            }}
            className={`${getStatusColor(guess.feedback.birth_year?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
              {guess.feedback.birth_year?.status !== "correct" && (
                <img src={getStatusIcon(guess.feedback.birth_year?.status)}
                alt="Birth Year"
                className="w-18 h-18 sm:w-28 sm:h-28 object-cover"
                draggable={false} />
              )}
              {/* TODO: Mudar no backend para birth date (dia / mes / ano) */}
              <span className="absolute text-center text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">{guess.guessed_idol_data.birth_year}</span>
            </motion.div>

            {/* Debut Year Column */}
            <motion.div 
            initial={{ rotateY: 90, opacity: 0 }}
            animate={currentColumn >= 5 ? { rotateY: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onAnimationComplete={() => {
              if (currentColumn === 5) {
                setAnimatingColumn(prev => new Map(prev).set(idolId, COL_DEBUT_YEAR));
              }
            }}
            className={`${getStatusColor(guess.feedback.idol_debut_year?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
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
                setAnimatingColumn(prev => new Map(prev).set(idolId, COL_HEIGHT));
              }
            }}
            className={`${getStatusColor(guess.feedback.height?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
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
                if (guess.guess_correct) {
                  onAllAnimationsComplete?.();
                }
              }
            }}
            className={`${getStatusColor(guess.feedback.position?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default transform-3d perspective-[1000px] transform-gpu`}>
              <p className="text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">
                {Array.isArray(guess.guessed_idol_data.position)
                  ? guess.guessed_idol_data.position.map((position, index) => {
                    const isCorrect = guess.feedback.position?.status !== "correct" && guess.feedback.position?.correct_items?.includes(position);
                    const isIncorrect = guess.feedback.position?.status !== "correct" && guess.feedback.position?.incorrect_items?.includes(position);
                    const colorClass = getPositionColor(isCorrect ? "correct_items" : isIncorrect ? "incorrect_items" : "");

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
