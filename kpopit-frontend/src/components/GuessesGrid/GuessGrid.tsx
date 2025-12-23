// Guesses Grid component
import React, { useState, useMemo } from "react";
import type {
  IdolListItem,
  GuessResponse,
} from "../../interfaces/gameInterfaces";
import GuessRow from "./GuessRow";

interface GuessesGridProps {
  guesses: GuessResponse[];
  allIdols: IdolListItem[];
  onAllAnimationsComplete: () => void;
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

const getStoredAnimatedIdols = (): Set<number> => {
  const stored = localStorage.getItem("animatedIdols");
  if (!stored) return new Set();

  try {
    const parsed = JSON.parse(stored) as number[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

const GuessesGrid = React.memo((props: GuessesGridProps) => {
  const { guesses, onAllAnimationsComplete } = props; 

  const [animatedIdols, setAnimatedIdols] = useState<Set<number>>(getStoredAnimatedIdols());

  const handleIdolAnimated = (idolId: number) => {
    setAnimatedIdols(prev => {
      if (prev.has(idolId)) return prev;
      
      const updated = new Set(prev);
      updated.add(idolId);
      localStorage.setItem("animatedIdols", JSON.stringify(Array.from(updated)));
      return updated;
    });
  };

  const reversedGuesses = useMemo(() => {
    return [...guesses].reverse();
  }, [guesses]);

  if (guesses.length === 0) return null;

  return (
    <div className="w-full h-fit sm:w-260 mx-auto sm:flex items-center overflow-x-auto pb-4 sm:pb-0">
      <div className="grid grid-cols-8 gap-y-4 sm:gap-y-8 gap-x-1.5 sm:gap-x-2.5 p-2 sm:p-4 justify-items-center items-center w-max mx-auto">
        {headers.map((header) => (
          <div key={header} className="font-bold text-[12px] sm:text-[16px] text-pretty text-center text-white w-full h-fit pb-1 sm:pb-1 -mb-3 sm:-mb-5"> {/* see responsivity */}
            {header}
            <hr className="w-full h-fill sm:h-1 bg-white rounded-[20px] mt-2" />
          </div>
        ))}
        
        {/* <div className="columns-8 gap-2 w-full h-[2px] sm:h-[4px] justify-items-center items-center bg-amber-800"></div> */}
        
        {reversedGuesses.map((guess, index) => {
          const idolId = guess.guessed_idol_data.idol_id;
          const isLatest = index === 0;
          const isAnimated = animatedIdols.has(idolId);

          return (
            <GuessRow
              key={idolId}
              guess={guess}
              isLatest={isLatest}
              isAnimated={isAnimated}
              onIdolAnimated={handleIdolAnimated}
              onAnimationComplete={isLatest ? onAllAnimationsComplete : undefined}
              />
        );
        })}
      </div>
  </div>
  );
});

export default GuessesGrid;
