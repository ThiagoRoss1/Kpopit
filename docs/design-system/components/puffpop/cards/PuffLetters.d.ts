/** Stacked puffy lettering (white face, ink stroke, pink body) whose depth animates with translate3d. */
export interface PuffLettersProps {
  text: string;
  /** rest [1.6,2.2] · hover [2.6,3.4] · press [0.6,0.8] */
  state?: "rest" | "hover" | "press";
  depth?: [number, number];
  className?: string;
}
export declare function PuffLetters(props: PuffLettersProps): JSX.Element;
