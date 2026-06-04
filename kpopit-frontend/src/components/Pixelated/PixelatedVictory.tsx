import { useState, useEffect, useRef } from "react";
import { albumCoverUrl } from "../../utils/imageUrl";

interface PixelatedVictoryProps {
    albumName: string;
    groupName: string;
    coverPath: string;
    attempts: number;
    position?: number | null;
    score?: number | null;
    rank?: number | null;
    streak?: number | null;
}

const PixelatedVictory = ({albumName, groupName, coverPath, attempts, position, score, rank, streak}: PixelatedVictoryProps) => {
    const [copied, setCopied] = useState<boolean>(false);
    const coverUrl = albumCoverUrl(coverPath);

    const cardRef = useRef<HTMLDivElement>(null);
    
    // Centre the victory card after a win / on F5 / back — same mechanism as
    // Classic & Blurry (VictoryCardHud): compute the target scroll position and
    // window.scrollTo, rather than scrollIntoView.
    useEffect(() => {
        const scrollToCard = () => {
            if (cardRef.current) {
                const cardPosition = cardRef.current.getBoundingClientRect().top + window.scrollY;
                const offset = window.innerHeight / 2 - cardRef.current.offsetHeight / 2;
                window.scrollTo({ top: cardPosition - offset, behavior: "smooth" });
            }
        };

        const timer = setTimeout(scrollToCard, 300);
        return () => clearTimeout(timer);
    }, []);

    const handleShare = () => {
        const header = `I guessed today's #KpopIt Pixelated album in ${attempts} ${attempts === 1 ? "attempt" : "attempts"}! 🎶\n\n`;
        const body = `${albumName} — ${groupName}`;
        navigator.clipboard.writeText(`${header}${body}\n\n${window.location.href}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const fmt = (v: number | null | undefined) => (v === null || v === undefined ? "—" : String(v));

    return (
        <div ref={cardRef} className="pixel-victory-enter w-full max-w-130 sm:max-w-150 mx-auto overflow-hidden bg-cream rounded-3xl border-2 border-ink shadow-[6px_6px_0_var(--color-ink)] px-6 py-8 sm:px-9 sm:py-10">
            {/* eyebrow */}
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.3em] text-neon-pink">
                ♪ Album solved
            </p>

            {/* album + vinyl + hangul backdrop */}
            <div className="relative mt-4 h-57.5 sm:h-72.5">
                <div className="absolute inset-0 z-0 flex items-center justify-center font-korean font-black text-[96px]
                    text-ink/6 tracking-[-0.04em] whitespace-nowrap pointer-events-none select-none">
                    케이팝잇
                </div>

                {/* Vinyl disc — positioned by this wrapper, fills it */}
                <div className="absolute right-1.5 top-5.5 z-1 w-45 h-45 sm:w-55 sm:h-55 sm:top-7.5">
                    <div className="pixel-vinyl">
                        <div className="pixel-vinyl__spin">
                            <div className="pixel-vinyl__label"><b>KpopIt</b><span>케이팝잇</span></div>
                        </div>
                        <div className="pixel-vinyl__light" />
                        <div className="pixel-vinyl__hole" />
                    </div>
                </div>

                {/* Album cover frame (title baked in) */}
                <div className="absolute left-2.5 top-2 z-2 p-2 rounded-[14px] bg-[#1c1c1c] rotate-[-1.8deg]
                    shadow-[0_8px_22px_rgba(10,10,10,0.25),0_0_0_2px_rgba(10,10,10,0.6)]">
                    <div className="relative w-47.5 h-47.5 sm:w-57.5 sm:h-57.5 rounded-lg overflow-hidden">
                        <img src={coverUrl} alt={`${albumName} cover`} className="w-full h-full object-cover" draggable={false} />
                        <div className="absolute left-3 right-3 bottom-2.5 text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.55)]">
                            <div className="text-[1.375rem] sm:text-[1.625rem] font-bold leading-none tracking-[0.02em] uppercase">{albumName}</div>
                            <div className="text-[0.66rem] font-semibold mt-1 tracking-[0.22em] uppercase opacity-[0.92]">{groupName}</div>
                        </div>
                        <div className="absolute left-2 top-2 w-6.5 h-6.5 rounded-full bg-white/88 flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.3)]">
                            <i className="w-0 h-0 ml-0.5 border-y-[5px] border-y-transparent border-l-[7px] border-l-[#1c1c1c]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* caption */}
            <p className="text-center mt-1">
                <span className="font-['Caveat',cursive] text-[1.375rem] text-ink">
                    you got it in <span className="text-neon-pink font-bold">{attempts}</span> {attempts === 1 ? "try" : "tries"}! ♡
                </span>
            </p>

            {/* stat trio */}
            <div className="flex gap-2 mt-4">
                <div className="pixel-chip">
                    <div className="pixel-chip__val">{attempts}</div>
                    <div className="pixel-chip__label">Guesses</div>
                </div>
                <div className="pixel-chip">
                    <div className="pixel-chip__val">{fmt(position)}</div>
                    <div className="pixel-chip__label">Position</div>
                </div>
                <div className="pixel-chip">
                    <div className="pixel-chip__val">{fmt(score)}</div>
                    <div className="pixel-chip__label">Score</div>
                </div>
            </div>

            {/* joined streak / rank row */}
            <div className="grid grid-cols-2 mt-3 pt-3 border-t-2 border-dashed border-ink/20">
                <div className="flex items-baseline justify-center gap-2.5">
                    <span className="pixel-chip__val">{fmt(streak)}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink/55">streak</span>
                </div>
                <div className="flex items-baseline justify-center gap-2.5 border-l-2 border-dashed border-ink/20">
                    <span className="pixel-chip__val">{rank === null || rank === undefined ? "—" : `#${rank}`}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink/55">rank</span>
                </div>
            </div>

            {/* share */}
            <div className="flex justify-center mt-6">
                <button
                    type="button"
                    onClick={handleShare}
                    className="kp-tilt-l flex items-center gap-2 h-12 px-7 rounded-full font-bold text-base text-white
                    bg-neon-pink border-2 border-ink shadow-[0_5px_0_var(--color-ink)] transition-all duration-150
                    hover:brightness-110 hover:cursor-pointer active:translate-y-1 active:shadow-[0_1px_0_var(--color-ink)]"
                >
                    ⤳ {copied ? "Copied!" : "Share Results"}
                </button>
            </div>
        </div>
    );
};

export default PixelatedVictory;
