import type { ReactNode } from "react";
import PageMeta from "../src/components/Seo/PageMeta";
import ClientOnly from "../src/components/ClientOnly";
import PageLoader from "../src/components/Loading/PageLoader";
import GameDayProvider from "../src/components/GameDayProvider";

type GamePageProps = { title: string; description: string; path: string; children: ReactNode };

// Game state lives in localStorage, so the game renders only in the browser; the prerendered
// HTML carries the page meta and the same loader the page shows until its data is in.
export default function GamePage({ title, description, path, children }: GamePageProps) {
  return (
    <>
      <PageMeta title={title} description={description} path={path} />
      <ClientOnly fallback={<PageLoader />}>
        <GameDayProvider>{children}</GameDayProvider>
      </ClientOnly>
    </>
  );
}
