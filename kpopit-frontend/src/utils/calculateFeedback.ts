import type { FeedbackData, FeedbackItem, GuessedIdolData } from "../interfaces/gameInterfaces";

const partialFeedback = (guess: string[], answer: string[]): FeedbackItem => {
    const guessSet = new Set(guess.map(item => item.trim()));
    const answerSet = new Set(answer.map(item => item.trim()));

    if (guessSet.size === answerSet.size &&
        [...guessSet].every(item => answerSet.has(item))) {
            return {
                status: 'correct',
                correct_items: Array.from(guessSet),
                incorrect_items: []
            };
        }

    const correctItems = [...guessSet].filter(item => answerSet.has(item));
    if (correctItems.length > 0) {
        return {
            status: 'partial',
            correct_items: correctItems,
            incorrect_items: [...guessSet].filter(item => !answerSet.has(item))
        };
    }

    return {
        status: 'incorrect',
        correct_items: [],
        incorrect_items: Array.from(guessSet)
    };
};

const numericalFeedback = (guessVal: number | null, answerVal: number | null, displayGuess?: string | number): FeedbackItem => {
    const valueToDisplay = displayGuess !== undefined ? displayGuess.toString() : (guessVal?.toString() || "");
    
    if (guessVal === null || answerVal === null) {
        return {
            status: 'incorrect',
            correct_items: [],
            incorrect_items: []
        };
    }

    if (guessVal > answerVal) {
        return {
            status: 'higher',
            correct_items: [],
            incorrect_items: [valueToDisplay]
        };
    }

    if (guessVal < answerVal) {
        return {
            status: 'lower',
            correct_items: [],
            incorrect_items: [valueToDisplay]
        };
    }
    
    return {
        status: 'correct',
        correct_items: [valueToDisplay],
        incorrect_items: []
    };
}

export const calculateFeedback = (
    guessedIdol: GuessedIdolData,
    answerIdol: GuessedIdolData
): FeedbackData => {
    return {
        position: partialFeedback(guessedIdol.position, answerIdol.position),
        nationality: partialFeedback(guessedIdol.nationality, answerIdol.nationality),
        groups: partialFeedback(guessedIdol.groups, answerIdol.groups),
        companies: partialFeedback(guessedIdol.companies, answerIdol.companies),

        idol_debut_year: numericalFeedback(
            guessedIdol.idol_debut_year,
            answerIdol.idol_debut_year
        ),
        height: numericalFeedback(guessedIdol.height, answerIdol.height),
        birth_date: numericalFeedback(
            guessedIdol.birth_date ? new Date(guessedIdol.birth_date).getTime() : null,
            answerIdol.birth_date ? new Date(answerIdol.birth_date).getTime() : null,
            guessedIdol.birth_date
        ),
        member_count: numericalFeedback(
            guessedIdol.member_count ?? null,
            answerIdol.member_count ?? null
        ),

        artist_name: guessedIdol.artist_name === answerIdol.artist_name
            ? { status: 'correct', correct_items: [guessedIdol.artist_name], incorrect_items: [] }
            : { status: 'incorrect', correct_items: [], incorrect_items: [guessedIdol.artist_name] },

        gender: guessedIdol.gender === answerIdol.gender
            ? { status: 'correct', correct_items: [guessedIdol.gender], incorrect_items: [] }
            : { status: 'incorrect', correct_items: [], incorrect_items: [guessedIdol.gender] }
    };
};

