import { X } from "lucide-react";
import "./catalogue.css";

/** Removable chips for the filters in use, plus "Clear all" when more than one is on. */
export default function AppliedChips({ chips, onClearAll }: { chips: { key: string; label: string; onRemove: () => void }[]; onClearAll: () => void }) {
    if (chips.length === 0) return null;
    return (
        <div className="flex flex-wrap items-center gap-2">
            {chips.map((c) => (
                <button
                    key={c.key}
                    type="button"
                    onClick={c.onRemove}
                    aria-label={`Remove ${c.label}`}
                    className="cg-chip pp-press pp-focus h-8 pl-3 pr-2 inline-flex items-center gap-1.5 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) font-bold text-[13px] cursor-pointer"
                    data-hover="chip"
                >
                    {c.label}
                    <X className="w-3.5 h-3.5" strokeWidth={3} aria-hidden />
                </button>
            ))}
            {chips.length > 1 && (
                <button type="button" onClick={onClearAll} className="pp-focus h-8 px-2 font-bold text-[13px] text-(--group) underline underline-offset-4 cursor-pointer">
                    Clear all
                </button>
            )}
        </div>
    );
}
