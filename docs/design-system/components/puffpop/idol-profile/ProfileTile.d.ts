/** Fact tile for the idol profile panel: black skewed label tab, puffy white value, pink hatching corner; supports flags and position chips. */
export interface ProfileTileProps {
  label: string;
  value?: string;
  sub?: string;
  /** value at --fk (30px) instead of --fv (20px) */
  big?: boolean;
  flags?: { src: string; label?: string }[];
  chips?: { label: string; sub?: string }[];
  /** grid span key: "6" | "4" | "3" | "2" | "2w" */
  span?: string;
  subKorean?: boolean;
  index?: number;
  chipOffset?: number;
}
export declare function ProfileTile(props: ProfileTileProps): JSX.Element;
