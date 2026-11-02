import { useState } from "react";
import { ArrowRight, Mail, Plus, Search } from "lucide-react";
import PageShell from "../../components/PageShell/PageShell";
import { Collapse } from "../../components/Accordion/Accordion";
import { PressAnchor, PressLink } from "../../components/buttons/PressButton";
import BrandIcon from "../../components/BrandIcon/BrandIcon";
import PageMeta from "../../components/Seo/PageMeta";
import { useFeatures } from "../../hooks/useFeatures";
import { CHANNELS, type ChannelId } from "../../data/contact";
import { faqJsonLd, visibleFaq, type FaqLink } from "../../data/faq";
import { cn } from "../../lib/utils";

const SEARCH_INPUT = cn(
    "box-border w-full h-13 pr-4.5 pl-12 rounded-full outline-none",
    "border-2 border-(--ink) bg-(--chip) shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
    "font-medium text-[15px] text-(--chip-ink) placeholder:text-(--muted)",
    "transition-[border-color] duration-300 focus:border-neon-pink",
);

const QUESTION_BUTTON = cn(
    "pp-focus box-border flex items-center gap-3.5 w-full border-0 bg-transparent text-inherit text-left cursor-pointer",
    "py-4.5 pr-4.5 pl-5.5 @max-[581px]:py-4 @max-[581px]:pr-4 @max-[581px]:pl-4.5",
    "transition-colors duration-300 hover:bg-(--chip-hover)",
);

const AnswerLink = ({ link, focusable }: { link: FaqLink | ChannelId; focusable: boolean }) => {
    // Links inside a closed answer stay out of the tab order.
    const tabIndex = focusable ? 0 : -1;

    if (typeof link !== "string") {
        return (
            <PressLink to={link.to} tabIndex={tabIndex} className="h-10 text-[13.5px]">
                {link.label}
                <ArrowRight className="size-3" strokeWidth={3} aria-hidden />
            </PressLink>
        );
    }

    const channel = CHANNELS[link];

    return (
        <PressAnchor
            href={channel.href}
            tabIndex={tabIndex}
            {...(link === "email" ? { target: undefined, rel: undefined } : {})}
            className="h-10 pl-1.75 text-[13.5px]"
        >
            <span className="grid place-items-center flex-none size-6.5 rounded-full border-2 border-[#1A1418] bg-white">
                {link === "email"
                    ? <Mail className="size-3.25 text-[#1A1418]" strokeWidth={2.6} />
                    : <BrandIcon name={link} className="size-3.25" />}
            </span>
            {channel.handle}
        </PressAnchor>
    );
};

