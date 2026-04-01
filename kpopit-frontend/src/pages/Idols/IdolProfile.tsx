import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getIdolInfo } from "../../services/api";
import type { IdolProfileData } from "../../interfaces/gameInterfaces";
import { Link, useParams } from "react-router";
import { CircleChevronLeft, MicVocal, SquareUserRound, CalendarDays, Cake, Ruler, MapPinHouse } from "lucide-react";
import { motion } from "framer-motion";
import InfoItem from "./InfoItem";
import useCalculateAge from "../../hooks/useCalculateAge";
import { getNationalityFlag } from "../../utils/getFlags";

function IdolProfile() {

    const { id } = useParams<{ id: string }>();

    const [activeTab, setActiveTab] = useState<string>("Profile");

    const {
        data: idolProfileData,
        isLoading: isLoadingIdolProfileData,
        isError: isErrorIdolProfileData,
    } = useQuery<IdolProfileData>({
        queryKey: ["idolProfileData", id],
        queryFn: () => getIdolInfo(Number(id)),
        staleTime: 1000 * 60 * 60 * 4,
        refetchOnWindowFocus: false,
        enabled: !!id,
    });

    const idolProfile = idolProfileData?.idol_profile;
    const idolCareer = idolProfileData?.idol_career;

    const age = useCalculateAge(idolProfile?.birth_date || "");

    const nationality = idolProfile?.nationality;
    const nationalities = nationality ? nationality.split(",").map(nat => nat.trim()) : [];

    if (isLoadingIdolProfileData) {
        return (
            <div className="fixed inset-0 z-100 flex w-full h-screen bg-black justify-center items-center">
                <span className="text-white animate-pulse">Loading Idol Profile Data...</span>
            </div>
        );
    }

    if (isErrorIdolProfileData || !idolProfileData) {
        return (
            <div className="fixed inset-0 z-100 flex w-full h-screen bg-black justify-center items-center">
                <span className="text-white animate-pulse">Error: Error fetching idol profile data</span>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-[#0a0a0a]">
            <div className="flex flex-col relative max-w-7xl mx-auto">
                <div className="flex flex-row w-full mt-7 justify-between items-center mb-8">
                    <div className="flex flex-row w-full justify-start items-center gap-6">
                        <Link
                            to="/idols" 
                            className="group w-15 h-15 rounded-full flex items-center justify-center hover:scale-105 transition-transform duration-300">
                            <CircleChevronLeft className="text-white/50 group-hover:text-white w-15 h-15 transition-colors duration-300" size={24} />
                        </Link>

                        <input className="w-75 h-15 bg-transparent text-white px-4 border-2 border-white/50 rounded-3xl" />
                    </div>

                    <div className="flex flex-row w-full justify-end items-center gap-4">
                        <span className="font-sans font-bold text-white text-xl">
                            Wrong info ?
                        </span>

                        <Link 
                            to="/contact"
                            className="font-sans text-white text-xl font-bold bg-neon-pink px-2 py-1 rounded-xl hover:bg-neon-pink/80 transition-colors duration-300">
                                Contact me
                        </Link>
                    </div>
                </div>

                {/* Idol profile content */}
                <div className="flex flex-col lg:flex-row w-full h-fit bg-white/20">
                    {/* Idol card */}
                    <div className="group flex w-96 h-135 rounded-3xl shrink-0 overflow-hidden border-2 border-white/20">
                        <img
                            src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${idolProfile?.image_path}?v=${idolProfile?.image_version}`}
                            alt={`${idolProfile?.artist_name} photo`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 transform-gpu"
                            draggable={false} 
                        />

                        {/* Idol name and group */}
                        <div className="absolute bottom-0 left-0">
                            <div className="flex flex-col justify-center items-start w-full h-full px-8 py-5 gap-1.5">
                                <div className="px-2 bg-neon-pink rounded-2xl">
                                    <span className="font-bold text-white text-lg">
                                        {idolCareer?.group_name}
                                    </span>
                                </div>

                                <span className={`font-sans font-black text-white ${(idolProfile?.artist_name.length ?? 0) > 10 
                                && (idolProfile?.artist_name.length ?? 0) <= 12 ? 'text-5xl' : (idolProfile?.artist_name.length ?? 0) > 12 ? 'text-4xl' : 'text-6xl'}
                                [text-shadow:4px_4px_2px_rgba(255,51,153,0.8)]`}>
                                    {idolProfile?.artist_name}
                                </span>

                                <span className="font-sans font-bold text-white text-lg [text-shadow:2px_2px_2px_rgba(0,0,0,0.8),0px_0px_10px_rgba(255,255,255,0.6)]">
                                    {idolProfile?.real_name}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Idols details - profile / career */}
                    <div className="flex flex-col w-full justify-start items-center p-6">
                        {/* Tab selection */}
                        <div className="flex flex-row w-full overflow-x-auto justify-start items-center gap-6 border-b border-white/20">
                            {["Profile", "Career"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`relative text-lg font-semibold ${activeTab === tab ? "text-neon-pink" : "text-white/60 hover:text-white"} 
                                    transition-colors duration-300`}
                                >
                                    {tab}
                                    {activeTab === tab && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-pink shadow-[0_0_8px_#ff007f]" 
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        {activeTab === "Profile" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 w-full h-fit gap-5 mt-5">
                                {/* Artist Name */}
                                <InfoItem
                                    icon={MicVocal}
                                    label="Artist Name"
                                    value={idolProfile?.artist_name} 
                                />

                                {/* Real Name */}
                                <InfoItem
                                    icon={SquareUserRound}
                                    label="Real Name"
                                    value={idolProfile?.real_name} 
                                />

                                <InfoItem
                                    icon={CalendarDays}
                                    label="Birth Date"
                                    value={idolProfile?.birth_date} 
                                />

                                <InfoItem
                                    icon={Cake}
                                    label="Age"
                                    value={age !== 0 ? age.toString() : "N/A"} 
                                />

                                <InfoItem
                                    icon={Ruler}
                                    label="Height"
                                    value={`${idolProfile?.height} cm`} 
                                />

                                <InfoItem
                                    icon={MapPinHouse}
                                    label={`${nationalities.length > 1 ? "Nationalities" : "Nationality"}`}
                                    value={nationalities.map((nat, i) => {
                                        const flag = getNationalityFlag(nat);
                                        return flag ? (
                                            <img key={i} src={flag} alt={`${nat} flag`} className="w-8 h-8 rounded-lg inline-block" />
                                        ) : nat })
                                    }
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IdolProfile;