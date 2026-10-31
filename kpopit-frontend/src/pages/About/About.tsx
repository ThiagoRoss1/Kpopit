import { Check, Code2, Database, Server, ArrowUpRight, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import PageShell from "../../components/Puff/PageShell";
import { PressAnchor, PressLink } from "../../components/Puff/PressButton";
import { IndexChips, SideIndex } from "../../components/Puff/SideIndex";
import BrandIcon from "../../components/Puff/BrandIcon";
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
    { label: "Idols", ko: "아이돌", text: "Idols, groups and companies", to: "/idols", bg: "#FF8AC4", images: ["karina", "kazuha", "winter", "sakura"].map((n) => `/images/idols/${n}.webp`) },
    { label: "Albums", ko: "앨범", text: "Every album in the game", to: "/albums", bg: "#FFE3F1", images: ["after_like", "fearless", "antifragile", "after_like"].map((n) => `/images/albums/${n}.webp`) },
];

const TODO: [string, boolean][] = [
    ["A dedicated page for idols", true],
    ["A new game mode: guess an idol by their blurred face card", true],
    ["More K-pop groups and idols", false],
    ["And more!", false],
];

const STACK = [
    { label: "FRONTEND", Icon: Code2, items: ["React", "Vite", "TypeScript"] },
    { label: "BACKEND", Icon: Server, items: ["Python", "Flask"] },
    { label: "DATABASE", Icon: Database, items: ["PostgreSQL"] },
];

const P = "m-0 font-normal text-base leading-[1.65] [text-wrap:pretty]";

function Section({ id, n, title, children, className }: { id: string; n: number; title: string; children: ReactNode; className?: string }) {
    return (
        <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24 flex flex-col gap-3", className)}>
            <h2 id={`${id}-title`} className="m-0 font-semibold text-xs tracking-[.14em] text-(--group)">{`${String(n).padStart(2, "0")} · ${title.toUpperCase()}`}</h2>
            {children}
        </section>
    );
}

const Rule = () => <div aria-hidden className="h-0.5 bg-[repeating-linear-gradient(90deg,var(--rule)_0_8px,transparent_8px_14px)]" />;

