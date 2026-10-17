import { Component, type ErrorInfo, type ReactNode } from "react";
import { useDelayedLoading } from "../../hooks/useDelayedLoading";

// Neutral visuals on purpose: the final loading/error look comes with the redesign.

type SectionErrorProps = { onRetry: () => void; className?: string; message?: string };

export function SectionError({ onRetry, className = "", message = "Couldn't load this part." }: SectionErrorProps) {
    return (
        <div role="alert" className={`flex flex-col items-center justify-center gap-3 text-center text-white/80 ${className}`}>
            <span className="text-base">{message}</span>
            <button
                type="button"
                onClick={onRetry}
                className="px-4 py-1.5 rounded-2xl border-2 border-white/60 text-white font-bold hover:bg-white/10 hover:cursor-pointer transition-colors duration-200"
            >
                Retry
            </button>
        </div>
    );
}

// Holds the section's final size, so its content (or error) doesn't push the page around.
export function SectionPlaceholder({ className = "", pulsing }: { className?: string; pulsing: boolean }) {
    return (
        <div
            aria-busy="true"
            aria-label="Loading"
            className={`rounded-3xl ${pulsing ? "bg-white/10 animate-pulse" : "bg-transparent"} ${className}`}
        />
    );
}

type BoundaryProps = { children: ReactNode; className?: string };

// Catches a crash inside one section; Retry renders it again.
export class SectionBoundary extends Component<BoundaryProps, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("Section crashed:", error, info.componentStack);
    }

    render() {
        if (this.state.failed) {
            return <SectionError className={this.props.className} onRetry={() => this.setState({ failed: false })} />;
        }
        return this.props.children;
    }
}

type SectionProps = {
    loading: boolean;
    error: boolean;
    onRetry: () => void;
    // Size classes of the final content, applied to the placeholder and the error box.
    placeholderClassName: string;
    children: () => ReactNode;
};

// One backend-dependent part of a page: waits, fails and retries on its own.
export default function Section({ loading, error, onRetry, placeholderClassName, children }: SectionProps) {
    const loaderVisible = useDelayedLoading(loading);

    if (error && !loading) return <SectionError onRetry={onRetry} className={placeholderClassName} />;
    if (loading || loaderVisible) return <SectionPlaceholder className={placeholderClassName} pulsing={loaderVisible} />;
    return <SectionBoundary className={placeholderClassName}>{children()}</SectionBoundary>;
}
