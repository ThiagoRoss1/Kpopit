/** Upcoming / themed album card: mini book cover with spine, tag eyebrow, title, description, "Coming soon" lock footer. */
export interface ThemedCardProps {
  title: string;
  group?: string;
  description?: string;
  tag?: string;
  stickers?: number;
  /** cover hue (oklch) */
  hue?: number;
  /** word printed on the mini book */
  cap?: string;
  locked?: boolean;
}
export declare function ThemedCard(props: ThemedCardProps): JSX.Element;
