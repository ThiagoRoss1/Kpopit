/** Puff Pop idol tile for the Idols catalogue: pink side body, white face, photo well, flags, puffy name, group · company, optional "In album" tag.
 * @startingPoint section="Puff Pop" subtitle="Idol catalogue tile" viewport="700x380" */
export interface IdolCardProps {
  name: string;
  group?: string | null;
  company?: string;
  img: string;
  flags?: { src: string; label?: string }[];
  inAlbum?: boolean;
  /** grid position; drives alternating ±0.5° tilt and entrance stagger */
  index?: number;
  delay?: string;
  onClick?: () => void;
  className?: string;
}
export declare function IdolCard(props: IdolCardProps): JSX.Element;
