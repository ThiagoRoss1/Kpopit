import { Link } from "react-router";
import PageShell from "../../components/PageShell/PageShell";
import { PressLink } from "../../components/buttons/PressButton";
import PageMeta from "../../components/Seo/PageMeta";
import { useFeatures } from "../../hooks/useFeatures";
import { cn } from "../../lib/utils";
import "./notFound.css";

// The card's feedback row: three misses and one partial, like a lost game.
const TILE_COLORS = ["#FD5C63", "#FD5C63", "#F3E563", "#FD5C63"];

const QUICK_LINKS = [
    { label: "All idols", to: "/idols" },
    { label: "All albums", to: "/albums" },
    { label: "How to play", to: "/how-to-play" },
    { label: "FAQ", to: "/faq" },
];

/** Unknown paths and disabled features. */
const NotFound = () => {
    const { features } = useFeatures();

    return (
        <>
            <PageMeta
                title="Page not found | KpopIt"
                description="This page doesn't exist on KpopIt. Today's idols are still waiting for you."
                path="/404"
                noindex
            />

            <PageShell width="max-w-260">
                <div
                    className={cn(
                        "grid grid-cols-[minmax(0,1fr)_minmax(0,380px)] content-center items-center gap-14",
                        "min-h-[min(760px,calc(100svh-150px))] @max-[581px]:min-h-[min(620px,calc(100svh-120px))]",
                        "@max-[901px]:grid-cols-1 @max-[901px]:justify-items-center @max-[901px]:gap-10 @max-[901px]:text-center",
                    )}
                >
                    <div className="pp-enter [--pp-anim:puffSide] [--pp-delay:80ms] flex flex-col @max-[901px]:items-center gap-4.5">
                        <h1 className="puff-ink m-0 px-2 pb-3 font-bold text-[150px] @max-[581px]:text-[104px] leading-[.9] text-white text-shadow-(--puff-xl) -rotate-3">
                            404
                        </h1>

                        <p className="m-0 font-bold text-[30px] leading-[1.15] text-balance">This page got lost backstage...</p>

                        <p className="m-0 max-w-115 font-medium text-base/normal text-(--muted) text-pretty">
                            The link may be old or mistyped. Today's idols are still waiting for you.
                        </p>

                        <div className="flex flex-wrap @max-[901px]:justify-center gap-3 mt-1.5">
                            <PressLink to="/" variant="cta" size="lg">Play today's game</PressLink>
                            {features.calendar && <PressLink to="/calendar" size="lg">Calendar</PressLink>}
                        </div>

                        <nav aria-label="Quick links" className="flex flex-wrap @max-[901px]:justify-center gap-4.5 mt-1.5 font-semibold text-sm">
                            {QUICK_LINKS.map((link) => (
                                <Link key={link.to} to={link.to} className="pp-focus text-(--group) hover:text-(--sig)">{link.label}</Link>
                            ))}
                        </nav>
                    </div>

                    <div
                        aria-hidden
                        className={cn(
                            "pp-enter [--pp-delay:200ms] relative @max-[581px]:hidden w-full max-w-95 rotate-3",
                            "transition-[translate,rotate] duration-600 ease-(--ease-settle) will-change-transform",
                            "hover:-translate-y-1 hover:rotate-0",
                        )}
                    >
                        <div
                            className={cn(
                                "flex flex-col gap-3 p-3.5 rounded-3xl",
                                "border-[2.5px] border-[#1A1418] bg-[#FFFDFA] shadow-[6px_6px_0_0_#FF8AC4,6px_6px_0_2.5px_#1A1418]",
                            )}
                        >
                            <div className="grid place-items-center aspect-square overflow-hidden rounded-2xl border-2 border-[#1A1418] bg-[#FFE3F1]">
                                <span className="not-found-wobble font-bold text-[150px] leading-none text-white text-shadow-(--puff-xl)">?</span>
                            </div>

                            <div className="grid grid-cols-4 gap-1.5">
                                {TILE_COLORS.map((color, i) => (
                                    <span
                                        key={i}
                                        className="not-found-tile-enter h-8.5 rounded-[10px] border-2 border-[#1A1418]"
                                        style={{ background: color, animationDelay: `${500 + i * 160}ms` }}
                                    />
                                ))}
                            </div>

                            <span className="font-semibold text-[13px] text-center text-[#6B5F66]">Page not found · 0 / 1 guessed</span>
                        </div>
                    </div>
                </div>
            </PageShell>
        </>
    );
};

export default NotFound;
