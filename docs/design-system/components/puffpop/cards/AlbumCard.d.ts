/** Puff Pop album tile: same shell as IdolCard, vinyl cover that slides out and spins on hover, pink year sticker, light sweep, JP/EN release tag. */
export interface AlbumCardProps {
  name: string;
  artist: string;
  /** short type: "Mini", "Studio", "Single", "Repackage" */
  type?: string;
  year?: string | number;
  img: string;
  /** non-Korean releases get a tag */
  lang?: "Korean" | "Japanese" | "English";
  tag?: string;
  index?: number;
  delay?: string;
  onClick?: () => void;
  className?: string;
}
export declare function AlbumCard(props: AlbumCardProps): JSX.Element;
