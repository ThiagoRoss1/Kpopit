export const useAllGameModes = (currentMode: string) => {
    const isWonToday = (modeId: string): boolean => {
        const wonKey = modeId === 'classic' ? 'gameWon' : `${modeId}GameWon`;
        const dateKey = modeId === 'classic' ? 'gameDate' : `${modeId}GameDate`;
        const won = localStorage.getItem(wonKey) === 'true';
        const savedDate = localStorage.getItem(dateKey);

        if (!won || !savedDate) return false;

        const currentDate = localStorage.getItem(currentMode === 'classic' ? 'gameDate' : `${currentMode}GameDate`);

        return currentDate === savedDate;
    };

    const allModes = [
        { id: 'classic', name: 'Classic', path: '/classic' },
        { id: 'blurry', name: 'Blurry', path: '/blurry' },
    ].map(mode => ({
        ...mode,
        won: isWonToday(mode.id),
        photoSpecs: mode.id === 'classic' ? "" : "blur-[2px]"
    }));

    const otherModes = allModes.filter(mode => mode.id !== currentMode);

    return { allModes, otherModes };
};