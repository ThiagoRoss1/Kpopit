import { useEffect, useRef, type ComponentProps } from "react";
import { cn } from "../../lib/utils";

const FADE = "28px";

type HScrollRowProps = ComponentProps<"div"> & { bar?: boolean };

/** Sideways row: edge fades only while it overflows (following the scroll) and mouse drag-scroll;
 *  a drag never fires the click under it. The vertical wheel always scrolls the page. `bar` shows
 *  the pink scrollbar instead of hiding it. */
const HScrollRow = ({ className, children, bar = false, ...rest }: HScrollRowProps) => {
    const rowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const row = rowRef.current;
        if (!row) return;

        const updateEdges = () => {
            const maxScroll = row.scrollWidth - row.clientWidth;

            row.style.setProperty("--fl", row.scrollLeft > 2 ? FADE : "0px");
            row.style.setProperty("--fr", row.scrollLeft < maxScroll - 2 ? FADE : "0px");

            // Overflowing by a shadow's width doesn't make it a scroller.
            row.dataset.over = maxScroll > 2 ? "1" : "0";
        };

        let drag: { startX: number; startLeft: number; moved: boolean } | null = null;
        let swallowClick = false;

        const handlePointerDown = (event: PointerEvent) => {
            if (event.pointerType !== "mouse" || event.button !== 0 || row.scrollWidth <= row.clientWidth) return;

            drag = { startX: event.clientX, startLeft: row.scrollLeft, moved: false };
        };

        const handlePointerMove = (event: PointerEvent) => {
            if (!drag) return;

            const distance = event.clientX - drag.startX;

            if (!drag.moved && Math.abs(distance) > 4) {
                drag.moved = true;
                row.dataset.drag = "1";
            }

            if (drag.moved) row.scrollLeft = drag.startLeft - distance;
        };

        const handlePointerUp = () => {
            if (!drag) return;

            swallowClick = drag.moved;
            drag = null;
            delete row.dataset.drag;

            setTimeout(() => { swallowClick = false; }, 0);
        };

        const handleClick = (event: MouseEvent) => {
            if (!swallowClick) return;

            event.preventDefault();
            event.stopPropagation();
        };

        const handleDragStart = (event: DragEvent) => event.preventDefault();

        updateEdges();

        const resizeObserver = new ResizeObserver(updateEdges);
        resizeObserver.observe(row);

        for (const child of Array.from(row.children)) {
            resizeObserver.observe(child);
        }

        row.addEventListener("scroll", updateEdges, { passive: true });
        row.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        row.addEventListener("click", handleClick, true);
        row.addEventListener("dragstart", handleDragStart);

        return () => {
            resizeObserver.disconnect();
            row.removeEventListener("scroll", updateEdges);
            row.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            row.removeEventListener("click", handleClick, true);
            row.removeEventListener("dragstart", handleDragStart);
        };
    }, []);

    return (
        <div ref={rowRef} {...rest} className={cn("pp-hscroll flex overflow-x-auto", bar && "pp-bar", className)}>
            {children}
        </div>
    );
};

export default HScrollRow;
