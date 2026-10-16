export interface SearchSuggestion { title: string; subtitle?: string; coverHue?: number; coverSrc?: string }
/** Frosted search shell + pink press-down submit + paper suggestion dropdown (round cover thumbs, hover slides 4px). */
export interface SearchFieldProps {
  placeholder?: string;
  value?: string;
  suggestions?: SearchSuggestion[];
  /** receives the picked suggestion, or the raw string if none was picked */
  onSubmit?: (value: SearchSuggestion | string) => void;
  onPick?: (s: SearchSuggestion) => void;
  disabled?: boolean;
}
export declare function SearchField(props: SearchFieldProps): JSX.Element;
