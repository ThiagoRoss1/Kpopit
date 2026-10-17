import type { ImgHTMLAttributes } from "react";

type ImgProps = ImgHTMLAttributes<HTMLImageElement> & {
    // The page's LCP image: loaded at once and ahead of other images.
    priority?: boolean;
};

// Every <img> goes through here: lazy and async-decoded unless the caller says otherwise.
export default function Img({ priority = false, loading, decoding, fetchPriority, ...props }: ImgProps) {
    return (
        <img
            loading={loading ?? (priority ? "eager" : "lazy")}
            decoding={decoding ?? "async"}
            fetchPriority={fetchPriority ?? (priority ? "high" : undefined)}
            {...props}
        />
    );
}
