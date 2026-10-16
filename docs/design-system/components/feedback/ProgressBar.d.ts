/** 9px pink-gradient fill track with an optional row of 4px milestone segments (default 5 = every 20%). */
export interface ProgressBarProps {
  /** 0–100 */
  value: number;
  /** milestone segments under the bar; 0 hides them */
  segments?: number;
  label?: string;
}
export declare function ProgressBar(props: ProgressBarProps): JSX.Element;
