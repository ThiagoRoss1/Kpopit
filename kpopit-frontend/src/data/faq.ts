// FAQ: one source for the /faq page and its FAQPage JSON-LD, so the two never drift.
import type { Features } from "../utils/features.ts";
import type { ChannelId } from "./contact.ts";

export interface FaqLink {
    label: string;
    to: string;
}

export interface FaqItem {
    question: string;
    answer: string;
    links?: (FaqLink | ChannelId)[];
    /** Shown only while this feature is on. */
    feature?: keyof Features;
}

export interface FaqGroup {
    title: string;
    korean: string;
    items: FaqItem[];
}

export const FAQ: FaqGroup[] = [
    {
        title: "GETTING STARTED",
        korean: "시작",
        items: [
            { question: "What is KpopIt?", answer: "KpopIt is a free daily K-pop guessing game inspired by Wordle. Every day there is a new mystery idol to find, and everyone gets the same one. It has over 150 idols from groups like TWICE, BLACKPINK, NewJeans, IVE, aespa and LE SSERAFIM, and it keeps growing with new idols and modes." },
            { question: "Is KpopIt the same as Kpopdle?", answer: "KpopIt is a Kpopdle-style game: a daily K-pop Wordle where you guess idols. It has its own modes (Classic, Blurry and Pixelated) and its own idol catalogue." },
            { question: "Is KpopIt free to play?", answer: "Yes, completely free. There's nothing to download and you don't need an account to play." },
        ],
    },
    {
        title: "PLAYING",
        korean: "게임",
        items: [
            { question: "How do you play KpopIt?", answer: "Type an idol's name in the search bar and send your guess. In Classic, every category changes colour to show how close you are. In Blurry, the photo gets clearer after each wrong guess. In Pixelated, the album cover gets less pixelated. Use the clues to find the answer in as few tries as possible.", links: [{ label: "How to play", to: "/how-to-play" }] },
            { question: "What game modes does KpopIt have?", answer: "Classic: guess the idol from clues like group, company, nationality and debut year. Blurry: guess from a blurred photo that clears up with each try, with a Hardmode option that keeps it blurred and a Color option after 4 guesses. Pixelated: guess the album from a pixelated cover.", links: [{ label: "Classic", to: "/how-to-play" }, { label: "Blurry", to: "/how-to-play?mode=blurry" }, { label: "Pixelated", to: "/how-to-play?mode=pixelated" }] },
            { question: "When does a new idol come out?", answer: "Every day at midnight Eastern Time (UTC-5). The answer is the same for everyone, so you can compare results with friends." },
            { question: "Can I play days I missed?", answer: "Yes, from the calendar. Past days count as wins in your stats but never for your streak, and they give less Idol XP.", links: [{ label: "Open the calendar", to: "/calendar" }], feature: "calendar" },
        ],
    },
    {
        title: "ACCOUNT",
        korean: "계정",
        items: [
            { question: "Do I need an account?", answer: "No, you can play without one. An account keeps your stats and history on every device you log in on, and the games you played before signing up stay with you." },
            { question: "What data does KpopIt keep?", answer: "Only what the game needs: your guesses and results, your settings, and your profile if you make an account. Nothing is sold. You can delete your account at any time; it's removed for good after 15 days.", links: [{ label: "Privacy policy", to: "/privacy-policy" }] },
            { question: "What is Idol XP?", answer: "Pick an idol and every game you finish gives them XP. Games finished with no idol picked fill your potion, which you can pour into any idol. Guests fill the potion too, but need an account to pick an idol.", links: [{ label: "Idol XP", to: "/idol-xp" }], feature: "idol_xp" },
        ],
    },
    {
        title: "GAME DATA",
        korean: "데이터",
        items: [
            { question: "Where can I see every idol and album?", answer: "On the Idols and Albums pages, with search and filters.", links: [{ label: "All idols", to: "/idols" }, { label: "All albums", to: "/albums" }] },
            { question: "How do I report wrong data or a bug?", answer: "Send the idol name and the correct info (or what went wrong) on Discord, X or by email. A screenshot helps a lot!", links: ["discord", "x", "email", { label: "Contact page", to: "/contact" }] },
        ],
    },
];

/** The groups and questions visible with these features on (empty groups dropped). */
export function visibleFaq(features: Features): FaqGroup[] {
    return FAQ.map((g) => ({ ...g, items: g.items.filter((i) => !i.feature || features[i.feature]) })).filter((g) => g.items.length > 0);
}

export function faqJsonLd(groups: FaqGroup[]) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: groups.flatMap((g) => g.items).map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
    };
}
