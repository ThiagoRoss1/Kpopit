/** Dropdown panel for FilterButton: dashed caps header with option count, 42px options with count badges, pink scrollbar, auto left/center/right placement. */
export interface FilterMenuProps {
  open?: boolean;
  title: string;
  sub?: string;
  options: { label: string; value: string; count?: number; flagSrc?: string; iconSrc?: string; selected?: boolean }[];
  onSelect?: (value: string, option: any) => void;
  /** omit to measure against the nearest .pp-page */
  side?: "left" | "center" | "right";
}
export declare function FilterMenu(props: FilterMenuProps): JSX.Element;
