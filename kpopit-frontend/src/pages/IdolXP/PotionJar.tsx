import { useId } from "react";

const FLASK = "M24 18V31A23.4 23.4 0 1 0 40 31V18Z";

/** Placeholder potion jar (until the real asset exists); `fill` is 0..1. */
export default function PotionJar({ fill, className }: { fill: number; className?: string }) {
    const clip = useId();
    return (
        <svg aria-hidden viewBox="0 0 64 82" className={className} style={{ overflow: "visible" }}>
            <defs><clipPath id={clip}><path d={FLASK} /></clipPath></defs>
            <path d={FLASK} transform="translate(3 4)" fill="#1A1418" />
            <path d={FLASK} fill="#FFFDFA" />
            <g clipPath={`url(#${clip})`}>
                <rect className="xp-liquid" x="0" y="0" width="64" height="82" fill="#FF8AC4" style={{ transform: `scaleY(${fill})` }} />
                <circle className="xp-bubble" cx="26" cy="68" r="3" fill="#FFFFFF" />
                <circle className="xp-bubble" cx="38" cy="70" r="2.2" fill="#FFFFFF" style={{ animationDelay: "1.1s" }} />
            </g>
            <path d={FLASK} fill="none" stroke="#1A1418" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M17 44a16 16 0 0 1 7-8" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity=".9" />
            <rect x="21" y="14" width="22" height="6" rx="2.5" fill="#FFFDFA" stroke="#1A1418" strokeWidth="2" />
            <rect x="23.5" y="3" width="17" height="12" rx="3" fill="#C9A27A" stroke="#1A1418" strokeWidth="2" />
        </svg>
    );
}
