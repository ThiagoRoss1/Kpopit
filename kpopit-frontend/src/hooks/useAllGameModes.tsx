export const useAllGameModes = (currentMode: string) => {
    const allModes = [
        { id: 'classic', name: 'Classic', path: '/classic' },
        { id: 'blurry', name: 'Blurry', path: '/blurry' },
    ].map(mode => ({
        ...mode,
        won: localStorage.getItem(`${mode.id === 'classic' ? 'gameWon' : mode.id + 'GameWon'}`) === 'true',
        photoSpecs: mode.id === 'classic' ? "" : "blur-[2px]"
    }));

    const otherModes = allModes.filter(mode => mode.id !== currentMode);

    return { allModes, otherModes };
};