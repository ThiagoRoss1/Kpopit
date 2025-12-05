export interface GameData {
  answer_id: number;
  categories: string[];
  server_date: string;

  /* Hints */
  member_count?: number;
  groups?: string[];
}

export interface IdolListItem {
  id: number;
  artist_name: string;
  image_path: string;
  groups?: string[];
  all_groups?: string[];
}

export interface FeedbackItem {
  status: string;
  // '?' turns these properties optional. It can or cannot exist.
  correct_items?: string[];
  incorrect_items?: string[];
}

export interface FeedbackData {
  artist_name: FeedbackItem;
  gender: FeedbackItem;
  idol_debut_year: FeedbackItem;
  birth_date: FeedbackItem;
  height: FeedbackItem;
  nationality: FeedbackItem;
  groups: FeedbackItem;
  position: FeedbackItem;
  companies: FeedbackItem;
}

export interface GuessedIdolData {
  idol_id: number;
  artist_name: string;
  gender: string;
  nationality: string[];
  groups: string[];
  active_group?: string | null;
  idol_debut_year: number;
  birth_date: string;
  height: number;
  position: string[];
  companies: string[];
  image_path: string;
}

export interface GuessResponse {
  guess_correct: boolean;
  feedback: FeedbackData;
  guessed_idol_data: GuessedIdolData;
}

// Export guess idol api instance (entire idol career)
export interface GuessPayload {
    guessed_idol_id: number;
    answer_id: number;
}

export interface UserTokenData {
  user_token: string;
  current_attempt: number;
}

export interface CompleteGuessRequest extends GuessPayload, UserTokenData {}

export interface YesterdayIdol {
  past_idol_id: number;
  yesterdays_pick_date: string;
  artist_name: string;
  groups?: string[];
  image_path: string;
}

export interface ResetTimer {
  hours: number;
  minutes: number;
  seconds: number;
  total_seconds: number;
  next_reset: string;
}

export interface Users {
  id: number;
  token: string;
  created_at: string;
}

export interface UserStats {
  current_streak: number;
  max_streak: number;
  wins_count: number;
  average_guesses: number;
  one_shot_wins: number;
}

export interface AddIdolRequest {
  id?: number;
  artist_name: string;
  real_name?: string;
  gender?: string;
  debut_year?: number;
  nationality?: string[];
  birth_date?: string;
  height?: number;
  position?: string[];
  image_path?: string;
  is_published?: number;
}

export interface DailyUserCount {
  user_count: number;
}

export interface GeneratedCodes {
  transfer_code: string;
  expires_at: string;
}

export interface RedeemUserToken {
  user_token: string;
}