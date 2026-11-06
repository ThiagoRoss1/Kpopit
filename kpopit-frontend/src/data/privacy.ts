// The privacy policy, statement by statement. Every line must match how the app handles data;
// change the policy here and UPDATED together.
// Placeholder date until the policy text is reviewed for launch.
export const UPDATED = "Oct 30, 2026";

export interface PrivacySection {
    id: string;
    title: string;
    short: string;
    body: string;
    list?: string[];
}

export const PRIVACY_INTRO = "KpopIt is a fan project made by one person. It keeps only what the game needs to work, and never sells your data.";

export const PRIVACY: PrivacySection[] = [
    {
        id: "collect",
        title: "What I collect",
        short: "Your games, and an account only if you make one.",
        body: "The first time you play, KpopIt gives your browser a random player ID. It's stored in your browser and only ever sent to KpopIt over HTTPS. With it the server saves each daily game: your guesses in order, whether you won, how many tries it took, when you started and finished, and your streaks and collection cards. If you create an account, I also keep:",
        list: [
            "Your username, display name and email (used to log in, verify your address and reset your password)",
            "Your password, stored only as a secure hash, never in plain text",
            "Your avatar (a photo you upload or an idol picture) and your bias idol and group",
            "Your Idol XP picks and your privacy switches",
        ],
    },
    {
        id: "use",
        title: "How I use it",
        short: "To run the game, nothing else.",
        body: "Your data powers your stats, history, profile, calendar, collection and Idol XP. Visits are counted in aggregate by Vercel Web Analytics and Cloudflare (pages viewed, country, device type, where the visit came from), never tied to your player ID or account. KpopIt's own database doesn't store your country, device or IP address.",
        list: [
            "Save your progress and restore today's game on another device",
            "Show your stats, history and profile",
            "Keep the game fair and limit abuse (your IP address is used for short-lived rate limits)",
            "Send you account emails, like verification and password reset",
            "Let you move your progress to another device with a transfer code",
        ],
    },
    {
        id: "never",
        title: "What I never do",
        short: "No selling, no ads, no tracking across sites.",
        body: "Your data stays inside KpopIt and the services that run it (below).",
        list: ["Sell your data", "Use it for advertising", "Track you on other websites", "Use advertising cookies"],
    },
    {
        id: "see",
        title: "Who can see it",
        short: "Only what you make public.",
        body: "With an account you get a public profile page, controlled by three switches in your settings: Public profile (whether anyone else can open it at all), Match history (whether visitors see your past games) and Activity (whether visitors see your activity calendar). New accounts start with the profile public; accounts made before these switches start private. In a public match history, a visitor only sees a day's answer if they finished that same day themselves; other days stay locked, so your history never spoils a puzzle. Guests have no public profile. When you change your username, your old one stays reserved for 15 days and redirects to your new profile.",
    },
    {
        id: "cookies",
        title: "Cookies and storage",
        short: "Just what keeps you logged in and your game in place.",
        body: "KpopIt uses your browser's local storage for your player ID, today's game, your theme and similar settings, and one cookie to keep you logged in (it can only be read by the KpopIt server and expires after 30 days at most). There are no advertising or tracking cookies. If optional cookies are ever added, this page will say so first.",
    },
    {
        id: "store",
        title: "Where it's stored",
        short: "On the KpopIt servers and on your device.",
        body: "Game and account data live in KpopIt's database, hosted on Railway. The website is served by Vercel, images and uploaded avatars are stored on Cloudflare, and account emails are sent through Resend. Each of them only handles the data needed for its part. Data is kept while your account (or player ID) is in use.",
    },
    {
        id: "rights",
        title: "Your rights and deleting",
        short: "Ask for your data, or delete your account anytime.",
        body: "You can ask for a copy of your data or ask me to remove it by writing to contact@kpopit.net. With an account you can delete it yourself in settings, with your password. Nothing is erased for 15 days, and logging in during that time cancels the deletion. After 15 days your account, every game and stat, your collection, your Idol XP, your profile and your uploaded avatar are deleted for good.",
    },
    {
        id: "changes",
        title: "Changes and contact",
        short: "This page grows with the game.",
        body: "When KpopIt changes how data is used, this page is updated and the date at the top changes. Questions about your privacy? Write to contact@kpopit.net or use the contact page.",
    },
];
