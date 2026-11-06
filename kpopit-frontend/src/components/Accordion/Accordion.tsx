import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "../../lib/utils";

interface CollapseProps {
    open: boolean;
    id?: string;
    children: ReactNode;
    className?: string;
}

/** Opens with grid rows 0fr -> 1fr; the content stays mounted (no layout jump, findable). */
export const Collapse = ({ open, id, children, className }: CollapseProps) => {
    return (
        <div id={id} className="pp-collapse" data-open={open ? "1" : "0"}>
            <div>
                <div className={cn("pp-collapse-in", className)}>{children}</div>
            </div>
        </div>
    );
};

interface AccordionItemProps {
    id: string;
    title: ReactNode;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}

/** One question or section: a full-width button with a plus that turns into an x. */
export const AccordionItem = ({ id, title, open, onToggle, children }: AccordionItemProps) => {
    return (
        <div className="rounded-[18px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[2px_3px_0_var(--ctl-off),var(--in)]">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={`${id}-panel`}
                onClick={onToggle}
                className="pp-focus w-full flex items-center gap-3 px-4.5 py-4 rounded-2xl text-left font-bold text-base cursor-pointer"
            >
                <span className="flex-1">{title}</span>

                <span
                    aria-hidden
                    className={cn(
                        "flex-none grid place-items-center size-8 rounded-full border-2 border-(--ink)",
                        "transition-transform duration-500 ease-(--ease-pop) transform-gpu",
                        open ? "rotate-45 bg-[#FF8AC4] text-[#1A1418]" : "bg-(--chip) text-(--chip-ink)",
                    )}
                >
                    <Plus className="size-4" strokeWidth={3} />
                </span>
            </button>

            <Collapse open={open} id={`${id}-panel`} className="px-4.5 pb-4.5">
                {children}
            </Collapse>
        </div>
    );
};
