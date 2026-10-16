/** Catalogue filter control: dropdown (chevron), toggle (check box + count badge), optional flag; pink fill when a value is applied. */
export interface FilterButtonProps {
  label: string;
  kind?: "dropdown" | "toggle";
  active?: boolean;
  open?: boolean;
  flagSrc?: string;
  badge?: string | number;
  minWidth?: string;
  onClick?: () => void;
  /** pass a <FilterMenu> */
  children?: React.ReactNode;
  className?: string;
}
export declare function FilterButton(props: FilterButtonProps): JSX.Element;
