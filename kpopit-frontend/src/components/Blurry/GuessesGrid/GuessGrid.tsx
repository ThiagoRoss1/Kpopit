import React, { useState, useMemo } from "react";
import type { FeedbackData, GuessResponse } from "../../../interfaces/gameInterfaces";
import GuessRow from "./GuessRow";

interface GuessGridProps {
    guesses: GuessResponse<Partial<FeedbackData>>[];
    onAnimationComplete?: () => void;
}

const getStoredAnimatedIdols = (): Set<number> => {
    const stored = localStorage.getItem("blurryAnimatedIdols");
    if (!stored) return new Set();

    try {
        const parsed = JSON.parse(stored) as number[];
        return new Set(parsed);
    } catch {
        return new Set();
    }
}

const GuessGrid = (props: GuessGridProps) => {
    const { guesses, onAnimationComplete } = props;

    const [animatedIdols, setAnimatedIdols] = useState<Set<number>>(getStoredAnimatedIdols());

    const handleIdolAnimated = (idolId: number) => {
        setAnimatedIdols(prev => {
            if (prev.has(idolId)) return prev;

            const updated = new Set(prev);
            updated.add(idolId);
            localStorage.setItem("blurryAnimatedIdols", JSON.stringify(Array.from(updated)));

            return updated;
        });
    };

    const reversedGuesses = useMemo(() => {
        return [...guesses].reverse();
    }, [guesses]);

    if (guesses.length === 0) return null;

    return (
        <div className="w-full h-fit flex flex-col items-center justify-center gap-4 px-4">
            {reversedGuesses.map((guess, index) => (
                <GuessRow
                    key={guess.guessed_idol_data.idol_id}
                    guess={guess}
                    isLatest={index === 0}
                    isAnimated={animatedIdols.has(guess.guessed_idol_data.idol_id)}
                    onIdolAnimated={handleIdolAnimated}
                    onAnimationComplete={index === 0 ? onAnimationComplete : undefined}
                />
            ))}
        </div>
    )
}

export default React.memo(GuessGrid, (prev, next) => {
    if (prev.guesses.length !== next.guesses.length) return false;

    const prevLast = prev.guesses[prev.guesses.length - 1];
    const nextLast = next.guesses[next.guesses.length - 1];

    return prevLast?.guessed_idol_data.idol_id === nextLast?.guessed_idol_data.idol_id;
});