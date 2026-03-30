import type { IdolsPageData } from "../../interfaces/gameInterfaces";

interface IdolsSearchBarProps {
    idolsData: IdolsPageData[];
    onIdolSelect: (searchTerm: string) => void;
    value: string;
}

const IdolsSearchBar = (props: IdolsSearchBarProps) => {
    const { onIdolSelect, value } = props;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value.toLowerCase();
        onIdolSelect?.(inputValue);
    };

    return (
        <div className="flex relative w-full h-fit justify-center items-center">
            <div className="relative flex items-center justify-center px-6 sm:px-0 max-xxs:w-full xxs:w-120 h-10 sm:w-141 sm:h-12">
                <input
                    className="w-full h-full text-white bg-black/50 rounded-3xl px-4
                    border border-white/60 focus:outline-none focus:ring-1 focus:ring-white/60"
                    type="text"
                    onChange={handleInputChange}
                    placeholder="Search an Idol"
                    value={value}
                />
            </div>
        </div>
    )
};

export default IdolsSearchBar;