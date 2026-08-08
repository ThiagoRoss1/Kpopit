/**
 * Resolve WAI-ARIA radio keyboard movement. Arrow keys wrap, Home/End jump,
 * and disabled entries (the derived Custom preset) are never selected.
 */

export function getRadioNavigationIndex(
    currentIndex: number,
    key: string,
    enabled: readonly boolean[],
): number | null {
    if (enabled.length === 0) return null;

    if (key === 'Home') {
        const first = enabled.findIndex(Boolean);
        return first >= 0 ? first : null;
    }

    if (key === 'End') {
        for (let index = enabled.length - 1; index >= 0; index -= 1) {
            if (enabled[index]) return index;
        }
        return null;
    }

    const direction = key === 'ArrowRight' || key === 'ArrowDown'
        ? 1
        : key === 'ArrowLeft' || key === 'ArrowUp'
            ? -1
            : 0;
    if (direction === 0) return null;

    let index = currentIndex;
    for (let step = 0; step < enabled.length; step += 1) {
        index = (index + direction + enabled.length) % enabled.length;
        if (enabled[index]) return index;
    }

    return null;
}
