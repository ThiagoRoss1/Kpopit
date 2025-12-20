import { useEffect, useState } from "react";

interface ImportDataTextProps {
    handleRedeem?: (code: string) => void;
    isRedeeming?: boolean;
    redeemError?: string | null;
}

const ImportDataText = (props: ImportDataTextProps) => {
    const { handleRedeem, isRedeeming, redeemError } = props;

    const [inputCode, setInputCode] = useState<string>("");
    const [showLoading, setShowLoading] = useState<boolean>(false);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        if (isRedeeming) {
            timer = setTimeout(() => setShowLoading(true), 100);
        } else {
            setShowLoading(false);
        }
        return () => clearTimeout(timer);
    }, [isRedeeming]);


    return (
        <div className="w-full bg-transparent">
            <div className="w-full flex flex-col">
                <div className="w-full flex flex-col justify-center items-start gap-4">
                    <span className="text-white text-base [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.35)]">
                        Paste your export code below
                    </span>
                    
                    <div className="w-full flex flex-col justify-center items-center gap-4">
                        <input className="w-full bg-transparent h-20 sm:h-20 rounded-2xl border border-white text-center text-3xl 
                        [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]"
                        maxLength={7}
                        type="text"
                        disabled={isRedeeming}
                        value={inputCode.toUpperCase()}
                        placeholder={showLoading ? "Redeeming..." : "123-ABC"}
                        onChange={(e) => setInputCode(e.target.value)}
                        />
                         {redeemError && (
                                <span className="text-xl text-red-500 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]">{redeemError}</span>
                            )}
                        <button className="h-16 w-80 rounded-2xl border border-white text-center
                        shadow-[0_0_5px_1px_rgba(255,255,255,0.15),0_0_5px_1px_rgba(255,255,255,0.15)]
                        hover:bg-black/40 hover:brightness-110 hover:cursor-pointer transition-all duration-500 transform-gpu"
                        onClick={() => {
                            if (handleRedeem && inputCode.trim() !== "") {
                                handleRedeem(inputCode.trim());
                                setInputCode("");
                            }
                        }}
                        >
                            <span className="text-white text-2xl">Import</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ImportDataText;