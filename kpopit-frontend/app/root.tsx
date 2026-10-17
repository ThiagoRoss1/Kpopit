import { useEffect, useState, type ReactNode } from "react";
import { Links, Meta, Outlet, Scripts } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import "../src/index.css";
import ScrollToTop from "../src/hooks/useScrollToTop";
import { AuthProvider } from "../src/contexts/AuthProvider";
import MaintenancePage from "../src/pages/Maintenance/MaintenancePage";
import { printEasterEgg } from "../src/utils/consoleEasterEgg";

const WEB_APPLICATION_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "KpopIt",
  "alternativeName": ["Kpopdle", "K-pop Wordle", "Kpop Wordle"],
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
        "text": "KpopIt is a free daily K-pop idol guessing game inspired by Wordle. Every day, a new mystery K-pop idol is selected and players guess who it is using clues about their group, company... It features over 150 idols from groups like TWICE, BLACKPINK, NewJeans, IVE, aespa, LE SSERAFIM. It features two game modes: Classic and Blurry, and it keeps expanding with new idols and games.",
      },
    },
    {
      "@type": "Question",
      "name": "How do you play KpopIt?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Type the name of a K-pop idol in the search bar and submit your guess. The game gives you color-coded feedback on each category on Classic Mode, and for Blurry Mode, you guess the idol from a blurred photo that gets clearer with each attempt. Use the clues to narrow down and find the mystery idol in as few attempts as possible.",
      },
    },
    {
      "@type": "Question",
      "name": "Is KpopIt the same as Kpopdle?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "KpopIt is a Kpopdle-style game - a daily K-pop Wordle where you guess K-pop idols. It features two game modes: Classic (guess using category clues) and Blurry (guess from a blurred idol photo that gets clearer with each attempt).",
      },
    },
    {
      "@type": "Question",
      "name": "Is KpopIt free to play?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, KpopIt is completely free to play. A new idol is available to guess every day at midnight EST. No account or download required.",
      },
    },
    {
      "@type": "Question",
      "name": "What game modes does KpopIt have?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "KpopIt has two game modes: Classic Mode, where you guess the idol using category-based clues like group, company nationality, and debut year; and Blurry Mode, where you guess the idol from a blurred photo that gradually becomes clearer with each wrong guess. Blurry Mode also features Hardcore and Grayscale options for extra challenge.",
      },
    },
  ],
};

// Site-wide head only: each page sets its own title, description and og:title/og:description
// (React hoists them here), so the document never carries two of them.
export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="google-site-verification" content="nUFMUckTn3CptHY3LyumUH3r60ddG2RweN_l40TE6-M" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/kpopit-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="keywords" content="kpop, kpopdle, kpop wordle, kpop game, idol, idol game, kpop quiz, daily game, guess the idol, kpop guessing game, wordle like, TWICE, NewJeans, BLACKPINK, ILLIT, LE SSERAFIM, LOONA" />
        <meta name="author" content="KpopIt" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:creator" content="@TgoRoss1" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEB_APPLICATION_LD) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta name="referrer" content="no-referrer-when-downgrade" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#e70a7d" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DynaPuff:wght@400..700&family=Caveat:wght@500;600;700&family=Major+Mono+Display&display=swap"
          rel="stylesheet"
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  // One client per render tree: prerendering many pages in one process must not share a cache.
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    printEasterEgg();
  }, []);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <ScrollToTop />
          <AuthProvider>
            {import.meta.env.VITE_MAINTENANCE_MODE === "true" ? <MaintenancePage type="collection" /> : <Outlet />}
          </AuthProvider>
        </HelmetProvider>
      </QueryClientProvider>

      <SpeedInsights />
      <Analytics />
    </>
  );
}

// Non-prerendered routes start from the SPA fallback: an empty body until the route loads, like
// the old index.html.
export function HydrateFallback() {
  return null;
}
