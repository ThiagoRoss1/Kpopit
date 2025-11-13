interface ImportDataTextProps {
    onSubmitReturn?: () => void;
}

const ImportDataText = (props: ImportDataTextProps) => {
    const { onSubmitReturn } = props;
    history.back();


    return (
        <div>
            <button 
            onClick={onSubmitReturn}>
                Back
            </button>
            <span>Oi</span>
        </div>
    )
}

export default ImportDataText;