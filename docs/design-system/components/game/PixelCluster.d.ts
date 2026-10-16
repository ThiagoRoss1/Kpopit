/** Four tilted pixel squares — the shape-cue for a result (green/correct-edge or red/incorrect-edge). Pops in staggered. */
export interface PixelClusterProps {
  ok: boolean;
  /** staggered overshoot pop-in */
  pop?: boolean;
}
export declare function PixelCluster(props: PixelClusterProps): JSX.Element;
