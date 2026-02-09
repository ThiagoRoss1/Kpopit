interface SwitchButtonProps {
    isActive: boolean;
    onToggle: () => void;
    disabled?: boolean;
}

const Switch = (props: SwitchButtonProps) => {
    const { isActive, onToggle, disabled } = props;
     
    return (
        <div
            onClick={!disabled ? onToggle : undefined}
            className={`flex w-12 h-6 sm:w-12 sm:h-6 p-1 rounded-full transition-colors duration-300
                ${isActive ? "bg-[#FF3399]" : "bg-gray-700"} ${disabled ? "select-none cursor-default opacity-50" : "cursor-pointer"}`}
        >
            <div
                className={`w-4 h-4 sm:w-4 sm:h-4 bg-white rounded-full transition-transform duration-300 transform-gpu
                    ${isActive ? "translate-x-6 scale-120" : "translate-x-0"}`}
            />
        </div>
    )
}

export default Switch;