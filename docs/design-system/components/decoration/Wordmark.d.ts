/** Live-type wordmark: first part pink gradient, second part white→cream gradient, stacked ink drop-shadows. "KpopIt", "PixelIt", "BlurryIt"… */
export interface WordmarkProps {
  /** pink half, default "Kpop" */
  first?: string;
  /** cream half, default "It" */
  second?: string;
  size?: "sm" | "md" | "lg";
  /** use the logo-pink → logo-coral gradient (main brand) instead of neon-pink */
  brand?: boolean;
  as?: "h1" | "h2" | "div" | "span";
  className?: string;
}
export declare function Wordmark(props: WordmarkProps): JSX.Element;
