import { cn } from "../../lib/utils";

// The full-screen "Loading Kpopit..." screen, kept below the navbar so it stays usable. It covers the
// page until its data is ready (on error: the message and a Retry button). It paints the saved
// theme's ground (set before first paint), so a Puff Pop page never flashes black; old pages pass "dark".

type PageLoaderProps = {
    message?: string;
    error?: boolean;
    errorMessage?: string;
    onRetry?: () => void;
    tone?: "theme" | "dark";
};

const PageLoader = ({ message = "Loading Kpopit...", error = false, errorMessage = "Error loading Kpopit.", onRetry, tone = "theme" }: PageLoaderProps) => {
    const isDark = tone === "dark";

    // The in-flow, screen-high box keeps the footer below the fold, so nothing moves when the page arrives.
    return (
        <div className="w-full min-h-screen">
            <div
                role={error ? "alert" : "status"}
                aria-busy={!error || undefined}
                className={cn(
                    "fixed inset-x-0 bottom-0 top-13.5 min-[860px]:top-15 z-90 flex flex-col items-center justify-center gap-4 w-full",
                    isDark ? "bg-black" : "bg-(--ground)",
                )}
            >
                <span className={cn(isDark ? "text-white" : "font-semibold text-(--muted)", !error && "animate-pulse")}>
                    {error ? errorMessage : message}
                </span>

                {error && onRetry && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className={cn(
                            "px-4 py-1.5 rounded-2xl border-2 font-bold cursor-pointer transition-colors duration-200",
                            isDark
                                ? "border-white/60 text-white hover:bg-white/10"
                                : "border-(--ink) bg-(--chip) text-(--text) hover:bg-(--chip-hover)",
                        )}
                    >
                        Retry
                    </button>
                )}
            </div>
        </div>
    );
};

export default PageLoader;
