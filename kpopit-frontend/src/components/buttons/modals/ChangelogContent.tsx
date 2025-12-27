const ChangelogText = () => {
    return (
        <div className="w-full bg-transparent mt-5 mb-5">
            <div className="w-full flex flex-col justify-center items-center gap-y-4">
                <div className="flex flex-col justify-center items-center max-xxs:w-70 xxs:w-80 sm:w-100 bg-gray-900 gap-3 rounded-lg p-4 
                shadow-[0_0_10px_2px_rgba(255,255,255,0.15),0_0_10px_2px_rgba(255,255,255,0.15)] border-2 border-white">
                    <h3 className="text-white text-[18px] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.40)]">26/12/2025</h3>
                        <span className="text-white text-[18px] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.40)]">Game Launch!</span>
                </div>
            </div>
        </div>
    )
}

export default ChangelogText;