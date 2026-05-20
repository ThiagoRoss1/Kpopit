import type { GuessResponse, FeedbackData } from "../interfaces/gameInterfaces";

export const areGuessesEqual = (
    a: GuessResponse<Partial<FeedbackData>>[] | GuessResponse[],
    b: GuessResponse<Partial<FeedbackData>>[] | GuessResponse[],
): boolean => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].guessed_idol_data?.idol_id !== b[i].guessed_idol_data?.idol_id) {
            return false;
        }
    }
    return true;
};
