/**
 * The raised paper surface. Every raised surface = ink border + SOLID offset shadow.
 * card (16px, 2px, 4px offset) · feature (20px, 2.5px, 6px offset — hero/collection cards) ·
 * paper (warm white, modal body) · sunken (14px progress box) · cream (24px victory card).
 * @startingPoint section="Surfaces" subtitle="Ink-outlined cards with solid offsets" viewport="700x300"
 */
export interface PanelProps {
  variant?: "card" | "feature" | "paper" | "sunken" | "cream";
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}
export declare function Panel(props: PanelProps): JSX.Element;
