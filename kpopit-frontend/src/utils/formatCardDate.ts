/**
 * `first_won_at` is a TIMESTAMPTZ and the game day is EST-anchored: a card won at
 * 09:00 in Tokyo on the 12th belongs to the EST 11th challenge. Formatting in the
 * viewer's local zone would name a day they did not play, so this pins the zone.
 */

const CARD_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
});

export function formatCardDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return '—';
    return CARD_DATE_FORMAT.format(parsed).toUpperCase();
}
