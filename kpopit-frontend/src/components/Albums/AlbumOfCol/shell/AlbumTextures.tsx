/** Shared texture layers for the AlbumOfCol component. */
import { useFx } from '../../../../pages/Collection/useCollectionFx';
import { useAlbumPreview } from '../albumPreview';
import lightsTextureSrc from '../../../../assets/materials/AlbumOfCol/lightstexture.jpg';
import lightsTextureSmallSrc from '../../../../assets/materials/AlbumOfCol/lightstexture-600w.jpg';
import grainParticlesSrc from '../../../../assets/materials/AlbumOfCol/particlestexture.jpg';
import grainParticlesSmallSrc from '../../../../assets/materials/AlbumOfCol/particlestexture-600w.jpg';
import paperSrc from '../../../../assets/materials/AlbumOfCol/papertexture.jpg';
import paperSmallSrc from '../../../../assets/materials/AlbumOfCol/papertexture-800w.jpg';

interface TextureProps {
    className?: string;
}

const TEXTURE_SIZES = '(max-width: 1023px) 170px, 810px';
const PAPER_SIZES = '(max-width: 640px) 260px, (max-width: 1023px) 75vw, 1283px';

/** Two stacked cesira lighting passes (screen blend), full-bleed */
export function TextureLighting({ className = '' }: TextureProps) {
    const on = useFx('textures');

    const preview = useAlbumPreview();
    if (!on || preview) return null;

    return (
        <img
            src={lightsTextureSrc}
            srcSet={`${lightsTextureSmallSrc} 600w, ${lightsTextureSrc} 1200w`}
            sizes={TEXTURE_SIZES}
            alt=""
            aria-hidden
            decoding="async"
            className={`pointer-events-none absolute inset-0 size-full object-cover mix-blend-screen ${className}`}
        />
    );
}

/** Particle texture for cover-style pages (multiply) */
export function GrainParticles({ className = '' }: TextureProps) {
    const on = useFx('textures');
    const preview = useAlbumPreview();
    if (!on || preview) return null;

    return (
        <img
            src={grainParticlesSrc}
            srcSet={`${grainParticlesSmallSrc} 600w, ${grainParticlesSrc} 1200w`}
            sizes={TEXTURE_SIZES}
            alt=""
            aria-hidden
            decoding="async"
            className={`pointer-events-none absolute inset-0 size-full object-cover mix-blend-multiply ${className}`}
        />
    );
}

/** Paper grain for content pages */
export function PaperGrain({ className = '' }: TextureProps) {
    const on = useFx('textures');

    const preview = useAlbumPreview();
    if (!on || preview) return null;

    return (
        <img
            src={paperSrc}
            srcSet={`${paperSmallSrc} 800w, ${paperSrc} 1086w`}
            sizes={PAPER_SIZES}
            alt=""
            aria-hidden
            decoding="async"
            className={`pointer-events-none absolute left-1/2 top-1/2 h-322.5 w-237.5 max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90 object-cover mix-blend-multiply ${className}`}
        />
    );
}

/** Hardcover inset frame shadow, painted last on cover-style pages */
export function CoverInsetShadow() {
    return (
        <div aria-hidden className="album-cover-inset pointer-events-none absolute inset-0 shadow-[inset_0px_4px_6px_0px_rgba(0,0,0,0.6),inset_-4px_-4px_6px_0px_rgba(0,0,0,0.6)]" />
    );
}
