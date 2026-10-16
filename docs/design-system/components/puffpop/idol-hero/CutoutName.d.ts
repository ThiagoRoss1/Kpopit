/** Ransom cut-out idol name: each letter a boxed tile cycling white/ink/pink/cream/light-pink, rotated and jittered; scales down with name length. */
export interface CutoutNameProps {
  name: string;
  /** idol id; shifts the colour cycle */
  seed?: number;
}
export declare function CutoutName(props: CutoutNameProps): JSX.Element;
