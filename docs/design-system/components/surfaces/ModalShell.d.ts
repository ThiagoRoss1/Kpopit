/**
 * Modal: blurred scrim + paper panel (20px radius, 6px offset) + Major Mono Display title + round close.
 * Scales in from 0.85 over 0.3s.
 * @startingPoint section="Surfaces" subtitle="Paper modal with mono title" viewport="700x420"
 */
export interface ModalShellProps {
  eyebrow?: string;
  /** rendered UPPERCASE in Major Mono Display */
  title: string;
  onClose?: () => void;
  /** render in-flow instead of fixed (for previews) */
  inline?: boolean;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}
export declare function ModalShell(props: ModalShellProps): JSX.Element;
