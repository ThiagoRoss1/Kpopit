/** Puff Pop top bar: tilted K logo + "· idols" word, text pills (active one filled pink), round day/night toggle. */
export interface PuffNavProps {
  word?: string;
  logoSrc?: string;
  logoHref?: string;
  onLogoClick?: (e: any) => void;
  items?: { label: string; active?: boolean; onClick?: () => void }[];
  theme?: "day" | "night";
  onToggleTheme?: () => void;
  /** 88px tall (idol page) instead of 112px */
  compact?: boolean;
  className?: string;
}
export declare function PuffNav(props: PuffNavProps): JSX.Element;
