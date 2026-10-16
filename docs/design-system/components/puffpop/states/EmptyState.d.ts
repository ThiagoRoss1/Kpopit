/** Catalogue states: empty / error (puffy title, muted line, pink press button) and loading (dashed skeleton grid). */
export interface EmptyStateProps {
  kind?: "empty" | "error" | "loading";
  title?: string;
  body?: string;
  cta?: string;
  onAction?: () => void;
  skeletons?: number;
}
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
