/** Spinning vinyl record: dark-purple grooves, cover as centre label, warm key / cool fill lighting. 4s linear spin. */
export interface VinylProps {
  coverSrc?: string;
  /** placeholder cover hue (oklch) when no coverSrc */
  coverHue?: number;
  spinning?: boolean;
  /** px, default 220 */
  size?: number | string;
  pixelated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}
export declare function Vinyl(props: VinylProps): JSX.Element;
