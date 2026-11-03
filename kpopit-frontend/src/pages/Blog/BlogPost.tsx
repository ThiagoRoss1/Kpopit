import { ArrowLeft, ArrowUpRight, Copy } from "lucide-react";
import PageShell from "../../components/PageShell/PageShell";
import { PressButton, PressLink } from "../../components/buttons/PressButton";
import { useToast } from "../../components/Toast/Toast";
import { KoreanTag } from "../../components/PageShell/PuffTitle";
import PageMeta, { SITE_URL } from "../../components/Seo/PageMeta";
import IntentLink from "../../components/Links/IntentLink";
import { BLOG_POSTS } from "../../content/blog";
import { postImageUrl } from "../../utils/posts";
import NotFound from "../NotFound/NotFound";
import { cn } from "../../lib/utils";
import { Cover, TagChip } from "./blogShared";
import { CARD_DEPTH, CARD_MOTION } from "./blogLooks";
import { formatPostDate, readNext } from "./blogData";
import "./blog.css";

const NEXT_TILTS = ["rotate-[-0.6deg]", "rotate-[0.5deg]", "rotate-[-0.4deg]"];

const BlogPost = ({ slug }: { slug: string }) => {
    const { show, node: toast } = useToast();
    const index = BLOG_POSTS.findIndex((candidate) => candidate.slug === slug);
    const post = BLOG_POSTS[index];
    if (!post) return <NotFound />;

    const path = `/blog/${post.slug}`;
    const older = BLOG_POSTS[index + 1];
    const newer = BLOG_POSTS[index - 1];
    const nextPosts = readNext(BLOG_POSTS, post);

    const neighbours = [
        older && { label: "← OLDER", post: older, isEnd: false },
        newer && { label: "NEWER →", post: newer, isEnd: true },
    ].filter((neighbour) => !!neighbour);

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
            <PageShell width="max-w-190" className="pt-3">
                <div className="flex flex-col gap-6.5">
                    <div className="pp-enter [--pp-anim:puffSide] flex flex-wrap items-center justify-between gap-2.5">
                        <PressLink to="/blog" className="pl-2.5">
                            <ArrowLeft className="size-4" strokeWidth={3} aria-hidden />
                            All posts
                        </PressLink>

                        <PressButton onClick={copyLink}>
                            <Copy className="size-3.75" strokeWidth={2.8} aria-hidden />
                            Copy link
                        </PressButton>
                    </div>

                    <header className="pp-enter [--pp-anim:puffSide] [--pp-delay:80ms] flex flex-col items-center gap-3.5 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2.5">
                            <TagChip tag={post.tag} />
                            <span className="font-semibold text-[13px] text-(--muted)">{`${formatPostDate(post.date)} · ${post.readMinutes} min read`}</span>
                        </div>

                        <h1
                            className={cn(
                                "puff-ink m-0 max-w-170 px-1.5 pb-2 -rotate-1",
                                "font-bold text-[44px] @max-[581px]:text-[32px] leading-[1.1] text-white text-shadow-(--puff-post) text-balance",
                            )}
                        >
                            {post.title}
                        </h1>

                        {post.ko && <KoreanTag>{post.ko}</KoreanTag>}
                    </header>

                    <figure
                        className={cn(
                            "pp-enter [--pp-delay:140ms] w-full max-w-160 m-0 mx-auto -rotate-1",
                            "transition-[rotate] duration-500 ease-(--ease-settle) will-change-transform hover:rotate-0",
                        )}
                    >
                        <div className="aspect-video overflow-hidden rounded-[18px] border-[2.5px] border-[#1A1418] bg-[#DCD6D2] shadow-[5px_5px_0_0_#FF8AC4,5px_5px_0_2px_#1A1418]">
                            <img draggable={false} src={post.image} alt={post.imageAlt} className="block size-full object-cover" />
                        </div>
                    </figure>

                    <article
                        className={cn(
                            "pp-enter [--pp-delay:200ms] relative flex flex-col gap-4.5",
                            "pt-9 px-11 pb-8.5 @max-[581px]:pt-6 @max-[581px]:px-4.5 @max-[581px]:pb-5.5",
                            "rounded-[23px] border-2 border-(--ink) bg-(--face) text-(--face-ink) shadow-[3px_4px_0_var(--ctl-off),var(--in)]",
                        )}
                    >
                        <div className="post-body" dangerouslySetInnerHTML={{ __html: post.html }} />

                        <div aria-hidden className="h-0.5 mt-3 bg-(--rule)" />

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-4 pt-1 pb-0.5">
                            <img draggable={false} src="/kpopit-icon-svg.svg" alt="" className="flex-none size-13 -rotate-6" />

                            <span className="flex flex-[1_1_200px] flex-col gap-1 min-w-0">
                                <span className="font-caveat font-bold text-[30px] leading-none text-(--group) rotate-[-1.5deg] origin-left">Thanks for reading!</span>
                                <span className="font-medium text-sm leading-[1.45] text-(--muted)">A new idol arrives at midnight.</span>
                            </span>

                            <span className="flex flex-wrap gap-2.5">
                                <PressLink to="/changelog" className="h-10.5 text-[13.5px]">
                                    Every update
                                    <ArrowUpRight className="size-3" strokeWidth={3} aria-hidden />
                                </PressLink>

                                <PressLink to="/" variant="pink" className="h-10.5 px-4.5 text-[13.5px]">Play today</PressLink>
                            </span>
                        </div>
                    </article>

                    {nextPosts.length > 0 && (
                        <section aria-label="Read next" className="flex flex-col gap-3.5">
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-[11px] tracking-[.14em] text-(--muted)">READ NEXT</span>
                                <span aria-hidden className="flex-1 h-0.5 bg-[repeating-linear-gradient(90deg,var(--rule)_0_8px,transparent_8px_14px)]" />
                            </div>

                            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
                                {nextPosts.map((nextPost, i) => (
                                    <IntentLink
                                        key={nextPost.slug}
                                        to={`/blog/${nextPost.slug}`}
                                        className={cn("flex flex-col gap-2.5 pt-2.5 px-2.5 pb-3.5 rounded-[20px]", CARD_MOTION, CARD_DEPTH, NEXT_TILTS[i])}
                                    >
                                        <Cover post={nextPost} ratio="aspect-video" className="rounded-[13px]" />

                                        <span className="flex items-center gap-2 px-1">
                                            <TagChip tag={nextPost.tag} />
                                            <span className="font-semibold text-[11.5px] text-(--muted)">{nextPost.readMinutes} min read</span>
                                        </span>

                                        <span className="px-1 font-bold text-base leading-[1.3] text-pretty">{nextPost.title}</span>
                                    </IntentLink>
                                ))}
                            </div>
                        </section>
                    )}

                    {neighbours.length > 0 && (
                        <nav aria-label="More posts" className="grid grid-cols-2 @max-[581px]:grid-cols-1 gap-3.5">
                            {neighbours.map((neighbour) => (
                                <IntentLink
                                    key={neighbour.label}
                                    to={`/blog/${neighbour.post.slug}`}
                                    className={cn(
                                        "pp-press pp-focus flex flex-col gap-1.5 px-4.5 py-3.5 rounded-[18px] no-underline",
                                        "border-2 border-(--ink) bg-(--chip) text-(--chip-ink)",
                                        neighbour.isEnd ? "items-end col-start-2 @max-[581px]:col-start-1 text-right" : "items-start text-left",
                                    )}
                                >
                                    <span className="font-semibold text-[10px] tracking-[.14em] text-(--muted)">{neighbour.label}</span>
                                    <span className="font-bold text-[15px] leading-[1.3]">{neighbour.post.title}</span>
                                </IntentLink>
                            ))}
                        </nav>
                    )}
                </div>
            </PageShell>

            {toast}
        </>
    );
};

export default BlogPost;
