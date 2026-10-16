/** Removable applied-filter pill (30px, × icon), or the underlined "Clear all" link. */
export interface AppliedChipProps {
  label?: string;
  onRemove?: () => void;
  variant?: "chip" | "clear";
}
export declare function AppliedChip(props: AppliedChipProps): JSX.Element;
