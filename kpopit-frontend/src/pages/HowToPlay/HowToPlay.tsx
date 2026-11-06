import { useSearchParams } from "react-router";
import PageShell from "../../components/PageShell/PageShell";
import { Pill, PressLink } from "../../components/buttons/PressButton";
import PageMeta from "../../components/Seo/PageMeta";
import { useHydrated } from "../../hooks/useHydrated";
import useResetTimer from "../../hooks/useResetTimer";
import { HOW_TO_PLAY } from "../../content/howToPlay";
import { MODES, parseMode, type HowToMode } from "./howToPlayData";
import ClassicGuide from "./ClassicGuide";
import BlurryGuide from "./BlurryGuide";
import PixelatedGuide from "./PixelatedGuide";
import "./howToPlay.css";

const capitalize = (word: string) => word[0].toUpperCase() + word.slice(1);

const HowToPlay = () => {
    const hydrated = useHydrated();
    const [params, setParams] = useSearchParams();

    // Prerendered as Classic; ?mode= switches once the page is live.
    const mode: HowToMode = hydrated ? parseMode(params.get("mode")) : "classic";
    const { timeRemaining, formattedTime } = useResetTimer({ day: null });

    const pickMode = (next: HowToMode) =>
        setParams((current) => {
            if (next === "classic") current.delete("mode");
            else current.set("mode", next);
            return current;
        }, { replace: true, preventScrollReset: true });

    return (
        <>
            <PageMeta
                title="How to play KpopIt: Classic, Blurry and Pixelated rules"
                description="How each KpopIt mode works: tile colours and arrows in Classic, the blurred photo in Blurry, the pixelated album cover in Pixelated, and when hints unlock."
                path="/how-to-play"
            />

            <PageShell header={{ title: "How to play", korean: "게임 방법", koreanLength: "long", subtitle: HOW_TO_PLAY[mode].intro }} width="max-w-220">
                <div className="pp-enter [--pp-delay:140ms] flex flex-col items-center gap-4 mt-6 mb-8.5">
                    <div role="tablist" aria-label="Game mode" className="flex justify-center gap-2 @max-[360px]:gap-1.5">
                        {MODES.map((option) => (
                            <Pill
                                key={option}
                                role="tab"
                                aria-selected={mode === option}
                                active={mode === option}
                                onClick={() => pickMode(option)}
                                className="h-11 px-5 @max-[360px]:px-3.25 font-bold text-[15px] @max-[360px]:text-sm"
                            >
                                {capitalize(option)}
                            </Pill>
                        ))}
                    </div>

                    <div className="flex flex-col items-center gap-1.25 pt-2.25 px-5.5 pb-2.5 rounded-[20px] border-2 border-dashed border-(--rule) text-center text-(--muted)">
                        <div className="flex items-center gap-2.5 whitespace-nowrap">
                            <span className="font-semibold text-[13px]">{mode === "pixelated" ? "Next album in" : "Next idol in"}</span>
                            <span aria-label="Time left" className="inline-flex font-bold text-[19px] leading-none text-(--text) tabular-nums">
                                {timeRemaining === null ? "--:--:--" : formattedTime}
                            </span>
                        </div>

                        <span className="font-medium text-xs whitespace-nowrap">Midnight at UTC-5 (EST)</span>
                    </div>
                </div>

                <div key={mode} className="flex flex-col gap-6.5">
                    {mode === "classic" && <ClassicGuide />}
                    {mode === "blurry" && <BlurryGuide />}
                    {mode === "pixelated" && <PixelatedGuide />}

                    <div className="flex flex-wrap items-center justify-center gap-4 mt-3">
                        <span className="font-caveat font-bold text-[28px] text-(--group) -rotate-2">Good luck and have fun!</span>
                        <PressLink to={`/${mode}`} variant="cta" size="lg">{`Play ${capitalize(mode)}`}</PressLink>
                    </div>
                </div>
            </PageShell>
        </>
    );
};

export default HowToPlay;
