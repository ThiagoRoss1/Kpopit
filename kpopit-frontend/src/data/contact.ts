// Where to reach KpopIt. One source for About, Contact, FAQ and the privacy policy.
export const CONTACT_EMAIL = "contact@kpopit.net";

export const CHANNELS = {
    discord: { label: "Discord", handle: "Discord", href: "https://discord.com/users/269461885189881856" },
    x: { label: "X", handle: "@TgoRoss1", href: "https://x.com/TgoRoss1" },
    github: { label: "GitHub", handle: "ThiagoRoss1", href: "https://github.com/ThiagoRoss1" },
    email: { label: "Email", handle: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
} as const;

export type ChannelId = keyof typeof CHANNELS;

/** The mailto link the form opens: subject by topic, the idol (for data reports), message, reply-to. */
export function contactMailto(topic: string, message: string, idol: string, replyTo: string): string {
    const body = [idol.trim() && `Idol: ${idol.trim()}`, message.trim(), replyTo.trim() && `Reply to: ${replyTo.trim()}`].filter(Boolean).join("\n\n");
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[KpopIt] ${topic}`)}&body=${encodeURIComponent(body)}`;
}
