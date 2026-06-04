import type { PixelatedGuessDetail } from "../../interfaces/gameInterfaces";
import { albumCoverUrl } from "../../utils/imageUrl";

interface PixelatedGuessRowProps {
    guess: PixelatedGuessDetail;
    tiltLeft: boolean;
    isNewest?: boolean;
}

// One guessed-album pill: cover thumb + album/group + green/red pixel
// cluster, with a fabric-tape patch on the elevated corner and a slight
// tilt. Mirrors the design's GuessRow (albums, not idols).
const PixelatedGuessRow = ({ guess, tiltLeft, isNewest = false }: PixelatedGuessRowProps) => {
    const coverUrl = albumCoverUrl(guess.cover_path);
    return (
        <div
            className={`relative w-full ${isNewest ? "pixel-guess-enter" : ""} ${tiltLeft ? "kp-tilt-l" : "kp-tilt-r"}`}
        >
            <span className={`pixel-fabric -top-2.5 ${tiltLeft ? "-right-2.5 rotate-[-14deg]" : "-left-2.5 rotate-14"}`} />
            <div className="flex items-center gap-4 py-2.5 pl-3 pr-4 rounded-full border-2 border-ink bg-[#fffaf3]
                shadow-[0_4px_0_var(--color-ink),0_6px_12px_rgba(0,0,0,0.08)]">
                <img
                    src={coverUrl}
                    alt={`${guess.album_name} cover`}
                    className="w-12 h-12 shrink-0 rounded-lg border-2 border-ink object-cover shadow-[0_2px_0_rgba(0,0,0,0.5)]"
                    draggable={false}
                />
                <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold text-ink tracking-[-0.01em] leading-[1.1] truncate">{guess.album_name}</div>
                    <div className="text-sm font-medium text-[#6b5d62] truncate">{guess.group_name}</div>
                </div>
                <div className={`pixel-cluster ${guess.guess_correct ? "pixel-cluster--ok" : "pixel-cluster--no"}`}>
                    <i /><i /><i /><i />
                </div>
            </div>
        </div>
    );
};

export default PixelatedGuessRow;
