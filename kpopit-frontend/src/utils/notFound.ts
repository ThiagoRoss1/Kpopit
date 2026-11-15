import { isAxiosError } from "axios";

/** True when the API answered 404 (the item doesn't exist), not for a network or server failure.
 *  A snapshot-or-API race rejects with an AggregateError holding both errors. */
export const isNotFoundError = (error: unknown): boolean => {
    if (error instanceof AggregateError) return error.errors.some(isNotFoundError);

    return isAxiosError(error) && error.response?.status === 404;
};

/** React Query retry: never for a 404, up to three times otherwise (the default). */
export const retryUnlessNotFound = (failureCount: number, error: unknown) => !isNotFoundError(error) && failureCount < 3;
