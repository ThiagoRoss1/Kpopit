import "../BlurryMode/blurry_mode.css";
import axios, { AxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSharedGameData } from "../../hooks/useSharedGameData";
import { useState, useEffect, useMemo } from "react";
import { getBlurryDailyIdol } from "../../services/api";
import type { BlurryGameData, IdolListItem } from "../../interfaces/gameInterfaces";

function BlurryMode() {

    const { userToken, isMobile, initUser, decryptedTokenRef, allIdolsData, 
        isLoadingAllIdols, isErrorAllIdols, userStatsData, queryClient } = useSharedGameData();

    const {
        data: blurryGameData,
        isLoading: isLoadingBlurryGameData,
        isError: isErrorBlurryGameData,
        error: blurryGameDataError,
    } = useQuery<BlurryGameData>({
        queryKey: ['blurryDailyIdol'],
        queryFn: getBlurryDailyIdol,
        enabled: !!decryptedTokenRef.current,
        staleTime: 1000 * 60 * 60 * 4,
        refetchOnWindowFocus: false,
    })

    const targetIdol = useMemo(() => {
        if (!allIdolsData || !blurryGameData) return null;
        return allIdolsData.find((idol: IdolListItem) => idol.id === blurryGameData.answer_id) || null;
    }, [allIdolsData, blurryGameData]);

    const artistName = targetIdol?.artist_name || "Loading...";

    if (isLoadingBlurryGameData || isLoadingAllIdols) {
        return <div className="flex w-full h-screen justify-center items-center text-white">Loading Kpopit...</div>;
    }

    if (isErrorAllIdols || isErrorBlurryGameData || !blurryGameData || isErrorBlurryGameData) {
        const error = blurryGameDataError as AxiosError;
        console.error("Error loading Blurry Mode data:", blurryGameDataError);
        console.error(error?.response?.data || error?.message);
        return <div className="flex w-full h-screen justify-center items-center text-white">Error loading Kpopit. Please try again later.</div>;
    }

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-start">
            <div className="flex items-center justify-center text-center mt-40">
                <span className="text-white text-3xl">Blurry Mode - Coming Soon!</span>
            </div>

            <div className="flex items-center justify-center text-center mt-40 h-100 w-100 bg-white">
                <img
                    src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${blurryGameData.blur_image_path}`}
                    alt={`Blurry image of ${artistName}`}
                    
                />
            </div>
        </div>
    )
}

export default BlurryMode;