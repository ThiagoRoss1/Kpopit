/** Small rounded meta chip with a 1.5px ink outline — "40 stickers", "73% complete". */
export interface PillProps {
  tone?: "paper" | "pink" | "ink";
  children: React.ReactNode;
  className?: string;
}
export declare function Pill(props: PillProps): JSX.Element;
