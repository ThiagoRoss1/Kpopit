import { ArrowRight } from "lucide-react";
import PageShell from "../../components/PageShell/PageShell";
import { PressAnchor, PressLink } from "../../components/buttons/PressButton";
import { IndexChips, SideIndex } from "../../components/PageShell/SideIndex";
import PageMeta from "../../components/Seo/PageMeta";
import { useScrollSpy } from "../../hooks/useScrollSpy";
import { CHANNELS, CONTACT_EMAIL } from "../../data/contact";
import { PRIVACY, PRIVACY_INTRO, UPDATED } from "../../data/privacy";
import { cn } from "../../lib/utils";

const INDEX = PRIVACY.map((section) => ({ id: section.id, label: section.title }));

const PrivacyPolicy = () => {
    const { active, jumpTo } = useScrollSpy(INDEX.map((entry) => entry.id));

    return (
        <>
            <PageMeta
                title="KpopIt Privacy Policy: what's kept and how to delete it"
                description="What KpopIt keeps (your games, and an account only if you make one), who can see it, the services that run the game, and how to delete your account."
                path="/privacy-policy"
            />

            <PageShell header={{ title: "Privacy Policy", korean: "개인정보", koreanLength: "long", subtitle: "What I keep, why, and how to delete it." }}>
                <div className="grid grid-cols-[230px_minmax(0,1fr)] @max-[901px]:grid-cols-1 items-start gap-8 @max-[901px]:gap-4 mt-8.5">
                    <div className="sticky @max-[901px]:static top-20 flex flex-col gap-2.5">
                        <SideIndex items={INDEX} active={active} onPick={jumpTo} />
                        <span className="@max-[901px]:hidden px-1 font-medium text-xs text-(--muted)">Last updated {UPDATED}</span>
                    </div>

                    <div className="flex flex-col gap-4 min-w-0">
                        <IndexChips items={INDEX} active={active} onPick={jumpTo} />

                        <article
                            className={cn(
                                "pp-enter [--pp-delay:200ms] flex flex-col gap-8.5 min-w-0 max-w-180",
                                "pt-9 px-11 pb-10 @max-[581px]:pt-6 @max-[581px]:px-4.5 @max-[581px]:pb-7",
                                "rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
                            )}
                        >
                            <p className="m-0 font-medium text-[15.5px] leading-[1.65] text-pretty">
                                {PRIVACY_INTRO} <span className="text-(--muted)">Last updated {UPDATED}.</span>
                            </p>

                            {PRIVACY.map((section, i) => (
                                <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="flex flex-col gap-3 scroll-mt-24">
                                    <h2 id={`${section.id}-title`} className="flex items-baseline gap-2.5 m-0 font-bold text-[21px] leading-tight">
                                        <span className="flex-none font-bold text-xs text-(--group)">{String(i + 1).padStart(2, "0")}</span>
                                        {section.title}
                                    </h2>

                                    <div className="flex flex-wrap items-baseline gap-3 py-2.75 px-3.75 rounded-[14px] bg-(--panel)">
                                        <span className="flex-none font-bold text-[10.5px] tracking-[.12em] text-(--group)">IN SHORT</span>
                                        <span className="flex-1 min-w-45 font-semibold text-[14.5px] leading-normal">{section.short}</span>
                                    </div>

                                    <p className="m-0 font-normal text-[15px] leading-[1.7] text-(--muted) text-pretty">{section.body}</p>

                                    {section.list && (
                                        <ul className="flex flex-col gap-2 m-0 p-0 list-none">
                                            {section.list.map((item) => (
                                                <li key={item} className="flex items-baseline gap-2.5 font-normal text-[15px] leading-[1.55] text-(--muted)">
                                                    <span aria-hidden className="flex-none size-2 rounded-[3px] border-[1.5px] border-(--ink) bg-[#FF8AC4] -translate-y-px rotate-45" />
                                                    <span className="min-w-0">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            ))}

                            <div className="flex flex-wrap gap-2.5 pt-5.5 border-t-2 border-(--rule)">
                                <PressLink to="/contact" className="h-11 px-4.5">
                                    Contact page
                                    <ArrowRight className="size-3.5" strokeWidth={3} aria-hidden />
                                </PressLink>

                                <PressAnchor href={CHANNELS.email.href} target={undefined} rel={undefined} className="h-11 px-4.5">{CONTACT_EMAIL}</PressAnchor>
                            </div>
                        </article>
                    </div>
                </div>
            </PageShell>
        </>
    );
};

export default PrivacyPolicy;
