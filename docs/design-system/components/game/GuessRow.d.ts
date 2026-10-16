/**
 * One guess in the Pixelated grid: pill row (correct green / incorrect red), cover chip, title + group,
 * PixelCluster, a fabric sticker on the corner, ±0.6° tilt. Text is INK (contrast fix).
 * @startingPoint section="Game" subtitle="Guess rows with stickers and tilts" viewport="700x300"
 */
export interface GuessRowProps {
  title: string;
  subtitle?: string;
  coverSrc?: string;
  coverHue?: number;
  correct: boolean;
  /** alternate left/right down a list */
  tilt?: "left" | "right";
  /** drop-in + delayed colour wash + cluster pop */
  animate?: boolean;
}
export declare function GuessRow(props: GuessRowProps): JSX.Element;
