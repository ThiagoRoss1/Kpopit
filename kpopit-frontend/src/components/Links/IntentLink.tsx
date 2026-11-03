import { useEffect, useRef, useState, type FocusEvent, type MouseEvent, type TouchEvent } from "react";
import { Link, useLocation, type LinkProps } from "react-router";
import "./IntentLink.css";

type IntentLinkProps = Omit<LinkProps, "prefetch"> & {
    // Starts the target page's data request; the route's code is prefetched by React Router.
    onIntent?: () => void;
    // Composite links keep their rail and labels still while a child shows the press.
    pressTarget?: "self" | "child";
};

// Same delay React Router uses for hover intent: passing the pointer over a list loads nothing.
const HOVER_INTENT_MS = 100;

const plainClick = (event: MouseEvent) =>
    !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

// A link that loads its page on intent and looks pressed until the page changes. The pressed state
// is its own (not NavLink's): NavLink re-renders every link on the page when a navigation starts.
export default function IntentLink({ className = "", pressTarget = "self", onIntent, onClick, onMouseEnter, onMouseLeave, onFocus, onTouchStart, ...props }: IntentLinkProps) {
    const location = useLocation();
    const [pressedOn, setPressedOn] = useState<string | null>(null);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    if (pressedOn !== null && pressedOn !== location.key) setPressedOn(null);

    useEffect(() => () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
    }, []);

    const stopHover = () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
    };
    const pressed = pressedOn === location.key;

    return (
        <Link
            prefetch="intent"
            {...props}
            className={`${className}${pressTarget === "child" ? " link-press-child" : ""}${pressed ? " link-pending" : ""}`}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                onClick?.(event);
                if (plainClick(event)) setPressedOn(location.key);
            }}
            onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
                stopHover();
                if (onIntent) hoverTimer.current = setTimeout(onIntent, HOVER_INTENT_MS);
                onMouseEnter?.(event);
            }}
            onMouseLeave={(event: MouseEvent<HTMLAnchorElement>) => {
                stopHover();
                onMouseLeave?.(event);
            }}
            onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
                onIntent?.();
                onFocus?.(event);
            }}
            onTouchStart={(event: TouchEvent<HTMLAnchorElement>) => {
                onIntent?.();
                onTouchStart?.(event);
            }}
        />
    );
}
