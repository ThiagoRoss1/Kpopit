import { Suspense, type ReactNode } from "react";
import { Await, useAsyncError, useLocation, useRevalidator } from "react-router";
import type { Held } from "../../utils/holdNavigation";
import PageLoader from "./PageLoader";
import NotFound from "../../pages/NotFound/NotFound";
import { isNotFoundError } from "../../utils/notFound";

type HeldDataProps<T> = {
    // null: nothing was loaded ahead (the page loads its own data).
    data: Held<T> | null;
    message: string;
    errorMessage: string;
    children: (value: T | undefined) => ReactNode;
};

// Renders a route's held data: the page at once when it arrived in time (or nothing was loaded
// ahead), otherwise the loader until it does. Routes always render through here, so a same-route
// navigation with ready data keeps the page mounted (open modals, typed input). Ready data never
// goes through Suspense: the prerender would stream the loader into the HTML ahead of the page.
export default function HeldData<T>({ data, message, errorMessage, children }: HeldDataProps<T>) {
    const location = useLocation();
    const revalidator = useRevalidator();
    if (data === null || data.ready) return children(data?.value);
    return (
        <Suspense key={location.key} fallback={<PageLoader message={message} />}>
            <Await
                resolve={data.promise}
                errorElement={<HeldError errorMessage={errorMessage} onRetry={() => revalidator.revalidate()} />}
            >
                {(value) => children(value as T)}
            </Await>
        </Suspense>
    );
}

// A 404 means the item doesn't exist: the Not Found page. Anything else can be retried.
const HeldError = ({ errorMessage, onRetry }: { errorMessage: string; onRetry: () => void }) => {
    const error = useAsyncError();
    if (isNotFoundError(error)) return <NotFound />;

    return <PageLoader error errorMessage={errorMessage} onRetry={onRetry} />;
};
