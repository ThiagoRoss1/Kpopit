interface HowToPlayBlurryContentProps {
    nextReset: () => { timeRemaining: number | null; formattedTime: string; };
}

const HowToPlayBlurryContent = (props: HowToPlayBlurryContentProps) => {
    const { nextReset } = props;

    return (
        <div className="flex flex-col">
            <span>Test</span>
            <span>Time remaining: {nextReset().formattedTime}</span>
        </div>
    )
}

export default HowToPlayBlurryContent;