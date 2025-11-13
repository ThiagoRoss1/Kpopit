interface ExportDataTextProps {
    onSubmitReturn?: () => void;
    generatedCodes?: string | null;
    hasGeneratedCodes?: boolean;
    handleGenerate?: () => void;
    timeLeft?: number | null;
    isExpired?: boolean;
}

const ExportDataText = (props: ExportDataTextProps) => {
    const { generatedCodes, handleGenerate, timeLeft } = props;

    return (
        <div className="w-full bg-transparent">
            {!generatedCodes ? (
            <div className="w-full flex flex-col">
                <div className="w-full flex flex-col justify-center items-start gap-4">
                    <span className="text-white text-base [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.35)]">
                        Click to generate your export code
                    </span>
                    
                    <div className="w-full flex flex-row justify-center items-start">
                        <button 
                        onClick={handleGenerate}
                        className="w-full sm:h-20 rounded-2xl border border-white bg-transparent
                    backface-hidden shadow-[0_0_10px_1px_rgba(255,255,255,0.10),0_0_10px_1px_rgba(255,255,255,0.10)] backdrop-blur-lg 
                    hover:brightness-110 hover:cursor-pointer transition-all duration-500 transform-gpu">
                            <div className="w-full flex flex-row items-center justify-center">
                                <span className="text-xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.35)]">
                                    Generate Code
                                </span>
                            </div>
                        </button>
                    </div>
                    <span className="text-[14px] text-yellow-500">⚠ Code will be valid for 3 days</span>
                </div>
            </div>
            ) : (
                <div className="w-full flex flex-col">
                    <div className="w-full flex flex-col justify-center items-start gap-4">
                        <span className="text-white text-base [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.35)]">
                            Click to copy this token to transfer your data
                        </span>
                        
                        <div className="w-full flex flex-row justify-center items-start">
                            <button 
                            onClick={() => console.log("nihao", {generatedCodes})}
                            className="w-full sm:h-20 rounded-2xl border border-white bg-transparent
                        backface-hidden shadow-[0_0_10px_1px_rgba(255,255,255,0.10),0_0_10px_1px_rgba(255,255,255,0.10)] backdrop-blur-lg 
                        hover:brightness-110 hover:cursor-pointer transition-all duration-500 transform-gpu">
                                <div className="w-full flex flex-row items-center justify-center">
                                    <span className="text-3xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.35)]">
                                        {generatedCodes}
                                    </span>
                                </div>
                            </button>
                        </div>
                        <span className="text-[14px] text-yellow-500">⚠ Code will be valid for {timeLeft} {`${timeLeft === 1 ? "day" : "days"}`}</span>
                    </div>
            </div>
            )}
        </div>
    )


}

export default ExportDataText;