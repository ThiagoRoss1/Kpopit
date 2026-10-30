import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ArrowUpRight, Mail } from "lucide-react";
import PageShell from "../../components/Puff/PageShell";
import { Pill, PressButton } from "../../components/Puff/PressButton";
import { useToast } from "../../components/Puff/Toast";
import BrandIcon from "../../components/Puff/BrandIcon";
import PageMeta from "../../components/Seo/PageMeta";
import { CHANNELS, CONTACT_EMAIL, contactMailto } from "../../data/contact";
import { cn } from "../../lib/utils";
import "../../components/Puff/puff.css";
import "./contact.css";

const TOPICS = [
    { label: "Bug", placeholder: "What happened, and on which page?" },
    { label: "Wrong idol data", placeholder: "What is wrong, and what is the correct info?" },
    { label: "Idea", placeholder: "Tell me your idea..." },
    { label: "Other", placeholder: "Write your message..." },
];
const IDOL_TOPIC = 1;

const LABEL = "font-semibold text-xs tracking-[.02em] text-(--face-ink)";
const FIELD = "ct-field box-border w-full rounded-[14px] border-2 border-(--ink) bg-(--chip) text-(--chip-ink) font-medium text-[15px] leading-normal";

export default function Contact() {
    const { show, node: toast } = useToast();
    const [topic, setTopic] = useState(0);
    const [message, setMessage] = useState("");
    const [idol, setIdol] = useState("");
    const [email, setEmail] = useState("");
    const empty = !message.trim();

    const send = (e: FormEvent) => {
        e.preventDefault();
        if (empty) return;
        window.location.href = contactMailto(TOPICS[topic].label, message, topic === IDOL_TOPIC ? idol : "", email);
        show("Opening your email app...");
    };

    const channels = [
        { ...CHANNELS.discord, title: "Discord", note: "Fastest reply · bugs and data", icon: <BrandIcon name="discord" className="w-5 h-5 [&_path]:fill-[#1A1418]" />, tile: "bg-[#FF8AC4]", highlight: true },
        { ...CHANNELS.x, title: "X / Twitter", note: "@TgoRoss1 · news and new modes", icon: <BrandIcon name="x" className="w-5 h-5" />, tile: "bg-white", highlight: false },
        { ...CHANNELS.email, title: "Email", note: CONTACT_EMAIL, icon: <Mail className="w-5 h-5 text-[#1A1418]" strokeWidth={2.6} />, tile: "bg-white", highlight: false },
    ];

    return (
        <>
            <PageMeta
                title="Contact KpopIt: report a bug, wrong idol data or an idea"
                description="Found a bug or wrong idol data in KpopIt, or have an idea? Reach me on Discord, X (@TgoRoss1) or by email at contact@kpopit.net."
                path="/contact"
            />
            <PageShell header={{ title: "Contact", korean: "연락처", subtitle: "Found a bug, wrong idol data or have an idea? Tell me..." }}>
                <div className="mt-[34px] grid grid-cols-[320px_minmax(0,1fr)] gap-7 items-start @max-[900px]:grid-cols-1 @max-[900px]:gap-[26px]">
                    <div className="pp-enter [--pp-delay:140ms] flex flex-col gap-3.5 min-w-0">
                        <span className="font-semibold text-xs tracking-[.14em] text-(--group) pl-1">FIND ME HERE</span>
                        <div className="flex flex-col gap-3.5 @max-[900px]:grid @max-[900px]:grid-cols-3 @max-[580px]:grid-cols-1">
                            {channels.map((c, i) => (
                                <a
                                    key={c.title}
                                    href={c.href}
                                    {...(c.href.startsWith("mailto:") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                                    className={cn(
                                        "ct-channel pp-focus box-border min-w-0 flex items-center gap-3.5 py-3.5 pr-4 pl-3.5 rounded-[20px] border-2 border-(--ink) bg-(--face) text-(--face-ink) no-underline",
                                        c.highlight ? "shadow-[4px_4px_0_0_#FF8AC4,4px_4px_0_2px_var(--ink)]" : "shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
                                    )}
                                    style={{ ["--ct-tilt" as string]: `${i % 2 ? 0.5 : -0.5}deg` }}
                                >
                                    <span className={cn("flex-none grid place-items-center w-11 h-11 rounded-[13px] border-2 border-[#1A1418] shadow-[2px_2.5px_0_#1A1418]", c.tile)}>{c.icon}</span>
                                    <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
                                        <span className="font-bold text-base leading-[1.15]">{c.title}</span>
                                        <span className="font-medium text-[12.5px] leading-[1.35] text-(--muted) [overflow-wrap:anywhere]">{c.note}</span>
                                    </span>
                                    <ArrowUpRight className="ct-arrow flex-none w-4 h-4" strokeWidth={3} aria-hidden />
                                </a>
                            ))}
                        </div>
                        <div className="flex flex-col gap-1.5 pt-1 px-1">
                            <span className="font-caveat font-bold text-2xl leading-[1.1] text-(--group)">I read every message!</span>
                            <span className="font-medium text-[13px] leading-normal text-(--muted) [text-wrap:pretty]">
                                Quick questions might already be in the <Link to="/faq" className="font-bold text-(--group)">FAQ</Link>. How your data is used: <Link to="/privacy-policy" className="font-bold text-(--group)">Privacy policy</Link>.
                            </span>
                        </div>
                    </div>

                    <form
                        onSubmit={send}
                        className="pp-enter [--pp-delay:220ms] min-w-0 rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-(--card-depth) pt-7 px-[30px] pb-[30px] @max-[580px]:pt-[22px] @max-[580px]:px-[18px] @max-[580px]:pb-6 flex flex-col gap-5"
                    >
                        <div className="flex flex-col gap-1">
                            <h2 className="m-0 font-bold text-[22px] leading-[1.15]">Send a message</h2>
                            <span className="font-medium text-[13px] leading-[1.45] text-(--muted)">Goes to my inbox by email. For a quick chat, Discord is faster.</span>
                        </div>
                        <div role="group" aria-labelledby="ct-topic" className="flex flex-col gap-2.5">
                            <span id="ct-topic" className={LABEL}>What's it about?</span>
                            <div className="flex gap-2 flex-wrap">
                                {TOPICS.map((t, i) => (
                                    <Pill key={t.label} active={topic === i} onClick={() => setTopic(i)} className="h-[38px] px-[15px] text-[13.5px] font-bold">{t.label}</Pill>
                                ))}
                            </div>
                        </div>
                        {topic === IDOL_TOPIC && (
                            <label className="ct-swap flex flex-col gap-2">
                                <span className={LABEL}>Which idol?</span>
                                <input value={idol} onChange={(e) => setIdol(e.target.value)} placeholder="Idol name and group" className={cn(FIELD, "h-12 px-4")} />
                            </label>
                        )}
                        <label className="flex flex-col gap-2">
                            <span className={LABEL}>Message</span>
                            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={TOPICS[topic].placeholder} rows={5} className={cn(FIELD, "min-h-[132px] py-3 px-4 resize-y")} />
                        </label>
                        <label className="flex flex-col gap-2">
                            <span className={LABEL}>Email <span className="font-medium text-(--muted)">(optional, if you want a reply)</span></span>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="bias@example.com" autoComplete="email" className={cn(FIELD, "h-12 px-4")} />
                        </label>
                        <div className="flex items-center gap-x-[18px] gap-y-3.5 flex-wrap">
                            <PressButton type="submit" variant="cta" size="lg" disabled={empty} className="@max-[580px]:w-full">Send message</PressButton>
                            <span className="font-medium text-[12.5px] leading-[1.45] text-(--muted)">Opens your email app</span>
                        </div>
                    </form>
                </div>
            </PageShell>
            {toast}
        </>
    );
}
