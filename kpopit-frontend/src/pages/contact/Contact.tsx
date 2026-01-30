import BackgroundStyle from "../../components/Background/BackgroundStyle";

const Contact = () => {
    return (
        <>
        <BackgroundStyle />
        <div className="w-full flex-1 overflow-y-auto flex items-start justify-center mb-110">
            <div className="flex flex-col items-center justify-center">
                <div className="w-full sm:w-full max-h-fit bg-white/0 overflow-hidden rounded-4xl
                shadow-[0px_2px_10px_4px_rgba(255,255,255,0.5)] mx-auto mt-20 mb-10">
                    <div className="flex flex-col items-center justify-center w-full h-10 mt-10">
                        <h1 className="xxs:text-2xl xm:text-3xl sm:text-3xl font-bold
                        text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                            Contact
                        </h1>
                    </div>

                    <div className="flex flex-col items-center justify-center px-8">
                        <div className="flex flex-col items-center justify-center mt-8 gap-3">
                            <h2 className="text-2xl font-bold text-white [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)] brightness-110">
                                Something to talk about KpopIt ?
                            </h2>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center mt-0 px-8">
                        <span className="text-base mt-1 text-white [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)] brightness-110">
                            If you find any issues or have any questions, feedback feel free to contact me!
                        </span>
                    </div>
                    

                    <div className="flex flex-col items-center justify-center mt-8 mb-8 px-8">
                        <div className="flex flex-row items-center justify-center">

                        <span className="text-base font-bold mt-1 text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]">
                            Twitter: <b><a className="text-blue-500" href="https://x.com/TgoRoss1"> @TgoRoss1</a></b>
                        </span>        
                        </div>

                        {/* Do email later */}
                    </div>
                </div>
            </div>
        </div>
        </>
    )
}

export default Contact;