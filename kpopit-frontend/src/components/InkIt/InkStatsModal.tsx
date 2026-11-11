import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { BookOpen, X } from "lucide-react";
import { cn } from "../../lib/utils";
import type { UserStats } from "../../interfaces/gameInterfaces";

interface InkStatsModalProps {
    stats: UserStats | undefined;
    onClose: () => void;
    onTransferData: () => void;
}

const BUTTON = "inkit-btn pp-focus grid h-11 cursor-pointer place-items-center rounded-full border-2 border-(--ink) bg-(--face) font-bold text-sm text-(--face-ink)";

/** The player's InkIt numbers, with the way to How to play and to moving data between devices. */
const InkStatsModal = ({ stats, onClose, onTransferData }: InkStatsModalProps) => {
    const [copied, setCopied] = useState(false);
    const closeRef = useRef<HTMLButtonElement | null>(null);
    const copyTimer = useRef<number | null>(null);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);
        closeRef.current?.focus();

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
        };
    }, [onClose]);

    const tiles = [
        { label: "Games won", value: stats?.wins_count ?? 0 },
        { label: "Average guesses", value: (stats?.average_guesses ?? 0).toFixed(2) },
        { label: "Current streak", value: stats?.current_streak ?? 0 },
        { label: "Max streak", value: stats?.max_streak ?? 0 },
        { label: "One shot wins", value: stats?.one_shot_wins ?? 0, wide: true },
    ];

    const copy = async () => {
        const lines = [
            "My #KpopIt InkIt statistics:",
            `🥇 Games won: ${tiles[0].value}`,
            `🤓 Average guesses: ${tiles[1].value}`,
            `🎯 One shots: ${tiles[4].value}`,
            `🔥 Current streak: ${tiles[2].value}`,
            `🚀 Max streak: ${tiles[3].value}`,
            "",
            `${window.location.origin}/inkit`,
        ];

        try {
            await navigator.clipboard.writeText(lines.join("\n"));
        } catch {
            return;
        }

        setCopied(true);
        copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
    };

    // Outside the page tree: the page's own stacking and filters can't trap it.
    return createPortal(
        <div
            onClick={onClose}
            className="inkit-modal fixed inset-0 z-200 grid place-items-center bg-[rgba(30,20,28,.55)] p-4 backdrop-blur-xs animate-[ikScrim_.2s_ease-out_backwards]"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Stats"
                data-testid="inkit-stats"
                onClick={(event) => event.stopPropagation()}
                className={cn(
                    "flex w-full max-w-120 flex-col gap-4.5 rounded-[23px] border-2 border-(--ink) bg-(--menu-bg) px-5.5 pt-5 pb-6 text-(--face-ink)",
                    "shadow-[7px_8px_0_-2px_#FF8AC4,7px_8px_0_0_var(--ink),var(--in)] animate-[ikPop_.3s_var(--ease-pop)_backwards]",
                )}
            >
                <div className="flex items-center gap-3">
                    <h2 className="m-0 inline-block flex-1 rotate-[-1.5deg] font-bold text-3xl leading-none text-white text-shadow-(--puff-empty)">Stats...</h2>

                    <Link
                        to="/how-to-play"
                        className="inkit-btn pp-focus flex h-9 items-center gap-1.5 rounded-full border-2 border-(--ink) bg-(--face) pr-3.5 pl-2.75 font-bold text-[13px] text-(--face-ink) no-underline"
                    >
                        <BookOpen className="size-3.75" strokeWidth={2.6} aria-hidden />
                        How to play
                    </Link>

                    <button
                        ref={closeRef}
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                        className="inkit-btn pp-focus grid size-9.5 flex-none cursor-pointer place-items-center rounded-full border-2 border-(--ink) bg-(--face) p-0 text-(--face-ink)"
                    >
                        <X className="size-3.75" strokeWidth={3} aria-hidden />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                    {tiles.map((tile) => (
                        <div
                            key={tile.label}
                            className={cn(
                                "mb-1 flex flex-col gap-2.25 rounded-[20px] border-2 border-(--ink) bg-(--face) px-2 pt-3.5 pb-3.75 text-center",
                                "shadow-[0_6px_0_-2px_#FF8AC4,0_6px_0_0_var(--ink),var(--in)]",
                                tile.wide && "col-span-full",
                            )}
                        >
                            <span className="font-semibold text-sm leading-[1.1] text-(--group)">{tile.label}</span>
                            <span className="font-bold text-[28px] leading-none text-white text-shadow-(--puff-value)">{tile.value}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                    <button type="button" onClick={onTransferData} className={BUTTON}>Transfer data</button>
                    <button type="button" onClick={copy} className={BUTTON}>{copied ? "Copied!" : "Copy"}</button>
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default InkStatsModal;
