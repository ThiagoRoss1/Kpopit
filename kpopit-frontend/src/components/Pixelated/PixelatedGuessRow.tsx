import React, { useState, useEffect, useCallback } from "react";
import "./PixelatedGuess.css";
import type { PixelatedGuessDetail } from "../../interfaces/gameInterfaces";
import { resolveCdnUrl } from "../../utils/imageUrl";

interface PixelatedGuessRowProps {
    guess: PixelatedGuessDetail;
    tiltLeft: boolean;
    isLatest: boolean;
    isAnimated: boolean;
    onAlbumAnimated: (albumId: number) => void;
    onAnimationComplete?: () => void;
}

const PixelatedGuessRow = ({
    guess,
    tiltLeft,
    isLatest,
    isAnimated,
    onAlbumAnimated,
    onAnimationComplete,
}: PixelatedGuessRowProps) => {
    const coverUrl = resolveCdnUrl(guess.cover_path);

    const [hasAnimated, setHasAnimated] = useState(isAnimated);
    const shouldAnimate = isLatest && !hasAnimated;

    const handleAnimationEnd = useCallback(
        (e: React.AnimationEvent) => {
            if (e.animationName !== "guessRowCorrect" && e.animationName !== "guessRowIncorrect") return;

            if (shouldAnimate) {
                onAlbumAnimated(guess.album_id);
                setHasAnimated(true);
            }
            onAnimationComplete?.();
        },
        [shouldAnimate, onAlbumAnimated, guess.album_id, onAnimationComplete]
    );

    useEffect(() => {
        if (!isLatest && !isAnimated) {
            onAlbumAnimated(guess.album_id);
        }
    }, [isLatest, isAnimated, guess.album_id, onAlbumAnimated]);

    return (
        <div className={tiltLeft ? "kp-tilt-l" : "kp-tilt-r"}>
            <div
                className={`relative w-full ${shouldAnimate ? "pixel-guess-enter" : ""}`}
                onAnimationEnd={shouldAnimate ? handleAnimationEnd : undefined}
            >
                <span className={`pixel-fabric -top-2.5 ${tiltLeft ? "-right-2.5 rotate-[-14deg]" : "-left-2.5 rotate-14"}`} />

                <div className={`flex justify-center items-center gap-4 py-2.5 pl-3 pr-4 rounded-full border-2 border-ink
                    shadow-[0_4px_0_var(--color-ink),0_6px_12px_rgba(0,0,0,0.08)] ${guess.guess_correct ? "pixel-row--correct" : "pixel-row--incorrect"}`}>
                    <div
                        className="w-12 h-12 rounded-xl border-2 border-ink bg-ink shadow-[3px_1.5px_0_rgba(0,0,0,1)]
                        overflow-hidden hover:scale-110 transition-transform duration-300 transform-gpu"
                    >
                        <img
                            src={coverUrl ?? undefined}
                            alt={`${guess.album_name} cover`}
                            className="w-full h-full object-cover"
                            draggable={false}
                        />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div
                            className="text-xl font-bold text-white [text-shadow:1px_2px_4px_rgba(0,0,0,0.6)]
                            tracking-[-0.01em] leading-[1.1] truncate"
                        >
                            {guess.album_name}
                        </div>
                        <div className="text-sm font-medium text-white/80 [text-shadow:1px_2px_4px_rgba(0,0,0,0.6)] truncate">{guess.group_name}</div>
                    </div>
                    <div className={`pixel-cluster ${guess.guess_correct ? `pixel-cluster--ok` : "pixel-cluster--no"}`}>
                        <i /><i /><i /><i />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(PixelatedGuessRow, (prev, next) => {
    return prev.guess.album_id === next.guess.album_id &&
        prev.isLatest === next.isLatest &&
        prev.isAnimated === next.isAnimated &&
        prev.tiltLeft === next.tiltLeft;
});
