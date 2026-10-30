import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "../../lib/utils";
import "./puff.css";

/** Opens with grid rows 0fr → 1fr; the content stays mounted (no layout jump, findable). */
export function Collapse({ open, id, children, className }: { open: boolean; id?: string; children: ReactNode; className?: string }) {
    return (
        <div id={id} className="pp-collapse" data-open={open ? "1" : "0"}>
            <div>
                <div className={cn("pp-collapse-in", className)}>{children}</div>
            </div>
        </div>
    );
}

/** One question/section: a full-width button with a plus that turns into an ×. */
export function AccordionItem({ id, title, open, onToggle, children }: {
    id: string;
    title: ReactNode;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    return (
        <div className="rounded-[18px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[2px_3px_0_var(--ctl-off),var(--in)]">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={`${id}-panel`}
                onClick={onToggle}
                className="pp-focus w-full flex items-center gap-3 text-left px-[18px] py-4 font-bold text-base cursor-pointer rounded-[16px]"
            >
                <span className="flex-1">{title}</span>
                <span
                    aria-hidden
                    className={cn(
                        "flex-none grid place-items-center w-8 h-8 rounded-full border-2 border-(--ink) transition-transform duration-500 ease-(--ease-pop)",
                        open ? "rotate-45 bg-[#FF8AC4] text-[#1A1418]" : "bg-(--chip) text-(--chip-ink)",
                    )}
                >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                </span>
            </button>
            <Collapse open={open} id={`${id}-panel`} className="px-[18px] pb-[18px]">
                {children}
            </Collapse>
        </div>
    );
}
