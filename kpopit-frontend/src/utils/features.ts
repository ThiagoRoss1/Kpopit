// Optional features as GET /api/features reports them. Anything missing, malformed or
// unreachable counts as off, so a failed read never shows a disabled feature.
export interface Features {
    calendar: boolean;
    idol_xp: boolean;
    public_profile: boolean;
    collection: boolean;
}

export const NO_FEATURES: Features = { calendar: false, idol_xp: false, public_profile: false, collection: false };

export function parseFeatures(raw: unknown): Features {
    if (!raw || typeof raw !== "object") return NO_FEATURES;
    const value = raw as Record<string, unknown>;
    return {
        calendar: value.calendar === true,
        idol_xp: value.idol_xp === true,
        public_profile: value.public_profile === true,
        collection: value.collection === true,
    };
}
