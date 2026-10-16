/** Mini record-sleeve hint card. Locked shows "+ N" guesses-left badge; unlocked, tap slides the vinyl out to reveal the value on its pink label. */
export interface HintSleeveProps {
  label: string;
  /** Hangul sub-label (Noto Sans KR) */
  korean?: string;
  /** e.g. "01" */
  index: string;
  value: string;
  tone?: "year" | "artist";
  /** guesses left until unlock; 0 = unlocked */
  remaining?: number;
  defaultOpen?: boolean;
}
export declare function HintSleeve(props: HintSleeveProps): JSX.Element;
