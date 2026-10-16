/**
 * Ink record sleeve with cream edge, two washi-tape corners, corner brackets on the cover and a Caveat note.
 * Tilted -4° by default. The Pixelated mode hero object.
 * @startingPoint section="Decoration" subtitle="Record sleeve + vinyl hero" viewport="700x420"
 */
export interface AlbumSleeveProps {
  coverSrc?: string;
  coverHue?: number;
  /** handwritten line under the cover; "" hides it */
  note?: string;
  /** big translucent "?" over the cover (before the first guess) */
  showQuestion?: boolean;
  tape?: boolean;
  /** degrees, default -4 */
  tilt?: number;
  width?: number | string;
  /** pixel block size hint — placeholder blurs, real images render pixelated */
  pixelBlock?: number;
  className?: string;
  style?: React.CSSProperties;
}
export declare function AlbumSleeve(props: AlbumSleeveProps): JSX.Element;
