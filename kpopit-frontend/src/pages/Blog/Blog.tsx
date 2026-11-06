import { useSearchParams } from "react-router";
import { ArrowRight, Pin } from "lucide-react";
import PageShell from "../../components/PageShell/PageShell";
import HScrollRow from "../../components/HScrollRow/HScrollRow";
import { Pill } from "../../components/buttons/PressButton";
import PageMeta from "../../components/Seo/PageMeta";
import IntentLink from "../../components/Links/IntentLink";
import { useHydrated } from "../../hooks/useHydrated";
import { BLOG_POSTS } from "../../content/blog";
import { POST_TAGS, type Post } from "../../utils/posts";
import { cn } from "../../lib/utils";
import { Cover, SectionRule, Sticker, TagChip } from "./blogShared";
import { CARD_ARROW, CARD_DEPTH, CARD_MOTION, FEATURED_DEPTH } from "./blogLooks";
import { formatPostDate, isNewPost, tagFromKey, tagKey } from "./blogData";

const cardDelay = (index: number) => `${Math.min(260 + index * 45, 900)}ms`;
const postMeta = (post: Post) => `${formatPostDate(post.date)} · ${post.readMinutes} min read`;

// Tailwind only sees whole class names, so every tilt the cards use is listed here.
const TILTS: Record<string, [string, string]> = {
    pinned: ["-rotate-1", "rotate-1"],
    middle: ["rotate-[-0.5deg]", "rotate-[0.5deg]"],
    row: ["rotate-[-0.35deg]", "rotate-[0.35deg]"],
};

