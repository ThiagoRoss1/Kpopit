import { useState, useEffect, useRef } from "react";
import "./PixelatedVictory.css";
import { albumCoverUrl } from "../../utils/imageUrl";
import type { YesterdayAlbum } from "../../interfaces/gameInterfaces";
import { OtherGamemodes } from "../OtherGamemodes/OtherGamemodes";
import { Copy } from "lucide-react";
import TargetAttempt from "../../assets/icons/target.svg";
import RankPosition from "../../assets/icons/ranking-fill.svg";
import PositionTrend from "../../assets/icons/trending-up.svg";
import Xlogo from "../../assets/icons/x-logo.svg";

interface  GameMode {
    id: string;
    name: string;
    path: string;
    won?: boolean;
    photoSpecs?: string;
}

interface PixelatedVictoryProps {
    albumName: string;
    groupName: string;
    coverPath: string;
    yesterdayAlbum?: YesterdayAlbum["album_name"] | null;
    yesterdayAlbumCover?: YesterdayAlbum["cover_path"] | null;
    yesterdayAlbumArtist?: YesterdayAlbum["artist"] | null;
    attempts: number;
    position?: number | null;
    score?: number | null;
    rank?: number | null;
    otherGamemodes?: GameMode[];
}

const PixelatedVictory = (props: PixelatedVictoryProps) => {
    const { albumName, groupName, coverPath, yesterdayAlbum, yesterdayAlbumCover, yesterdayAlbumArtist, attempts, position, score, rank, otherGamemodes } = props;
    
    const [copied, setCopied] = useState<boolean>(false);
    const [showYesterdayName, setShowYesterdayName] = useState<boolean>(false);
    const [isYNameTruncated, setIsYNameTruncated] = useState<boolean>(false);
    const coverUrl = albumCoverUrl(coverPath);
    const yesterdayCoverUrl = yesterdayAlbumCover ? albumCoverUrl(yesterdayAlbumCover) : null;

    const cardRef = useRef<HTMLDivElement>(null);
    const yNameRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const el = yNameRef.current;
        if (!el) return;
        const check = () => setIsYNameTruncated(el.scrollWidth > el.clientWidth + 1);
        check();
        const ro = new ResizeObserver(check);
        ro.observe(el);
        return () => ro.disconnect();
    }, [yesterdayAlbum]);
    
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

    const textToCopy = (attempts: number) => {
        const header = `I guessed today's #KpopIt Pixelated album in ${attempts} ${attempts === 1 ? "attempt" : "attempts"}! 🎶\n\n`;
        const siteLink = `\n\n${window.location.href}`;

        return header + siteLink;
    }
    
    const handleCopy = (attempts: number) => {
        navigator.clipboard.writeText(textToCopy(attempts));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleShare = (attempts: number) => {
        const text = encodeURIComponent(textToCopy(attempts));
        const twitterWebIntentUrl = `https://twitter.com/intent/tweet?text=${text}`;

        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
            const twitterAppUrl = `twitter://post?message=${text}`;
            const now = Date.now();
            window.location.href = twitterAppUrl;
            setTimeout(() => {
                if (Date.now() - now < 1000) {
                    window.open(twitterWebIntentUrl, '_blank', "noopener,noreferrer");
                }
            }, 800);
        } else {
            window.open(twitterWebIntentUrl, "_blank", "noopener,noreferrer");
        };
    };

    const fmt = (v: number | null | undefined) => (v === null || v === undefined ? "—" : String(v));

    const ordinal = (n: number | null | undefined) => {
        if (n === null || n === undefined) return "—";
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
    };

    return (
        <div ref={cardRef} className="pixel-victory-enter w-full max-w-130 sm:max-w-150 mx-auto overflow-hidden bg-cream rounded-3xl border-2 border-ink shadow-[6px_6px_0_var(--color-ink)] max-xxs:px-4 max-xxs:py-6 px-6 py-8 sm:px-9 sm:py-10">
            {/* Title */}
            <p className="text-center max-xxs:text-2xl text-3xl sm:text-4xl font-bold text-white [text-shadow:1.5px_2px_8px_rgba(0,0,0,0.8)] max-xxs:mb-5 mb-6 sm:mb-10">
                Congratulations! ♪
            </p>

            {/* Album + vinyl + hangul backdrop */}
            <div className="relative max-xxs:h-49 h-55 sm:h-70 mb-6 sm:mb-4">
                <div className="absolute inset-0 z-0 flex items-center justify-center font-korean font-black max-xxs:text-[120px] text-[160px]
                    text-ink/6 tracking-[-0.04em] whitespace-nowrap pointer-events-none select-none">
                    케이팝잇
                </div>

                {/* Vinyl disc */}
                <div className="absolute max-xxs:right-2 right-4.5 max-xxs:top-4 top-5.5 z-1 max-xxs:w-37 max-xxs:h-37 w-45 h-45 sm:w-55 sm:h-55 sm:top-7.5">
                    <div className="pixel-vinyl">
                        <div className="pixel-vinyl__spin">
                            <div className="pixel-vinyl__label overflow-hidden rounded-full">
                                <img src={coverUrl} alt={`${albumName} cover`} className="w-full h-full object-cover" draggable={false} />
                            </div>
                        </div>
                        <div className="pixel-vinyl__light" />
                        <div className="pixel-vinyl__hole" />
                    </div>
                </div>

                {/* Album cover */}
                <div className="absolute max-xxs:left-3 left-7.5 top-2 z-2 max-xxs:p-1.5 p-2 rounded-[14px] bg-[#1c1c1c] -rotate-3
                    shadow-[0_8px_22px_rgba(10,10,10,0.25),0_0_0_2px_rgba(10,10,10,0.6)]
                    firefox:shadow-none firefox:drop-shadow-[0_8px_22px_rgba(10,10,10,0.25)] firefox:active:drop-shadow-[0_0_0_2px_0_rgba(10,10,10,0.6)]">
                    <div className="relative max-xxs:w-39 max-xxs:h-39 w-47.5 h-47.5 sm:w-57.5 sm:h-57.5 rounded-lg overflow-hidden">
                        <img
                            src={coverUrl}
                            alt={`${albumName} cover`}
                            className="w-full h-full object-cover"
                            draggable={false} />

                        <div className="absolute left-3 right-3 bottom-2.5 text-white [text-shadow:1px_2px_4px_rgba(0,0,0,1)]">
                            <div className="max-xxs:text-base text-xl sm:text-2xl font-bold leading-none uppercase">
                                {albumName}
                            </div>

                            <div className="max-xxs:text-xs text-sm font-semibold mt-1 uppercase italic">
                                {groupName}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <span className="flex justify-center items-center text-center mb-4">
                <span className="font-['Caveat',cursive] text-2xl text-ink">
                    You were the <span className="text-neon-pink font-bold">{ordinal(rank)}</span> fan to guess the album!
                </span>
            </span>

            {/* Yesterday's album */}
            {yesterdayAlbum && (
                <div className="mt-4 mb-8">
                    <div className="flex flex-col gap-3 rounded-[18px] bg-linear-to-br from-cream to-[#e4d2cc] border-2 border-ink shadow-[4px_4px_0_var(--color-ink)] max-xxs:px-3 max-xxs:py-3 xxs:px-3 xs:px-4 py-4 sm:px-5
                    firefox:shadow-none firefox:drop-shadow-[4px_4px_0_var(--color-ink)] firefox:active:drop-shadow-[4px_4px_0_var(--color-ink)]">
                        <span className="flex justify-center items-center max-xxs:text-lg text-xl sm:text-2xl font-bold text-white [text-shadow:1px_2px_4px_rgba(0,0,0,1)]">
                            Yesterday's Album
                        </span>

                        <div className="flex flex-row items-center max-xxs:gap-3 gap-4 sm:gap-5">
                            {/* Sleeve */}
                            <div className="relative shrink-0 max-xxs:w-26 max-xxs:h-21 w-31 h-25 sm:w-34 sm:h-26">
                                {/* Vinyl disc */}
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 max-xxs:w-16 max-xxs:h-16 w-20 h-20 sm:w-21 sm:h-21 z-0">
                                    <div className="pixel-vinyl">
                                        <div className="pixel-vinyl__spin">
                                            <div className="pixel-vinyl__label overflow-hidden rounded-full">
                                                <img 
                                                    src={yesterdayAlbumCover ? albumCoverUrl(yesterdayAlbumCover) : undefined} 
                                                    alt={`${yesterdayAlbum} cover`} 
                                                    className="w-full h-full object-cover" draggable={false} />
                                            </div>
                                        </div>
                                        <div className="pixel-vinyl__light" />
                                        <div className="pixel-vinyl__hole" />
                                    </div>
                                </div>

                                {/* Album sleeve */}
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-3 max-xxs:w-19 max-xxs:h-19 w-23 h-23 sm:w-24 sm:h-24 z-1 p-1 rounded-[9px]
                                bg-[#1c1c1c] shadow-[0_5px_14px_rgba(10,10,10,0.25)]">
                                    <img
                                        src={yesterdayCoverUrl || undefined}
                                        alt={`${yesterdayAlbum} cover`}
                                        className="w-full h-full object-cover rounded-md"
                                        draggable={false}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col min-w-0 flex-1">
                                <div className="group/yname relative min-w-0">
                                    <span
                                        ref={yNameRef}
                                        onClick={() => isYNameTruncated && setShowYesterdayName(v => !v)}
                                        className={`block max-sm:truncate max-xxs:text-xl text-2xl sm:text-3xl font-bold leading-none text-white [text-shadow:1px_2px_4px_rgba(0,0,0,1)]
                                        ${isYNameTruncated ? "hover:cursor-pointer" : ""}`}
                                    >
                                        {yesterdayAlbum}
                                    </span>

                                    {isYNameTruncated && (
                                        <span
                                            role="tooltip"
                                            className={`pointer-events-none absolute right-0 bottom-5 z-30 mb-2 w-max max-w-[70vw]
                                            rounded-lg border-2 border-ink bg-[#1f1f1f] px-3 py-1.5
                                            text-sm font-semibold text-cream whitespace-normal wrap-break-word leading-snug
                                            shadow-[3px_3px_0_var(--color-neon-pink)] firefox:shadow-none firefox:drop-shadow-[3px_3px_0_var(--neon-pink)]
                                            opacity-0 -translate-y-1 transition-all duration-150
                                            group-hover/yname:opacity-100 group-hover/yname:translate-y-0 
                                            ${showYesterdayName ? "opacity-100 translate-y-0" : ""}`}
                                        >
                                            {yesterdayAlbum}
                                        </span>
                                    )}

                                    {showYesterdayName && (
                                        <div
                                            className="fixed inset-0 z-20"
                                            onClick={() => setShowYesterdayName(false)}
                                        />
                                    )}
                                </div>

                                <span className="mt-1 text-sm text-white [text-shadow:1px_2px_4px_rgba(0,0,0,0.8)]">{yesterdayAlbumArtist}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="flex w-full max-xxs:gap-1.5 gap-2 mb-8">
                <div 
                    className="flex flex-1 flex-col justify-start items-center text-center max-xxs:py-2.5 max-xxs:px-1 py-3 px-2 gap-1 bg-linear-to-r from-[#1f1f1f] to-[#1f1f1f]/90 rounded-3xl
                    shadow-[3px_3px_0_var(--color-neon-pink)] text-cream hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_1px_0_var(--color-neon-pink)] transition-all duration-300"
                >
                    <img src={TargetAttempt} alt="Attempts Icon" className="w-4 h-4 sm:w-6 sm:h-6" draggable={false} />

                    <div className="font-bold max-xxs:text-xl text-2xl">{attempts}</div>

                    <div className="font-bold max-xxs:text-[11px] text-sm uppercase">
                        {`${attempts === 1 ? 'Attempt' : 'Attempts'}`}
                    </div>
                    </div>
                <div 
                    className="flex flex-1 flex-col justify-start items-center text-center max-xxs:py-2.5 max-xxs:px-1 py-3 px-2 gap-1 bg-linear-to-r from-[#1f1f1f] to-[#1f1f1f]/90 rounded-3xl
                    shadow-[3px_3px_0_var(--color-neon-pink)] text-cream hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_1px_0_var(--color-neon-pink)] transition-all duration-300"
                >
                    <img src={RankPosition} alt="Rank Icon" className="w-4 h-4 sm:w-6 sm:h-6" draggable={false} />

                    <div className="font-bold max-xxs:text-xl text-2xl">{fmt(position)}</div>

                    <div className="font-bold max-xxs:text-[11px] text-sm uppercase">Position</div>
                </div>

                <div 
                    className="flex flex-1 flex-col justify-start items-center text-center max-xxs:py-2.5 max-xxs:px-1 py-3 px-2 gap-1 bg-linear-to-r from-[#1f1f1f] to-[#1f1f1f]/90 rounded-3xl
                    shadow-[3px_3px_0_var(--color-neon-pink)] text-cream hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_1px_0_var(--color-neon-pink)] transition-all duration-300"
                >
                    <img src={PositionTrend} alt="Position Icon" className="w-4 h-4 sm:w-6 sm:h-6" draggable={false} />

                    <div className="font-bold max-xxs:text-xl text-2xl">{fmt(score)}</div>

                    <div className="font-bold max-xxs:text-[11px] text-sm uppercase">Score</div>
                </div>
            </div>

            <div className="flex flex-col w-full h-full gap-1">
                <div className="flex items-start justify-start">
                    <span className="text-ink text-lg font-bold [text-shadow:1px_1px_6px_rgba(0,0,0,0)]">
                        Other Game Modes
                    </span>
                </div>
            
                <OtherGamemodes 
                    otherGamemodes={otherGamemodes || []} 
                />
            </div>

            {/* Share */}
            <div className="flex flex-row justify-center gap-2 mt-6">
                <button
                    type="button"
                    onClick={() => handleCopy(attempts)}
                    className="kp-tilt-l flex justify-center items-center text-center gap-2 w-45 sm:w-50 h-12 px-5 sm:px-7 rounded-full font-bold text-[14px] sm:text-base text-white
                    bg-neon-pink border-2 border-ink shadow-[0_5px_0_var(--color-ink)] firefox:shadow-none firefox:drop-shadow-[0_5px_0_var(--color-ink)] 
                    firefox:active:drop-shadow-[0_1px_0_var(--color-ink)] transition-all duration-200 transform-gpu
                    hover:scale-101 firefox:hover:scale-100 hover:brightness-110 hover:cursor-pointer active:translate-y-1 active:shadow-[0_1px_0_var(--color-ink)]"
                >
                    <Copy className="w-4 h-4" />
                    {copied ? "Copied!" : "Share Results"}
                </button>

                <button 
                    onClick={() => handleShare(attempts)}
                    className="kp-tilt-r flex justify-center items-center text-center gap-2 w-12 h-12 rounded-full 
                    bg-neon-pink border-2 border-ink shadow-[0_5px_0_var(--color-ink)] firefox:shadow-none firefox:drop-shadow-[0_5px_0_var(--color-ink)] 
                    firefox:active:drop-shadow-[0_1px_0_var(--color-ink)] transition-all duration-200 transform-gpu
                    hover:scale-101 firefox:hover:scale-100 hover:brightness-110 hover:cursor-pointer active:translate-y-1 active:shadow-[0_1px_0_var(--color-ink)]"
                >
                    <img 
                        src={Xlogo} 
                        alt="X" 
                        className="w-8 h-8 object-cover" 
                        draggable={false} />
                </button>
            </div>
        </div>
    );
};

export default PixelatedVictory;
