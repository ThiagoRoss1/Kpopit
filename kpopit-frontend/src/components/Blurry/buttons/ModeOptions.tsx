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

    return (
    <div className="w-full h-fit max-w-full flex justify-center items-center">
        <div className="sm:w-60 sm:h-14 bg-white">
            <Switch
                isActive={options.hardcore}
                onToggle={() => onToggle('hardcore')}
                disabled={false}
            />

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