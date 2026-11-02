import { useState } from "react";
import { BLUR_LEVELS } from "../BlurryMode/blurLevels";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { CLASSIC_EXAMPLE, HINT_AT, guessesLeft } from "./howToPlayData";
import { GuessStepper, GuideCard, Heading, Steps, Switch } from "./HowToPlayParts";

const BlurryGuide = () => {
    const [guesses, setGuesses] = useState(0);
    const [isHardmode, setIsHardmode] = useState(false);
    const [isColorOn, setIsColorOn] = useState(false);

    const isColorUnlocked = guesses >= HINT_AT.blurryColor;
    const blur = isHardmode ? BLUR_LEVELS[0] : BLUR_LEVELS[Math.min(guesses, BLUR_LEVELS.length - 1)];

    const helps = [
        {
            label: "Hardmode",
            text: "Guesses will NOT unblur the photo. For players who want a challenge.",
            on: isHardmode,
            locked: false,
            toggle: () => setIsHardmode(!isHardmode),
        },
        {
            label: "Color",
            text: `Reveals the photo's colours. Unlocks after ${HINT_AT.blurryColor} guesses, for when you're struggling to spot the idol.`,
            on: isColorOn && isColorUnlocked,
            locked: !isColorUnlocked,
            toggle: () => setIsColorOn(!isColorOn),
        },
    ];

    return (
        <>
            <GuideCard index={0}>
                <div className="grid grid-cols-[minmax(0,340px)_minmax(0,1fr)] @max-[761px]:grid-cols-1 items-center gap-7 @max-[761px]:gap-5">
                    <div className="flex flex-col gap-3.5">
                        <div className="aspect-square overflow-hidden rounded-[18px] border-[2.5px] border-[#1A1418] bg-[#DCD6D2] shadow-[4px_5px_0_var(--ctl-off)]">
                            {/* The blur is the game's own level for this attempt, so it stays inline. */}
                            <img
                                src={resolveCdnUrl(CLASSIC_EXAMPLE.hit.image) ?? ""}
                                alt="Blurred idol photo"
                                className="block size-full object-cover scale-110 transition-[filter] duration-550 ease-(--ease-settle)"
                                style={{ filter: `blur(${blur}px) grayscale(${isColorOn && isColorUnlocked ? 0 : 1})` }}
                            />
                        </div>

                        <GuessStepper value={guesses} max={BLUR_LEVELS.length - 1} onChange={setGuesses} />
                    </div>

                    <div className="flex flex-col gap-4">
                        <Heading number={1}>HOW TO PLAY</Heading>

                        <Steps
                            steps={[
                                "Type the name of a K-pop idol or group in the search bar.",
                                "Press Enter or click the Guess button to submit.",
                                "The photo starts blurred and gets clearer with each guess.",
                            ]}
                        />

                        <p className="m-0 text-sm text-(--muted)"><b>Important:</b> not all idols are in Blurry mode yet. The list is updated regularly.</p>
                    </div>
                </div>
            </GuideCard>

            <GuideCard index={1}>
                <Heading number={2}>HELPS</Heading>
                <span className="text-sm text-(--muted)">Two switches change how the photo behaves. Try them on the photo above.</span>

                {helps.map((help) => (
                    <div key={help.label} className="flex flex-col gap-2 p-3.5 rounded-2xl border-2 border-(--ink) bg-(--chip)">
                        <div className="flex items-center justify-between gap-3">
                            <span className="font-bold text-[15px]">{help.label}</span>
                            <Switch
                                label={help.label}
                                on={help.on}
                                locked={help.locked}
                                lockText={`+ ${guessesLeft(guesses, HINT_AT.blurryColor)}`}
                                onToggle={help.toggle}
                            />
                        </div>

                        <span className="text-[13.5px] text-(--muted)">{help.text}</span>
                    </div>
                ))}
            </GuideCard>
        </>
    );
};

export default BlurryGuide;
