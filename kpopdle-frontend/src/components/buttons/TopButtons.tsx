// Top Buttons Component

interface TopButtonsProps {
    onSubmitChangelog: () => void;
    onSubmitHowToPlay: () => void;   
    onSubmitAbout: () => void;
}

const TopButtons = (props: TopButtonsProps) => {
    const { onSubmitChangelog, onSubmitHowToPlay, onSubmitAbout } = props;

    // Left and Right Button Styles //
    const buttonCardStyle = "inline-flex relative sm:w-44 sm:h-13 overflow-hidden rounded-[16px] border-1 border-white bg-transparent backdrop-blur-3xl shadow-[4px_4px_4px_1px_rgba(0,0,0,0.25),inset_0_4px_4px_0_rgba(0,0,0,0.25)]";
    const buttonAnimation = ""
    const buttonTextStyle = "inline-flex h-full w-full items-center justify-center rounded-[16px] text-sm sm:text-[20px] bg-gradient-to-b from-[#b43777] to-[#ce757a] font-semibold text-transparent bg-clip-text";
    // Middle Button Styles //
    const centerButtonCardStyle = "inline-flex relative sm:w-50 sm:h-15 overflow-hidden rounded-[20px] p-[1px] focus:outline-none focus:ring-2 focus:ring-[#000000] focus:ring-offset-1 focus:ring-offset-[#242424] backdrop-blur-md shadow-[4px_4px_4px_1px_rgba(0,0,0,0.25),inset_0_4px_4px_0_rgba(0,0,0,0.25)]";
    const centerButtonAnimation = "absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#b43777_0%,#ffffff_50%,#b43777_100%)]";
    const centerButtonTextStyle = "inline-flex h-full w-full items-center justify-center rounded-[20px] bg-black px-1 text-sm sm:text-[20px] text-[#b43777] font-semibold backdrop-blur-3xl";
    // Hover //
    const hoverEffect = "hover:brightness-125 hover:scale-105 hover:cursor-pointer hover:bg-black/80 transition-transform transform-gpu duration-500";
    const centerHoverEffect = "hover:brightness-125 hover:scale-105 hover:cursor-pointer transition-transform transform-gpu duration-500";

    // Previous styles //
    // const pastCenterButtonCardStyle = "flex-1 min-w-0 h-10 flex items-center justify-center text-center rounded-[12px] px-2 py-1 sm:w-[148px] sm:h-[50px] sm:px-[10px] sm:py-[10px] backdrop-blur-md shadow-[4px_4px_4px_1px_rgba(0,0,0,0.25),inset_0_4px_4px_0_rgba(0,0,0,0.25)] bg-gradient-to-b from-black to-black/10";
    // const pastCenterButtonTextStyle = "inline-flex h-full items-center justify-center rounded-full backdrop-blur-3xl w-full text-sm sm:text-[20px] text-center bg-gradient-to-b from-[#b43777] to-[#ce757a] text-transparent bg-clip-text";

    return (
        <div className="flex items-center justify-center w-full h-full bg-transparent">
            <div className="flex items-center justify-between w-full h-fit gap-2 sm:gap-10">
                <button onClick={onSubmitChangelog} type="button" className={`${buttonCardStyle} ${hoverEffect}`}>
                    <span className={`${buttonAnimation}`} />
                        <span className={`${buttonTextStyle}`}>
                            Changelog
                        </span>
                </button>

                <button onClick={onSubmitHowToPlay} type="button" className={`${centerButtonCardStyle} ${centerHoverEffect}`}>
                    <span className={`${centerButtonAnimation}`} />
                        <span className={`${centerButtonTextStyle}`}>
                            How to Play 
                        </span>
                </button>
                
                <button onClick={onSubmitAbout} type="button" className={`${buttonCardStyle} ${hoverEffect}`}>
                    <span className={`${buttonTextStyle}`}>
                       About 
                    </span>
                </button>
            </div>
        </div>
    )

}

export default TopButtons;