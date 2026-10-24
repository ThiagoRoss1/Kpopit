import { useEffect, useState, type ReactNode } from "react";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import "../src/assets/fonts/fonts.css";
import "../src/index.css";
import dynaPuffLatin from "../src/assets/fonts/dynapuff-latin-wght-normal.woff2?url";
import { AuthProvider } from "../src/contexts/AuthProvider";
import MaintenancePage from "../src/pages/Maintenance/MaintenancePage";
import { printEasterEgg } from "../src/utils/consoleEasterEgg";
import { getQueryClient } from "../src/services/queryClient";
import PageLoader from "../src/components/Loading/PageLoader";

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
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:creator" content="@TgoRoss1" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta name="referrer" content="no-referrer-when-downgrade" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#e70a7d" />
        {/* The body font: fetched with the HTML instead of after the CSS is parsed. */}
        <link rel="preload" href={dynaPuffLatin} as="font" type="font/woff2" crossOrigin="" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        {/* New pages start at the top; back/forward returns to where the page was left. */}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  // The browser's shared client (route loaders fill it too); a fresh one per prerendered page.
  const [queryClient] = useState(getQueryClient);

  useEffect(() => {
    printEasterEgg();
  }, []);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
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

// __spa-fallback.html (paths that aren't prerendered): the navbar's bar and the loader, in the
// places the real navbar and page take, so nothing jumps when the app takes over.
export function HydrateFallback() {
  return (
    <div className="min-h-screen bg-black">
      <div aria-hidden className="sticky top-0 z-100 w-full h-12 sm:h-15 border-b border-neon-pink/40 bg-black/50" />
      <PageLoader />
    </div>
  );
}

// Last resort when a page crashes outside its own sections: a plain page with a way back.
export function ErrorBoundary() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  const status = isRouteErrorResponse(error) ? error.status : null;
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-black text-white text-center px-4">
      <h1 className="text-3xl font-bold">{status === 404 ? "Page not found" : "Something went wrong"}</h1>
      <p className="text-white/70">Try again, or go back to the home page.</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-2xl border-2 border-white/60 font-bold hover:bg-white/10 hover:cursor-pointer"
        >
          Try again
        </button>
        <a href="/" className="px-4 py-2 rounded-2xl bg-white text-black font-bold hover:brightness-90">
          Home
        </a>
      </div>
    </main>
  );
}
