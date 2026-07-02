import React, { useState, useMemo } from "react";
import type { PixelatedGuessDetail } from "../../interfaces/gameInterfaces";
import PixelatedGuessRow from "./PixelatedGuessRow";

interface PixelatedGuessGridProps {
    guesses: PixelatedGuessDetail[];
    onAnimationComplete?: () => void;
}

const getStoredAnimatedAlbums = (): Set<number> => {
    const stored = localStorage.getItem("pixelatedAnimatedAlbums");
    if (!stored) return new Set();

    try {
        const parsed = JSON.parse(stored) as number[];
        return new Set(parsed);
    } catch {
        return new Set();
    }
};

const PixelatedGuessGrid = (props: PixelatedGuessGridProps) => {
    const { guesses, onAnimationComplete } = props;

    const [animatedAlbums, setAnimatedAlbums] = useState<Set<number>>(getStoredAnimatedAlbums());

    const handleAlbumAnimated = (albumId: number) => {
        setAnimatedAlbums(prev => {
            if (prev.has(albumId)) return prev;

            const updated = new Set(prev);
            updated.add(albumId);
            localStorage.setItem("pixelatedAnimatedAlbums", JSON.stringify(Array.from(updated)));

            return updated;
        });
    };

    const orderedGuesses = useMemo(
        () => guesses.map((guess, originalIndex) => ({ guess, originalIndex })).reverse(),
        [guesses]
    );

    if (guesses.length === 0) return null;

    return (
        <div className="flex flex-col gap-4.5">
            {orderedGuesses.map(({ guess, originalIndex }, index) => (
                <PixelatedGuessRow
                    key={guess.album_id}
                    guess={guess}
                    tiltLeft={originalIndex % 2 === 0}
                    isLatest={index === 0}
                    isAnimated={animatedAlbums.has(guess.album_id)}
                    onAlbumAnimated={handleAlbumAnimated}
                    onAnimationComplete={index === 0 ? onAnimationComplete : undefined}
                />
            ))}
        </div>
    );
};

export default React.memo(PixelatedGuessGrid, (prev, next) => {
    if (prev.guesses.length !== next.guesses.length) return false;

    const prevLast = prev.guesses[prev.guesses.length - 1];
    const nextLast = next.guesses[next.guesses.length - 1];

    return prevLast?.album_id === nextLast?.album_id;
});