const Blog = () => {
    const hydrated = useHydrated();
    const [params, setParams] = useSearchParams();

    // The prerendered page shows every post; the ?tag= filter applies once the page is live.
    const tag = hydrated ? tagFromKey(params.get("tag")) : null;
    const today = hydrated ? new Date() : null;
    const isNew = (post: Post) => !!today && isNewPost(post.date, today);

    const posts = BLOG_POSTS.filter((post) => !tag || post.tag === tag);
    const [latest, ...rest] = posts;
    const pinned = rest.filter((post) => post.pinned);
    const older = rest.filter((post) => !post.pinned);
    const middlePosts = older.slice(0, 2);

    const years: { year: string; posts: Post[] }[] = [];
    for (const post of older.slice(2)) {
        const year = post.date.slice(0, 4);
        if (years.at(-1)?.year !== year) years.push({ year, posts: [] });
        years.at(-1)!.posts.push(post);
    }

    const pickTag = (next: string | null) => {
        setParams((current) => {
            if (next) current.set("tag", next);
            else current.delete("tag");
            return current;
        }, { replace: true, preventScrollReset: true });
    };

    return (
        <>
            <PageMeta
                title="KpopIt Blog: updates, dev logs and K-pop game news"
                description="News, updates and dev logs from KpopIt, the daily K-pop guessing game: new modes, features and what's coming next."
                path="/blog"
            />

            <PageShell header={{ title: "Blog", korean: "블로그", subtitle: "News, updates and my thoughts from KpopIt..." }} width="max-w-260">
                <HScrollRow
                    role="group"
                    aria-label="Filter posts"
                    className={cn(
                        "pp-enter [--pp-delay:160ms] flex-wrap justify-center gap-2 mt-5.5 mb-7.5 pt-1 pb-2 px-1 @min-[581px]:overflow-visible",
                        "@max-[581px]:flex-nowrap @max-[581px]:justify-start @max-[581px]:-mx-4 @max-[581px]:px-4 @max-[581px]:pt-0.5",
                    )}
                >
                    {[null, ...POST_TAGS].map((option) => {
                        const count = option ? BLOG_POSTS.filter((post) => post.tag === option).length : BLOG_POSTS.length;

                        return (
                            <Pill key={option ?? "all"} active={tag === option} onClick={() => pickTag(option && tagKey(option))} className="flex-none pr-2 pl-4">
                                {option ?? "All posts"}
                                <span
                                    className={cn(
                                        "grid place-items-center min-w-6 h-5.5 px-1.75 rounded-full",
                                        "border-[1.5px] border-[#1A1418] bg-white font-bold text-[11px] leading-none text-[#1A1418]",
                                    )}
                                >
                                    {count}
                                </span>
                            </Pill>
                        );
                    })}
                </HScrollRow>

                {!latest && <p className="font-medium text-center text-(--muted)">No posts here yet.</p>}

                <div className="flex flex-col gap-7.5">
                    {latest && (
                        <IntentLink
                            key={latest.slug}
                            to={`/blog/${latest.slug}`}
                            className={cn("pp-enter [--pp-delay:200ms] block p-5.5 rounded-[23px]", CARD_MOTION, FEATURED_DEPTH)}
                        >
                            <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] @max-[761px]:grid-cols-1 items-center gap-7 @max-[761px]:gap-4.5">
                                <div className="relative rotate-[-1.2deg]">
                                    <Cover post={latest} className="rounded-2xl border-[2.5px] shadow-[4px_5px_0_#1A1418]" />

                                    <span className="absolute z-2 -top-3 -left-2.5 flex gap-1.5">
                                        <Sticker tone="pink" className="px-2.75 py-1.25 text-[11px] -rotate-6">LATEST</Sticker>
                                        {isNew(latest) && <Sticker tone="butter" className="px-2.75 py-1.25 text-[11px] rotate-4 translate-y-0.75">NEW</Sticker>}
                                    </span>
                                </div>

                                <div className="flex flex-col items-start gap-3">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <TagChip tag={latest.tag} />
                                        <span className="font-semibold text-xs text-(--muted)">{postMeta(latest)}</span>
                                    </div>

                                    <h2 className="m-0 font-bold text-[30px] leading-[1.15] text-balance">{latest.title}</h2>
                                    <p className="m-0 font-normal text-[15.5px] leading-[1.6] text-(--muted) text-pretty">{latest.description}</p>

                                    <span
                                        className={cn(
                                            "inline-flex items-center gap-2 h-11 mt-1 px-5 rounded-full",
                                            "border-2 border-(--ink) bg-[#FF8AC4] shadow-[2px_3px_0_var(--ink),var(--in-pink)]",
                                            "font-bold text-sm text-[#1A1418]",
                                            "transition-[translate] duration-600 ease-(--ease-settle) will-change-transform group-hover/card:-translate-y-0.5",
                                        )}
                                    >
                                        Read the post
                                        <ArrowRight className={cn("size-3.5", CARD_ARROW)} strokeWidth={3} aria-hidden />
                                    </span>
                                </div>
                            </div>
                        </IntentLink>
                    )}

                    <div className="grid gap-11 mt-5.5">
                        {pinned.length > 0 && (
                            <aside aria-label="Pinned posts" className="flex flex-col gap-4">
                                <div className="flex items-center gap-2.5">
                                    <Pin className="size-3.75 rotate-30" stroke="var(--group)" strokeWidth={2.6} aria-hidden />
                                    <span className="font-semibold text-[11px] tracking-[.14em] text-(--muted)">PINNED</span>
                                    <span aria-hidden className="flex-1 h-0.5 bg-[repeating-linear-gradient(90deg,var(--rule)_0_8px,transparent_8px_14px)]" />
                                </div>

                                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] @max-[581px]:grid-cols-1 gap-4.5">
                                    {pinned.map((post, i) => (
                                        <IntentLink
                                            key={post.slug}
                                            to={`/blog/${post.slug}`}
                                            style={{ ["--pp-delay" as string]: cardDelay(i) }}
                                            className={cn(
                                                "pp-enter relative flex flex-col gap-3 pt-3 px-3 pb-4 rounded-[20px]",
                                                CARD_MOTION,
                                                CARD_DEPTH,
                                                TILTS.pinned[i % 2],
                                            )}
                                        >
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    "absolute z-2 -top-3.25 right-4 grid place-items-center size-7.5 rounded-full rotate-18",
                                                    "border-2 border-[#1A1418] bg-[#FF70B8] shadow-[2px_3px_0_#1A1418,inset_0_2px_0_rgba(255,255,255,.55)]",
                                                )}
                                            >
                                                <Pin className="size-3.75" fill="#FFFFFF" stroke="#1A1418" strokeWidth={2.2} />
                                            </span>

                                            <Cover post={post} ratio="aspect-16/8" className="rounded-[13px]" />

                                            <div className="flex flex-col gap-1.75 min-w-0 px-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <TagChip tag={post.tag} />
                                                    <span className="font-semibold text-[11.5px] text-(--muted)">{formatPostDate(post.date)}</span>
                                                </div>

                                                <h3 className="m-0 font-bold text-[17px] leading-tight text-pretty">{post.title}</h3>
                                            </div>
                                        </IntentLink>
                                    ))}
                                </div>
                            </aside>
                        )}

                        <section aria-label="More posts" className="flex flex-col gap-4.5 min-w-0">
                            {older.length > 0 && <SectionRule label="MORE POSTS" count={older.length} />}

                            {middlePosts.map((post, i) => (
                                <IntentLink
                                    key={post.slug}
                                    to={`/blog/${post.slug}`}
                                    style={{ ["--pp-delay" as string]: cardDelay(i) }}
                                    className={cn("pp-enter p-4 rounded-[22px]", CARD_MOTION, CARD_DEPTH, TILTS.middle[i % 2])}
                                >
                                    <div className="grid grid-cols-2 @max-[761px]:grid-cols-1 items-center gap-6 @max-[761px]:gap-4">
                                        <div className="relative">
                                            <Cover post={post} className="rounded-[14px] shadow-[3px_4px_0_#1A1418]" />
                                            {isNew(post) && <Sticker tone="butter" className="absolute z-2 -top-2.5 -left-2 -rotate-6">NEW</Sticker>}
                                        </div>

                                        <div className="flex flex-col items-start gap-2.5 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <TagChip tag={post.tag} />
                                                <span className="font-semibold text-xs text-(--muted)">{postMeta(post)}</span>
                                            </div>

                                            <h3 className="m-0 font-bold text-[23px] leading-[1.2] text-balance">{post.title}</h3>
                                            <p className="m-0 font-normal text-[14.5px] leading-[1.6] text-(--muted) text-pretty">{post.description}</p>

                                            <span className="flex items-center gap-1.5 mt-0.5 font-bold text-[13.5px] text-(--group)">
                                                <span
                                                    className={cn(
                                                        "underline decoration-2 decoration-(--side) underline-offset-4",
                                                        "transition-[text-decoration-color] duration-300 group-hover/card:decoration-current",
                                                    )}
                                                >
                                                    Read the post
                                                </span>
                                                <ArrowRight className={cn("size-3.25", CARD_ARROW)} strokeWidth={3} aria-hidden />
                                            </span>
                                        </div>
                                    </div>
                                </IntentLink>
                            ))}

                            {years.map((group) => (
                                <div key={group.year} className="flex flex-col gap-3.5">
                                    <span
                                        className={cn(
                                            "self-start mt-1.5 mb-0.5 px-3 py-1 rounded-[10px] -rotate-3",
                                            "border-2 border-[#1A1418] bg-[#FF8AC4] shadow-[2px_3px_0_#1A1418,inset_0_2px_0_rgba(255,255,255,.5)]",
                                            "font-bold text-[15px] leading-none text-[#1A1418]",
                                        )}
                                    >
                                        {group.year}
                                    </span>

                                    {group.posts.map((post, i) => (
                                        <IntentLink
                                            key={post.slug}
                                            to={`/blog/${post.slug}`}
                                            style={{ ["--pp-delay" as string]: cardDelay(i + 2) }}
                                            className={cn(
                                                "pp-enter grid grid-cols-[176px_minmax(0,1fr)_auto] @max-[581px]:grid-cols-[92px_minmax(0,1fr)]",
                                                "items-center gap-5 @max-[581px]:gap-3.5 p-3 rounded-[20px]",
                                                CARD_MOTION,
                                                CARD_DEPTH,
                                                TILTS.row[i % 2],
                                            )}
                                        >
                                            <div className="relative">
                                                <Cover post={post} className="rounded-[13px] @max-[581px]:aspect-square" />
                                                {isNew(post) && <Sticker tone="butter" className="absolute z-2 -top-2.5 -left-2 -rotate-6">NEW</Sticker>}
                                            </div>

                                            <div className="flex flex-col gap-1.75 min-w-0 py-0.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <TagChip tag={post.tag} />
                                                    <span className="font-semibold text-[11.5px] text-(--muted)">{postMeta(post)}</span>
                                                </div>

                                                <h3 className="m-0 font-bold text-[19px] @max-[581px]:text-base leading-tight text-pretty">{post.title}</h3>
                                                <p className="@max-[581px]:hidden m-0 line-clamp-2 font-normal text-[13.5px] leading-[1.55] text-(--muted)">{post.description}</p>
                                            </div>

                                            <span
                                                aria-hidden
                                                className={cn(
                                                    "@max-[581px]:hidden grid place-items-center size-10 mr-1.5 rounded-full",
                                                    "border-2 border-(--ink) bg-(--chip) text-(--chip-ink) shadow-[2px_3px_0_var(--ctl-off),var(--in)]",
                                                )}
                                            >
                                                <ArrowRight className={cn("size-3.75", CARD_ARROW)} strokeWidth={3} />
                                            </span>
                                        </IntentLink>
                                    ))}
                                </div>
                            ))}
                        </section>
                    </div>
                </div>
            </PageShell>
        </>
    );
};

export default Blog;
