import { useState } from "react";
import { ArrowRight, Mail, Plus, Search } from "lucide-react";
import PageShell from "../../components/Puff/PageShell";
import { Collapse } from "../../components/Puff/Accordion";
import { PressAnchor, PressLink } from "../../components/Puff/PressButton";
import BrandIcon from "../../components/Puff/BrandIcon";
import PageMeta from "../../components/Seo/PageMeta";
import { useFeatures } from "../../hooks/useFeatures";
import { CHANNELS, type ChannelId } from "../../data/contact";
import { faqJsonLd, visibleFaq, type FaqLink } from "../../data/faq";
import { cn } from "../../lib/utils";

function AnswerLink({ link, focusable }: { link: FaqLink | ChannelId; focusable: boolean }) {
    const tab = focusable ? 0 : -1;
    if (typeof link !== "string") {
        return (
            <PressLink to={link.to} tabIndex={tab} className="h-10 text-[13.5px]">
                {link.label}
                <ArrowRight className="w-3 h-3" strokeWidth={3} aria-hidden />
            </PressLink>
        );
    }
    const channel = CHANNELS[link];
    return (
        <PressAnchor href={channel.href} tabIndex={tab} {...(link === "email" ? { target: undefined, rel: undefined } : {})} className="h-10 pl-[7px] text-[13.5px]">
            <span className="flex-none grid place-items-center w-[26px] h-[26px] rounded-full border-2 border-[#1A1418] bg-white">
                {link === "email" ? <Mail className="w-[13px] h-[13px] text-[#1A1418]" strokeWidth={2.6} /> : <BrandIcon name={link} className="w-[13px] h-[13px]" />}
            </span>
            {channel.handle}
        </PressAnchor>
    );
}

export default function Faq() {
    const { features } = useFeatures();
    const groups = visibleFaq(features);
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState<string | null>("What is KpopIt?");
    const q = query.trim().toLowerCase();
    const shown = groups
        .map((g) => ({ ...g, items: g.items.filter((i) => !q || `${i.question} ${i.answer}`.toLowerCase().includes(q)) }))
        .filter((g) => g.items.length > 0);

    return (
        <>
            <PageMeta
                title="KpopIt FAQ: modes, accounts, data and reporting a bug"
                description="Quick answers about KpopIt, the free daily K-pop guessing game: how to play, the modes, when a new idol comes out, accounts, your data and reporting a bug."
                path="/faq"
                jsonLd={faqJsonLd(groups)}
            />
            <PageShell header={{ title: "FAQ", korean: "자주 묻는 질문", koreanLength: "long", subtitle: "Quick answers to the usual questions..." }} width="max-w-[720px]">
                <div className="mt-[34px] flex flex-col gap-9 @max-[580px]:gap-7">
                    <label className="pp-enter [--pp-delay:140ms] relative block">
                        <Search aria-hidden className="absolute left-[18px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-(--muted)" strokeWidth={2.6} />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setOpen(null); }}
                            placeholder="Search questions..."
                            aria-label="Search questions"
                            className="box-border w-full h-[52px] pr-[18px] pl-12 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) font-medium text-[15px] [box-shadow:2px_3px_0_var(--ctl-off),var(--in)] outline-none transition-[border-color] duration-300 focus:border-[#FF3399] placeholder:text-(--muted)"
                        />
                    </label>

                    {shown.map((group, gi) => (
                        <section key={group.title} className="pp-enter flex flex-col gap-3.5" style={{ ["--pp-delay" as string]: `${180 + gi * 70}ms` }}>
                            <h2 className="m-0 mb-0.5 flex items-baseline gap-2 font-semibold text-xs tracking-[.14em] text-(--group)">
                                {group.title}
                                <span lang="ko" className="font-korean font-bold text-[11px] tracking-normal text-(--muted)">{group.korean}</span>
                            </h2>
                            {group.items.map((item, ii) => {
                                // A search opens every match.
                                const isOpen = open === item.question || (!!q && open === null);
                                const id = `faq-${gi}-${ii}`;
                                return (
                                    <div
                                        key={item.question}
                                        className={cn(
                                            "rounded-[18px] border-2 border-(--ink) bg-(--face) text-(--face-ink) overflow-hidden transition-shadow duration-400",
                                            isOpen ? "[box-shadow:4px_4px_0_0_#FF8AC4,4px_4px_0_2px_var(--ink)]" : "[box-shadow:2px_3px_0_var(--ctl-off),var(--in)]",
                                        )}
                                    >
                                        <button
                                            type="button"
                                            aria-expanded={isOpen}
                                            aria-controls={id}
                                            onClick={() => setOpen(isOpen ? "" : item.question)}
                                            className="pp-focus box-border w-full flex items-center gap-3.5 py-[18px] pr-[18px] pl-[22px] @max-[580px]:py-4 @max-[580px]:pr-4 @max-[580px]:pl-[18px] border-0 bg-transparent text-inherit text-left cursor-pointer transition-colors duration-300 hover:bg-(--chip-hover)"
                                        >
                                            <span className="flex-1 min-w-0 font-bold text-base leading-[1.35] [text-wrap:pretty]">{item.question}</span>
                                            <span aria-hidden className={cn("flex-none grid place-items-center w-8 h-8 rounded-full border-2 border-[#1A1418] text-[#1A1418] transition-transform will-change-transform duration-500 ease-(--ease-pop)", isOpen ? "rotate-45 bg-[#FF8AC4]" : "bg-[#FFFDFA]")}>
                                                <Plus className="w-4 h-4" strokeWidth={3} />
                                            </span>
                                        </button>
                                        <Collapse open={isOpen} id={id} className="px-[22px] pb-[22px] @max-[580px]:px-[18px] @max-[580px]:pb-[18px] flex flex-col gap-3.5 items-start">
                                            <p className="m-0 font-normal text-[15px] leading-[1.65] text-(--muted) [text-wrap:pretty]">{item.answer}</p>
                                            {item.links && (
                                                <div className="flex flex-wrap gap-2.5 pb-[3px]">
                                                    {item.links.map((link) => <AnswerLink key={typeof link === "string" ? link : link.to} link={link} focusable={isOpen} />)}
                                                </div>
                                            )}
                                        </Collapse>
                                    </div>
                                );
                            })}
                        </section>
                    ))}

                    {shown.length === 0 && (
                        <div className="flex flex-col items-center gap-2 py-[30px] text-center">
                            <span className="font-bold text-[34px] leading-none text-white [text-shadow:var(--puff-empty)] puff-ink">No matches...</span>
                            <span className="font-medium text-sm text-(--muted)">Try another word, or ask on Discord.</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-3.5 flex-wrap py-5 px-[22px] rounded-[20px] border-2 border-dashed border-(--side) bg-(--panel)">
                        <div className="flex flex-col gap-0.5">
                            <span className="font-caveat font-bold text-[26px] leading-[1.1] text-(--group)">Still stuck?</span>
                            <span className="font-medium text-sm text-(--muted)">Send a message, I read everything.</span>
                        </div>
                        <PressAnchor href={CHANNELS.discord.href} className="h-11 pl-2 pr-[18px]">
                            <span className="flex-none grid place-items-center w-7 h-7 rounded-full border-2 border-[#1A1418] bg-white">
                                <BrandIcon name="discord" className="w-[15px] h-[15px]" />
                            </span>
                            Discord
                        </PressAnchor>
                    </div>
                </div>
            </PageShell>
        </>
    );
}
