import useResetTimer from "../../../hooks/useResetTimer";

const HowToPlayBlurryContent = () => {
    const nextReset = useResetTimer();

    return (
        <div className="w-full">
            
            {/* Introduction Section */}
            <div className="flex flex-col w-full justify-center items-center gap-2">
                <h3 className="text-[18px]">Guess today's K-pop blurry Idol. It changes every 24 hours.</h3>
                <span className="text-base">You can search for an idol by typing their name in the search bar.</span>
            </div>
                <div className="flex flex-col w-full justify-center items-center mt-6 gap-1.5">
                    <span className="text-[18px]">Next idol in</span>
                    <span className="text-3xl">{nextReset.formattedTime}</span>
                    <span className="text-[12px]">Timezone: America (EST)</span>
                    <span className="text-[12px]">(Midnight at UTC-5)</span>
                </div>

            {/* How to Play Section */}
            <div className="flex flex-col w-full">
                <div className="flex flex-col w-full items-start justify-center mt-8 gap-1">
                    <h3 className="text-4xl font-bold text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                        How to play
                    </h3>
                </div>

                <div className="flex flex-col w-full items-start justify-center border-t border-white mt-2 gap-0">
                    <span className="pt-2 normal-font">In blurry mode, you must type the name of a K-pop idol or group in the search bar.</span>
                    <span className="normal-font">To submit your guess, press <b>enter</b> or click the <b>Guess</b> button</span>

                    {/* Blurry */}
                    <div className="flex flex-col w-full mt-8 gap-1">
                        <h3 className="text-4xl pt-2 font-bold text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                            Blurry
                        </h3>
                    </div>

                    {/* Blurry info */}
                    <div className="flex flex-col w-full items-start justify-center border-t border-white mt-2 gap-0">
                        <span className="pt-2 normal-font">You can see all blurry infos below.</span>
                    </div>

                    <div className="flex flex-col w-full items-start justify-center mt-2 gap-4">
                        <div className="flex flex-col w-full">
                            <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                                Idols
                            </h4>
                            <span className="normal-font p-1">⚠ <b>Important:</b> Not all idols are included in blurry mode (yet), i'll regularly update the list.</span>
                        </div>
                    </div>

                    {/* Game info */}
                    <div className="flex flex-col w-full items-start justify-center mt-2 gap-4">
                        <div className="flex flex-col w-full">
                            <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                                Game
                            </h4>
                            <span className="normal-font p-1">
                                The core logic is similar to classic mode, but with some differences:
                            </span>
                            <span className="normal-font">
                                • You have to guess the idol based on a <b>blurry</b> image that gets <b>clearer</b> with each guess.
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col w-full items-start justify-center mt-2 gap-4">
                        <div className="flex flex-col w-full">
                            <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                                Helps
                            </h4>

                            <span className="normal-font p-1">
                                <b>Hardmode:</b> If you enable hardmode, the guesses <b>will NOT</b> unblur the image. This option is for users that want to challenge themselves.
                            </span>
                            <span className="normal-font p-1">
                                <b>Color:</b> This option will reveal the colors of the image. It will be unlocked after <b>4 guesses</b>. This can be helpful if you are struggling to identify the idol.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Ending Note */}
                <div className="flex w-full">
                    <div className="flex w-full items-center justify-center mt-12 gap-1">
                        <span className="text-2xl font-bold text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                            Good luck and have fun!
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HowToPlayBlurryContent;