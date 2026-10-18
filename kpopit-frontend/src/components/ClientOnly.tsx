import type { ReactNode } from "react";
import { useHydrated } from "../hooks/useHydrated";

// Renders children only in the browser; prerendered HTML and the hydration pass get the fallback.
export default function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
    return useHydrated() ? children : fallback;
}
