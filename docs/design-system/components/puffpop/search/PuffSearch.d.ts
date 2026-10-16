/** Primary catalogue search field: 50px, radius 18, full ink offset that grows on focus; icon tilts, clear button spins in. */
export interface PuffSearchProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}
export declare function PuffSearch(props: PuffSearchProps): JSX.Element;
