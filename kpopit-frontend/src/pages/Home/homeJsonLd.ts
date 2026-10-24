// Structured data (schema.org) for the home page only; other pages carry their own.
const ALTERNATE_NAMES = ["Kpop It", "KpopIt Daily"];

const WEBSITE_LD = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "KpopIt",
    "alternateName": ALTERNATE_NAMES,
    "url": "https://kpopit.net/",
};

const WEB_APPLICATION_LD = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "KpopIt",
    "alternateName": ALTERNATE_NAMES,
    "url": "https://kpopit.net",
    "description": "Daily K-pop idol Wordle guessing game. Guess the idol based on clues about their group, company, career details, nationality and a lot more.",
    "applicationCategory": "Game",
    "keywords": "kpopdle, kpop wordle, kpop guessing game, daily kpop game, guess the idol, kpop quiz, kpop, game, wordle like, kpop idol guessing game",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "author": { "@type": "Organization", "name": "KpopIt" },
};

const FAQ_LD = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {
            "@type": "Question",
            "name": "What is KpopIt?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "KpopIt is a free daily K-pop idol guessing game inspired by Wordle. Every day, a new mystery K-pop idol is selected and players guess who it is using clues about their group, company... It features over 150 idols from groups like TWICE, BLACKPINK, NewJeans, IVE, aespa, LE SSERAFIM. It features three game modes: Classic, Blurry and Pixelated, and it keeps expanding with new idols and games.",
            },
        },
        {
            "@type": "Question",
            "name": "How do you play KpopIt?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Type the name of a K-pop idol in the search bar and submit your guess. The game gives you color-coded feedback on each category on Classic Mode, for Blurry Mode, you guess the idol from a blurred photo that gets clearer with each attempt, and for Pixelated Mode, you guess the album from a pixelated cover. Use the clues to narrow down and find the mystery idol in as few attempts as possible.",
            },
        },
        {
            "@type": "Question",
            "name": "Is KpopIt the same as Kpopdle?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "KpopIt is a Kpopdle-style game - a daily K-pop Wordle where you guess K-pop idols. It features three game modes: Classic (guess using category clues), Blurry (guess from a blurred idol photo that gets clearer with each attempt) and Pixelated (guess the album from its pixelated cover).",
            },
        },
        {
            "@type": "Question",
            "name": "Is KpopIt free to play?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, KpopIt is completely free to play. A new challenge is available in every mode every day at midnight EST. No account or download required.",
            },
        },
        {
            "@type": "Question",
            "name": "What game modes does KpopIt have?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "KpopIt has three game modes: Classic Mode, where you guess the idol using category-based clues like group, company, nationality and debut year; Blurry Mode, where you guess the idol from a blurred photo that gradually becomes clearer with each wrong guess (with Hardcore and Grayscale options for extra challenge); and Pixelated Mode, where you guess the album of the day from a pixelated cover.",
            },
        },
    ],
};

export const HOME_JSON_LD = [WEBSITE_LD, WEB_APPLICATION_LD, FAQ_LD];
