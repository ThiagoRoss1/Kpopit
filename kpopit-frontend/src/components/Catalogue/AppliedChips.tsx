import { X } from "lucide-react";
import "./catalogue.css";

export interface AppliedChip {
    key: string;
    label: string;
    onRemove: () => void;
}

/** The result count, a removable chip per filter in use, and "Clear all" when more than one is on. */
export default function AppliedChips({ result, chips, onClearAll, filtersOpen }: { result: string; chips: AppliedChip[]; onClearAll: () => void; filtersOpen: boolean }) {
    return (
        <div className="cg-res pp-enter [--pp-delay:220ms] min-h-(--cg-res-h) flex items-center flex-wrap gap-x-2.5 gap-y-2 py-1.5 font-medium text-xs text-(--muted)" data-fopen={filtersOpen ? "1" : "0"}>
            <span aria-live="polite" className="mr-1">{result}</span>
            {chips.map((c) => (
                <button
                    key={c.key}
                    type="button"
                    onClick={c.onRemove}
                    aria-label={`Remove ${c.label}`}
                    className="cg-chip cg-focus inline-flex items-center gap-1.5 h-[30px] pr-[9px] pl-3 border-[1.5px] border-(--ink) rounded-full bg-(--chip) text-(--chip-ink) font-semibold text-xs cursor-pointer shadow-[1.5px_2px_0_var(--ctl-off),var(--in)]"
                >
                    <span>{c.label}</span>
                    <X className="w-3 h-3" strokeWidth={3} aria-hidden />
                </button>
            ))}
            {chips.length > 1 && (
                <button type="button" onClick={onClearAll} className="cg-clearall cg-focus border-0 bg-transparent text-(--text) font-semibold text-xs underline decoration-(--side) decoration-2 underline-offset-4 cursor-pointer py-1.5 px-0.5">
                    Clear all
                </button>
            )}
        </div>
    );
}
