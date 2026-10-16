/** Page title in puffy lettering ("Idols", "Albums") with a tilted Hangul chip and a muted count line. */
export interface PuffTitleProps {
  title: string;
  ko?: string;
  count?: string;
  as?: "h1" | "h2";
  className?: string;
}
export declare function PuffTitle(props: PuffTitleProps): JSX.Element;
