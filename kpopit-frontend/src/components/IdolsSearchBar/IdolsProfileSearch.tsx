import "./IdolsSearchBar.css";
import { useEffect, useRef, useState } from "react";
import { useIdolSearch } from "../../hooks/useIdolSearch";
import type { IdolsPageData } from "../../interfaces/gameInterfaces";
import { Link, useNavigate } from "react-router-dom";

interface IdolsProfileSearchProps {
    idolsData: IdolsPageData[];
    searchTerm: string;
    onClose?: () => void;
    onChange?: (newTerm: string) => void;
    excludedIdols?: number[];

    onChoose: (idol: IdolsPageData) => void;
}

const IdolsProfileSearch = (props: IdolsProfileSearchProps) => {
    const { idolsData, searchTerm, onClose, onChange, excludedIdols = [], onChoose } = props;

    const [showList, setShowList] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    const navigate = useNavigate();

    useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setShowList(false);
            onClose?.();
        }
    };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose])

    const { filtered: searchResults, hasQuery } = useIdolSearch({
        idols: idolsData,
        query: searchTerm,
        excludedIdols,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        onChange?.(value);
        if (value.trim().length > 0) {
            setShowList(true);
        }
    }

    return (
        <div ref={containerRef} className="relative h-full w-full sm:max-w-92.5">
            <div className="flex w-full h-full bg-transparent text-white border-2 border-white/50 rounded-3xl justify-center items-center overflow-hidden">
                <form 
                    className="flex flex-col w-full h-full gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (hasQuery && searchResults.length > 0) {
                            const firstResult = searchResults[0];

                            onChoose(firstResult);

                            const slug = `${firstResult.id}/${firstResult.artist_name}-${firstResult.group_name}`.trim().replace(/\s+/g, '-').toLowerCase();
                            navigate(`/idols/${slug}`);

                            onChange?.("");
                            setShowList(false);
                        }
                    }}
                    >
                    <div className="flex items-center gap-2 w-full h-full">
                        <input 
                            className="flex w-full h-13 sm:w-92.5 sm:h-15 grow placeholder-white/60 px-4 rounded-3xl"
                            type="text"
                            value={searchTerm}
                            onChange={handleInputChange}
                            onFocus={() => searchTerm.length > 0 && setShowList(true)}
                            placeholder="Search for an Idol, Group, or Company..."
                        />

                    </div>

                    {searchTerm.length > 0 && hasQuery && showList && searchResults.length > 0 && (
                    <ul className={`droplist-enter absolute z-50 left-0 top-full mt-2 w-full h-fit rounded-3xl
                    overflow-y-auto overflow-x-hidden searchbar-scroll
                    border-2 border-white/50 max-h-60 sm:max-h-60`}>
                        {searchResults.map((idol) => {
                            return (
                                <Link 
                                    to={`/idols/${idol.id}/${idol.artist_name}-${idol.group_name}`.trim().replace(/\s+/g, '-').toLowerCase()}
                                    key={idol.id}
                                    onClick={() => {
                                        onChoose(idol)
                                        onChange?.("");
                                        setShowList(false);
                                    }}
                                >
                                    <li 
                                        className="group relative px-4 py-3 bg-[#0a0a0a]/80 hover:bg-[#1f1f1f] cursor-pointer 
                                        transition-all duration-300"
                                    >
                                        {idol.image_path && (
                                            <div className="flex justify-start items-center gap-3">
                                                <img 
                                                    src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${idol.image_path}?v=${idol.image_version}`}
                                                    alt={`${idol.artist_name} image`}
                                                    className="w-11 h-11 sm:w-12 sm:h-12 object-cover rounded-2xl border border-white
                                                    group-hover:scale-105 group-hover:translate-x-1 transition-transform duration-500 transform-gpu" 
                                                />
                                                <div className="relative flex flex-col">
                                                    <span className="font-sans font-bold text-base sm:text-lg text-white [text:shadow:1px_1px_0px_rgba(0,0,0,0.6)] 
                                                    group-hover:translate-x-1 transition-transform duration-500 transform-gpu">
                                                        {`${idol.artist_name} (${idol.group_name})`}
                                                    </span>

                                                    <span className="font-sans font-bold text-xs sm:text-sm text-white/60 
                                                    group-hover:translate-x-1 transition-transform duration-500 transform-gpu">
                                                        {idol.company_name}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                </Link>
                            )}).filter((_, index) => index < 20)}
                    </ul>
                    )}
                </form>
            </div>
        </div>

    )
}

export default IdolsProfileSearch;