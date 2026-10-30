import { ArrowLeft, ArrowUpRight, Copy } from "lucide-react";
import PageShell from "../../components/Puff/PageShell";
import { PressButton, PressLink } from "../../components/Puff/PressButton";
import { useToast } from "../../components/Puff/Toast";
import PageMeta, { SITE_URL } from "../../components/Seo/PageMeta";
import IntentLink from "../../components/Links/IntentLink";
import { BLOG_POSTS } from "../../content/blog";
import { postImageUrl } from "../../utils/posts";
import NotFound from "../NotFound/NotFound";
import { TagChip } from "./blogShared";
import { formatPostDate, readNext } from "./blogData";
import "./blog.css";

const NEXT_TILT = ["-0.6deg", "0.5deg", "-0.4deg"];

export default function BlogPost({ slug }: { slug: string }) {
    const { show, node: toast } = useToast();
    const index = BLOG_POSTS.findIndex((p) => p.slug === slug);
    const post = BLOG_POSTS[index];
    if (!post) return <NotFound />;

    const path = `/blog/${post.slug}`;
    const older = BLOG_POSTS[index + 1];
    const newer = BLOG_POSTS[index - 1];
    const next = readNext(BLOG_POSTS, post);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}${path}`);
            show("Link copied!");
        } catch {
            show("Couldn't copy the link.");
        }
    };

    return (
        <>
            <PageMeta
                title={`${post.title} | KpopIt Blog`}
                description={post.description}
                path={path}
                image={postImageUrl(post)}
                jsonLd={{
                    "@context": "https://schema.org",
                    "@type": "BlogPosting",
                    headline: post.title,
                    description: post.description,
                    datePublished: post.date,
                    image: postImageUrl(post),
                    url: `${SITE_URL}${path}`,
                    author: { "@type": "Person", name: "Thiago Rossi", url: "https://x.com/TgoRoss1" },
                    publisher: { "@type": "Organization", name: "KpopIt", logo: `${SITE_URL}/kpopit-icon.png` },
                }}
            />
            <PageShell width="max-w-[760px]" className="pt-3">
                <div className="flex flex-col gap-[26px]">
                    <div className="pp-enter [--pp-anim:puffSide] flex justify-between items-center gap-2.5 flex-wrap">
                        <PressLink to="/blog" className="pl-2.5">
                            <ArrowLeft className="w-4 h-4" strokeWidth={3} aria-hidden />
                            All posts
                        </PressLink>
                        <PressButton onClick={copyLink}>
                            <Copy className="w-[15px] h-[15px]" strokeWidth={2.8} aria-hidden />
                            Copy link
                        </PressButton>
                    </div>

                    <header className="pp-enter [--pp-anim:puffSide] [--pp-delay:80ms] flex flex-col items-center gap-3.5 text-center">
                        <div className="flex items-center gap-2.5 flex-wrap justify-center">
                            <TagChip tag={post.tag} />
                            <span className="font-semibold text-[13px] text-(--muted)">{`${formatPostDate(post.date)} · ${post.readMinutes} min read`}</span>
                        </div>
                        <h1 className="m-0 max-w-[680px] font-bold text-[44px] @max-[580px]:text-[32px] leading-[1.1] text-white [text-shadow:var(--puff-post)] -rotate-1 px-1.5 pb-2 [text-wrap:balance]">
                            {post.title}
                        </h1>
                    </header>

                    <figure className="pp-enter [--pp-delay:140ms] m-0 mx-auto w-full max-w-[640px] -rotate-1 transition-transform duration-500 ease-(--ease-bounce) hover:rotate-0">
                        <div className="aspect-video rounded-[18px] border-[2.5px] border-[#1A1418] overflow-hidden bg-[#DCD6D2] shadow-[5px_5px_0_0_#FF8AC4,5px_5px_0_2px_#1A1418]">
                            <img src={post.image} alt={post.imageAlt} className="block w-full h-full object-cover" />
                        </div>
                    </figure>

                    <article className="pp-enter [--pp-delay:200ms] relative rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[3px_4px_0_var(--ctl-off),var(--in)] pt-9 px-11 pb-[34px] @max-[580px]:pt-6 @max-[580px]:px-[18px] @max-[580px]:pb-[22px] flex flex-col gap-[18px]">
                        <div className="post-body" dangerouslySetInnerHTML={{ __html: post.html }} />
                        <div aria-hidden className="h-0.5 mt-3 bg-(--rule)" />
                        <div className="flex items-center gap-x-5 gap-y-4 flex-wrap pt-1 pb-0.5">
                            <img src="/kpopit-icon-svg.svg" alt="" className="flex-none w-[52px] h-[52px] -rotate-6" />
                            <span className="flex-[1_1_200px] flex flex-col gap-1 min-w-0">
                                <span className="font-caveat font-bold text-[30px] leading-none text-(--group) -rotate-[1.5deg] origin-left">Thanks for reading!</span>
                                <span className="font-medium text-sm leading-[1.45] text-(--muted)">A new idol arrives at midnight.</span>
                            </span>
                            <span className="flex gap-2.5 flex-wrap">
                                <PressLink to="/changelog" className="h-[42px] text-[13.5px]">
                                    Every update
                                    <ArrowUpRight className="w-3 h-3" strokeWidth={3} aria-hidden />
                                </PressLink>
                                <PressLink to="/" variant="pink" className="h-[42px] px-[18px] text-[13.5px]">Play today</PressLink>
                            </span>
                        </div>
                    </article>

                    {next.length > 0 && (
                        <section aria-label="Read next" className="flex flex-col gap-3.5">
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-[11px] tracking-[.14em] text-(--muted)">READ NEXT</span>
                                <span aria-hidden className="flex-1 h-0.5 bg-[repeating-linear-gradient(90deg,var(--rule)_0_8px,transparent_8px_14px)]" />
                            </div>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
                                {next.map((p, i) => (
                                    <IntentLink
                                        key={p.slug}
                                        to={`/blog/${p.slug}`}
                                        style={{ ["--bl-tilt" as string]: NEXT_TILT[i] }}
                                        className="bl-card pp-focus no-underline text-(--face-ink) flex flex-col gap-2.5 pt-2.5 px-2.5 pb-3.5 rounded-[20px] border-2 border-(--ink) bg-(--face) shadow-[3px_4px_0_var(--ctl-off),var(--in)]"
                                    >
                                        <div className="aspect-video rounded-[13px] border-2 border-[#1A1418] overflow-hidden bg-[#DCD6D2]">
                                            <img src={p.image} alt="" loading="lazy" className="block w-full h-full object-cover" />
                                        </div>
                                        <span className="flex items-center gap-2 px-1">
                                            <TagChip tag={p.tag} />
                                            <span className="font-semibold text-[11.5px] text-(--muted)">{p.readMinutes} min read</span>
                                        </span>
                                        <span className="px-1 font-bold text-base leading-[1.3] [text-wrap:pretty]">{p.title}</span>
                                    </IntentLink>
                                ))}
                            </div>
                        </section>
                    )}

                    {(older || newer) && (
                        <nav aria-label="More posts" className="grid grid-cols-2 gap-3.5 @max-[580px]:grid-cols-1">
                            {[older && { k: "← OLDER", p: older, end: false }, newer && { k: "NEWER →", p: newer, end: true }].filter(Boolean).map((n) => n && (
                                <IntentLink
                                    key={n.k}
                                    to={`/blog/${n.p.slug}`}
                                    className={`pp-press pp-focus flex flex-col gap-1.5 px-[18px] py-3.5 rounded-[18px] border-2 border-(--ink) bg-(--chip) text-(--chip-ink) no-underline ${n.end ? "items-end text-right col-start-2 @max-[580px]:col-start-1" : "items-start text-left"}`}
                                >
                                    <span className="font-semibold text-[10px] tracking-[.14em] text-(--muted)">{n.k}</span>
                                    <span className="font-bold text-[15px] leading-[1.3]">{n.p.title}</span>
                                </IntentLink>
                            ))}
                        </nav>
                    )}
                </div>
            </PageShell>
            {toast}
        </>
    );
}
