import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import ClientOnly from "../src/components/ClientOnly";
import PageLoader from "../src/components/Loading/PageLoader";
import GameDayProvider from "../src/components/GameDayProvider";

type GamePageProps = { title: string; description: string; path: string; children: ReactNode };

// Game state lives in localStorage, so the game renders only in the browser; the prerendered
// HTML carries the page meta and the same loader the page shows until its data is in.
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
      <ClientOnly fallback={<PageLoader />}>
        <GameDayProvider>{children}</GameDayProvider>
      </ClientOnly>
    </>
  );
}
