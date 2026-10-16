/**
 * Square-ish icon-only button. pink = 44px stats button (rounded-2xl, press-down);
 * circle = 48px pink circle (share to X); round = 36px paper close button with offset;
 * toggle = 40px white header toggle (theme / FX) with 3px drop.
 */
export interface IconButtonProps {
  variant?: "pink" | "circle" | "round" | "toggle";
  /** accessible name — required */
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children: React.ReactNode;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
