/** Idol page search: skewed white bar with pink offset that sits right-aligned at 400px when closed and slides to full width (transform only) when focused; max 5 results. */
export interface SlideSearchProps {
  value?: string;
  onChange?: (value: string) => void;
  results?: { name: string; sub: string; img: string; current?: boolean; onPick?: () => void }[];
  open?: boolean;
  placeholder?: string;
  max?: number;
}
export declare function SlideSearch(props: SlideSearchProps): JSX.Element;
