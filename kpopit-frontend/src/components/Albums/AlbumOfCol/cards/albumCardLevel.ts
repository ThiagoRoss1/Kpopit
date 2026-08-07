import type { AlbumMember } from '../../../../interfaces/albumInterfaces';

export type CardTreatment = 'base' | 'gold' | 'holo';

export const treatmentForLevel = (level: number): CardTreatment =>
    level >= 3 ? 'holo' : level === 2 ? 'gold' : 'base';

export function treatmentForGroup(members: AlbumMember[]): CardTreatment {
    if (members.length === 0) return 'base';
    const allAtLeast = (level: number) => members.every((m) => m.owned && (m.level ?? 1) >= level);
    return allAtLeast(3) ? 'holo' : allAtLeast(2) ? 'gold' : 'base';
}
