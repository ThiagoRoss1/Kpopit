// Buttons Card Modal Component
import React from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children?: React.ReactNode;
}

const Modal = (props: ModalProps) => {
    const { isOpen, onClose, children } = props;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/20 backdrop-blur-sm" onClick={() => onClose()}>
            
            <div className="min-h-screen flex items-start justify-center w-full sm:max-w-[846px] mx-auto pt-20 pb-20" onClick={(e) => e.stopPropagation()}>

                <div className="relative w-full max-w-[846px] text-center bg-white/10 border border-white/50 rounded-[20px] overflow-hidden shadow-[4px_4px_4px_1px_rgba(0,0,0,0.1),inset_0_4px_4px_rgba(0,0,0,0.25)] ">

                    <div className="w-full flex items-center justify-between px-4 py-2 bg-white/10 border-b border-white/20">
                        <h2 className="text-4xl font-bold bg-gradient-to-b from-[#b43777] to-[#ce757a] bg-clip-text text-transparent drop-shadow-lg">
                            How to Play...
                        </h2>
                        <button className="rounded-full flex-shrink-0 w-10 h-10 text-center 
                        bg-gradient-to-b from-[#b43777]/80 to-white/80 backdrop-blur-lg shadow-lg hover:brightness-115 hover:scale-105
                        hover:cursor-pointer hover:bg-gradient-to-b hover:from-[#b43777]/100 hover:to-white/100 transition-transform duration-500" onClick={onClose}>
                        X
                        </button>
                    </div>
                    
                    <div className="w-full bg-white/10 px-4 py-4 text-left">
                        <p className="break-words">Test Text...</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Modal;