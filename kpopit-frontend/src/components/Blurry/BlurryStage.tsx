import { useState } from "react";
import { cn } from "../../lib/utils";
import Img from "../Img";

interface BlurryStageProps {
    src: string;
    blur: number;
    color: boolean;
    gameEnded: boolean;
    answerName?: string;
    isLoading?: boolean;
    onLoad?: () => void;
}

const CORNERS = [
    "top-5 left-5 border-l-3 border-t-3",
    "top-5 right-5 border-r-3 border-t-3",
    "bottom-5 left-5 border-l-3 border-b-3",
    "bottom-5 right-5 border-r-3 border-b-3",
];

/** Both challenge dates use the same photo frame, reveal and mobile zoom. */
const BlurryStage = ({ src, blur, color, gameEnded, answerName, isLoading = false, onLoad }: BlurryStageProps) => {
    const [isTouched, setIsTouched] = useState(false);

    return (
        <>
            {isTouched && <div className="fixed inset-0 z-40 bg-black/60" onTouchEnd={() => setIsTouched(false)} />}

            <div className="relative group" onTouchEnd={() => setIsTouched(false)}>
                <div
                    className={cn(
                        "relative flex items-center justify-center overflow-hidden mb-4 rounded-[46px] border-2 border-white",
                        "max-xxs:w-55 max-xxs:h-80 xxs:w-60 xxs:h-88 xs:w-70 xs:h-98 xm:w-70 xm:h-98 zm:w-80 zm:h-108 sm:w-100 sm:h-128",
                        "transition-all duration-300 transform-gpu",
                        isLoading ? "bg-gray-600" : "bg-black",
                        isTouched ? "scale-110 z-50" : "scale-100",
                    )}
                    onTouchEnd={(event) => {
                        if (!window.matchMedia("(orientation: portrait)").matches) return;

                        setIsTouched((current) => !current);
                        event.stopPropagation();
                    }}
                >
                    {CORNERS.map((corner) => (
                        <div key={corner} className={cn("absolute z-10 max-xxs:size-4 xxs:size-4 xs:size-6 border-white/20", corner)} />
                    ))}

                    <Img
                        priority
                        src={src}
                        alt={gameEnded && answerName ? `Blurry image of ${answerName}` : "Blurry image of the day's idol"}
                        style={{ filter: `blur(${gameEnded ? 0 : blur}px) grayscale(${gameEnded || color ? 0 : 100}%)` }}
                        onLoad={onLoad}
                        onError={onLoad}
                        draggable={false}
                        className={cn(
                            "size-full pointer-events-none select-none object-cover transition-all duration-1000",
                            isLoading ? "opacity-0" : "opacity-100",
                        )}
                    />
                </div>
            </div>
        </>
    );
};

export default BlurryStage;
