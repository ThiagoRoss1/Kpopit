import "./IdolsList.css";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getIdolsPage } from "../../services/api";
import type { IdolsPageData } from "../../interfaces/gameInterfaces";
import IdolsSearchBar from "../../components/IdolsSearchBar/IdolsSearchBar";
import IdolsCards from "../../components/IdolsPageCards/IdolsCards";
import { formatCompanyName } from "../../utils/formatters";

function IdolsList() {
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
    }, []);

    const {
        data: idolsData,
        isLoading: isLoadingIdolsData,
        isError: isErrorIdolsData,
    } = useQuery<IdolsPageData[]>({
        queryKey: ["idolsPageData"],
        queryFn: getIdolsPage,
        staleTime: 1000 * 60 * 60 * 4,
        refetchOnWindowFocus: false,
        enabled: true,
    });

    useEffect(() => {
        document.title = "KpopIt - Idols List";
    }, []);

    // Idol filtering
    const filteredIdols = useMemo(() => {
        const term = searchTerm.toLowerCase();
        if (!term) return idolsData;

        return idolsData?.filter(idol =>
            idol.artist_name.toLowerCase().includes(term) || 
            idol.group_name.toLowerCase().includes(term) ||
            idol.company_name?.toLowerCase().includes(term)
        ).sort((a, b) => {
            const aName = a.artist_name.toLowerCase();
            const bName = b.artist_name.toLowerCase();

            const getPriority = (name: string) => {
                if (name.startsWith(term)) return 1;
                if (name.includes(term)) return 2;
                return 3;
            };

            const aPriority = getPriority(aName);
            const bPriority = getPriority(bName);

            return aPriority !== bPriority ? aPriority - bPriority : aName.localeCompare(bName);
        })
    }, [searchTerm, idolsData]); 

    if (isLoadingIdolsData) {
        return (
            <div className="fixed inset-0 z-100 flex w-full h-screen bg-black justify-center items-center">
                <span className="text-white animate-pulse">Loading Idols Data...</span>
            </div>
        );
    }

    if (isErrorIdolsData || !idolsData) {
        return (
        <div className="fixed inset-0 z-100 flex w-full h-screen bg-black justify-center items-center">
            <span className="text-white animate-pulse">Error: Error fetching idols data</span>
        </div>
        );
    }

    return (
        <div className="w-full min-h-full bg-[#0a0a0a]">
            <div className="flex flex-col w-full h-full justify-start items-center">
                {/* Title */}
                <div className="flex items-center justify-center w-full h-fit mt-10 mb-5">
                    <h1 className="text-4xl xs:text-5xl [text-shadow:0px_0px_4px_rgba(255,255,255,1)] 
                    font-bold text-center text-white">
                        Kpopit Idols
                    </h1>
                </div>
                
                {/* Search Bar */}
                <div className="w-full h-fit flex justify-center items-center mb-19">
                    <IdolsSearchBar 
                        idolsData={idolsData} 
                        onIdolSelect={setSearchTerm}
                        value={searchTerm} 
                    />
                </div>

                <div className="w-full h-fit flex flex-col justify-center items-start text-center mb-4 
                max-xxs:px-2 xs:px-4 md:px-6 lg:px-14 xl:px-20 2xl:px-60 gap-4">
                    <span className="text-white max-xxs:text-4xl xxs:text-4xl sm:text-5xl lg:text-6xl font-sans font-black">
                        List of <span className="text-neon-pink [text-shadow:0px_0px_10px_rgba(255,51,153,0.5),0px_0px_20px_rgba(255,51,153,0.3)]">Idols</span>
                    </span>
                    
                    <span className="text-white text-xl font-sans font-semibold opacity-60 [text-shadow:1px_1px_10px_rgba(255,255,255,0.6)]">
                        {`Showing ${filteredIdols?.length || 0} ${filteredIdols?.length === 1 ? 'idol' : 'idols'}`}
                    </span>
                </div>

                <div className="grid w-full h-fit gap-6 mb-6 max-xxs:px-2 xs:px-4 md:px-6 lg:px-14 xl:px-20 2xl:px-60
                grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                    {filteredIdols?.map((idol, i) => (
                        <Link
                            key={idol.id}
                            to={`/idols/${idol.id}/${idol.artist_name.toLowerCase()}-${idol.group_name.toLowerCase()}`.trim().replace(/\s+/g, '-')}
                            className="idol-card-enter" style={{ animationDelay: `${i * 0.02}s` }}>
                        <IdolsCards
                            key={idol.id}
                            idolImage={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${idol.image_path}?v=${idol.image_version}`}
                            artistName={idol.artist_name}
                            groupName={idol.group_name}
                            companyName={idol.company_name ? formatCompanyName(idol.company_name) : idol.company_name}
                        />
                        </Link>
                    ))}
                </div>
                
                {filteredIdols?.length === 0 && (
                <div className="absolute top-1/2 text-white font-semibold text-xl [text-shadow:1px_1px_10px_rgba(255,255,255,0.6)]">
                    No idols found
                </div>
                )}
            </div>            
        </div>
    )
}

export default IdolsList;


