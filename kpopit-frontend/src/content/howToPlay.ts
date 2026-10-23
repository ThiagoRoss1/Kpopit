import type { ContentPage } from "./types";
import type { GameModeKey } from "../utils/gameStorage";

const DAILY_RESET = "A new challenge starts every day at midnight in New York (EST), the same for every player.";

export const HOW_TO_PLAY: Record<GameModeKey, ContentPage> = {
    classic: {
        title: "How to play Classic",
        intro: "Guess today's K-pop idol. It changes every 24 hours.",
        sections: [
            {
                heading: "Guessing",
                paragraphs: [
                    "Type an idol's name or group in the search bar (soloists can be found with \"Soloist\") and press Enter or the submit button.",
                    DAILY_RESET,
                ],
            },
            {
                heading: "Tiles",
                paragraphs: ["Each guess shows a row of tiles comparing that idol with today's idol:"],
                items: [
                    "Green: the attribute matches.",
                    "Yellow: a partial match (for example, one shared group or position).",
                    "Red: no match.",
                    "Arrows: today's idol has a higher or lower value (debut year, birth date, height, member count).",
                ],
            },
            {
                heading: "Categories",
                paragraphs: [
                    "Group shows every group the idol has been part of; only the current active group works as a search term.",
                    "Companies, nationality, debut year, birth date, height and positions follow the idol's profile on the Idols page.",
                ],
            },
            {
                heading: "Hints",
                paragraphs: ["Stuck? Hints unlock after some guesses, starting with the member count of the idol's group."],
            },
        ],
    },
    blurry: {
        title: "How to play Blurry",
        intro: "Guess today's K-pop idol from a blurred photo. It changes every 24 hours.",
        sections: [
            {
                heading: "Guessing",
                paragraphs: ["Type the idol's name in the search bar and press Enter or the submit button.", DAILY_RESET],
            },
            {
                heading: "The photo",
                paragraphs: ["The photo starts blurry and gets clearer with every wrong guess. Not every idol is in Blurry mode yet."],
                items: [
                    "Hardmode: the photo does NOT get clearer as you guess.",
                    "Color: reveals the photo's colors; it unlocks after 4 guesses.",
                ],
            },
        ],
    },
    pixelated: {
        title: "How to play Pixelated",
        intro: "Guess today's K-pop album from its pixelated cover. It changes every 24 hours.",
        sections: [
            {
                heading: "Guessing",
                paragraphs: ["Type an album or group in the search bar and pick the album.", DAILY_RESET],
            },
            {
                heading: "Hints",
                paragraphs: ["The cover gets less pixelated as you guess, and two hints unlock on the way:"],
                items: ["Release year, after 3 guesses.", "Artist, after 6 guesses."],
            },
        ],
    },
};
