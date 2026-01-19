import { useEffect, useRef, useState } from "react";
import { Copy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface ExportDataTextProps {
    onSubmitReturn?: () => void;
    generatedCodes?: string | null;
    handleGenerate?: () => void;
    isGenerating?: boolean;
    expires_At?: string | null;
    timeLeft?: number | null;
    fetchActiveCode?: () => Promise<void>;
}

const ExportDataText = (props: ExportDataTextProps) => {
    const { generatedCodes, handleGenerate, isGenerating, timeLeft, expires_At, fetchActiveCode } = props;

    const hasCalledGenerate = useRef(false);
    const hasCalledFetch = useRef(false);

    const [copied, setCopied] = useState<boolean>(false);
    const [showLoading, setShowLoading] = useState<boolean>(false);
    const [isFetching, setIsFetching] = useState<boolean>(true);
    
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        if (isGenerating) {
            timer = setTimeout(() => setShowLoading(true), 100);
        } else {
            setShowLoading(false);
        }
        
        const fetchCode = async () => {
            if (fetchActiveCode && !hasCalledFetch.current) {
            hasCalledFetch.current = true;
            setIsFetching(true);
            try {
                await fetchActiveCode();
            } finally {
                setIsFetching(false);
            }
            }
        }

        fetchCode();

        if (handleGenerate && !hasCalledGenerate.current && !isGenerating && !generatedCodes && !isFetching) {
            hasCalledGenerate.current = true;
            handleGenerate();
        }
        return (() => clearTimeout(timer));

    }, [handleGenerate, isGenerating, fetchActiveCode, generatedCodes, isFetching]);

    return (
        <div className="w-full bg-transparent">
            <div className="w-full flex flex-col">
                <div className="w-full flex flex-col justify-center items-start gap-4">
                    <span className="text-white text-base [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.35)]">
                        Click to copy this token to transfer your data
                    </span>
                    
                    <div className="w-full flex flex-row justify-center items-start">
                        <button 
                        onClick={() => {
                            if (generatedCodes) {
                                navigator.clipboard.writeText(generatedCodes);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1500);
                            }
                        }}
                        className="group w-full h-20 sm:h-20 rounded-2xl border border-white bg-transparent
                        backface-hidden shadow-[0_0_10px_1px_rgba(255,255,255,0.10),0_0_10px_1px_rgba(255,255,255,0.10)] backdrop-blur-lg 
                        hover:bg-black/40 hover:brightness-110 hover:cursor-pointer transition-all duration-500 transform-gpu">
                            <div className="w-full flex flex-row items-center justify-center">
                                <span className="text-3xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.35)]">
                                    {isFetching ? "Loading..." : (showLoading ? "Generating..." : generatedCodes)}
                                </span>

                                <Copy className="opacity-0 group-hover:opacity-80 w-10 h-10 absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-500 transform-gpu"/>
                            </div>
                        </button>
                        <AnimatePresence>
                        {copied && (
                            <motion.div 
                                key="copy-notification"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                exit={{ opacity: 0, y: -20 }}
                                className="absolute flex bottom-10 left-1/2 -translate-x-1/2 justify-center items-center w-60 h-7 sm:w-60 sm:h-7">
                                    <div className="flex justify-center items-center bg-black/60 w-48 h-7 sm:w-48 sm:h-7 rounded-xl border border-white
                                    shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)]">
                                        <span className="relative font-medium text-base text-white drop-shadow-lg
                                        [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,1.8),0_0_12px_rgba(255,255,255,1.55)]">
                                            Copied to clipboard!
                                        </span>
                                    </div>
                            </motion.div>                   
                        )}
                    </AnimatePresence>
                    </div>
                    <div className="w-full flex flex-col justify-center items-start [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(236,201,75,0.55)] gap-1">
                        <span className="text-[14px] text-yellow-500">{`${timeLeft === 0 ? "⚠ Code will be valid for less than a day" : `⚠ Code will be valid for ${timeLeft} ${timeLeft === 1 ? "day" : "days"}`}`}</span>
                        <span className="text-[14px] text-yellow-500">⚠ Valid until: {expires_At ? new Date(expires_At).toLocaleDateString() : ""}</span>
                    </div>
                </div>
            </div>        
        </div>
    )
}

export default ExportDataText;