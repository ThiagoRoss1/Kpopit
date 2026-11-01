import { Link } from "react-router";
import PageShell from "../../components/Puff/PageShell";
import { PressLink } from "../../components/Puff/PressButton";
import PageMeta from "../../components/Seo/PageMeta";
import { useFeatures } from "../../hooks/useFeatures";
import "./notFound.css";

const TILES = ["#FD5C63", "#FD5C63", "#F3E563", "#FD5C63"];
const QUICK_LINKS = [
    { label: "All idols", to: "/idols" },
    { label: "All albums", to: "/albums" },
    { label: "How to play", to: "/how-to-play" },
    { label: "FAQ", to: "/faq" },
];

/** Unknown paths and disabled features. */
export default function NotFound() {
    const { features } = useFeatures();
    return (
        <>
            <PageMeta title="Page not found | KpopIt" description="This page doesn't exist on KpopIt. Today's idols are still waiting for you." path="/404" noindex />
            <PageShell width="max-w-[1040px]">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-14 items-center content-center min-h-[min(760px,calc(100svh-150px))] @max-[900px]:grid-cols-1 @max-[900px]:gap-10 @max-[900px]:justify-items-center @max-[900px]:text-center @max-[580px]:min-h-[min(620px,calc(100svh-120px))]">
                    <div className="pp-enter [--pp-anim:puffSide] [--pp-delay:80ms] flex flex-col gap-[18px] @max-[900px]:items-center">
                        <h1 className="m-0 font-bold text-[150px] @max-[580px]:text-[104px] leading-[.9] text-white [text-shadow:var(--puff-xl)] -rotate-3 puff-ink px-2 pb-3">404</h1>
                        <p className="m-0 font-bold text-[30px] leading-[1.15] [text-wrap:balance]">This page got lost backstage...</p>
                        <p className="m-0 max-w-[460px] font-medium text-base leading-normal text-(--muted) [text-wrap:pretty]">The link may be old or mistyped. Today's idols are still waiting for you.</p>
                        <div className="flex gap-3 flex-wrap mt-1.5 @max-[900px]:justify-center">
                            <PressLink to="/" variant="cta" size="lg">Play today's game</PressLink>
                            {features.calendar && <PressLink to="/calendar" size="lg">Calendar</PressLink>}
                        </div>
                        <nav aria-label="Quick links" className="flex gap-[18px] flex-wrap font-semibold text-sm mt-1.5 @max-[900px]:justify-center">
                            {QUICK_LINKS.map((l) => (
                                <Link key={l.to} to={l.to} className="pp-focus text-(--group) hover:text-(--sig)">{l.label}</Link>
                            ))}
                        </nav>
                    </div>
                    <div aria-hidden className="nf-card pp-enter [--pp-delay:200ms] relative w-full max-w-[380px] rotate-3 @max-[580px]:hidden">
                        <div className="rounded-[24px] border-[2.5px] border-[#1A1418] bg-[#FFFDFA] [box-shadow:6px_6px_0_0_#FF8AC4,6px_6px_0_2.5px_#1A1418] p-3.5 flex flex-col gap-3">
                            <div className="aspect-square rounded-[16px] border-2 border-[#1A1418] overflow-hidden bg-[#FFE3F1] grid place-items-center">
                                <span className="nf-q font-bold text-[150px] leading-none text-white [text-shadow:var(--puff-xl)]">?</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                                {TILES.map((bg, i) => (
                                    <span key={i} className="nf-tile h-[34px] rounded-[10px] border-2 border-[#1A1418]" style={{ background: bg, animationDelay: `${500 + i * 160}ms` }} />
                                ))}
                            </div>
                            <span className="text-center font-semibold text-[13px] text-[#6B5F66]">Page not found · 0 / 1 guessed</span>
                        </div>
                    </div>
                </div>
            </PageShell>
        </>
    );
}
