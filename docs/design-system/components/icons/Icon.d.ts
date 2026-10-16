export type IconName = "x" | "chart" | "arrow-right" | "arrow-left" | "search" | "lock" | "play" | "book" | "copy" | "sun" | "moon" | "sliders";
/** Lucide-geometry stroke icon (the app's icon system). Inherits currentColor. */
export interface IconProps {
  name: IconName;
  /** px, default 20 */
  size?: number;
  /** stroke width; defaults to 3 for x/search/play/sliders, else 2.5 */
  stroke?: number;
  className?: string;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element | null;