export default function About() {
    const { active, jumpTo } = useScrollSpy(SECTIONS.map((s) => s.id));

    return (
        <>
            <PageMeta
                title="About KpopIt: the daily K-pop idol guessing game"
                description="KpopIt is a free Wordle-inspired daily K-pop game made by a fan: guess the idol in Classic and Blurry, the album in Pixelated. Who makes it and how to reach..."
                path="/about"
            />
            <PageShell header={{ title: "About", korean: "소개", subtitle: "The daily K-pop idol guessing game, made by a fan for fans." }} width="max-w-[1040px]">
                <div className="mt-[34px] grid grid-cols-[220px_minmax(0,1fr)] gap-8 items-start @max-[900px]:grid-cols-1">
                    <SideIndex items={SECTIONS} active={active} onPick={jumpTo} />
                    <div className="flex flex-col gap-4 min-w-0">
                        <IndexChips items={SECTIONS} active={active} onPick={jumpTo} />
                        <article className="pp-enter [--pp-delay:200ms] relative rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) [box-shadow:var(--card-depth)] pt-9 pr-11 pb-10 pl-16 @max-[580px]:pt-[22px] @max-[580px]:pr-[18px] @max-[580px]:pb-[26px] @max-[580px]:pl-[34px] flex flex-col gap-7">
                            <span aria-hidden className="absolute left-[38px] @max-[580px]:left-[18px] top-0 bottom-0 w-0.5 bg-[rgba(255,51,153,.45)]" />

                            <Section id="what" n={1} title="What is KpopIt" className="grid grid-cols-[minmax(0,1fr)_210px] gap-7 items-start @max-[580px]:grid-cols-1">
                                <div className="flex flex-col gap-3">
                                    <p className={P}>KpopIt is a <b>daily idol guessing game</b>. It's a Wordle-inspired project made for K-pop fans.</p>
                                    <p className={P}>Every day there's a new idol to find in Classic, a blurry photo in Blurry and a pixelated album cover in Pixelated. Everyone gets the same answer, and a new one arrives at midnight.</p>
                                    <div className="flex gap-2 flex-wrap mt-1">
                                        {(["classic", "blurry", "pixelated"] as const).map((m) => (
                                            <PressLink key={m} to={m === "classic" ? "/how-to-play" : `/how-to-play?mode=${m}`} size="sm" className="h-[38px] text-[13px]">
                                                {`How ${m[0].toUpperCase()}${m.slice(1)} works`}
                                                <ArrowRight className="w-3 h-3" strokeWidth={3} aria-hidden />
                                            </PressLink>
                                        ))}
                                    </div>
                                </div>
                                <figure className="ab-photo relative m-0 rotate-2 @max-[580px]:max-w-[220px] @max-[580px]:justify-self-center">
                                    <div className="aspect-square rounded-[18px] border-[2.5px] border-[#1A1418] overflow-hidden bg-[#DCD6D2] [box-shadow:4px_5px_0_var(--ctl-off)]">
                                        <img src={resolveCdnUrl("/images/idols/chaewon.webp") ?? ""} alt="A blurred idol photo, like in Blurry mode" className="block w-full h-full object-cover scale-[1.12] blur-[9px] grayscale-[.55]" />
                                    </div>
                                    <span aria-hidden className="absolute inset-0 grid place-items-center font-bold text-[92px] leading-none text-white [text-shadow:var(--puff-title)] pointer-events-none">?</span>
                                    <figcaption className="absolute left-1/2 -bottom-3.5 -translate-x-1/2 -rotate-3 whitespace-nowrap px-3 py-[5px] rounded-full border-2 border-[#1A1418] bg-[#FFFDFA] text-[#1A1418] [box-shadow:2px_3px_0_#1A1418] font-bold text-xs">Who is it?</figcaption>
                                </figure>
                            </Section>
                            <Rule />

                            <Section id="who" n={2} title="Who makes it">
                                <p className={P}>
                                    KpopIt was created by <a href={CHANNELS.github.href} target="_blank" rel="noopener noreferrer" className="font-bold text-(--group)">ThiagoRoss1</a>, a K-pop fan and Computer Science student.
                                </p>
                                <p className={P}>I originally started this project as a simple guessing game. But as development went on, I got more and more excited and started adding new features. I haven't been able to include everything I had planned yet, but I'm really proud of what I've accomplished so far.</p>
                            </Section>
                            <Rule />

                            <Section id="data" n={3} title="Game data">
                                <p className={P}>Want to browse the KpopIt database? Check out the idols, groups, companies and albums here.</p>
                                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                                    {DATA_LINKS.map((d) => (
                                        <PressLink key={d.label} to={d.to} className="h-auto justify-start gap-3.5 py-3 pr-4 pl-3 rounded-[18px]">
                                            <span aria-hidden className="ab-fade relative flex-none w-[60px] h-[60px] rounded-[15px] border-2 border-[#1A1418] overflow-hidden [box-shadow:2px_3px_0_#1A1418] -rotate-3" style={{ background: d.bg }}>
                                                {d.images.map((src, i) => <img key={i} src={resolveCdnUrl(src) ?? ""} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />)}
                                            </span>
                                            <span className="flex-1 flex flex-col gap-0.5 text-left">
                                                <span className="flex items-baseline gap-2"><span className="font-bold text-base">{d.label}</span><span lang="ko" className="font-korean font-bold text-[11px] text-(--muted)">{d.ko}</span></span>
                                                <span className="font-medium text-xs text-(--muted) whitespace-normal">{d.text}</span>
                                            </span>
                                            <ArrowRight className="w-4 h-4 flex-none" strokeWidth={3} aria-hidden />
                                        </PressLink>
                                    ))}
                                </div>
                            </Section>
                            <Rule />

                            <Section id="inspiration" n={4} title="Inspiration">
                                <p className={P}>I initially drew inspiration from several word-guessing games and wanted to create something based on that concept. Then I thought: why not make a Wordle-like game for K-pop fans?</p>
                                <p className={P}>During development, I discovered other K-pop guessing games and took inspiration from them as well. The games that inspired me the most were:</p>
                                <div className="flex gap-2 flex-wrap">
                                    {[["Onepiecedle", "https://onepiecedle.net/"], ["Kpople", "https://www.kpople.net/"]].map(([name, href]) => (
                                        <PressAnchor key={name} href={href} size="sm" className="h-[38px] text-[13px]">
                                            {name}
                                            <ArrowUpRight className="w-3 h-3" strokeWidth={3} aria-hidden />
                                        </PressAnchor>
                                    ))}
                                </div>
                            </Section>
                            <Rule />

                            <Section id="next" n={5} title="What's next">
                                <p className={P}>I plan to keep working on this project and adding new updates. Here's the list so far:</p>
                                <ul className="m-0 p-0 list-none flex flex-col gap-2">
                                    {TODO.map(([text, done]) => (
                                        <li key={text} className="flex items-center gap-3">
                                            <span aria-hidden className={cn("flex-none w-[22px] h-[22px] rounded-[7px] border-2 border-(--ink) grid place-items-center text-[#1A1418]", done ? "bg-[#FF8AC4]" : "bg-(--chip)")}>
                                                {done && <Check className="w-3 h-3" strokeWidth={4} />}
                                            </span>
                                            <span className={cn("font-normal text-[15.5px] leading-normal", done ? "text-(--muted) line-through decoration-(--side) decoration-2" : "text-(--face-ink)")}>
                                                {text}
                                                {done && <span className="sr-only"> (done)</span>}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex flex-col gap-2 mt-1.5">
                                    <span className="font-semibold text-[10px] tracking-[.14em] text-(--muted)">BUILT WITH</span>
                                    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
                                        {STACK.map((s) => (
                                            <div key={s.label} className="pt-3 px-3.5 pb-3.5 rounded-[16px] border-2 border-(--ink) bg-(--chip) [box-shadow:2px_3px_0_var(--ctl-off),var(--in)] flex flex-col gap-2.5">
                                                <span className="font-semibold text-[10px] tracking-[.14em] text-(--muted)">{s.label}</span>
                                                {s.items.map((item) => (
                                                    <span key={item} className="ab-tech flex items-center gap-2.5 font-bold text-[14.5px]">
                                                        <span className="ab-ticon flex-none grid place-items-center w-[34px] h-[34px] rounded-[11px] border-2 border-[#1A1418] bg-white text-[#1A1418] [box-shadow:1.5px_2px_0_#1A1418]">
                                                            <s.Icon className="w-[18px] h-[18px]" strokeWidth={2.4} aria-hidden />
                                                        </span>
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Section>
                            <Rule />

                            <Section id="contact" n={6} title="Contact">
                                <p className={P}>Feel free to DM me if you have any questions, feedback or suggestions!</p>
                                <div className="flex gap-2.5 flex-wrap">
                                    {(["discord", "x", "github"] as const).map((id) => (
                                        <PressAnchor key={id} href={CHANNELS[id].href} className="h-[46px] pl-2 pr-[18px]">
                                            <span className="flex-none grid place-items-center w-7 h-7 rounded-full border-2 border-[#1A1418] bg-white">
                                                <BrandIcon name={id} className="w-[15px] h-[15px]" />
                                            </span>
                                            {CHANNELS[id].handle}
                                        </PressAnchor>
                                    ))}
                                    <PressLink to="/contact" className="h-[46px] px-[18px]">
                                        Contact page
                                        <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} aria-hidden />
                                    </PressLink>
                                </div>
                            </Section>

                            <div className="flex flex-col items-center gap-2.5 text-center pt-[18px] border-t-2 border-(--rule)">
                                <p className="m-0 max-w-[520px] font-normal text-[15px] leading-[1.65] text-(--muted) [text-wrap:pretty]">
                                    I've learned a lot about web development and K-pop along the way, and I'm excited to see this project grow. I hope you enjoy playing it as much as I enjoyed making it!
                                </p>
                                <span className="flex items-center gap-2.5 -rotate-2">
                                    <span className="font-caveat font-bold text-[30px] leading-[1.1] text-(--group)">Thank you for playing KpopIt!</span>
                                    <span aria-hidden className="ab-heart text-[26px] leading-none">💜</span>
                                </span>
                            </div>
                        </article>
                    </div>
                </div>
            </PageShell>
        </>
    );
}
