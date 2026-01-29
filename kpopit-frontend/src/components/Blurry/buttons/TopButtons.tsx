// Top Buttons Blurry component
import Stats from "../../../assets/icons/chart-bar-fill.svg";
import Share from "../../../assets/icons/share-network-fill.svg";


interface TopButtonsProps {
    onSubmitStats: () => void;
    onSubmitHowToPlay: () => void;
    onSubmitShare: () => void;
}

const TopButtons = (props: TopButtonsProps) => {
    const { onSubmitStats, onSubmitHowToPlay, onSubmitShare } = props;

    // Middle Button Styles //
    const centerButtonCardStyle = "inline-flex relative sm:w-46.5 sm:h-12.5 overflow-hidden rounded-2xl sm:rounded-[20px] p-[1px] focus:outline-none focus:ring-2 focus:ring-[#000000] focus:ring-offset-1 focus:ring-offset-[#242424] firefox:isolate firefox:z-0 shadow-[4px_4px_4px_1px_rgba(0,0,0,0.25),inset_0_4px_4px_0_rgba(0,0,0,0.25)]";   
    const centerButtonAnimation = "absolute inset-[-300%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#b43777_0%,#ffffff_50%,#b43777_100%)] firefox:transform-3d firefox:will-change-transform";
    const centerButtonTextStyle = "inline-flex h-full w-full items-center justify-center rounded-2xl sm:rounded-[20px] bg-black px-1 max-xxs:text-[14px] xxs:text-[14px] xs:text-base sm:text-[20px] text-[#b43777] font-semibold backdrop-blur-2xl";

    // Hover //
    const centerHoverEffect = "hover:brightness-125 hover:scale-105 firefox:hover:scale-100 hover:cursor-pointer transition-transform transform-gpu firefox:will-change-transform duration-500";

    // Rounded Button Styles - Stats / Share //
    const RoundedButtonStyle = "inline-flex relative max-xxs:h-8 max-xxs:w-8 xxs:h-8 xxs:w-8 xs:h-9 xs:w-9 sm:h-12.5 sm:w-12.5 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-[#000000] focus:ring-offset-1 focus:ring-offset-[#242424] hover:brightness-110 firefox:hover:brightness-140 hover:scale-105 firefox:hover:scale-100 transform duration-300";
    const ImageStyle = "flex items-center justify-center max-xxs:w-8 max-xxs:h-8 xxs:w-8 xxs:h-8 xs:w-8 xs:h-8 sm:w-8 sm:h-8 rounded-full transform-gpu";

    // Rounded Button Animation - Stats / Share //
    const RoundedButtonAnimation = "absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#b43777_0%,#bf898c_50%,#b43777_100%)]";
    const RoundedButtonBackgroundStyle = "inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-1 font-medium text-white backdrop-blur-3xl";

    return (
        <div className="flex items-center justify-center w-full h-full bg-transparent">
            <div className="flex items-center justify-between w-full h-fit gap-4">
                
                {/* Stats Button */}
                <button onClick={onSubmitStats} type="button" className={RoundedButtonStyle}>
                    <span className={RoundedButtonAnimation} />
                        <span className={RoundedButtonBackgroundStyle}>
                            <img src={Stats} alt="Stats" className={ImageStyle} draggable={false} />
                        </span>
                </button>

                {/* How to Play Button */}        
                <button onClick={onSubmitHowToPlay} type="button" className={`${centerButtonCardStyle} ${centerHoverEffect}`}>
                    <span className={`${centerButtonAnimation}`} />
                        <span className={`${centerButtonTextStyle}`}>
                            How to Play
                        </span>
                </button>

                {/* Share Button */}
                <button onClick={onSubmitShare} type="button" className={RoundedButtonStyle}>
                    <span className={RoundedButtonAnimation} />
                        <span className={RoundedButtonBackgroundStyle}>
                            <img src={Share} alt="Share" className={ImageStyle} draggable={false} />
                        </span>
                </button>
            </div>
        </div>
    )
}

export default TopButtons;