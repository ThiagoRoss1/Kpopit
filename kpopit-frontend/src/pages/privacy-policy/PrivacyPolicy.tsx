import { ArrowRight } from "lucide-react";
import PageShell from "../../components/Puff/PageShell";
import { PressAnchor, PressLink } from "../../components/Puff/PressButton";
import { IndexChips, SideIndex } from "../../components/Puff/SideIndex";
import PageMeta from "../../components/Seo/PageMeta";
import { useScrollSpy } from "../../hooks/useScrollSpy";
import { CHANNELS, CONTACT_EMAIL } from "../../data/contact";
import { PRIVACY, PRIVACY_INTRO, UPDATED } from "../../data/privacy";

const INDEX = PRIVACY.map((s) => ({ id: s.id, label: s.title }));

export default function PrivacyPolicy() {
    const { active, jumpTo } = useScrollSpy(INDEX.map((s) => s.id));

    return (
        <>
            <PageMeta
                title="KpopIt Privacy Policy: what's kept and how to delete it"
                description="What KpopIt keeps (your games, and an account only if you make one), who can see it, the services that run the game, and how to delete your account."
                path="/privacy-policy"
            />
            <PageShell header={{ title: "Privacy Policy", korean: "개인정보", koreanLength: "long", subtitle: "What I keep, why, and how to delete it." }}>
                <div className="mt-[34px] grid grid-cols-[230px_minmax(0,1fr)] gap-8 items-start @max-[900px]:grid-cols-1 @max-[900px]:gap-4">
                    <div className="flex flex-col gap-2.5 sticky top-[90px] @max-[900px]:static">
                        <SideIndex items={INDEX} active={active} onPick={jumpTo} />
                        <span className="px-1 font-medium text-xs text-(--muted) @max-[900px]:hidden">Last updated {UPDATED}</span>
                    </div>
                    <div className="flex flex-col gap-4 min-w-0">
                        <IndexChips items={INDEX} active={active} onPick={jumpTo} />
                        <article className="pp-enter [--pp-delay:200ms] min-w-0 max-w-[720px] rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[2px_3px_0_var(--ctl-off),var(--in)] pt-9 px-11 pb-10 @max-[580px]:pt-6 @max-[580px]:px-[18px] @max-[580px]:pb-7 flex flex-col gap-[34px]">
                            <p className="m-0 font-medium text-[15.5px] leading-[1.65] [text-wrap:pretty]">
                                {PRIVACY_INTRO} <span className="text-(--muted)">Last updated {UPDATED}.</span>
                            </p>
                            {PRIVACY.map((section, i) => (
                                <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-24 flex flex-col gap-3">
                                    <h2 id={`${section.id}-title`} className="m-0 flex items-baseline gap-2.5 font-bold text-[21px] leading-[1.25]">
                                        <span className="flex-none font-bold text-xs text-(--group)">{String(i + 1).padStart(2, "0")}</span>
                                        {section.title}
                                    </h2>
                                    <div className="flex gap-3 items-baseline flex-wrap py-[11px] px-[15px] rounded-[14px] bg-(--panel)">
                                        <span className="flex-none font-bold text-[10.5px] tracking-[.12em] text-(--group)">IN SHORT</span>
                                        <span className="flex-1 min-w-[180px] font-semibold text-[14.5px] leading-normal">{section.short}</span>
                                    </div>
                                    <p className="m-0 font-normal text-[15px] leading-[1.7] text-(--muted) [text-wrap:pretty]">{section.body}</p>
                                    {section.list && (
                                        <ul className="m-0 p-0 list-none flex flex-col gap-2">
                                            {section.list.map((item) => (
                                                <li key={item} className="flex gap-2.5 items-baseline font-normal text-[15px] leading-[1.55] text-(--muted)">
                                                    <span aria-hidden className="flex-none w-2 h-2 rounded-[3px] border-[1.5px] border-(--ink) bg-[#FF8AC4] -translate-y-px rotate-45" />
                                                    <span className="min-w-0">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            ))}
                            <div className="flex flex-wrap gap-2.5 pt-[22px] border-t-2 border-(--rule)">
                                <PressLink to="/contact" className="h-11 px-[18px]">
                                    Contact page
                                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} aria-hidden />
                                </PressLink>
                                <PressAnchor href={CHANNELS.email.href} target={undefined} rel={undefined} className="h-11 px-[18px]">{CONTACT_EMAIL}</PressAnchor>
                            </div>
                        </article>
                    </div>
                </div>
            </PageShell>
        </>
    );
}
