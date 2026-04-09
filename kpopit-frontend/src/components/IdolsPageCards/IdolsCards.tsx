interface IdolsCardsProps {
    idolImage?: string;
    artistName?: string;
    groupName?: string;
    companyName?: string;
}

const IdolsCards = (props: IdolsCardsProps) => {
    const { idolImage, artistName, groupName, companyName } = props;

    return (
        <div className="group relative flex w-full h-70 sm:w-full sm:h-70 lg:h-80 bg-black/20 border-2 border-white/50 rounded-[20px] overflow-hidden
        hover:cursor-pointer hover:scale-105 hover:border-white transition-transform duration-300 ease-out transform-gpu will-change-transform backface-hidden">
            {/* Idol Image */}
            <div className="w-full h-full flex justify-center items-center overflow-hidden">
                <img 
                    src={idolImage} 
                    alt={`${artistName} image`} 
                    className="w-full h-full object-cover transform-gpu hover:scale-110 transition-transform duration-700 " 
                    draggable={false}
                />
            </div>

            {/* Idol Info */}
            <div className="absolute flex flex-col bottom-0 w-full h-20 border-t-2 border-white/20 rounded-t-2xl bg-black/60 justify-center items-start px-2 
            pointer-events-none group-hover:bg-black group-hover:border-white transition-colors duration-700 transform-gpu backface-hidden">
                <h3 className="text-white font-bold text-base sm:text-lg lg:text-xl [text-shadow:3px_3px_0px_rgba(0,0,0,0.8)] text-center translate-x-0 scale-100
                group-hover:translate-x-4 group-hover:scale-110 group-hover:text-[#ff3399] group-hover:[text-shadow:2px_2px_12px_rgba(255,51,153,0.8)]
                antialiased transition-transform duration-500 transform-gpu will-change-transform">
                    {artistName}
                </h3>

                <div className="flex flex-row gap-1 justify-center items-center text-white [text-shadow:-3px_3px_0px_rgba(0,0,0,0.8)]
                leading-tight wrap-break-word whitespace-normal text-[12px] sm:text-sm">
                    <span className="font-semibold italic">{groupName} {companyName && `• ${companyName}`}</span>
                </div>
            </div>
        </div>
    );
}

export default IdolsCards;