const Faq = () => {
    const { features } = useFeatures();
    const groups = visibleFaq(features);
    const [query, setQuery] = useState("");
    const [openQuestion, setOpenQuestion] = useState<string | null>("What is KpopIt?");

    const search = query.trim().toLowerCase();
    const shownGroups = groups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => !search || `${item.question} ${item.answer}`.toLowerCase().includes(search)),
        }))
        .filter((group) => group.items.length > 0);

    return (
        <>
            <PageMeta
                title="KpopIt FAQ: modes, accounts, data and reporting a bug"
                description="Quick answers about KpopIt, the free daily K-pop guessing game: how to play, the modes, when a new idol comes out, accounts, your data and reporting a bug."
                path="/faq"
                jsonLd={faqJsonLd(groups)}
            />

            <PageShell header={{ title: "FAQ", korean: "자주 묻는 질문", koreanLength: "long", subtitle: "Quick answers to the usual questions..." }} width="max-w-180">
                <div className="flex flex-col gap-9 @max-[581px]:gap-7 mt-8.5">
                    <label className="pp-enter [--pp-delay:140ms] relative block">
                        <Search aria-hidden className="absolute left-4.5 top-1/2 -translate-y-1/2 size-4.5 text-(--muted)" strokeWidth={2.6} />
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => { setQuery(event.target.value); setOpenQuestion(null); }}
                            placeholder="Search questions..."
                            aria-label="Search questions"
                            className={SEARCH_INPUT}
                        />
                    </label>

                    {shownGroups.map((group, groupIndex) => (
                        <section key={group.title} className="pp-enter flex flex-col gap-3.5" style={{ ["--pp-delay" as string]: `${180 + groupIndex * 70}ms` }}>
                            <h2 className="flex items-baseline gap-2 m-0 mb-0.5 font-semibold text-xs tracking-[.14em] text-(--group)">
                                {group.title}
                                <span lang="ko" className="font-korean font-bold text-[11px] tracking-normal text-(--muted)">{group.korean}</span>
                            </h2>

                            {group.items.map((item, itemIndex) => {
                                // A search opens every match.
                                const isOpen = openQuestion === item.question || (!!search && openQuestion === null);
                                const answerId = `faq-${groupIndex}-${itemIndex}`;

                                return (
                                    <div
                                        key={item.question}
                                        className={cn(
                                            "overflow-hidden rounded-[18px] border-2 border-(--ink) bg-(--face) text-(--face-ink) transition-shadow duration-400",
                                            isOpen ? "shadow-[4px_4px_0_0_#FF8AC4,4px_4px_0_2px_var(--ink)]" : "shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
                                        )}
                                    >
                                        <button
                                            type="button"
                                            aria-expanded={isOpen}
                                            aria-controls={answerId}
                                            onClick={() => setOpenQuestion(isOpen ? "" : item.question)}
                                            className={QUESTION_BUTTON}
                                        >
                                            <span className="flex-1 min-w-0 font-bold text-base leading-[1.35] text-pretty">{item.question}</span>

                                            <span
                                                aria-hidden
                                                className={cn(
                                                    "grid place-items-center flex-none size-8 rounded-full border-2 border-[#1A1418] text-[#1A1418]",
                                                    "transition-[rotate,background-color] duration-500 ease-(--ease-pop) will-change-transform",
                                                    isOpen ? "rotate-45 bg-[#FF8AC4]" : "bg-[#FFFDFA]",
                                                )}
                                            >
                                                <Plus className="size-4" strokeWidth={3} />
                                            </span>
                                        </button>

                                        <Collapse
                                            open={isOpen}
                                            id={answerId}
                                            className="flex flex-col items-start gap-3.5 px-5.5 pb-5.5 @max-[581px]:px-4.5 @max-[581px]:pb-4.5"
                                        >
                                            <p className="m-0 font-normal text-[15px] leading-[1.65] text-(--muted) text-pretty">{item.answer}</p>

                                            {item.links && (
                                                <div className="flex flex-wrap gap-2.5 pb-0.75">
                                                    {item.links.map((link) => (
                                                        <AnswerLink key={typeof link === "string" ? link : link.to} link={link} focusable={isOpen} />
                                                    ))}
                                                </div>
                                            )}
                                        </Collapse>
                                    </div>
                                );
                            })}
                        </section>
                    ))}

                    {shownGroups.length === 0 && (
                        <div className="flex flex-col items-center gap-2 py-7.5 text-center">
                            <span className="puff-ink font-bold text-[34px] leading-none text-white text-shadow-(--puff-empty)">No matches...</span>
                            <span className="font-medium text-sm text-(--muted)">Try another word, or ask on Discord.</span>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3.5 py-5 px-5.5 rounded-[20px] border-2 border-dashed border-(--side) bg-(--panel)">
                        <div className="flex flex-col gap-0.5">
                            <span className="font-caveat font-bold text-[26px] leading-[1.1] text-(--group)">Still stuck?</span>
                            <span className="font-medium text-sm text-(--muted)">Send a message, I read everything.</span>
                        </div>

                        <PressAnchor href={CHANNELS.discord.href} className="h-11 pl-2 pr-4.5">
                            <span className="grid place-items-center flex-none size-7 rounded-full border-2 border-[#1A1418] bg-white">
                                <BrandIcon name="discord" className="size-3.75" />
                            </span>
                            Discord
                        </PressAnchor>
                    </div>
                </div>
            </PageShell>
        </>
    );
};

export default Faq;
