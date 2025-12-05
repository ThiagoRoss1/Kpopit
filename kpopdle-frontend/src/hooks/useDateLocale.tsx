import { useMemo } from 'react';

export function useDateLocale() {
    return useMemo(() => ({
        formatBirthDate: (dateString: string) => {
            const [year, month, day] = dateString.split('-')
            const date = new Date(Number(year), Number(month) -1, Number(day));
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        }
    }), []);
}