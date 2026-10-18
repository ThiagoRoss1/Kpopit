import { Suspense, type ReactNode } from "react";
import { Await, useLocation, useRevalidator } from "react-router";
import type { Held } from "../../utils/holdNavigation";
import PageLoader from "./PageLoader";

type HeldDataProps<T> = {
    // null: nothing was loaded ahead (the page loads its own data).
    data: Held<T> | null;
    message: string;
    errorMessage: string;
    children: (value: T | undefined) => ReactNode;
};

// Renders a route's held data: the page at once when it arrived in time, otherwise the loader
// until it does. One tree for both, so a same-route navigation with ready data keeps the page
// mounted (open modals, typed input); only a pending one gets a fresh boundary for its loader.
export default function HeldData<T>({ data, message, errorMessage, children }: HeldDataProps<T>) {
    const location = useLocation();
    const revalidator = useRevalidator();
    const pending = data !== null && !data.ready;
    const resolve = data === null ? undefined : data.ready ? data.value : data.promise;
    return (
        <Suspense key={pending ? location.key : "ready"} fallback={<PageLoader message={message} />}>
            <Await
                resolve={resolve}
                errorElement={<PageLoader error errorMessage={errorMessage} onRetry={() => revalidator.revalidate()} />}
            >
                {(value) => children(value as T | undefined)}
            </Await>
        </Suspense>
    );
}
