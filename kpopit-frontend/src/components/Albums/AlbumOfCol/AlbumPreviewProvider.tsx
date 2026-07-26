import type { ReactNode } from 'react';
import { AlbumPreviewContext } from './albumPreview';

/** Marks the subtree as a lightweight thumbnail render — real page nodes read
    this to skip textures, photos and animated fills instead of taking props. */
export function AlbumPreviewProvider({ children }: { children: ReactNode }) {
    return <AlbumPreviewContext.Provider value={true}>{children}</AlbumPreviewContext.Provider>;
}
