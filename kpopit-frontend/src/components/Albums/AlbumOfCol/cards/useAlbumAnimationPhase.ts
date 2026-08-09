import { useState, type CSSProperties } from 'react';
import { isSafariAlbumEngine } from '../../../../hooks/useIsDevice';
import { animationPhaseStyleAt } from './albumAnimationPhase';

export { animationDelayAt, animationPhaseStyleAt } from './albumAnimationPhase';

/**
 * Make independently mounted page/card clones share the document clock.
 * A negative CSS delay starts each animation as though it had existed since
 * time zero, without mutating WebKit's Animation objects after promotion.
 */
export function useAlbumAnimationPhase(): CSSProperties {
    const [phaseStyle] = useState<CSSProperties>(() => animationPhaseStyleAt(performance.now(), isSafariAlbumEngine));
    return phaseStyle;
}
