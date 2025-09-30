// Top Buttons Component
interface TopButtonsProps {
    onSubmit: () => void;
}

const TopButtons = (props: TopButtonsProps) => {
    const { onSubmit } = props;

    return (
        <div>
            <div>
                <button onClick={onSubmit} type="button">
                    Submit
                </button>
            </div>
        </div>
    )

}

export default TopButtons;