// The original full-screen "Loading Kpopit..." screen, kept below the navbar so it stays usable.
// It covers the page until its data is ready; on error it shows the message and a Retry button.

type PageLoaderProps = {
    message?: string;
    error?: boolean;
    errorMessage?: string;
    onRetry?: () => void;
};

export default function PageLoader({ message = "Loading Kpopit...", error = false, errorMessage = "Error loading Kpopit.", onRetry }: PageLoaderProps) {
    // The in-flow, screen-high box keeps the footer below the fold, so nothing moves when the page arrives.
    return (
        <div className="min-h-screen w-full">
        <div
            role={error ? "alert" : "status"}
            aria-busy={!error || undefined}
            className="fixed inset-x-0 bottom-0 top-12 sm:top-15 z-90 flex flex-col w-full bg-black justify-center items-center gap-4"
        >
            <span className={`text-white ${error ? "" : "animate-pulse"}`}>{error ? errorMessage : message}</span>
            {error && onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="px-4 py-1.5 rounded-2xl border-2 border-white/60 text-white font-bold hover:bg-white/10 hover:cursor-pointer transition-colors duration-200"
                >
                    Retry
                </button>
            )}
        </div>
        </div>
    );
}
