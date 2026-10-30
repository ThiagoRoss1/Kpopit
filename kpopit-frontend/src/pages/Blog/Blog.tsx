import { useSearchParams } from "react-router";
import { ArrowRight, Pin } from "lucide-react";
import PageShell from "../../components/Puff/PageShell";
import HScrollRow from "../../components/Puff/HScrollRow";
import { Pill } from "../../components/Puff/PressButton";
import PageMeta from "../../components/Seo/PageMeta";
import IntentLink from "../../components/Links/IntentLink";
import { useHydrated } from "../../hooks/useHydrated";
import { BLOG_POSTS } from "../../content/blog";
import { POST_TAGS, type Post } from "../../utils/posts";
import { cn } from "../../lib/utils";
import { SectionRule, Sticker, TagChip } from "./blogShared";
import { formatPostDate, isNewPost, tagFromKey, tagKey } from "./blogData";
import "./blog.css";

const cardDelay = (i: number) => `${Math.min(260 + i * 45, 900)}ms`;
const meta = (post: Post) => `${formatPostDate(post.date)} · ${post.readMinutes} min read`;

function Cover({ post, className, ratio = "aspect-[16/10]" }: { post: Post; className?: string; ratio?: string }) {
    return (
        <div className={cn(ratio, "overflow-hidden bg-[#DCD6D2] border-2 border-[#1A1418]", className)}>
            <img src={post.image} alt="" loading="lazy" className="block w-full h-full object-cover" />
        </div>
    );
}

