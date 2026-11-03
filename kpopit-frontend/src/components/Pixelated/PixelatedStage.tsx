import { useRef, useState } from "react";
import { useIsLg } from "../../hooks/useIsDevice";
import { cn } from "../../lib/utils";
import PixelatedCanvas from "./PixelatedCanvas";
import PixelatedHints from "./PixelatedHints";

interface PixelatedStageProps {
    coverUrl?: string;
    blockSize: number;
    guessCount: number;
    gameEnded: boolean;
    releaseYear: number;
    artistName: string;
    persist?: boolean;
}

/** The daily and calendar game share the sleeve, mobile zoom and hint controls. */
const PixelatedStage = ({ coverUrl, blockSize, guessCount, gameEnded, releaseYear, artistName, persist = true }: PixelatedStageProps) => {
    const isLg = useIsLg();
    const [zoom, setZoom] = useState<"closed" | "open" | "closing">("closed");
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const stageWidth = "w-55 xxs:w-60 xs:w-65 xm:w-70 zm:w-76 sm:w-80 md:w-90 lg:w-90 xl:w-110";

    return (
        <>
            {zoom !== "closed" && (
                <div
                    className={cn("fixed inset-0 z-40 bg-black/60", zoom === "closing" ? "pixel-zoom-backdrop-out" : "pixel-zoom-backdrop-in")}
                    onTouchEnd={() => setZoom((current) => current === "open" ? "closing" : current)}
                />
            )}

            <div className="flex flex-col w-full lg:w-1/2 xl:w-160">
                <div
                    className={cn(
                        "pixel-stage relative w-full mx-auto select-none",
                        "h-70 xxs:h-75 xs:h-80 xm:h-85 zm:h-95 sm:h-100 md:h-110 xl:h-130",
                        zoom !== "closed" && "z-50",
                    )}
                >
                    <div
                        className={cn(
                            "absolute flex aspect-square z-1 top-5 md:top-3 left-1/2 lg:left-32 xl:left-36",
                            "translate-x-[-35%] xs:translate-x-[-30%] zm:translate-x-[-30%] md:translate-x-[-25%] lg:translate-x-[-2%] xl:translate-x-[5%]",
                            "transition-opacity duration-300",
                            stageWidth,
                            zoom === "open" ? "opacity-0" : "opacity-100",
                        )}
                    >
                        <div className="pixel-vinyl">
                            <div className="pixel-vinyl__spin">
                                <div className="pixel-vinyl__label overflow-hidden">
                                    <PixelatedCanvas imageUrl={coverUrl} blockSize={blockSize} alt="Pixelated album cover" className="block size-full rounded-full object-cover" />
                                </div>
                            </div>
                            <div className="pixel-vinyl__light" />
                            <div className="pixel-vinyl__hole" />
                        </div>
                    </div>

                    <div
                        className={cn(
                            "pixel-sleeve absolute flex z-2 left-1/2 lg:left-0 top-[2%] -rotate-4",
                            "translate-x-[-55%] xs:translate-x-[-65%] md:translate-x-[-60%] lg:translate-x-0",
                            "h-65 xxs:h-70 xs:h-75 xm:h-80 zm:h-86 sm:h-90 md:h-100 lg:h-100 xl:h-120",
                            "rounded-2xl rounded-b-3xl border-2 border-cream bg-ink",
                            "shadow-[0_14px_30px_rgba(0,0,0,0.35),0_4px_10px_rgba(0,0,0,0.2)]",
                            stageWidth,
                            zoom === "open" ? "pixel-sleeve-zoom-in" : zoom === "closing" && "pixel-sleeve-zoom-out",
                        )}
                        onTouchStart={(event) => {
                            const touch = event.touches[0];
                            if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY };
                        }}
                        onTouchEnd={(event) => {
                            if (isLg || !window.matchMedia("(orientation: portrait)").matches) return;

                            const start = touchStartRef.current;
                            const touch = event.changedTouches[0];
                            touchStartRef.current = null;
                            if (!start || !touch || Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 10) return;

                            event.stopPropagation();
                            setZoom((current) => current === "open" ? "closing" : "open");
                        }}
                        onAnimationEnd={(event) => {
                            if (event.animationName === "pixelSleeveZoomOut") setZoom("closed");
                        }}
                    >
                        <div className="relative flex items-center justify-center p-4 w-full h-fit">
                            <span className="pixel-washi absolute top-0 -left-6 w-[22%] h-5.5 z-4 rotate-[-34.8deg]" />
                            <span className="pixel-washi absolute top-0 -right-6 w-[22%] h-5.5 z-5 rotate-[34.8deg]" />

                            <div className="relative flex flex-col w-full aspect-square rounded-xl overflow-hidden bg-transparent">
                                <PixelatedCanvas imageUrl={coverUrl} blockSize={blockSize} alt="Pixelated album cover" className="block size-full object-cover" />

                                {!gameEnded && guessCount === 0 && (
                                    <div
                                        className={cn(
                                            "absolute inset-0 z-1 flex items-center justify-center pointer-events-none mix-blend-overlay",
                                            "font-bold text-[clamp(56px,15vw,120px)] text-white/40 text-shadow-[0_4px_20px_rgba(0,0,0,0.5)]",
                                        )}
                                    >
                                        ?
                                    </div>
                                )}

                                <span className="absolute top-2.5 left-2.5 size-3.5 z-3 pointer-events-none border-l-2 border-t-2 border-white/55" />
                                <span className="absolute top-2.5 right-2.5 size-3.5 z-3 pointer-events-none border-r-2 border-t-2 border-white/55" />
                                <span className="absolute bottom-2.5 left-2.5 size-3.5 z-3 pointer-events-none border-l-2 border-b-2 border-white/55" />
                                <span className="absolute bottom-2.5 right-2.5 size-3.5 z-3 pointer-events-none border-r-2 border-b-2 border-white/55" />
                            </div>
                        </div>

                        <div className="absolute inset-x-0 bottom-4 z-3 text-center font-caveat text-xl xs:text-2xl leading-none tracking-[0.02em] text-white text-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                            Guess the album
                        </div>
                    </div>
                </div>

                {!gameEnded && (
                    <div className="mt-2 lg:mt-6 flex items-center justify-center">
                        <PixelatedHints guessCount={guessCount} releaseYear={releaseYear} artistName={artistName} persist={persist} />
                    </div>
                )}
            </div>
        </>
    );
};

export default PixelatedStage;
