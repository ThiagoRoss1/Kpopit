// Top Buttons Component

interface InfoProps {
    onSubmitChangelog: () => void;
    onSubmitAbout: () => void;
}

const InfoButtons = (props: InfoProps) => {
    const { onSubmitChangelog, onSubmitAbout } = props;

    // Left and Right Button Styles //
    const buttonCardStyle = "inline-flex relative max-xxs:w-20 max-xxs:h-10 xxs:w-25 xxs:h-10 xs:w-28 xs:h-10 sm:w-52 sm:h-13 overflow-hidden rounded-2xl sm:rounded-2xl border-1 border-white bg-transparent backdrop-blur-sm sm:backdrop-blur-xl shadow-[4px_4px_4px_1px_rgba(0,0,0,0.25),inset_0_4px_4px_0_rgba(0,0,0,0.25)]";

    const buttonAnimation = ""
    const buttonTextStyle = "inline-flex h-full w-full items-center justify-center rounded-2xl sm:rounded-2xl max-xxs:text-[12px] xxs:text-[14px] xs:text-base sm:text-[20px] text-white font-semibold text-shadow-[2px_2px_4px_rgba(0,0,0,0.5)]";

    // Hover //
    const hoverEffect = "hover:brightness-125 hover:scale-105 hover:cursor-pointer hover:bg-black/80 transition-transform transform-gpu firefox:transition-all firefox:will-change-transform duration-500";    
    // Previous styles //
    // const pastCenterButtonCardStyle = "flex-1 min-w-0 h-10 flex items-center justify-center text-center rounded-[12px] px-2 py-1 sm:w-[148px] sm:h-[50px] sm:px-[10px] sm:py-[10px] backdrop-blur-md shadow-[4px_4px_4px_1px_rgba(0,0,0,0.25),inset_0_4px_4px_0_rgba(0,0,0,0.25)] bg-gradient-to-b from-black to-black/10";
    // const pastCenterButtonTextStyle = "inline-flex h-full items-center justify-center rounded-full backdrop-blur-3xl w-full text-sm sm:text-[20px] text-center bg-gradient-to-b from-[#b43777] to-[#ce757a] text-transparent bg-clip-text";

    return (
        <div className="flex items-center justify-center w-full h-full bg-transparent">
            <div className="flex items-center justify-between w-full h-fit gap-4 xs:gap-4 sm:gap-12">
                <button onClick={onSubmitChangelog} type="button" className={`${buttonCardStyle} ${hoverEffect}`}>
                    <span className={`${buttonAnimation}`} />
                        <span className={`${buttonTextStyle}`}>
                            Changelog
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

export default InfoButtons;