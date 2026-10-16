/** Sticker-granted banner. Frame climbs white (LV.1) → level-gold (LV.2) → level-holo (LV.3). */
export interface RewardBannerProps {
  level?: 1 | 2 | 3;
  /** first copy of this sticker */
  isNew?: boolean;
  /** shows the reward-yellow "Group photo unlocked!" line */
  groupPhoto?: boolean;
  linkLabel?: string;
  href?: string;
}
export declare function RewardBanner(props: RewardBannerProps): JSX.Element;
