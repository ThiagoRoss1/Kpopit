/** Related idol card: square photo + puffy name only, alternating ±1.2°, lifts −8px with a pink shadow on hover. */
export interface RelatedCardProps {
  name: string;
  img: string;
  index?: number;
  onClick?: () => void;
  aria?: string;
}
export declare function RelatedCard(props: RelatedCardProps): JSX.Element;
