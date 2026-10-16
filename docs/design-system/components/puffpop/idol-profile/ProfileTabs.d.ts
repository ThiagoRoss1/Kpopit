/** Idol page section tabs (Profile / Career / Status): Major Mono number + caps label + Hangul; active is pink with puffy ink text, lifted and rotated −2°. */
export interface ProfileTabsProps {
  tabs?: { id: string; label: string; ko?: string }[];
  active?: string;
  onChange?: (id: string) => void;
}
export declare function ProfileTabs(props: ProfileTabsProps): JSX.Element;
