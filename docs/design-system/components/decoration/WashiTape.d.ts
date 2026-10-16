/** Striped pink washi-tape strip (45° neon-pink / pink-soft stripes, 75% opacity). Decorative only. */
export interface WashiTapeProps {
  /** degrees; sleeves use ±34.8 */
  angle?: number;
  width?: number | string;
  height?: number;
  style?: React.CSSProperties;
  className?: string;
}
export declare function WashiTape(props: WashiTapeProps): JSX.Element;
