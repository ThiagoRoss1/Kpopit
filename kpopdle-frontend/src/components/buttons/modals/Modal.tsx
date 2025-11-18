// Buttons Card Modal Component
import React from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";

interface ModalProps {
    isOpen?: boolean;
    onClose: () => void;
    title?: string;
    children?: React.ReactNode;
    isHowToPlay?: boolean;
    isAboutOrChangelog?: boolean;
    isTransferDataSubPages?: boolean;
    returnPage?: () => void;
}

const Modal = (props: ModalProps) => {
    const { isOpen, onClose, children, title, isHowToPlay, isAboutOrChangelog, isTransferDataSubPages, returnPage } = props;
    
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            document.body.style.position = "fixed";
            document.body.style.width = "100%";
        } else {
            document.body.style.overflow = "auto";
            document.body.style.position = "";
            document.body.style.width = "";
        }

        return () => {
            document.body.style.overflow = "auto";
            document.body.style.position = "";
            document.body.style.width = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 backdrop-blur-sm" onClick={() => onClose()}>        
            <motion.div 
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 50 }}
                transition={{ duration: 0.2, ease: "easeInOut" }} 
                className="flex items-start justify-center w-full sm:max-w-[846px] mx-auto mt-20 mb-10" onClick={(e) => e.stopPropagation()}>

                <div className={`relative w-full max-w-[846px] text-center ${isHowToPlay ? "bg-black/80" : isAboutOrChangelog ? "bg-black/40" : "bg-black/0"} border border-white/80 rounded-[20px] overflow-hidden shadow-[4px_4px_4px_1px_rgba(0,0,0,0.1),inset_0_4px_4px_rgba(0,0,0,0.25)]`}>

                    <div className={`w-full flex items-center ${isTransferDataSubPages ? "justify-start gap-1 px-2" : "justify-between px-4"} py-2 bg-white/10 border-b border-white/20`}>
                        {isTransferDataSubPages ? (
                            <button className="group bg-white/0 w-10 h-10 flex items-center justify-center
                            hover:scale-110 hover:brightness-110 hover:cursor-pointer transition-all duration-200 transform-gpu"
                            onClick={returnPage}>
                                <div>
                                    <ChevronLeft className="opacity-50 group-hover:opacity-100 sm:w-10 sm:h-10 text-white"/>
                                </div>
                            </button>
                        ) : null}
                        <h2 className="text-4xl font-bold bg-linear-to-b from-[#b43777] to-[#ec4850] bg-clip-text text-transparent drop-shadow-lg hover:cursor-default">
                            {title}
                        </h2>
                            <div className={`${isTransferDataSubPages ? "justify-end flex-1 px-2" : "justify-center"} items-center flex`}>
                            <button className="flex items-center justify-center rounded-full shrink-0 sm:w-10 sm:h-10 text-center
                            bg-linear-to-b from-[#b43777]/0 to-[#ec4850]/0 backdrop-blur-lg shadow-lg hover:brightness-115 hover:scale-105
                            hover:cursor-pointer hover:bg-linear-to-b hover:from-[#b43777] hover:to-[#ec4850] transition-all transform-gpu duration-500" onClick={onClose}>
                                <X size={20} color="white" strokeWidth={3} absoluteStrokeWidth className="sm:w-5 sm:h-5" />
                            </button>
                            </div>
                    </div>
                    
                    <div className="w-full bg-white/5 px-4 py-4 text-left text-white">
                        <span className="wrap-break-word">{children}</span>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

export default Modal;