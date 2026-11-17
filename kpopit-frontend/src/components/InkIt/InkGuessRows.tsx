import type { CSSProperties } from "react";
import { Link } from "react-router";
import { cn } from "../../lib/utils";
import type { InkItGuess } from "../../interfaces/gameInterfaces";
import { resolveCdnUrl } from "../../utils/imageUrl";

export interface GuessRow extends InkItGuess {
    /** The idol's group, from the idol list. */
    group: string;
    /** Her page. */
    href: string;
}

interface InkGuessRowsProps {
    rows: GuessRow[];
    /** Rows that were already on screen when the page opened don't replay their entrance. */
    settledCount: number;
}

// The colour photo is painted over the pencil one in four brush strokes, top to bottom,
// alternating sides.
const STROKES = [0, 1, 2, 3].map((index) => ({
    top: `${Math.max(0, index * 25 - 3)}%`,
    bottom: `${Math.max(0, 100 - (index + 1) * 25 - 3)}%`,
    animation: `${index % 2 ? "ikStrokeR" : "ikStrokeL"} .24s cubic-bezier(.5,0,.25,1) ${(0.45 + index * 0.1).toFixed(2)}s both`,
}));

/** The guesses, newest on top. A new row drops in, its photo is drawn, then the colour washes in. */
const InkGuessRows = ({ rows, settledCount }: InkGuessRowsProps) => {
    if (rows.length === 0) return null;

    return (
        <ol aria-label="Your guesses" className="m-0 flex list-none flex-col-reverse justify-end gap-2.5 p-0">
            {rows.map((row, index) => {
                const isNew = index >= settledCount;
                const photo = resolveCdnUrl(row.image_path, row.image_version) ?? undefined;
                const color = row.correct ? "var(--row-right)" : "var(--row-wrong)";
                const showGroup = row.artist_name.length + row.group.length < 26;

                return (
                    <li
                        key={row.idol_id}
                        data-testid="inkit-guess-row"
                        data-correct={row.correct}
                        style={{ "--col": color, backgroundColor: isNew ? undefined : color } as CSSProperties}
                        className={cn(
                            "relative isolate flex h-18.5 items-center gap-3.5 rounded-full border-2 border-(--ink) pr-5 pl-3.25 max-[900px]:h-17",
                            // The row keeps its colour in Night, so its top light stays white too.
                            "shadow-[3px_4px_0_var(--ink),inset_0_2px_0_#FFFFFF,inset_0_-3px_0_rgba(26,20,24,.07)]",
                            isNew && "bg-(--face) animate-[ikRow_1.05s_var(--ease-settle)_backwards]",
                        )}
                    >
                        {isNew && (
                            <span aria-hidden className="pointer-events-none absolute inset-0 -z-1 overflow-hidden rounded-full">
                                <span className="absolute inset-0 bg-(--col) animate-[ikWash_.9s_cubic-bezier(.4,0,.2,1)_.8s_backwards]" />
                            </span>
                        )}

                        <Link
                            to={row.href}
                            aria-label={`${row.artist_name} profile`}
                            className={cn(
                                "pp-focus relative block size-14 flex-none overflow-hidden rounded-2xl border-2 border-[#1A1418] max-[900px]:size-12.5",
                                // A dark fill under a settled photo: a light one showed at the antialiased corners.
                                isNew ? "bg-(--chip-hover)" : "bg-[#1A1418]",
                                "shadow-[3px_3px_0_color-mix(in_oklab,var(--col)_55%,#000),5px_5px_8px_color-mix(in_oklab,var(--col)_40%,transparent)]",
                                "transform-gpu transition-[scale,rotate] duration-[380ms] ease-(--ease-settle) hover:scale-105 hover:rotate-[-2deg]",
                                isNew && "animate-[ikPhoto_1.05s_cubic-bezier(.3,.75,.35,1)_.15s_backwards]",
                            )}
                        >
                            {!isNew && <img src={photo} alt="" draggable={false} className="absolute inset-0 size-full object-cover object-center" />}

                            {isNew && (
                                <>
                                    <img src={photo} alt="" draggable={false} className="absolute inset-0 block size-full object-cover object-center opacity-50 brightness-[1.2] contrast-[1.7] grayscale" />

                                    {STROKES.map((stroke) => (
                                        <img
                                            key={stroke.top}
                                            src={photo}
                                            alt=""
                                            draggable={false}
                                            style={{ "--t": stroke.top, "--b": stroke.bottom, animation: stroke.animation } as CSSProperties}
                                            className="absolute inset-0 block size-full object-cover object-center"
                                        />
                                    ))}
                                </>
                            )}
                        </Link>

                        <div
                            className={cn(
                                "relative flex min-w-0 flex-1 flex-col items-start gap-px [container:inkrow/inline-size]",
                                isNew && "animate-[ikName_.75s_cubic-bezier(.16,1,.3,1)_.9s_backwards]",
                            )}
                        >
                            <span className="max-w-full truncate pt-px pr-1 pb-0.75 pl-0.5 font-bold text-xl/[1.15] text-white text-shadow-(--puff-name) max-[900px]:text-lg/[1.15]">
                                {row.artist_name}
                            </span>

                            {showGroup && (
                                <span className="inkit-row-group max-w-full overflow-hidden pl-0.5 font-semibold text-[13px]/[1.1] whitespace-nowrap text-[#1A1418] opacity-80 max-[900px]:text-xs/[1.1]">
                                    {row.group}
                                </span>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
};

export default InkGuessRows;
