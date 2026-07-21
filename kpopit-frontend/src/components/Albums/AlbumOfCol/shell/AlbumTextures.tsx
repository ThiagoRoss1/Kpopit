/** Shared texture layers for the AlbumOfCol component. */
import lightsTextureSrc from '../../../../assets/materials/AlbumOfCol/lightstexture.jpg';
import grainParticlesSrc from '../../../../assets/materials/AlbumOfCol/particlestexture.jpg';
import paperSrc from '../../../../assets/materials/AlbumOfCol/papertexture.jpg';

interface TextureProps {
    className?: string;
}

/** Two stacked cesira lighting passes (screen blend), full-bleed */
export function TextureLighting({ className = '' }: TextureProps) {
    return (
        <>
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
