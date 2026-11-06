import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getIdolsPage } from "../../services/api";
import { resolveCdnUrl } from "../../utils/imageUrl";
import type { IdolsPageData } from "../../interfaces/gameInterfaces";

interface Option {
    id: number;
    name: string;
    sub: string | null;
    image: string | null;
}

/** Published idols, and the groups they belong to, from the idols page list. */
export const useBiasOptions = (enabled: boolean) => {
    const { data } = useQuery<IdolsPageData[]>({
        queryKey: ["idolsPageData"],
        queryFn: getIdolsPage,
        staleTime: 1000 * 60 * 60 * 4,
        refetchOnWindowFocus: false,
        enabled,
    });
    return useMemo(() => {
        const published = (data ?? []).filter((i) => i.is_published);
        const idols: Option[] = published
            .map((i) => ({ id: i.id, name: i.artist_name, sub: i.group_name, image: resolveCdnUrl(i.image_path, i.image_version) }))
            .sort((a, b) => a.name.localeCompare(b.name));
        const groups = new Map<number, Option>();
        for (const idol of published) {
            if (idol.group_id !== null && idol.group_name && !groups.has(idol.group_id)) {
                groups.set(idol.group_id, { id: idol.group_id, name: idol.group_name, sub: null, image: null });
            }
        }
        return { idols, groups: [...groups.values()].sort((a, b) => a.name.localeCompare(b.name)), loaded: !!data };
    }, [data]);
};
