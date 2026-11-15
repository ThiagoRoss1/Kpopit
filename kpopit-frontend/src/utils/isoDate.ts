/** True for a real calendar day written YYYY-MM-DD ("2026-02-31" and "2026-11-0x" are not). */
export const isIsoDate = (value: string | null | undefined): value is string => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const time = Date.parse(`${value}T00:00:00Z`);
    return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
};
