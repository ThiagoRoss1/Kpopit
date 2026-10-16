/**
 * The signature press-down button. Primary = neon-pink pill with a solid 4px ink drop that sinks on press.
 * Outline = transparent, 12px radius, 3px offset, Major Mono Display label (modal footers, secondary actions).
 * @startingPoint section="Actions" subtitle="Press-down pink pill + mono outline button" viewport="700x260"
 */
export interface PressButtonProps {
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
  /** full-width */
  block?: boolean;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
  className?: string;
  children?: React.ReactNode;
}
export declare function PressButton(props: PressButtonProps): JSX.Element;