export default function Blog() {
    const hydrated = useHydrated();
    const [params, setParams] = useSearchParams();
    // The prerendered page shows every post; the ?tag= filter applies once the page is live.
    const tag = hydrated ? tagFromKey(params.get("tag")) : null;
    const today = hydrated ? new Date() : null;
    const isNew = (post: Post) => !!today && isNewPost(post.date, today);

    const list = BLOG_POSTS.filter((p) => !tag || p.tag === tag);
    const [latest, ...rest] = list;
    const pinned = rest.filter((p) => p.pinned);
    const older = rest.filter((p) => !p.pinned);
    const mids = older.slice(0, 2);
    const years: { year: string; posts: Post[] }[] = [];
    for (const post of older.slice(2)) {
        const year = post.date.slice(0, 4);
        if (years.at(-1)?.year !== year) years.push({ year, posts: [] });
        years.at(-1)!.posts.push(post);
    }

    const pick = (next: string | null) => {
        setParams((p) => {
            if (next) p.set("tag", next);
            else p.delete("tag");
            return p;
        }, { replace: true, preventScrollReset: true });
    };

    return (
        <>
            <PageMeta
                title="KpopIt Blog: updates, dev logs and K-pop game news"
                description="News, updates and dev logs from KpopIt, the daily K-pop guessing game: new modes, features and what's coming next."
                path="/blog"
            />
            <PageShell header={{ title: "Blog", korean: "블로그", subtitle: "News, updates and my thoughts from KpopIt..." }} width="max-w-[1040px]">
                <HScrollRow
                    role="group"
                    aria-label="Filter posts"
                    className="pp-enter [--pp-delay:160ms] flex-wrap justify-center gap-2 mt-[26px] mb-[34px] @max-[580px]:flex-nowrap @max-[580px]:justify-start @max-[580px]:-mx-4 @max-[580px]:px-4 @max-[580px]:pt-0.5 @max-[580px]:pb-2"
                >
                    {[null, ...POST_TAGS].map((t) => {
                        const n = t ? BLOG_POSTS.filter((p) => p.tag === t).length : BLOG_POSTS.length;
                        return (
                            <Pill key={t ?? "all"} active={tag === t} onClick={() => pick(t && tagKey(t))} className="flex-none pr-2 pl-4">
                                {t ?? "All posts"}
                                <span className="min-w-6 h-[22px] px-[7px] grid place-items-center rounded-full bg-white text-[#1A1418] border-[1.5px] border-[#1A1418] font-bold text-[11px] leading-none">{n}</span>
                            </Pill>
                        );
                    })}
                </HScrollRow>

                {!latest && <p className="text-center text-(--muted) font-medium">No posts here yet.</p>}

                <div className="flex flex-col gap-[30px]">
                    {latest && (
                        <IntentLink
                            key={latest.slug}
                            to={`/blog/${latest.slug}`}
                            data-feat
                            className="bl-card pp-focus pp-enter [--pp-delay:200ms] block no-underline text-(--face-ink) rounded-[23px] border-2 border-(--ink) bg-(--face) shadow-(--card-depth) p-[22px]"
                        >
                            <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-7 items-center @max-[760px]:grid-cols-1 @max-[760px]:gap-[18px]">
                                <div className="relative -rotate-[1.2deg]">
                                    <Cover post={latest} className="rounded-[16px] border-[2.5px] shadow-[4px_5px_0_#1A1418]" />
                                    <span className="absolute z-2 -top-3 -left-2.5 flex gap-1.5">
                                        <Sticker tone="pink" className="text-[11px] px-[11px] py-[5px] -rotate-6">LATEST</Sticker>
                                        {isNew(latest) && <Sticker tone="butter" className="text-[11px] px-[11px] py-[5px] rotate-4 translate-y-[3px]">NEW</Sticker>}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-3 items-start">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <TagChip tag={latest.tag} />
                                        <span className="font-semibold text-xs text-(--muted)">{meta(latest)}</span>
                                    </div>
                                    <h2 className="m-0 font-bold text-[30px] leading-[1.15] [text-wrap:balance]">{latest.title}</h2>
                                    <p className="m-0 font-normal text-[15.5px] leading-[1.6] text-(--muted) [text-wrap:pretty]">{latest.description}</p>
                                    <span className="bl-cta mt-1 h-11 px-5 inline-flex items-center gap-2 rounded-full border-2 border-(--ink) bg-[#FF8AC4] text-[#1A1418] font-bold text-sm shadow-[2px_3px_0_var(--ink),var(--in-pink)]">
                                        Read the post
                                        <ArrowRight className="bl-arrow w-3.5 h-3.5" strokeWidth={3} aria-hidden />
                                    </span>
                                </div>
                            </div>
                        </IntentLink>
                    )}

                    <div className="grid gap-11 mt-[22px]">
                        {pinned.length > 0 && (
                            <aside aria-label="Pinned posts" className="flex flex-col gap-4">
                                <div className="flex items-center gap-2.5">
                                    <Pin className="w-[15px] h-[15px] rotate-30" stroke="var(--group)" strokeWidth={2.6} aria-hidden />
                                    <span className="font-semibold text-[11px] tracking-[.14em] text-(--muted)">PINNED</span>
                                    <span aria-hidden className="flex-1 h-0.5 bg-[repeating-linear-gradient(90deg,var(--rule)_0_8px,transparent_8px_14px)]" />
                                </div>
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-[18px] @max-[580px]:grid-cols-1">
                                    {pinned.map((post, i) => (
                                        <IntentLink
                                            key={post.slug}
                                            to={`/blog/${post.slug}`}
                                            style={{ ["--bl-tilt" as string]: `${i % 2 ? 1 : -1}deg`, ["--pp-delay" as string]: cardDelay(i) }}
                                            className="bl-card pp-focus pp-enter relative no-underline text-(--face-ink) flex flex-col gap-3 pt-3 px-3 pb-4 rounded-[20px] border-2 border-(--ink) bg-(--face) shadow-[3px_4px_0_var(--ctl-off),var(--in)]"
                                        >
                                            <span aria-hidden className="absolute z-2 -top-[13px] right-4 w-[30px] h-[30px] rounded-full border-2 border-[#1A1418] bg-[#FF70B8] grid place-items-center shadow-[2px_3px_0_#1A1418,inset_0_2px_0_rgba(255,255,255,.55)] rotate-[18deg]">
                                                <Pin className="w-[15px] h-[15px]" fill="#FFFFFF" stroke="#1A1418" strokeWidth={2.2} />
                                            </span>
                                            <Cover post={post} ratio="aspect-[16/8]" className="rounded-[13px]" />
                                            <div className="flex flex-col gap-[7px] px-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <TagChip tag={post.tag} />
                                                    <span className="font-semibold text-[11.5px] text-(--muted)">{formatPostDate(post.date)}</span>
                                                </div>
                                                <h3 className="m-0 font-bold text-[17px] leading-[1.25] [text-wrap:pretty]">{post.title}</h3>
                                            </div>
                                        </IntentLink>
                                    ))}
                                </div>
                            </aside>
                        )}

                        <section aria-label="More posts" className="flex flex-col gap-[18px] min-w-0">
                            {older.length > 0 && <SectionRule label="MORE POSTS" count={older.length} />}
                            {mids.map((post, i) => (
                                <IntentLink
                                    key={post.slug}
                                    to={`/blog/${post.slug}`}
                                    style={{ ["--bl-tilt" as string]: `${i % 2 ? 0.5 : -0.5}deg`, ["--pp-delay" as string]: cardDelay(i) }}
                                    className="bl-card pp-focus pp-enter no-underline text-(--face-ink) rounded-[22px] border-2 border-(--ink) bg-(--face) shadow-[3px_4px_0_var(--ctl-off),var(--in)] p-4"
                                >
                                    <div className="grid grid-cols-2 gap-6 items-center @max-[760px]:grid-cols-1 @max-[760px]:gap-4">
                                        <div className="relative">
                                            <Cover post={post} className="rounded-[14px] shadow-[3px_4px_0_#1A1418]" />
                                            {isNew(post) && <Sticker tone="butter" className="absolute z-2 -top-2.5 -left-2 -rotate-6">NEW</Sticker>}
                                        </div>
                                        <div className="flex flex-col gap-2.5 items-start min-w-0">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <TagChip tag={post.tag} />
                                                <span className="font-semibold text-xs text-(--muted)">{meta(post)}</span>
                                            </div>
                                            <h3 className="m-0 font-bold text-[23px] leading-[1.2] [text-wrap:balance]">{post.title}</h3>
                                            <p className="m-0 font-normal text-[14.5px] leading-[1.6] text-(--muted) [text-wrap:pretty]">{post.description}</p>
                                            <span className="mt-0.5 flex items-center gap-1.5 font-bold text-[13.5px] text-(--group)">
                                                <span className="bl-read">Read the post</span>
                                                <ArrowRight className="bl-arrow w-[13px] h-[13px]" strokeWidth={3} aria-hidden />
                                            </span>
                                        </div>
                                    </div>
                                </IntentLink>
                            ))}
                            {years.map((group) => (
                                <div key={group.year} className="flex flex-col gap-3.5">
                                    <span className="self-start mt-1.5 mb-0.5 px-3 py-1 rounded-[10px] border-2 border-[#1A1418] bg-[#FF8AC4] text-[#1A1418] font-bold text-[15px] leading-none shadow-[2px_3px_0_#1A1418,inset_0_2px_0_rgba(255,255,255,.5)] -rotate-3">
                                        {group.year}
                                    </span>
                                    {group.posts.map((post, i) => (
                                        <IntentLink
                                            key={post.slug}
                                            to={`/blog/${post.slug}`}
                                            style={{ ["--bl-tilt" as string]: `${i % 2 ? 0.35 : -0.35}deg`, ["--pp-delay" as string]: cardDelay(i + 2) }}
                                            className="bl-card pp-focus pp-enter no-underline text-(--face-ink) grid grid-cols-[176px_minmax(0,1fr)_auto] gap-5 items-center p-3 rounded-[20px] border-2 border-(--ink) bg-(--face) shadow-[3px_4px_0_var(--ctl-off),var(--in)] @max-[580px]:grid-cols-[92px_minmax(0,1fr)] @max-[580px]:gap-3.5"
                                        >
                                            <div className="relative">
                                                <Cover post={post} className="rounded-[13px] @max-[580px]:aspect-square" />
                                                {isNew(post) && <Sticker tone="butter" className="absolute z-2 -top-2.5 -left-2 -rotate-6">NEW</Sticker>}
                                            </div>
                                            <div className="flex flex-col gap-[7px] min-w-0 py-0.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <TagChip tag={post.tag} />
                                                    <span className="font-semibold text-[11.5px] text-(--muted)">{meta(post)}</span>
                                                </div>
                                                <h3 className="m-0 font-bold text-[19px] @max-[580px]:text-base leading-[1.25] [text-wrap:pretty]">{post.title}</h3>
                                                <p className="m-0 line-clamp-2 font-normal text-[13.5px] leading-[1.55] text-(--muted) @max-[580px]:hidden">{post.description}</p>
                                            </div>
                                            <span aria-hidden className="grid place-items-center w-10 h-10 mr-1.5 rounded-full border-2 border-(--ink) bg-(--chip) text-(--chip-ink) shadow-[2px_3px_0_var(--ctl-off),var(--in)] @max-[580px]:hidden">
                                                <ArrowRight className="bl-arrow w-[15px] h-[15px]" strokeWidth={3} />
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
}
