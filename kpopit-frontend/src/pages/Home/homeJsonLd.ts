// Structured data (schema.org) for the home page only; other pages carry their own (FAQPage is on /faq).
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
    "url": "https://kpopit.net/",
    "description": "Daily K-pop idol Wordle guessing game. Guess the idol based on clues about their group, company, career details, nationality and a lot more.",
    "applicationCategory": "Game",
    "keywords": "kpopdle, kpop wordle, kpop guessing game, daily kpop game, guess the idol, kpop quiz, kpop, game, wordle like, kpop idol guessing game",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "author": { "@type": "Organization", "name": "KpopIt" },
};

export const HOME_JSON_LD = [WEBSITE_LD, WEB_APPLICATION_LD];
