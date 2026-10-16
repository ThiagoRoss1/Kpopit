/** Victory-card stat tile: #1f1f1f plate, 24px radius, 3px neon-pink offset that collapses on hover. Use in rows of 3. */
export interface StatTileProps {
  /** image URL (white glyph from assets/icons) or node */
  icon?: string | React.ReactNode;
  value: React.ReactNode;
  /** uppercase label, e.g. "Attempts" */
  label: string;
}
export declare function StatTile(props: StatTileProps): JSX.Element;
