import { useEffect, useState } from 'react';

const NIGHT_KEY = 'kpopit-collections-night';

export function useCollectionNight() {
    const [night, setNight] = useState(() => localStorage.getItem(NIGHT_KEY) === 'true');
    useEffect(() => {
        localStorage.setItem(NIGHT_KEY, night ? 'true' : 'false');
    }, [night]);
    return [night, setNight] as const;
}
