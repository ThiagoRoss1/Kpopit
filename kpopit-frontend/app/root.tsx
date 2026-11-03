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
import PuffTitle from "../src/components/PageShell/PuffTitle";
import { PressAnchor, PressButton } from "../src/components/buttons/PressButton";
import { safeReload } from "../src/utils/safeReload";
import { THEME_INIT_SCRIPT } from "../src/utils/theme";
import { fetchFeatures, orNothing } from "./prerender-api";

// Build time only: the feature flags the prerendered navbar and pages render with (useFeatures).
export async function loader() {
  return { features: await orNothing(fetchFeatures()) };
}

// There is no server to ask again: the build-time flags stay, and useFeatures refreshes them.
export function shouldRevalidate() {
  return false;
}

// Site-wide head only: each page sets its own title, description and og:title/og:description
// (React hoists them here), so the document never carries two of them.
export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        {/* Applies the saved Day/Night before the first paint (the HTML ships Day). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
      <div aria-hidden className="sticky top-0 z-100 w-full h-15 max-[760px]:h-13.5 border-b-2 border-ink bg-[#262226] shadow-[0_3px_0_#FF8AC4]" />
      <PageLoader />
    </div>
  );
}

// Last resort when a page crashes outside its own sections: a plain page with a way back.
// Home is a full page load so the crashed app starts over.
export function ErrorBoundary() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  const status = isRouteErrorResponse(error) ? error.status : null;
  return (
    <main className="pp-root min-h-screen w-full flex flex-col items-center justify-center gap-4 px-4 bg-(--ground) text-(--text) text-center">
      <PuffTitle className="text-[44px] max-[580px]:text-[34px] whitespace-normal text-balance">
        {status === 404 ? "Page not found" : "Something went wrong"}
      </PuffTitle>
      <p className="m-0 font-medium text-base text-(--muted)">Try again, or go back to the home page.</p>
      <div className="flex gap-3 flex-wrap justify-center mt-1">
        <PressButton size="lg" onClick={safeReload}>Try again</PressButton>
        <PressAnchor href="/" target="_self" rel={undefined} variant="cta" size="lg">Home</PressAnchor>
      </div>
    </main>
  );
}
