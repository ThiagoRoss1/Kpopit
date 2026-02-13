import "./ModeOptions.css";
import { useEffect, useState } from "react";
import Switch from "../../buttons/ui/Switch";

interface ModeOptionsProps {
    options: {
        hardcore: boolean;
        color: boolean;
    };
    onToggle: (id: 'hardcore' | 'color') => void;
    attempts: number;
    groups?: string[] | null;
}

const ModeOptions = (props: ModeOptionsProps) => {
    const { options, onToggle, attempts, groups } = props;

    const [isHintRevealed] = useState(() => {
        return localStorage.getItem("blurryHintClicked") === "true";
    })

    const [isHintClicked, setIsHintClicked] = useState(isHintRevealed);

    const COLOR = 4;
    const GROUP_HINT = 8;

    const canUseColorMode = attempts >= COLOR;
    const canUseGroupHint = attempts >= GROUP_HINT;

    const remaining = COLOR - attempts;
    const groupsDisplay = groups && groups.length > 0 ? groups : ["Soloist"];

    useEffect(() => {
        if (isHintClicked) {
            localStorage.setItem("blurryHintClicked", "true");
        }
    }, [isHintClicked]);

    return (
        <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex w-50 h-14 sm:w-60 sm:h-16 justify-center items-center
            bg-transparent border border-white rounded-2xl gap-0 p-1 sm:gap-4 sm:p-2">
                <div className="flex flex-1 flex-col items-center gap-0.5 mb-0.5 sm:gap-0.5 sm:mb-0.5">
                    <span className="text-white [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)] text-[12px] sm:text-sm">
                        Hardmode
                    </span>

                    <Switch
                        isActive={options.hardcore}
                        onToggle={() => onToggle('hardcore')}
                        disabled={false}
                    />
                </div>

                <div className="w-0.5 h-8 sm:w-0.5 sm:h-8 bg-gray-300" />

                <div className={`flex flex-1 flex-col items-center gap-0.5 mb-0.5 sm:gap-0.5 sm:mb-0.5
                    ${!canUseColorMode ? "opacity-50 grayscale" : ""}`}>
                    <span className="text-white [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)] text-[12px] sm:text-sm">
                        Color {remaining > 0 ? `(${remaining})` : ""}
                    </span>

                    <Switch
                        isActive={options.color}
                        onToggle={() => onToggle('color')}
                        disabled={!canUseColorMode}
                    />
                </div>
            </div>

            {/* Hint box */}
            {canUseGroupHint && groups && (
            <button 
                className={`relative flex ${isHintClicked ? "" : "mode-options-hint-box"}`}
                onClick={() => setIsHintClicked(true)}
                aria-label="Reveal Group Hint"
            >
                {!isHintClicked ? (
                <div className="flex flex-col w-50 h-14 sm:w-60 sm:h-16 justify-center items-center
                bg-transparent border border-white rounded-2xl gap-0 p-1 sm:gap-4 sm:p-2
                hover:cursor-pointer">            
                    <span className="justify-center items-center text-white text-base px-0">
                        Click to reveal idol's {groupsDisplay.length > 1 ? `groups` : `group`}
                    </span>
                </div>
                ) : (
                    <div className="flex flex-row w-50 h-14 sm:w-60 sm:h-16 justify-center items-center
                    bg-black border border-white rounded-2xl gap-0 p-1 sm:gap-4 sm:p-2
                    transition-colors duration-2000 transform-gpu">
                        <span className={`justify-center items-center ${(!isHintRevealed && isHintClicked ? "text-hint-fade-in" : "")}
                        text-white text-lg [text-shadow:1.2px_1.6px_2.0px_rgba(255,51,153,1)]`}>
                            {groupsDisplay.join(", ")}
                        </span>
                    </div>
                )}
            </button>
            )}
        </div>
    )
}

export default ModeOptions;