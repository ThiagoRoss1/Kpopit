import { createContext, useContext } from 'react';

/** Split from the provider so this file exports no component: a module that
    exports both a component and a hook breaks react-refresh's fast reload. */
export const AlbumPreviewContext = createContext(false);

/** True when rendering inside a carousel thumbnail, false in the real book. */
export function useAlbumPreview(): boolean {
    return useContext(AlbumPreviewContext);
}
