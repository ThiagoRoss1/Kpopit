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

export default function PageLoader({ message = "Loading Kpopit...", error = false, errorMessage = "Error loading Kpopit.", onRetry, tone = "theme" }: PageLoaderProps) {
    const dark = tone === "dark";
    // The in-flow, screen-high box keeps the footer below the fold, so nothing moves when the page arrives.
    return (
        <div className="min-h-screen w-full">
        <div
            role={error ? "alert" : "status"}
            aria-busy={!error || undefined}
            className={`fixed inset-x-0 bottom-0 top-13.5 min-[860px]:top-15 z-90 flex flex-col w-full justify-center items-center gap-4 ${dark ? "bg-black" : "bg-(--ground)"}`}
        >
            <span className={`${dark ? "text-white" : "font-semibold text-(--muted)"} ${error ? "" : "animate-pulse"}`}>{error ? errorMessage : message}</span>
            {error && onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className={`px-4 py-1.5 rounded-2xl border-2 font-bold hover:cursor-pointer transition-colors duration-200 ${dark ? "border-white/60 text-white hover:bg-white/10" : "border-(--ink) text-(--text) bg-(--chip) hover:bg-(--chip-hover)"}`}
                >
                    Retry
                </button>
            )}
        </div>
        </div>
    );
}
