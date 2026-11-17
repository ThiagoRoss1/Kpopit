import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ArrowUpRight, Mail } from "lucide-react";
import PageShell from "../../components/PageShell/PageShell";
import { Pill, PressButton } from "../../components/buttons/PressButton";
import { useToast } from "../../components/Toast/Toast";
import BrandIcon from "../../components/BrandIcon/BrandIcon";
import PageMeta from "../../components/Seo/PageMeta";
import { CHANNELS, CONTACT_EMAIL, contactMailto } from "../../data/contact";
import { cn } from "../../lib/utils";

const TOPICS = [
    { label: "Bug", placeholder: "What happened, and on which page?" },
    { label: "Wrong idol data", placeholder: "What is wrong, and what is the correct info?" },
    { label: "Idea", placeholder: "Tell me your idea..." },
    { label: "Other", placeholder: "Write your message..." },
];
const IDOL_TOPIC = 1;

const LABEL = "font-semibold text-xs tracking-[.02em] text-(--face-ink)";

const FIELD = cn(
    "box-border w-full rounded-[14px] border-2 border-(--ink) bg-(--chip)",
    "font-medium text-[15px] leading-normal text-(--chip-ink) placeholder:text-(--muted) placeholder:opacity-85",
    "transition-[border-color,box-shadow] duration-300",
    "focus:outline-none focus:border-neon-pink focus:shadow-[0_0_0_3px_rgba(255,51,153,.18)]",
);

// A channel card: tilted, it straightens and lifts on hover, and presses into its pink depth.
const CHANNEL_CARD = cn(
    "pp-focus group/channel box-border flex items-center gap-3.5 min-w-0 py-3.5 pr-4 pl-3.5 rounded-[20px] no-underline",
    "border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[4px_4px_0_0_#FF8AC4,4px_4px_0_2px_var(--ink)]",
    "transition-[translate,rotate,box-shadow,background-color] duration-450 ease-(--ease-settle) will-change-transform",
    "hover:-translate-y-0.5 hover:rotate-0 hover:bg-(--chip-hover)",
    "active:translate-1 active:rotate-0 active:shadow-[0_0_0_0_#FF8AC4,0_0_0_2px_var(--ink)] active:duration-180",
);

