import type { CalendarMode } from "./gameInterfaces";

/** GET /api/idol-xp/state for an account (guests only get `potion`). */
export interface IdolXpIdol {
    idol_id: number;
    artist_name: string | null;
    image_path: string | null;
    xp: number;
    level: number;
    next_level_xp: number | null;
}

export interface IdolXpState {
    current: { idol_id: number; artist_name: string; image_path: string | null; selected_from: string } | null;
    idols: IdolXpIdol[];
    potion: { xp: number; cap: number };
}

export interface PourResult extends IdolXpState {
    poured: { idol_id: number; amount: number };
}

export interface ProfileSettings {
    bias_idol_id: number | null;
    bias_group_id: number | null;
    is_public: boolean;
    show_match_history: boolean;
    show_activity: boolean;
}

export interface ProfileHeroXp {
    current: {
        idol_id: number;
        artist_name: string;
        image_path: string | null;
        xp: number;
        level: number;
        level_xp: number;
        next_level_xp: number | null;
    } | null;
}

export type PublicProfile =
    | { username: string; is_private: true }
    | {
        username: string;
        is_private: false;
        is_owner: boolean;
        /** The game day (America/New_York), for the heatmap. */
        today: string;
        display_name: string | null;
        avatar_url: string | null;
        member_since: string | null;
        bias_idol: { id: number; artist_name: string; image_path: string | null } | null;
        bias_group: { id: number; name: string } | null;
        history_visible: boolean;
        /** Days with games in the last 18 weeks; null when the owner hides it. */
        activity: { date: string; modes: number }[] | null;
        /** Only while the idol_xp flag is on. */
        idol_xp: ProfileHeroXp | null;
    };

export interface RateBucket {
    start: string;
    played: number;
    wins: number;
}

export interface ModeStats {
    played: number;
    wins: number;
    win_rate: number;
    avg_guesses: number | null;
    one_shots: number;
    fastest_seconds: number | null;
    current_streak: number;
    current_streak_mode?: CalendarMode | null;
    max_streak: number;
    /** Wins by guesses: index 0 = 1 guess ... index 7 = 8 or more. */
    distribution: number[];
    weekly: RateBucket[];
    monthly: RateBucket[];
    /** Top groups by guesses; name null = everything else. */
    groups: { name: string | null; guesses: number }[];
    most_guessed: { idol_id: number; artist_name: string; image_path: string | null; group_name: string | null; guesses: number }[];
}

export type ProfileStats = Record<CalendarMode | "all", ModeStats>;

export type HistoryEntry =
    | { date: string; gamemode_id: number; day_number: number | null; locked: true }
    | {
        date: string;
        gamemode_id: number;
        day_number: number | null;
        locked: false;
        won: boolean;
        guesses: number;
        is_calendar: boolean;
        answer: { name: string; image_path: string | null } | null;
    };

export interface ProfileHistory {
    entries: HistoryEntry[];
    has_more: boolean;
}
