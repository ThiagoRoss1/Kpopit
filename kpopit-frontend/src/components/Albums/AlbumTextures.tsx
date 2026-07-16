// Album 1 Collection — shared texture layers (see COLLECTION_UI_IMPLEMENTATION.md §11).
// cesira  → lighting effect, two instances (screen blend per the Figma frames)
// selina  → particle effect, cover-style pages only (multiply)
// paper   → paper grain (image-1783996137578), content pages (multiply)
//
// The optional className (e.g. a z-index) is applied to the blended <img> elements
// themselves — wrapping them in a z-indexed container would create a stacking
// context and isolate the blend from the page beneath it.

import lightsTextureSrc from '../../assets/albumref/materials/cesira-alvarado-br4yAXkSuvs-unsplash.jpg';
import grainParticlesSrc from '../../assets/albumref/materials/selina-farzaei--cJjkNo8r7k-unsplash.jpg';
import paperSrc from '../../assets/albumref/materials/image-1783996137578.jpg';

interface TextureProps {
    className?: string;
}

/** Two stacked cesira lighting passes (screen blend), full-bleed */
export function CesiraLighting({ className = '' }: TextureProps) {
    return (
        <>
            <img src={lightsTextureSrc} alt="" aria-hidden className={`pointer-events-none absolute inset-0 size-full object-cover mix-blend-screen ${className}`} />
            <img src={lightsTextureSrc} alt="" aria-hidden className={`pointer-events-none absolute inset-0 size-full object-cover mix-blend-screen ${className}`} />
        </>
    );
}

/** Particle texture for cover-style pages (multiply) */
export function GrainParticles({ className = '' }: TextureProps) {
    return (
        <img src={grainParticlesSrc} alt="" aria-hidden className={`pointer-events-none absolute inset-0 size-full object-cover mix-blend-multiply ${className}`} />
    );
}

/** Paper grain for content pages (multiply, rotated like the Figma frames) */
export function PaperGrain({ className = '' }: TextureProps) {
    return (
        <img
            src={paperSrc}
            alt=""
            aria-hidden
            className={`pointer-events-none absolute left-1/2 top-1/2 h-322.5 w-237.5 max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90 object-cover mix-blend-multiply ${className}`}
        />
    );
}

/** Hardcover inset frame shadow, painted last on cover-style pages */
export function CoverInsetShadow() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0px_4px_6px_0px_rgba(0,0,0,0.6),inset_-4px_-4px_6px_0px_rgba(0,0,0,0.6)]" />
    );
}