const Contact = () => {
    const { show, node: toast } = useToast();
    const [topic, setTopic] = useState(0);
    const [message, setMessage] = useState("");
    const [idol, setIdol] = useState("");
    const [email, setEmail] = useState("");
    const isEmpty = !message.trim();

    const send = (event: FormEvent) => {
        event.preventDefault();
        if (isEmpty) return;


        window.location.href = contactMailto(TOPICS[topic].label, message, topic === IDOL_TOPIC ? idol : "", email);
        show("Opening your email app...");
    };

    const channels = [
        {
            ...CHANNELS.discord,
            title: "Discord",
            note: "Fastest reply · bugs and data",
            icon: <BrandIcon name="discord" className="size-5 [&_path]:fill-[#1A1418]" />,
            tile: "bg-[#FF8AC4]",
        },
        {
            ...CHANNELS.x,
            title: "X / Twitter",
            note: "@TgoRoss1 · news and new modes",
            icon: <BrandIcon name="x" className="size-5" />,
            tile: "bg-white",
        },
        {
            ...CHANNELS.email,
            title: "Email",
            note: CONTACT_EMAIL,
            icon: <Mail className="size-5 text-[#1A1418]" strokeWidth={2.6} />,
            tile: "bg-white",
        },
    ];

    return (
        <>
            <PageMeta
                title="Contact KpopIt: report a bug, wrong idol data or an idea"
                description="Found a bug or wrong idol data in KpopIt, or have an idea? Reach me on Discord, X (@TgoRoss1) or by email at contact@kpopit.net."
                path="/contact"
            />
            <PageShell header={{ title: "Contact", korean: "연락처", subtitle: "Found a bug, wrong idol data or have an idea? Tell me..." }}>
                <div className="grid grid-cols-[320px_minmax(0,1fr)] @max-[901px]:grid-cols-1 items-start gap-7 @max-[901px]:gap-6.5 mt-8.5">
                    <div className="pp-enter [--pp-delay:140ms] flex flex-col gap-3.5 min-w-0">
                        <span className="pl-1 font-semibold text-xs tracking-[.14em] text-(--group)">FIND ME HERE</span>

                        <div className="flex @max-[901px]:grid flex-col @max-[901px]:grid-cols-3 @max-[581px]:grid-cols-1 gap-3.5">
                            {channels.map((channel, i) => (
                                <a
                                    key={channel.title}
                                    href={channel.href}
                                    {...(channel.href.startsWith("mailto:") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                                    className={cn(CHANNEL_CARD, i % 2 ? "rotate-[0.5deg]" : "rotate-[-0.5deg]")}
                                >
                                    <span
                                        className={cn(
                                            "grid place-items-center flex-none size-11 rounded-[13px] border-2 border-[#1A1418] shadow-[2px_2.5px_0_#1A1418]",
                                            channel.tile,
                                        )}
                                    >
                                        {channel.icon}
                                    </span>

                                    <span className="flex flex-col flex-1 gap-0.75 min-w-0">
                                        <span className="font-bold text-base leading-[1.15]">{channel.title}</span>
                                        <span className="font-medium text-[12.5px] leading-[1.35] text-(--muted) wrap-anywhere">{channel.note}</span>
                                    </span>

                                    <ArrowUpRight
                                        className={cn(
                                            "flex-none size-4",
                                            "transition-[translate] duration-400 ease-(--ease-settle) will-change-transform",
                                            "group-hover/channel:translate-x-0.75 group-hover/channel:-translate-y-0.75",
                                        )}
                                        strokeWidth={3}
                                        aria-hidden
                                    />
                                </a>
                            ))}
                        </div>

                        <div className="flex flex-col gap-1.5 pt-1 px-1">
                            <span className="font-caveat font-bold text-2xl leading-[1.1] text-(--group)">I read every message!</span>

                            <span className="font-medium text-[13px] leading-normal text-(--muted) text-pretty">
                                Quick questions might already be in the <Link to="/faq" className="font-bold text-(--group)">FAQ</Link>.
                                {" "}How your data is used: <Link to="/privacy-policy" className="font-bold text-(--group)">Privacy policy</Link>.
                            </span>
                        </div>
                    </div>

                    <form
                        onSubmit={send}
                        className={cn(
                            "pp-enter [--pp-delay:220ms] flex flex-col gap-5 min-w-0",
                            "pt-7 px-7.5 pb-7.5 @max-[581px]:pt-5.5 @max-[581px]:px-4.5 @max-[581px]:pb-6",
                            "rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-(--card-depth)",
                        )}
                    >
                        <div className="flex flex-col gap-1">
                            <h2 className="m-0 font-bold text-[22px] leading-[1.15]">Send a message</h2>
                            <span className="font-medium text-[13px] leading-[1.45] text-(--muted)">Goes to my inbox by email. For a quick chat, Discord is faster.</span>
                        </div>

                        <div role="group" aria-labelledby="contact-topic" className="flex flex-col gap-2.5">
                            <span id="contact-topic" className={LABEL}>What's it about?</span>

                            <div className="flex flex-wrap gap-2">
                                {TOPICS.map((option, i) => (
                                    <Pill key={option.label} active={topic === i} onClick={() => setTopic(i)} className="h-9.5 px-3.75 font-bold text-[13.5px]">
                                        {option.label}
                                    </Pill>
                                ))}
                            </div>
                        </div>

                        {topic === IDOL_TOPIC && (
                            <label className="flex flex-col gap-2 animate-[puffDrop_.4s_var(--ease-settle)_backwards]">
                                <span className={LABEL}>Which idol?</span>
                                <input value={idol} onChange={(event) => setIdol(event.target.value)} placeholder="Idol name and group" className={cn(FIELD, "h-12 px-4")} />
                            </label>
                        )}

                        <label className="flex flex-col gap-2">
                            <span className={LABEL}>Message</span>
                            <textarea
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                placeholder={TOPICS[topic].placeholder}
                                rows={5}
                                className={cn(FIELD, "min-h-33 py-3 px-4 resize-y")}
                            />
                        </label>

                        <label className="flex flex-col gap-2">
                            <span className={LABEL}>
                                Email <span className="font-medium text-(--muted)">(optional, if you want a reply)</span>
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="bias@example.com"
                                autoComplete="email"
                                className={cn(FIELD, "h-12 px-4")}
                            />
                        </label>

                        <div className="flex flex-wrap items-center gap-x-4.5 gap-y-3.5">
                            <PressButton type="submit" variant="cta" size="lg" disabled={isEmpty} className="@max-[581px]:w-full">Send message</PressButton>
                            <span className="font-medium text-[12.5px] leading-[1.45] text-(--muted)">Opens your email app</span>
                        </div>
                    </form>
                </div>
            </PageShell>

            {toast}
        </>
    );
};

export default Contact;
