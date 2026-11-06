import { Atom, Braces, Check, Database, FlaskConical, SquareTerminal, Zap, ArrowUpRight, ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import PageShell from "../../components/PageShell/PageShell";
import { PressAnchor, PressLink } from "../../components/buttons/PressButton";
import { IndexChips, SideIndex } from "../../components/PageShell/SideIndex";
import BrandIcon from "../../components/BrandIcon/BrandIcon";
import PageMeta from "../../components/Seo/PageMeta";
import { useScrollSpy } from "../../hooks/useScrollSpy";
import { CHANNELS } from "../../data/contact";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { cn } from "../../lib/utils";
import "./about.css";

const SECTIONS = [
    { id: "what", label: "What is KpopIt" },
    { id: "who", label: "Who makes it" },
    { id: "data", label: "Game data" },
    { id: "inspiration", label: "Inspiration" },
    { id: "next", label: "What's next" },
    { id: "contact", label: "Contact" },
];

const DATA_LINKS = [
    {
        label: "Idols",
        korean: "아이돌",
        text: "Idols, groups and companies",
        to: "/idols",
        ground: "bg-[#FF8AC4]",
        images: ["karina", "kazuha", "winter", "sakura"].map((name) => `/images/idols/${name}.webp`),
    },
    {
        label: "Albums",
        korean: "앨범",
        text: "Every album in the game",
        to: "/albums",
        ground: "bg-[#FFE3F1]",
        images: ["after_like", "fearless", "antifragile", "after_like"].map((name) => `/images/albums/${name}.webp`),
    },
];

const TODO: [string, boolean][] = [
    ["A dedicated page for idols", true],
    ["A new game mode: guess an idol by their blurred face card", true],
    ["More K-pop groups and idols", false],
    ["And more!", false],
];

const STACK: { label: string; items: [string, LucideIcon][] }[] = [
    { label: "FRONTEND", items: [["React", Atom], ["Vite", Zap], ["TypeScript", Braces]] },
    { label: "BACKEND", items: [["Python", SquareTerminal], ["Flask", FlaskConical]] },
    { label: "DATABASE", items: [["PostgreSQL", Database]] },
];

const INSPIRATIONS = [
    ["Onepiecedle", "https://onepiecedle.net/"],
    ["Kpople", "https://www.kpople.net/"],
];

const PARAGRAPH = "m-0 font-normal text-base leading-[1.65] text-pretty";

// An arrow inside a link button that nudges out when the button is hovered.
const NUDGE_ARROW = "transition-[translate] duration-400 ease-(--ease-pop) will-change-transform group-hover/link:translate-x-0.75";
const NUDGE_ARROW_UP = "transition-[translate] duration-400 ease-(--ease-pop) will-change-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5";

interface SectionProps {
    id: string;
    number: number;
    title: string;
    children: ReactNode;
    className?: string;
}

const Section = ({ id, number, title, children, className }: SectionProps) => {
    return (
        <section id={id} aria-labelledby={`${id}-title`} className={cn("flex flex-col gap-3 scroll-mt-24", className)}>
            <h2 id={`${id}-title`} className="m-0 font-semibold text-xs tracking-[.14em] text-(--group)">
                {`${String(number).padStart(2, "0")} · ${title.toUpperCase()}`}
            </h2>
            {children}
        </section>
    );
};

const Rule = () => <div aria-hidden className="h-0.5 bg-[repeating-linear-gradient(90deg,var(--rule)_0_8px,transparent_8px_14px)]" />;

const About = () => {
    const { active, jumpTo } = useScrollSpy(SECTIONS.map((section) => section.id));

    return (
        <>
            <PageMeta
                title="About KpopIt: the daily K-pop idol guessing game"
                description="KpopIt is a free Wordle-inspired daily K-pop game made by a fan: guess the idol in Classic and Blurry, the album in Pixelated. Who makes it and how to reach..."
                path="/about"
            />

            <PageShell header={{ title: "About", korean: "소개", subtitle: "The daily K-pop idol guessing game, made by a fan for fans." }} width="max-w-260">
                <div className="grid grid-cols-[220px_minmax(0,1fr)] @max-[901px]:grid-cols-1 items-start gap-8 mt-8.5">
                    <SideIndex items={SECTIONS} active={active} onPick={jumpTo} />

                    <div className="flex flex-col gap-4 min-w-0">
                        <IndexChips items={SECTIONS} active={active} onPick={jumpTo} />

                        <article
                            className={cn(
                                "pp-enter [--pp-delay:200ms] relative flex flex-col gap-7",
                                "pt-9 pr-11 pb-10 pl-16 @max-[581px]:pt-5.5 @max-[581px]:pr-4.5 @max-[581px]:pb-6.5 @max-[581px]:pl-8.5",
                                "rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-(--card-depth)",
                            )}
                        >
                            {/* The notebook margin line */}
                            <span aria-hidden className="absolute left-9.5 @max-[581px]:left-4.5 inset-y-0 w-0.5 bg-[rgba(255,51,153,.45)]" />

                            <div className="grid grid-cols-[minmax(0,1fr)_210px] @max-[581px]:grid-cols-1 items-start gap-7">
                                <Section id="what" number={1} title="What is KpopIt">
                                    <div className="flex flex-col gap-3">
                                        <p className={PARAGRAPH}>KpopIt is a <b>daily idol guessing game</b>. It's a Wordle-inspired project made for K-pop fans.</p>

                                        <p className={PARAGRAPH}>
                                            Every day there's a new idol to find in Classic, a blurry photo in Blurry and a pixelated album cover in Pixelated.
                                            Everyone gets the same answer, and a new one arrives at midnight.
                                        </p>

                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {(["classic", "blurry", "pixelated"] as const).map((mode) => (
                                                <PressLink
                                                    key={mode}
                                                    to={mode === "classic" ? "/how-to-play" : `/how-to-play?mode=${mode}`}
                                                    size="sm"
                                                    className="group/link h-9.5 text-[13px]"
                                                >
                                                    {`How ${mode[0].toUpperCase()}${mode.slice(1)} works`}
                                                    <ArrowRight className={cn("size-3", NUDGE_ARROW)} strokeWidth={3} aria-hidden />
                                                </PressLink>
                                            ))}
                                        </div>
                                    </div>
                                </Section>

                                <figure
                                    className={cn(
                                        "group/photo relative m-0 rotate-2 @max-[581px]:max-w-55 @max-[581px]:justify-self-center",
                                        "transition-[translate,rotate] duration-550 ease-(--ease-settle) will-change-transform",
                                        "hover:-translate-y-0.75 hover:rotate-0",
                                    )}
                                >
                                    <div className="aspect-square overflow-hidden rounded-[18px] border-[2.5px] border-[#1A1418] bg-[#DCD6D2] shadow-[4px_5px_0_var(--ctl-off)]">
                                        <img
                                            draggable={false}
                                            src={resolveCdnUrl("/images/idols/chaewon.webp") ?? ""}
                                            alt="A blurred idol photo, like in Blurry mode"
                                            className={cn(
                                                "block size-full object-cover scale-112 blur-[9px] grayscale-55",
                                                "transition-[filter] duration-600 ease-(--ease-settle)",
                                                "group-hover/photo:blur-[5px] group-hover/photo:grayscale-30",
                                            )}
                                        />
                                    </div>

                                    <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center font-bold text-[92px] leading-none text-white text-shadow-(--puff-title)">
                                        ?
                                    </span>

                                    <figcaption
                                        className={cn(
                                            "absolute left-1/2 -bottom-3.5 -translate-x-1/2 -rotate-3 px-3 py-1.25 rounded-full whitespace-nowrap",
                                            "border-2 border-[#1A1418] bg-[#FFFDFA] shadow-[2px_3px_0_#1A1418]",
                                            "font-bold text-xs text-[#1A1418]",
                                        )}
                                    >
                                        Who is it?
                                    </figcaption>
                                </figure>
                            </div>

                            <Rule />

                            <Section id="who" number={2} title="Who makes it">
                                <p className={PARAGRAPH}>
                                    KpopIt was created by{" "}
                                    <a
                                        href={CHANNELS.github.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                            "pp-focus font-bold text-(--group)",
                                            "underline decoration-2 decoration-(--side) underline-offset-4",
                                            "transition-[color,text-decoration-color] duration-300 hover:text-(--sig) hover:decoration-current",
                                        )}
                                    >
                                        ThiagoRoss1
                                    </a>
                                    , a K-pop fan and Computer Science student.
                                </p>

                                <p className={PARAGRAPH}>
                                    I originally started this project as a simple guessing game. But as development went on, I got more and more excited and
                                    started adding new features. I haven't been able to include everything I had planned yet, but I'm really proud of what
                                    I've accomplished so far.
                                </p>
                            </Section>

                            <Rule />

                            <Section id="data" number={3} title="Game data">
                                <p className={PARAGRAPH}>Want to browse the KpopIt database? Check out the idols, groups, companies and albums here.</p>

                                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                                    {DATA_LINKS.map((link) => (
                                        <PressLink key={link.label} to={link.to} className="group/link justify-start gap-3.5 h-auto py-3 pr-4 pl-3 rounded-[18px]">
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    "relative flex-none size-15 overflow-hidden rounded-[15px] -rotate-3",
                                                    "border-2 border-[#1A1418] shadow-[2px_3px_0_#1A1418]",
                                                    "transition-[rotate,scale] duration-400 ease-(--ease-pop) will-change-transform",
                                                    "group-hover/link:rotate-0 group-hover/link:scale-105",
                                                    link.ground,
                                                )}
                                            >
                                                {link.images.map((src, i) => (
                                                    <img
                                                        draggable={false}
                                                        key={i}
                                                        src={resolveCdnUrl(src) ?? ""}
                                                        alt=""
                                                        loading="lazy"
                                                        className="about-crossfade-image absolute inset-0 size-full object-cover"
                                                        style={{ animationDelay: `${i * 3}s` }}
                                                    />
                                                ))}
                                            </span>

                                            <span className="flex flex-col flex-1 gap-0.5 text-left">
                                                <span className="flex items-baseline gap-2">
                                                    <span className="font-bold text-base">{link.label}</span>
                                                    <span lang="ko" className="font-korean font-bold text-[11px] text-(--muted)">{link.korean}</span>
                                                </span>

                                                <span className="font-medium text-xs text-(--muted) whitespace-normal">{link.text}</span>
                                            </span>

                                            <ArrowRight className={cn("flex-none size-4", NUDGE_ARROW)} strokeWidth={3} aria-hidden />
                                        </PressLink>
                                    ))}
                                </div>
                            </Section>

                            <Rule />

                            <Section id="inspiration" number={4} title="Inspiration">
                                <p className={PARAGRAPH}>
                                    I initially drew inspiration from several word-guessing games and wanted to create something based on that concept.
                                    Then I thought: why not make a Wordle-like game for K-pop fans?
                                </p>

                                <p className={PARAGRAPH}>
                                    During development, I discovered other K-pop guessing games and took inspiration from them as well. The games that
                                    inspired me the most were:
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    {INSPIRATIONS.map(([name, href]) => (
                                        <PressAnchor key={name} href={href} size="sm" className="group/link h-9.5 text-[13px]">
                                            {name}
                                            <ArrowUpRight className={cn("size-3", NUDGE_ARROW_UP)} strokeWidth={3} aria-hidden />
                                        </PressAnchor>
                                    ))}
                                </div>
                            </Section>

                            <Rule />

                            <Section id="next" number={5} title="What's next">
                                <p className={PARAGRAPH}>I plan to keep working on this project and adding new updates. Here's the list so far:</p>

                                <ul className="flex flex-col gap-2 m-0 p-0 list-none">
                                    {TODO.map(([text, isDone]) => (
                                        <li key={text} className="flex items-center gap-3">
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    "grid place-items-center flex-none size-5.5 rounded-[7px] border-2 border-(--ink) text-[#1A1418]",
                                                    isDone ? "bg-[#FF8AC4]" : "bg-(--chip)",
                                                )}
                                            >
                                                {isDone && <Check className="size-3" strokeWidth={4} />}
                                            </span>

                                            <span
                                                className={cn(
                                                    "font-normal text-[15.5px] leading-normal",
                                                    isDone ? "text-(--muted) line-through decoration-(--side) decoration-2" : "text-(--face-ink)",
                                                )}
                                            >
                                                {text}
                                                {isDone && <span className="sr-only"> (done)</span>}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="flex flex-col gap-2 mt-1.5">
                                    <span className="font-semibold text-[10px] tracking-[.14em] text-(--muted)">BUILT WITH</span>

                                    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
                                        {STACK.map((layer) => (
                                            <div
                                                key={layer.label}
                                                className={cn(
                                                    "flex flex-col gap-2.5 pt-3 px-3.5 pb-3.5 rounded-2xl",
                                                    "border-2 border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
                                                )}
                                            >
                                                <span className="font-semibold text-[10px] tracking-[.14em] text-(--muted)">{layer.label}</span>

                                                {layer.items.map(([tool, Icon]) => (
                                                    <span key={tool} className="group/tool flex items-center gap-2.5 font-bold text-[14.5px]">
                                                        <span
                                                            className={cn(
                                                                "grid place-items-center flex-none size-8.5 rounded-[11px]",
                                                                "border-2 border-[#1A1418] bg-white text-[#1A1418] shadow-[1.5px_2px_0_#1A1418]",
                                                                "transition-[rotate,scale] duration-450 ease-(--ease-pop) will-change-transform",
                                                                "group-hover/tool:-rotate-8 group-hover/tool:scale-110",
                                                            )}
                                                        >
                                                            <Icon className="size-4.5" strokeWidth={2.4} aria-hidden />
                                                        </span>
                                                        {tool}
                                                    </span>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Section>

                            <Rule />

                            <Section id="contact" number={6} title="Contact">
                                <p className={PARAGRAPH}>Feel free to DM me if you have any questions, feedback or suggestions!</p>

                                <div className="flex flex-wrap gap-2.5">
                                    {(["discord", "x", "github"] as const).map((id) => (
                                        <PressAnchor key={id} href={CHANNELS[id].href} className="h-11.5 pl-2 pr-4.5">
                                            <span className="grid place-items-center flex-none size-7 rounded-full border-2 border-[#1A1418] bg-white">
                                                <BrandIcon name={id} className="size-3.75" />
                                            </span>
                                            {CHANNELS[id].handle}
                                        </PressAnchor>
                                    ))}

                                    <PressLink to="/contact" className="group/link h-11.5 px-4.5">
                                        Contact page
                                        <ArrowRight className={cn("size-3.5", NUDGE_ARROW)} strokeWidth={3} aria-hidden />
                                    </PressLink>
                                </div>
                            </Section>

                            <div className="flex flex-col items-center gap-2.5 pt-4.5 border-t-2 border-(--rule) text-center">
                                <p className="m-0 max-w-130 font-normal text-[15px] leading-[1.65] text-(--muted) text-pretty">
                                    I've learned a lot about web development and K-pop along the way, and I'm excited to see this project grow.
                                    I hope you enjoy playing it as much as I enjoyed making it!
                                </p>

                                <span className="flex items-center gap-2.5 -rotate-2">
                                    <span className="font-caveat font-bold text-[30px] leading-[1.1] text-(--group)">Thank you for playing KpopIt!</span>
                                    <span aria-hidden className="text-[34px] leading-none">💜</span>
                                </span>
                            </div>
                        </article>
                    </div>
                </div>
            </PageShell>
        </>
    );
};

export default About;
