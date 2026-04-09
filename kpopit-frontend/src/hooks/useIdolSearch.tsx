import { useMemo } from "react";
import type { IdolsPageData } from "../interfaces/gameInterfaces";

interface UseIdolSearchProps {
    idols: IdolsPageData[];
    query: string;
    excludedIdols?: number[];
}

interface UseIdolSearchResult {
    filtered: IdolsPageData[];
    hasQuery: boolean;
}

export const useIdolSearch = (props: UseIdolSearchProps): UseIdolSearchResult => {
    const { idols, query, excludedIdols = [] } = props;

    const normalizedQuery = query.trim().toLowerCase();

    const filteredIdols = useMemo(() => {
        if (!normalizedQuery) return [];

        return idols.filter((idol: IdolsPageData) => {
            const matchesName = idol.artist_name.toLowerCase().includes(normalizedQuery);

            const matchesGroup = idol.group_name.toLowerCase().includes(normalizedQuery)

            const matchesAllGroups = idol.all_groups.toLowerCase().includes(normalizedQuery);

            const matchesCompany = idol.company_name?.toLowerCase().includes(normalizedQuery);

            const isNotExcluded = !excludedIdols.includes(idol.id);
            const matches = (matchesName || matchesGroup || matchesAllGroups || matchesCompany) && isNotExcluded;

            return matches;
        }).sort((a, b) => {
            const aName = a.artist_name.toLowerCase();
            const bName = b.artist_name.toLowerCase();

            const getPriority = (name: string) => {
                if (name.startsWith(normalizedQuery)) return 1;
                if (name.includes(normalizedQuery)) return 2;
                return 3;
            }

            const aPriority = getPriority(aName);
            const bPriority = getPriority(bName);

            return aPriority !== bPriority ? aPriority - bPriority : aName.localeCompare(bName);
        })
    }, [idols, normalizedQuery, excludedIdols]);

    return {
        filtered: filteredIdols,
        hasQuery: normalizedQuery.length > 0,
    };
}
