import { Suspense, type ReactNode } from "react";
import { Await, useLocation, useRevalidator } from "react-router";
import type { Held } from "../../utils/holdNavigation";
import PageLoader from "./PageLoader";

type HeldDataProps<T> = {
    data: Held<T>;
    message: string;
    errorMessage: string;
    children: (value: T) => ReactNode;
};

// Renders a route's held data: the page at once when it arrived in time, otherwise the loader
// until it does. Keyed by location so a new page in the same route shows its own loader.
export default function HeldData<T>({ data, message, errorMessage, children }: HeldDataProps<T>) {
    const location = useLocation();
    const revalidator = useRevalidator();
    if (data.ready) return children(data.value);
    return (
        <Suspense key={location.key} fallback={<PageLoader message={message} />}>
            <Await
                resolve={data.promise}
                errorElement={<PageLoader error errorMessage={errorMessage} onRetry={() => revalidator.revalidate()} />}
            >
                {(value) => children(value as T)}
            </Await>
        </Suspense>
    );
}
