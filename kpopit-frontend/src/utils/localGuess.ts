import type { GuessedIdolData, GuessResponse, IdolListItem } from "../interfaces/gameInterfaces";
import { calculateFeedback } from "./calculateFeedback.ts";

/** Maps an `/idols-list` item to the shape the feedback calculation expects (`id` → `idol_id`). */
export const toGuessedIdolData = (idol: IdolListItem): GuessedIdolData => ({
    ...idol,
    idol_id: idol.id,
});

/**
 * Resolves the daily payload's `answer_id` and the guessed id against the cached idol list and
 * builds the Classic guess result shown before the server answers. Null when either idol is
 * missing from the list.
 */
export const buildLocalClassicGuess = (
    allIdols: IdolListItem[],
    guessedId: number,
    answerId: number,
): GuessResponse | null => {
    const guessed = allIdols.find(idol => idol.id === guessedId);
    const answer = allIdols.find(idol => idol.id === answerId);
    if (!guessed || !answer) return null;

    const guessedIdolData = toGuessedIdolData(guessed);
    return {
        guess_correct: guessed.id === answerId,
        feedback: calculateFeedback(guessedIdolData, toGuessedIdolData(answer)),
        guessed_idol_data: guessedIdolData,
    };
};
