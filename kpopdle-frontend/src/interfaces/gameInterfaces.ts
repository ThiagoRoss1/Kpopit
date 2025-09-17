export interface GameData {
  answer_id: number;
  categories: string[];
}

export interface IdolListItem {
  id: number;
  artist_name: string;
}

export interface FeedbackItem {
  status: string;
  // '?' turns these properties optional. I can or cannot exist.
  correct_items?: string[];
  incorrect_items?: string[];
}

export interface FeedbackData {
  artist_name: FeedbackItem;
  gender: FeedbackItem;
  idol_debut_year: FeedbackItem;
  birth_year: FeedbackItem;
  height: FeedbackItem;
  nationality: FeedbackItem;
  groups: FeedbackItem;
  position: FeedbackItem;
  companies: FeedbackItem;
}

export interface GuessedIdolData {
  artist_name: string;
  gender: string;
  nationality: string[];
  groups: string[];
  idol_debut_year: number;
  birth_year: number;
  height: number;
  position: string[];
  companies: string[];
}

export interface GuessResponse {
  guess_correct: boolean;
  feedback: FeedbackData;
  guessed_idol_data: GuessedIdolData;
}