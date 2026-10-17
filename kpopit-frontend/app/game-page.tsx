import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import ClientOnly from "../src/components/ClientOnly";

type GamePageProps = { title: string; description: string; path: string; children: ReactNode };

// Game state lives in localStorage, so the game renders only in the browser; the prerendered
// HTML carries the page meta and the same loading screen the page shows while it fetches.
export default function GamePage({ title, description, path, children }: GamePageProps) {
  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://kpopit.net${path}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
      </Helmet>
      <ClientOnly
        fallback={
          <div className="fixed inset-0 z-100 flex w-full h-screen bg-black justify-center items-center">
            <span className="text-white animate-pulse">Loading Kpopit...</span>
          </div>
        }
      >
        {children}
      </ClientOnly>
    </>
  );
}
