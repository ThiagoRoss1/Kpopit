import type { ReactNode } from "react";
import PageMeta from "../src/components/Seo/PageMeta";
import ClientOnly from "../src/components/ClientOnly";
import PageLoader from "../src/components/Loading/PageLoader";
import GameDayProvider from "../src/components/GameDayProvider";

type GamePageProps = {
  title: string;
  description: string;
  path: string;
  calendarGame?: boolean;
  /** Puff Pop pages show the loader in the saved theme instead of the old dark look. */
  puff?: boolean;
  children: ReactNode;
};

// Game state lives in localStorage, so the game renders only in the browser; the prerendered
// HTML carries the page meta and the same loader the page shows until its data is in.
export default function GamePage({ title, description, path, calendarGame = false, puff = false, children }: GamePageProps) {
  return (
    <>
      {!calendarGame && <PageMeta title={title} description={description} path={path} />}
      <ClientOnly fallback={<PageLoader tone={puff ? "theme" : "dark"} />}>
        <GameDayProvider>{children}</GameDayProvider>
      </ClientOnly>
    </>
  );
}
