import { cn } from "../../lib/utils";

interface ListEmptyStateProps {
    /** "No idols found...", "No albums found..." */
    title: string;
    search: string;
    onReset: () => void;
}

/** What a list shows when its search and filters match nothing, with a way back to everything. */
const ListEmptyState = ({ title, search, onReset }: ListEmptyStateProps) => {
    return (
        <div className="pp-enter grid place-content-center justify-items-center gap-3.5 min-h-85 text-center">
            <div className="pr-1.5 pb-2 pl-1 puff-ink -rotate-[1.5deg] font-bold text-[34px] leading-[1.15] text-white text-shadow-(--puff-empty)">
                {title}
            </div>

            <div className="font-medium text-sm text-(--muted)">
                {search ? `No matches for "${search}" with these filters.` : "No matches with these filters."}
            </div>

            <button
                type="button"
                onClick={onReset}
                className={cn(
                    "pp-focus mt-2 h-11.5 px-5.5 rounded-full border-2 border-(--ink) cursor-pointer",
                    "bg-(--tag) text-white text-shadow-(--tag-text) font-bold text-sm",
                    "shadow-[3px_4px_0_var(--ink),var(--in-pink)] active:shadow-[0_0_0_var(--ink),var(--in-pink)]",
                    "transition-[translate,box-shadow] duration-350 ease-(--ease-settle) transform-gpu",
                    "hover:-translate-y-0.5 active:translate-x-0.75 active:translate-y-1 active:duration-150",
                )}
            >
                Clear search & filters
            </button>
        </div>
    );
};

export default ListEmptyState;
