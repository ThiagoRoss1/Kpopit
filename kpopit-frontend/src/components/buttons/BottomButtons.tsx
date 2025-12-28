// Bottom Buttons Component
// import StreakOff from "../../assets/icons/fire-fill-gray.svg";
// import StreakOn from "../../assets/icons/fire-fill.svg";
import Stats from "../../assets/icons/chart-bar-fill.svg";
import Share from "../../assets/icons/share-network-fill.svg";

interface BottomButtonsProps {
    onSubmitStats: () => void;
    // onSubmitStreak: () => void;
    onSubmitShare: () => void;
}

// const streak = 1;

const BottomButtons = (props: BottomButtonsProps) => {
    const { onSubmitStats, onSubmitShare } = props;

    const ButtonStyle = "inline-flex relative max-xxs:h-8 max-xxs:w-8 xxs:h-8 xxs:w-8 xs:h-9 xs:w-9 sm:h-9 sm:w-9 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-[#000000] focus:ring-offset-1 focus:ring-offset-[#242424] hover:brightness-110 firefox:hover:brightness-140 hover:scale-105 firefox:hover:scale-100 transform duration-300";
    const ImageStyle = "flex items-center justify-center max-xxs:w-8 max-xxs:h-8 xxs:w-8 xxs:h-8 xs:w-8 xs:h-8 sm:w-8 sm:h-8 rounded-full transform-gpu";

    return (
        <div className="flex items-center justify-center w-full max-w-sm mx-auto h-fit sm:w-full sm:h-fit">
            <div className="flex flex-row items-center justify-center w-28 h-9 sm:w-28 sm:h-9 gap-3 sm:gap-3 rounded-2xl">
                <button onClick={onSubmitStats} type="button" className={`${ButtonStyle}`}>
                    <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#b43777_0%,#bf898c_50%,#b43777_100%)]" />
                        <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-1 font-medium text-white backdrop-blur-3xl">
                            <img src={Stats} alt="Stats" className={ImageStyle} draggable={false} />
                        </span>
                </button>

                {/* <button onClick={onSubmitStreak} type="button" className={`${ButtonStyle}`}>
                    <img src={`${streak >= 1 ? StreakOn : StreakOff}`} alt="Streak" className={`${ImageStyle}`} />
                    <span className={`text-[18px] absolute font-light text-center text-white hover:pointer-events-none [text-shadow:1.6px_1.6px_3px_rgba(25,25,25,0.8)]`}>
                        {streak}
                    </span>
                </button> */}
                
                <button onClick={onSubmitShare} type="button" className={`${ButtonStyle}`}>
                    <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#b43777_0%,#bf898c_50%,#b43777_100%)]" />
                        <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-1 font-medium text-white backdrop-blur-3xl">
                            <img src={Share} alt="Share" className={ImageStyle} draggable={false} />
                        </span>
                </button>
            </div>
        </div>
    )
}

export default BottomButtons;