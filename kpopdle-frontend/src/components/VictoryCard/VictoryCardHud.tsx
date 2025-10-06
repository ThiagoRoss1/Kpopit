//import React from "react";
import React from "react";
import { useEffect, useState, useRef } from "react";
import type { GuessedIdolData } from "../../interfaces/gameInterfaces";
import { motion } from "motion/react";
import VictoryCardSmall from "./VictoryCardSmall.tsx";
import VictoryCardBig from "./VictoryCardBig.tsx";

interface VictoryCardHudProps {
    cardInfo: GuessedIdolData;
    attempts: number;
    yesterdayIdol: string;
    yesterdayIdolGroup?: string[] | null;
    idolActiveGroup?: string[] | null;
    nextReset: () => { timeRemaining: number | null; formattedTime: string; };
}

const VictoryCardHudProps = (props: VictoryCardHudProps) => {
    const { cardInfo, attempts, nextReset, yesterdayIdol, yesterdayIdolGroup, idolActiveGroup } = props;
    
    const [showSmallModal, setShowSmallModal] = useState(false);
    const bigCardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const scrollToBigCard = () => {
            if (bigCardRef.current) {
                const cardPosition = bigCardRef.current.getBoundingClientRect().top + window.scrollY;
                const offset = window.innerHeight / 2 - bigCardRef.current.offsetHeight / 2;
                const targetPosition = cardPosition - offset;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        };

        const timer = setTimeout(scrollToBigCard, 300);
        return () => clearTimeout(timer);
    }, []);

return (
    <React.Fragment>
        <div ref={bigCardRef}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ 
                    duration: 0.6,
                    ease: "easeOut",
                    delay: 0.2
                }}
            >
                <VictoryCardBig
                    cardInfo={cardInfo}
                    attempts={attempts}
                    nextReset={nextReset}
                    yesterdayIdol={yesterdayIdol}
                    yesterdayIdolGroup={yesterdayIdolGroup ?? null}
                    idolActiveGroup={idolActiveGroup ?? null}
                    onShareClick={() => setShowSmallModal(true)}
                />
            </motion.div>
        </div>

        {showSmallModal && (
            <motion.div 
                className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center overflow-y-auto"
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ duration: 0.3 }}
                onClick={() => setShowSmallModal(false)}
            >
                <div className="flex items-center justify-center w-full sm:max-w-[370px] mx-auto p-4">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0, y: -30 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }} 
                        transition={{ 
                            duration: 0.4,
                            ease: [0.34, 1.56, 0.64, 1]
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <VictoryCardSmall 
                            cardInfo={cardInfo}
                            attempts={attempts}
                            nextReset={nextReset}
                            onClose={() => setShowSmallModal(false)}
                        />
                    </motion.div>
                </div>
            </motion.div>
        )}
    </React.Fragment>
       
)};

export default VictoryCardHudProps;



{/* <div>    bg-black/20 backdrop-blur-sm
        <form>
            <ul>
                <li>{cardinfo.artist_name}</li>
                <li>Congratulations!</li>
                <li>Attempts: {attempts}!</li>
                <li>Yesterday's Idol: {yesterdayidol}</li>
            </ul>
        </form>
    </div> */}




// //import React from "react";
// import type { GuessedIdolData } from "../../interfaces/gameInterfaces";

// interface VictoryCardHudProps {
//     onClose?: () => void;
//     cardinfo: GuessedIdolData;
//     attempts: number;
//     yesterdayidol: string;
//     nextreset: () => { timeRemaining: number | null; formattedTime: string; };
// }

// const VictoryCardHudProps = (props: VictoryCardHudProps) => {
//     const { cardinfo, attempts, nextreset, onClose } = props;



// return (
//     <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center">
//         <div className="min-h-screen flex items-center justify-center w-full sm:max-w-[370px] sm:max-h-[608px] mx-auto pt-20 pb-20">
//             <div className="relative flex flex-col items-center justify-start w-full sm:w-[350px] sm:h-[588px] bg-white/50 rounded-[50px]">
                
//                 {/* Icons Container */}
//                 <div className="relative w-full h-26 mb-3">
//                     <div className="absolute top-2.5 right-4 flex items-center justify-center w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-white/20">
//                         <button className="flex items-center justify-center" onClick={onClose}>
//                             <img src="/icons/close-icon.png" alt="Close" className="w-5 h-5" />
//                         </button>
//                     </div>

//                     <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex items-center justify-center w-16 h-16 sm:w-16 sm:h-16 rounded-full bg-amber-800">
//                         <img src="/icons/trophy-icon.png" alt="Trophy" className="w-10 h-10 sm:w-10 sm:h-10" />
//                     </div>

