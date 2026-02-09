import Switch from "../../buttons/ui/Switch";

interface ModeOptionsProps {
    options: {
        hardcore: boolean;
        color: boolean;
    };
    onToggle: (id: 'hardcore' | 'color') => void;
    attempts: number;
}

const ModeOptions = (props: ModeOptionsProps) => {
    const { options, onToggle, attempts } = props;

    const COLOR = 4;
    const canUseColorMode = attempts >= COLOR;

    const remaining = COLOR - attempts;

    return (
    <div className="flex w-50 h-14 sm:w-60 sm:h-16 justify-center items-center
    bg-transparent border border-white rounded-2xl gap-0 p-1 sm:gap-4 sm:p-2">
        <div className="flex flex-1 flex-col items-center gap-0.5 mb-0.5 sm:gap-0.5 sm:mb-0.5">
            <span className="text-white [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)] text-[12px] sm:text-sm">
                Hardmode
            </span>

            <Switch
                isActive={options.hardcore}
                onToggle={() => onToggle('hardcore')}
                disabled={false}
            />
        </div>

        <div className="w-0.5 h-8 sm:w-0.5 sm:h-8 bg-gray-300" />

        <div className={`flex flex-1 flex-col items-center gap-0.5 mb-0.5 sm:gap-0.5 sm:mb-0.5
            ${!canUseColorMode ? "opacity-50 grayscale" : ""}`}>
            <span className="text-white [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)] text-[12px] sm:text-sm">
                Color {remaining > 0 ? `(${remaining})` : ""}
            </span>

            <Switch
                isActive={options.color}
                onToggle={() => onToggle('color')}
                disabled={!canUseColorMode}
            />
        </div>
    </div>
    )
}

export default ModeOptions;