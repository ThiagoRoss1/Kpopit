interface DroplistBaseProps {
    isOpen?: boolean;
    onClose: () => void;
    children?: React.ReactNode;
    // align?: "left" | "center" | "right";
}

const DroplistBase = (props: DroplistBaseProps) => {
    const { isOpen, onClose, children } = props;

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50" onClick={() => onClose()}>
                <div 
                    className="absolute mt-2 right-0 w-48 bg-black/30 border border-white rounded-lg shadow-lg backdrop-blur-xl"
                    onClick={(e) => e.stopPropagation()}>

                    <div className="flex flex-col">
                        {children}
                    </div>
                </div>
            </div>
        
        </>
    )
}

export default DroplistBase;