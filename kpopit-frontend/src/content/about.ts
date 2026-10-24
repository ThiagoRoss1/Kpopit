import type { ContentPage } from "./types";

export const ABOUT: ContentPage = {
    title: "About KpopIt",
    intro: "KpopIt is a daily K-pop guessing game inspired by Wordle, made by ThiagoRoss1, a K-pop fan and Computer Science student.",
    sections: [
        {
            heading: "The game",
            paragraphs: [
                "Every day there is one challenge per mode, the same for every player in the world. It resets at midnight in New York (EST).",
                "Classic asks you to find the idol of the day by comparing attributes, Blurry shows a photo that gets clearer with each guess, and Pixelated hides an album cover behind pixels.",
            ],
        },
        {
            heading: "Game data",
            paragraphs: ["Every idol, group and company in the game can be browsed on the Idols page."],
        },
        {
            heading: "Inspiration",
            paragraphs: [
                "The idea came from word-guessing games: why not a Wordle-like game for K-pop fans?",
                "The games that inspired it the most were Onepiecedle and Kpople.",
            ],
        },
        {
            heading: "Contact",
            paragraphs: ["Questions, feedback or wrong idol info: use the Contact page or send a DM on X (@TgoRoss1)."],
        },
    ],
};
