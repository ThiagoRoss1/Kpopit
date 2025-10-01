// Bottom Buttons Component
interface BottomButtonsProps {
    onSubmitStats: () => void;
    onSubmitStreak: () => void;
    onSubmitShare: () => void;
}

const BottomButtons = (props: BottomButtonsProps) => {
    const { onSubmitStats, onSubmitStreak, onSubmitShare } = props;

    const ButtonStyle = "rounded-full bg-[#d9d9d9]";

    return (
        <div className="flex items-center justify-center w-full max-w-sm mx-auto h-fit sm:max-w-[93px] sm:h-[23.25px] bg-transparent ">
            <div className="flex items-center justify-center w-full h-fit gap-2 sm:gap-3 sm:h-[23.25px]">
                <button onClick={onSubmitStats} type="button" className={`${ButtonStyle}`}>
                    <img src="/icons/stats-icon.png" alt="Stats" />
                </button>

                <button onClick={onSubmitStreak} type="button" className={`${ButtonStyle}`}>
                    <img src="/icons/streak-icon.png" alt="Streak" />
                </button>
                
                <button onClick={onSubmitShare} type="button" className={`${ButtonStyle}`}>
                    <img src="/icons/share-icon.png" alt="Share" />
                </button>
            </div>
        </div>
    )
}

export default BottomButtons;