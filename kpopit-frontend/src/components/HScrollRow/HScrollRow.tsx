import { useEffect, useRef, type ComponentProps } from "react";
import { cn } from "../../lib/utils";
import "../PageShell/puff.css";

const FADE = "28px";

/** Sideways row: edge fades only while it overflows (following the scroll) and mouse drag-scroll;
 *  a drag never fires the click under it. The vertical wheel always scrolls the page. `bar` shows
 *  the pink scrollbar instead of hiding it. */
export default function HScrollRow({ className, children, bar = false, ...rest }: ComponentProps<"div"> & { bar?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const row = ref.current;
        if (!row) return;
        const edges = () => {
            const max = row.scrollWidth - row.clientWidth;
            row.style.setProperty("--fl", row.scrollLeft > 2 ? FADE : "0px");
            row.style.setProperty("--fr", row.scrollLeft < max - 2 ? FADE : "0px");
            // Overflowing by a shadow's width doesn't make it a scroller.
            row.dataset.over = max > 2 ? "1" : "0";
        };
        let drag: { x: number; left: number; moved: boolean } | null = null;
        let swallowClick = false;
        const onDown = (e: PointerEvent) => {
            if (e.pointerType !== "mouse" || e.button !== 0 || row.scrollWidth <= row.clientWidth) return;
            drag = { x: e.clientX, left: row.scrollLeft, moved: false };
        };
        const onMove = (e: PointerEvent) => {
            if (!drag) return;
            const dx = e.clientX - drag.x;
            if (!drag.moved && Math.abs(dx) > 4) {
                drag.moved = true;
                row.dataset.drag = "1";
            }
            if (drag.moved) row.scrollLeft = drag.left - dx;
        };
        const onUp = () => {
            if (!drag) return;
            swallowClick = drag.moved;
            drag = null;
            delete row.dataset.drag;
            setTimeout(() => { swallowClick = false; }, 0);
        };
        const onClick = (e: MouseEvent) => {
            if (!swallowClick) return;
            e.preventDefault();
            e.stopPropagation();
        };
        const onDragStart = (e: DragEvent) => e.preventDefault();

        edges();
        const resize = new ResizeObserver(edges);
        resize.observe(row);
        for (const child of Array.from(row.children)) resize.observe(child);
        row.addEventListener("scroll", edges, { passive: true });
        row.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        row.addEventListener("click", onClick, true);
        row.addEventListener("dragstart", onDragStart);
        return () => {
            resize.disconnect();
            row.removeEventListener("scroll", edges);
            row.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            row.removeEventListener("click", onClick, true);
            row.removeEventListener("dragstart", onDragStart);
        };
    }, []);

    return (
        <div ref={ref} {...rest} className={cn("pp-hscroll flex overflow-x-auto", bar && "pp-bar", className)}>
            {children}
        </div>
    );
}
