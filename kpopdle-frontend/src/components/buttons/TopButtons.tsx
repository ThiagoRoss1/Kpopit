// Top Buttons Component
interface TopButtonsProps {
    onSubmitChangelog: () => void;
    onSubmitHowToPlay: () => void;   
    onSubmitAbout: () => void;
}

const TopButtons = (props: TopButtonsProps) => {
    const { onSubmitChangelog, onSubmitHowToPlay, onSubmitAbout } = props;

    const buttonCardStyle = "flex-1 min-w-0 h-10 flex items-center justify-center text-center rounded-[12px] px-2 py-1 sm:w-[130px] sm:h-[44px] sm:px-[10px] sm:py-[10px] backdrop-blur-md shadow-[4px_4px_4px_1px_rgba(0,0,0,0.25),inset_0_4px_4px_0_rgba(0,0,0,0.25)] bg-gradient-to-b from-white/10 to-[#999999]/10";
    const centerButtonCardStyle = "flex-1 min-w-0 h-10 flex items-center justify-center text-center rounded-[12px] px-2 py-1 sm:w-[148px] sm:h-[50px] sm:px-[10px] sm:py-[10px] backdrop-blur-md shadow-[4px_4px_4px_1px_rgba(0,0,0,0.25),inset_0_4px_4px_0_rgba(0,0,0,0.25)] bg-gradient-to-b from-black to-black/10";
    const buttonTextStyle = "text-sm sm:text-[20px] text-center bg-gradient-to-b from-[#b43777] to-[#d86da4] text-transparent bg-clip-text";
    const centerButtonTextStyle = "text-sm sm:text-[20px] text-center bg-gradient-to-b from-[#b43777] to-[#ce757a] text-transparent bg-clip-text";
    const hoverEffect = "hover:brightness-125 hover:scale-105 hover:cursor-pointer transition-transform duration-500";

    return (
        <div className="flex items-center justify-center w-full max-w-sm mx-auto h-fit sm:max-w-[458px] sm:h-[50px] bg-transparent">
            <div className="flex items-center justify-between w-full h-fit gap-2 sm:gap-6 sm:h-[50px]">
                <button onClick={onSubmitChangelog} type="button" className={`${buttonCardStyle} ${hoverEffect}`}>
                    <span className={`${buttonTextStyle}`}>
                       Changelog 
                    </span>
                </button>

                <button onClick={onSubmitHowToPlay} type="button" className={`${centerButtonCardStyle} ${hoverEffect}`}>
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