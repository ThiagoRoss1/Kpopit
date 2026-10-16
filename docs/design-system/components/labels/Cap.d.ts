/** Uppercase tracked eyebrow / meta caption. 11px (md) or 10px (sm) DynaPuff 600 — raised from the source's 8–9px mono for legibility. */
export interface CapProps {
  tone?: "accent" | "pink" | "muted" | "faint";
  size?: "md" | "sm";
  children: React.ReactNode;
  className?: string;
}
export declare function Cap(props: CapProps): JSX.Element;