//                     </div>

//                     {/* Text Container */}
//                     <div className="w-full px-8 sm:px-[52px] mb-4">
//                         <div className="flex flex-col items-center text-center gap-2 max-w-[280px] mx-auto">
//                             <h2 className="font-bold text-lg sm:text-[20px]">
//                                 Congratulations! 🎊
//                             </h2>
//                             <p className="text-base sm:text-[16px] leading-tight">
//                                 {`You guessed it in ${attempts} ${attempts === 1 ? "try" : "tries"}!`}
//                             </p>
//                         </div>       
//                     </div>

//                     {/* Idol Container */}
//                     <div className="flex w-full items-center justify-center mb-4">
//                         <div className="flex items-center bg-[#a8a8a8]/60 w-full sm:w-80 h-20 sm:h-24 px-5 gap-3 rounded-[20px]">

//                             <div className="flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 bg-[#d9d9d9] rounded-[20px] flex-shrink-0">
//                                 <img src="/icons/idol-placeholder.png" alt="Idol" className="w-10 h-10 sm:w-12 sm:h-12" />
//                             </div>

//                             <div className="flex flex-col text-center items-center justify-center flex-1 gap-0.5">
//                                 <p className="font-bold text-base sm:text-[20px]">
//                                     {cardinfo.artist_name}
//                                 </p>
//                                 <p className="text-sm sm:text-[14px] leading-tight">
//                                     {cardinfo.groups.join(", ") || "Soloist"}
//                                 </p>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Stats Container */}
//                     <div className="flex w-full items-center justify-center mb-4">
//                         <div className="flex flex-row items-center justify-between w-full sm:w-80 h-20 gap-2">
//                             <div className="flex items-center justify-center text-center bg-[#b4b4b4]/60 flex-1 sm:w-36 h-20 rounded-[20px]">
//                                 <div className="flex flex-col items-center justify-center text-center gap-1">
//                                     <p className="font-bold text-xl sm:text-2xl leading-none">
//                                         {attempts}
//                                     </p>
//                                     <p className="text-sm sm:text-sm leading-tight">
//                                         {attempts === 1 ? "Attempt" : "Attempts"}
//                                     </p>
//                                 </div>
//                             </div>

//                             <div className="flex items-center justify-center text-center bg-[#b4b4b4]/60 flex-1 sm:w-36 h-20 rounded-[20px]">
//                                 <div className="flex flex-col items-center justify-center text-center gap-1">
//                                     <p className="font-bold text-xl sm:text-2xl leading-none">
//                                         3
//                                     </p>
//                                     <p className="text-sm sm:text-sm leading-tight">
//                                         Streak
//                                     </p>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Share Container */}
//                     <div className="flex w-full items-center justify-center mb-5">
//                         <div className="flex flex-col items-center w-full sm:w-80">
//                             <button className="flex items-center justify-center bg-[#9f9f9f]/60 w-full sm:w-80 h-11 sm:h-12 rounded-[16px] mb-4" onClick={() => {console.log("Success")}}>
//                                 <p className="font-bold text-base sm:text-[18px] leading-tight">
//                                     Share Results
//                                 </p>
//                             </button>

//                             <div className="flex flex-row items-center justify-center gap-6">
//                                 <button className="flex items-center justify-center bg-[#747474]/60 w-12 h-12 rounded-[20px]">
//                                     <img src="/icons/twitter-icon.png" alt="Twitter" className="w-7 h-7" />
//                                 </button>

//                                 <button className="flex items-center justify-center bg-[#747474]/60 w-12 h-12 rounded-[20px]">
//                                     <img src="/icons/instagram-icon.png" alt="Instagram" className="w-7 h-7" />
//                                 </button>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Next Idol Container */}
//                     <div className="flex w-full items-center justify-center">
//                         <div className="flex flex-row items-center justify-center text-center gap-1">
//                             <p className="text-sm sm:text-[16px]">
//                                 Next idol in
//                             </p>
//                             <p className="font-bold text-sm sm:text-[16px]">
//                                 {nextreset().formattedTime}
//                             </p>
//                         </div>
//                     </div>




                
            

//             </div>

//         </div>
//     </div>


// )};



// {/* <div>    bg-black/20 backdrop-blur-sm
//         <form>
//             <ul>
//                 <li>{cardinfo.artist_name}</li>
//                 <li>Congratulations!</li>
//                 <li>Attempts: {attempts}!</li>
//                 <li>Yesterday's Idol: {yesterdayidol}</li>
//             </ul>
//         </form>
//     </div> */}















// export default VictoryCardHudProps;