import { useState } from "react";
import PixelatedCanvas from "../../components/Pixelated/PixelatedCanvas";
import { PIXEL_LEVELS } from "../../utils/pixelLevels";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { cn } from "../../lib/utils";
import { HINT_AT, guessesLeft } from "./howToPlayData";
import { GuessStepper, GuideCard, Heading, Steps } from "./HowToPlayParts";

const SLEEVES = [
    { label: "Release Year", korean: "발매년도", value: "2022", unlocksAt: HINT_AT.pixelated[0], look: "bg-[#E4E4E4] text-[#72401A]" },
    { label: "Artist", korean: "가수", value: "IVE", unlocksAt: HINT_AT.pixelated[1], look: "bg-[#FFD1E8] text-[#5A1A48]" },
];

// The game's sleeve motion: a springy slide for the record and the sleeve.
const SLEEVE_MOTION = "transition-[translate,rotate] duration-600 ease-[cubic-bezier(.34,1.4,.64,1)] will-change-transform";

const PixelatedGuide = () => {
    const [guesses, setGuesses] = useState(0);
    const [openSleeves, setOpenSleeves] = useState([false, false]);

    const toggleSleeve = (index: number) => setOpenSleeves((open) => open.map((isOpen, i) => (i === index ? !isOpen : isOpen)));

    return (
        <>
            <GuideCard index={0}>
                <div className="grid grid-cols-[minmax(0,340px)_minmax(0,1fr)] @max-[761px]:grid-cols-1 items-center gap-7 @max-[761px]:gap-5">
                    <div className="flex flex-col gap-3.5">
                        <div className="relative aspect-square overflow-hidden rounded-[18px] border-[2.5px] border-[#1A1418] bg-[#DCD6D2] shadow-[4px_5px_0_var(--ctl-off)]">
                            {/* The game's own mosaic canvas, so each step looks exactly like that attempt in Pixelated. */}
                            <PixelatedCanvas
                                imageUrl={resolveCdnUrl("/images/albums/after_like.webp") ?? undefined}
                                blockSize={PIXEL_LEVELS[Math.min(guesses, PIXEL_LEVELS.length - 1)]}
                                alt="Pixelated album cover"
                                className="absolute inset-0 size-full"
                            />
                        </div>

                        <GuessStepper value={guesses} max={PIXEL_LEVELS.length - 1} onChange={setGuesses} />
                    </div>

                    <div className="flex flex-col gap-4">
                        <Heading number={1}>HOW TO PLAY</Heading>

                        <Steps
                            steps={[
                                "Type the name of an album in the search bar and pick it from the list.",
                                "Each wrong guess makes the cover less pixelated.",
                                `There are ${PIXEL_LEVELS.length} levels. On the last one the full cover is shown.`,
                            ]}
                        />
                    </div>
                </div>
            </GuideCard>

            <GuideCard index={1}>
                <Heading number={2}>HINTS</Heading>
                <span className="text-sm text-(--muted)">Two hint sleeves unlock as you guess. Use the arrows above to add guesses.</span>

                <div className="flex flex-col gap-4">
                    {SLEEVES.map((sleeve, i) => {
                        const isUnlocked = guesses >= sleeve.unlocksAt;
                        const isOpen = isUnlocked && openSleeves[i];

                        return (
                            <div key={sleeve.label} className="relative h-24">
                                <div
                                    aria-hidden
                                    className={cn(
                                        "absolute left-2 top-2 grid place-items-center size-20 rounded-full border-2 border-[#1A1418] bg-[#0D0008]",
                                        SLEEVE_MOTION,
                                        isOpen && "translate-x-20.5 rotate-360",
                                    )}
                                >
                                    <span className={cn("grid place-items-center size-10 rounded-full font-bold text-xs", sleeve.look)}>{sleeve.value}</span>
                                </div>

                                <button
                                    type="button"
                                    disabled={!isUnlocked}
                                    aria-label={isUnlocked ? `${sleeve.label} hint` : `${sleeve.label} hint, locked`}
                                    onClick={() => toggleSleeve(i)}
                                    className={cn(
                                        "pp-focus absolute left-0 top-0 flex flex-col justify-between size-24 p-2 rounded-[10px] text-left cursor-pointer disabled:cursor-default",
                                        "border-2 border-[#1A1418] shadow-[3px_4px_0_var(--ctl-off)]",
                                        SLEEVE_MOTION,
                                        isOpen ? "-translate-x-1.5 -rotate-7" : "-rotate-2",
                                        sleeve.look,
                                    )}
                                >
                                    <span className="font-bold text-[9px] tracking-[.12em]">HINT #{i + 1}</span>

                                    <span className="font-bold text-[13px] leading-tight">
                                        {sleeve.label}
                                        <br />
                                        <span lang="ko" className="font-korean text-[10px]">{sleeve.korean}</span>
                                    </span>

                                    <span className="font-semibold text-[9px]">
                                        {isUnlocked ? (isOpen ? "Tap to hide" : "Tap to reveal") : `+ ${guessesLeft(guesses, sleeve.unlocksAt)}`}
                                    </span>
                                </button>

                                <span className="@max-[431px]:hidden absolute left-50 top-1/2 -translate-y-1/2 text-sm">
                                    <b>{sleeve.label}</b> unlocks after <b>{sleeve.unlocksAt} guesses</b>.
                                </span>
                            </div>
                        );
                    })}
                </div>

                <span className="text-sm text-(--muted)">Tap an unlocked sleeve to reveal it, tap again to hide it.</span>
            </GuideCard>
        </>
    );
};

export default PixelatedGuide;
