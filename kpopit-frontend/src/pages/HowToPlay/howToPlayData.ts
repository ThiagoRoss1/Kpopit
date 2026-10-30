// Facts the How to play page shows. Hint thresholds and levels match the game pages.
export type HowToMode = "classic" | "blurry" | "pixelated";
export const MODES: HowToMode[] = ["classic", "blurry", "pixelated"];

export const parseMode = (value: string | null): HowToMode =>
    MODES.includes(value as HowToMode) ? (value as HowToMode) : "classic";

/** Guesses before each hint unlocks (Classic AnswerHintsBox, Blurry ModeOptions, Pixelated hints). */
export const HINT_AT = { classic: [6, 8], blurryColor: 4, pixelated: [3, 6] } as const;

export const FEEDBACK = {
    correct: { label: "Correct", bg: "#4FFFB0", edge: "#15803D" },
    partial: { label: "Partially correct", bg: "#F3E563", edge: "#A16207" },
    incorrect: { label: "Incorrect", bg: "#FD5C63", edge: "#B91C1C" },
} as const;

type Tone = keyof typeof FEEDBACK;
interface ExampleRow { name: string; image: string; cells: { value: string; tone: Tone; arrow?: boolean }[] }

// Two real idols (game data): the miss shows every kind of tile, the hit is all green.
export const CLASSIC_EXAMPLE: { columns: string[]; miss: ExampleRow; hit: ExampleRow; missNote: string } = {
    columns: ["Idol", "Group(s)", "Company", "Nationality", "Birth Date", "Debut Year", "Height", "Position(s)"],
    miss: {
        name: "Kwon Eunbi",
        image: "/images/idols/eunbi.webp",
        cells: [
            { value: "IZ*ONE\nSoloist", tone: "partial" },
            { value: "Woollim", tone: "incorrect" },
            { value: "South Korea", tone: "correct" },
            { value: "1995", tone: "incorrect", arrow: true },
            { value: "2018", tone: "correct" },
            { value: "158 cm", tone: "incorrect", arrow: true },
            { value: "Leader\nMain Dancer", tone: "partial" },
        ],
    },
    hit: {
        name: "Kim Chaewon",
        image: "/images/idols/chaewon.webp",
        cells: [
            { value: "LE SSERAFIM\nIZ*ONE", tone: "correct" },
            { value: "Source Music", tone: "correct" },
            { value: "South Korea", tone: "correct" },
            { value: "2000", tone: "correct" },
            { value: "2018", tone: "correct" },
            { value: "164 cm", tone: "correct" },
            { value: "Leader\nVocalist", tone: "correct" },
        ],
    },
    missNote: "Not quite. Nationality and debut year match, IZ*ONE and Leader are partly right, and the arrows say today's idol is younger and taller.",
};

export const CATEGORIES: { name: string; text: string; sample: string; tone: Tone; notes?: string[]; wide?: boolean }[] = [
    { name: "Group(s)", text: "Every group the idol has been part of, whether they're active or not.", sample: "LE SSERAFIM\nIZ*ONE", tone: "correct", wide: true, notes: ["Solo artists show as \"Soloist\".", "Only the currently active group works as a search term."] },
    { name: "Company", text: "The company and label the idol is currently under.", sample: "Source\nMusic", tone: "correct" },
    { name: "Nationality", text: "The idol's nationality (or nationalities).", sample: "KR", tone: "correct" },
    { name: "Birth date", text: "The idol's birth date.", sample: "2000", tone: "incorrect" },
    { name: "Debut year", text: "The year the idol officially debuted in the industry, not their current group.", sample: "2018", tone: "incorrect" },
    { name: "Height", text: "The idol's height, in centimetres.", sample: "164", tone: "partial" },
    { name: "Position(s)", text: "The idol's position(s) in their group(s).", sample: "Leader", tone: "partial" },
];
