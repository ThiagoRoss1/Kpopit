import { useQuery } from "@tanstack/react-query";
import { getIdolInfo } from "../../services/api";
import type { IdolProfileData } from "../../interfaces/gameInterfaces";
import { useParams } from "react-router";

function IdolProfile() {

    const { id } = useParams<{ id: string }>();

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
        <div>
            <span className="text-white">{idolProfileData.idol_profile.artist_name} from {idolProfileData.idol_career.group_name} Available in Classic and Blurry ? {idolProfileData.game_info.game_modes_available.Classic ? "Yes" : "No"}, {idolProfileData.game_info.game_modes_available.Blurry ? "Yes" : "No"}</span>
        </div>
    );
};

export default IdolProfile;