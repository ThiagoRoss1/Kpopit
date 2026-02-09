import ArrowUp from "../../../assets/icons/arrow-fat-line-up-fill.svg";
import ArrowDown from "../../../assets/icons/arrow-fat-line-down-fill.svg";
import ChaewonBanner from "../../../assets/imgs/chaewon_guess.png";
import EunbiBanner from "../../../assets/imgs/eunbi_guess.png";
import useResetTimer from "../../../hooks/useResetTimer";

const HowToPlayText = () => {
    const nextReset  = useResetTimer();

    return (
        <div className="w-full [text-shadow:1.6px_1.6px_3px_rgba(0,0,0,0.5)]">

            {/* Introduction Section */}
            <div className="flex flex-col w-full justify-center items-center gap-2">
                <h3 className="text-[18px]">Guess today's K-Pop Idol. It changes every 24 hours.</h3>
                <span className="text-base">You can search for an idol by typing their name or group in the search bar.</span>
            </div>
                <div className="flex flex-col w-full justify-center items-center mt-6 gap-1.5">
                    <span className="text-[18px]">Next Idol in</span>
                    <span className="text-3xl">{nextReset.formattedTime}</span>
                    <span className="text-[12px]">Timezone: America (EST)</span>
                    <span className="text-[12px]">(Midnight at UTC-5)</span>
                </div>

            {/* How to Play Section 1 */}
            <div className="flex flex-col w-full">
                <div className="flex flex-col w-full items-start justify-center mt-8 gap-1">
                    <h3 className="text-4xl font-bold text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                        How to play
                    </h3>
                </div>

                <div className="flex flex-col w-full items-start justify-center border-t border-white mt-2 gap-0">
                    <span className="pt-2 normal-font">In classic mode, you must type the name of a K-pop idol or group in the search bar.</span>
                    <span className="normal-font">To submit your guess, press <b>enter</b> or click the <b>Guess</b> button.</span>

                    
                    {/* Feedback */}
                    <div className="flex flex-col w-full gap-1">
                        <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                            Feedback
                        </h4>          
                        <span className="normal-font">The color of each tile changes depending on your guess:</span>            
                        <div className="flex flex-col items-start justify-center gap-2">
                            <div className="flex flex-row items-center gap-2">
                                <div className="sm:w-12 sm:h-12 bg-[#4FFFB0] shadow-[0_0_10px_2px_rgba(79,255,176,0.15),0_0_10px_2px_rgba(79,255,176,0.15)] rounded-lg" />
                                    <span className="font-semibold text-[#4FFFB0] text-shadow-2xs"> -{'>'} Correct</span>
                            </div>

                            <div className="flex flex-row items-center gap-2">
                                <div className="sm:w-12 sm:h-12 bg-[#f3e563] shadow-[0_0_10px_2px_rgba(243,229,99,0.15),0_0_10px_2px_rgba(243,229,99,0.15)] rounded-lg" />
                                    <span className="font-semibold text-[#f3e563] text-shadow-2xs"> -{'>'} Partially Correct</span>
                            </div>

                            <div className="flex flex-row items-center gap-2">
                                <div className="sm:w-12 sm:h-12 bg-[#fd5c63] shadow-[0_0_10px_2px_rgba(253,92,99,0.15),0_0_10px_2px_rgba(253,92,99,0.15)] rounded-lg" />
                                    <span className="font-semibold text-[#fd5c63] text-shadow-2xs"> -{'>'} Incorrect</span>
                            </div>
                        </div>
                    
                        {/* Arrows */}
                        <h5 className="font-bold text-xl pt-1 text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                            Arrows
                        </h5>
                        <span className="normal-font">The arrows indicate whether <b>today's idol</b> has higher or lower stats compared to your guess:</span>
                        <div className="flex flex-col items-start justify-center gap-2">
                            <div className="flex flex-row items-center gap-2">
                                <div className="sm:w-12 sm:h-12 bg-[#fd5c63] shadow-[0_0_10px_2px_rgba(253,92,99,0.15),0_0_10px_2px_rgba(253,92,99,0.15)] rounded-lg">
                                    <img src={ArrowUp} alt="Arrow Up Icon" className="sm:w-12 sm:h-12 object-cover" draggable={false} />               
                                </div> 
                                    <span className="font-semibold text-[#fd5c63] text-shadow-2xs"> -{'>'} Up arrow means today's idol is <b>above</b> - 
                                    younger, taller or debuted recently</span>
                            </div>


                            <div className="flex flex-row items-center gap-2">
                                <div className="sm:w-12 sm:h-12 bg-[#fd5c63] shadow-[0_0_10px_2px_rgba(253,92,99,0.15),0_0_10px_2px_rgba(253,92,99,0.15)] rounded-lg">
                                    <img src={ArrowDown} alt="Arrow Down Icon" className="sm:w-12 sm:h-12 object-cover" draggable={false} />               
                                </div> 
                                    <span className="font-semibold text-[#fd5c63] text-shadow-2xs"> -{'>'} Down arrow means today's idol is <b>below</b> - 
                                    older, shorter or debuted earlier</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Categories Section 2 */}
            <div className="flex flex-col w-full">
                <div className="flex flex-col w-full items-start justify-center mt-8 gap-1">
                    <h3 className="text-4xl font-bold text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                        Categories
                    </h3>
                </div>

                <div className="flex flex-col w-full items-start justify-center border-t border-white mt-2 gap-0">
                    <span className="pt-2 normal-font">There is a list below explaining each of the categories for further information.</span>

                    {/* Categories List */}
                    <div className="flex flex-col w-full items-start justify-center mt-2 gap-4">

                        {/* Group(s) */}
                        <div className="flex flex-col w-full">
                            <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                                Group(s):
                            </h4>
                            <span className="normal-font pt-1">Shows which <b>group(s)</b> the idol has been part of, whether they're active or not.</span>
                            <span className="normal-font">Actual solo artists will simply appear as <b>"Soloist"</b>.</span>
                            <span className="normal-font">Although both inactive or active groups are displayed on the tiles, only the idol's <b>currently active group</b> can be used as a "search term" in the search bar.</span>
                            <span className="normal-font">In future updates, we may include more details about each idol's group history.</span>
                        </div>

                        {/* Company */}
                        <div className="flex flex-col w-full">
                            <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                                Company:
                            </h4>
                            <span className="normal-font pt-1">Shows which <b>company</b> and <b>label</b> the idol is currently under.</span>
                        </div>

                        {/* Nationality */}
                        <div className="flex flex-col w-full">
                            <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                                Nationality:
                            </h4>
                            <span className="normal-font pt-1">Idol's <b>nationality (or nationalities)</b> will be displayed here.</span>
                        </div>

                        {/* Birth Date or Date / Age */}
                        <div className="flex flex-col w-full">
                            <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                                Birth Date:
                            </h4>
                            <span className="normal-font pt-1">Idol's <b>birth date</b> will be displayed here.</span>
                        </div>

                        {/* Debut year */}
                        <div className="flex flex-col w-full">
                            <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                                Debut Year:
                            </h4>
                            <span className="normal-font pt-1">Shows the idol's <b>debut year</b>.</span>
                            <span className="normal-font">Refers to the year the idol <b>officially debuted</b> in the industry, <b>not</b> their current group.</span>
                        </div>

                        {/* Height */}
                        <div className="flex flex-col w-full">
                            <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                                Height:
                            </h4>
                            <span className="normal-font pt-1">Shows the idol's <b>height.</b></span>
                            <span className="normal-font">Height will be displayed in <b>centimeters (cm)</b>.</span>
                        </div>

                        {/* Position(s) */}
                        <div className="flex flex-col w-full">
                            <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                                Position(s):
                            </h4>
                            <span className="normal-font pt-1">Shows the idol's <b>position(s)</b> within their group(s).</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hints Section 3 */}
            <div className="flex flex-col w-full">
                <div className="flex flex-col w-full items-start justify-center mt-8 gap-1">
                    <h3 className="text-4xl font-bold text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                        Hints
                    </h3>
                </div>

                <div className="flex flex-col w-full items-start justify-center border-t border-white mt-2 gap-0">
                    <span className="pt-2 normal-font">If you're struggling to guess the idol, you can unlock hints after some guesses.</span>

                    {/* Hints list */}
                    <div className="flex flex-col w-full items-start justify-center mt-2 gap-4">

                        {/* Hint 1 */}
                        <div className="flex flex-col">
                            <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                                Member Count
                            </h4>
                            <div className="flex flex-row items-center gap-1 mt-1">
                                <span className="font-semibold text-[18px] text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                                    Group Members:
                                </span>
                                <span className="normal-font">This hint will reveal the <b>member count</b> of the idol's <b>current</b> group.</span>
                            </div>
                            <span className="normal-font">If the idol is currently a <b>soloist</b>, this hint will display <b>"Soloist"</b> instead.</span>
                        </div>

                        {/* Hint 2 */}
                        <div className="flex flex-col">
                            <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                                Group Name
                            </h4>
                            <div className="flex flex-row items-center gap-1 mt-1">
                                <span className="font-semibold text-[18px] text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                                    Current Group:
                                </span>
                                <span className="normal-font">This hint will reveal the <b>current</b> idol's <b>group</b>.</span>
                            </div>
                        </div>
                    </div>


                    {/* Description */}
                    <div className="flex flex-col w-full items-start justify-center mt-6">
                        <h5 className="font-bold text-xl pt-1 text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                            Cards information
                        </h5>
                        <span className="normal-font">To reveal the hints, you must flip the card over.</span>
                        <span className="normal-font">You can see how many guesses you have left inside the card before it unlocks.</span>
                        <span className="normal-font">After flipping the card, the hint will be blurred, you can unblur it by clicking on the hint.</span>
                    </div>
                </div>
            </div>

            {/* Search bar Section 4 */}
            <div className="flex flex-col w-full">
                <div className="flex flex-col w-full items-start justify-center mt-8 gap-1">
                    <h3 className="text-4xl font-bold text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                        Search bar
                    </h3>
                </div>

                <div className="flex flex-col w-full items-start justify-center border-t border-white mt-2 gap-0">
                    <span className="pt-2 normal-font">You can search for an idol by typing her <b>name</b> or her <b>group name</b>. For soloists you can search for <b>"Soloist"</b>.</span>
                    <span className="normal-font">The dropdown menu will show matching results in alphabetical order as you type.</span>
                    <span className="normal-font">To submit your guess, you can press the <b>Enter</b> key or <b>click</b> the submit button next to the search bar.</span>
                </div>
            </div>

            {/* Example Section 5 */}
            <div className="flex flex-col w-full">
                <div className="flex flex-col w-full items-start justify-center mt-8 gap-1">
                    <h3 className="text-4xl font-bold text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                        Example
                    </h3>
                </div>

                <div className="flex flex-col w-full items-start justify-center border-t border-white mt-2 gap-0">
                    <div className="flex flex-col w-full items-start justify-center gap-4">
                        <span className="normal-font pt-2">Let's consider today's idol is <b className="text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                            Kim Chaewon
                        </b>.</span>
                        <span className="normal-font">If you guess <b className="text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                            Kwon Eunbi
                        </b>, here's what you see:</span>
                    </div>

                    <div className="flex flex-col gap-6 mt-4">
                        <img src={EunbiBanner} alt="Kwon Eunbi" className="border-2 border-white rounded-3xl" draggable={false} />

                        <div className="flex flex-col gap-4">
                            <span className="normal-font">Buf if you guess <b className="text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                                Kim Chaewon
                            </b>, you get this:</span>
                            <img src={ChaewonBanner} alt="Kim Chaewon" className="border-2 border-white rounded-3xl" draggable={false} />
                        </div>
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
    )


}

export default HowToPlayText