import { Import } from 'lucide-react';

interface TransferDataTextProps {
    onSubmitImportData?: () => void;
    onSubmitExportData?: () => void;
}


const TransferDataText = (props: TransferDataTextProps) => {
    const { onSubmitImportData, onSubmitExportData } = props;


    return (
        <div className='w-full bg-transparent'> 
            <div className='w-full flex flex-col items-center justify-center gap-4'>
                {/* Import Button */}
                <div className='w-full flex flex-row justify-center items-center'>
                    <button 
                    onClick={onSubmitImportData}
                    className='w-full sm:h-16 rounded-2xl border border-white bg-transparent
                    backface-hidden shadow-[0_0_10px_1px_rgba(255,255,255,0.10),0_0_10px_1px_rgba(255,255,255,0.10)] backdrop-blur-lg
                    hover:scale-101 hover:brightness-110 hover:bg-[#000000]/80 hover:bg-linear-to-r hover:from-[#b43777] hover:via-[#0d0314] hover:to-[#000000]
                    bg-size-[130%_100%] bg-left hover:animate-[moveGradient_0.3s_linear_forwards] hover:cursor-pointer transition-all duration-500 transform-gpu'>
                        <div className='relative flex flex-row items-center justify-start px-4 gap-4'>
                            <Import className='sm:w-10 sm:h-10' />
                            <span className='text-xl text-white [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.35)]'>
                                Import data
                            </span>
                        </div>
                    </button>
                </div>

                {/* Export Button */}
                <div className='w-full flex flex-row justify-center items-center'>
                    <button 
                    onClick={onSubmitExportData}
                    className='w-full sm:h-16 rounded-2xl border border-white bg-transparent
                    backface-hidden shadow-[0_0_10px_1px_rgba(255,255,255,0.10),0_0_10px_1px_rgba(255,255,255,0.10)] backdrop-blur-lg
                    hover:scale-101 hover:brightness-110 hover:bg-[#000000]/80 hover:bg-linear-to-r hover:from-[#b43777] hover:via-[#0d0314] hover:to-[#000000]
                    bg-size-[130%_100%] bg-left hover:animate-[moveGradient_0.3s_linear_forwards] hover:cursor-pointer transition-all duration-500 transform-gpu'>
                        <div className='relative flex flex-row items-center justify-start px-4 gap-4'>
                            <Import className='sm:w-10 sm:h-10 rotate-180' />
                            <span className='text-xl text-white [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.35)]'>
                                Export data
                            </span>
                        </div>
                    </button>
                </div>
                



            </div>
        </div>
    )
}

export default TransferDataText;