import { cn } from "../../lib/utils";
import { resolveCdnUrl } from "../../utils/imageUrl";
import type { AlbumsPageItem } from "../../interfaces/gameInterfaces";
import FadeImg from "../../components/FadeImg";
import ListCard, { ListCardMeta, ListCardName } from "../../components/ListCard/ListCard";
import { albumPath, shortType } from "./albumsData";

// The record's groove rings (radius, and how bright the line is).
const GROOVES: [number, string][] = [
    [23, "rgba(255,255,255,.07)"],
    [27.5, "rgba(255,255,255,.05)"],
    [38, "rgba(255,255,255,.07)"],
    [42.5, "rgba(255,255,255,.05)"],
    [46, "rgba(255,255,255,.06)"],
];

const SLOW_EASE = "ease-[cubic-bezier(.25,1,.5,1)]";

/** The record peeking out of the sleeve: grooves and a sheen. On the card's hover the record slides
 *  out a little further and its sheen turns. */
const Vinyl = () => {
    return (
        <div
            aria-hidden
            className={cn(
                "absolute top-[4%] right-1.5 w-[76%] aspect-square",
                "transition-[translate] duration-940 transform-gpu",
                SLOW_EASE,
                "group-hover:translate-x-[3.5%] group-hover:duration-1300 group-active:translate-x-[2%] group-active:duration-200",
            )}
        >
            <svg viewBox="0 0 100 100" className="absolute inset-0 block size-full overflow-visible">
                <circle cx="51.6" cy="52.4" r="48.6" fill="#1A1418" />
                <circle cx="50" cy="50" r="48.6" fill="#120610" />
                <circle cx="50" cy="50" r="34" fill="none" stroke="#050003" strokeWidth="1" />

                {GROOVES.map(([radius, stroke]) => (
                    <circle key={radius} cx="50" cy="50" r={radius} fill="none" stroke={stroke} strokeWidth=".6" />
                ))}
            </svg>

            {/* The sheen turns on hover */}
            <div
                className={cn(
                    "absolute inset-[1.4%] rounded-full pointer-events-none",
                    "bg-[conic-gradient(from_20deg,rgba(255,255,255,0)_0deg,rgba(255,255,255,.16)_28deg,rgba(255,255,255,0)_64deg,rgba(255,255,255,0)_190deg,rgba(255,255,255,.09)_218deg,rgba(255,255,255,0)_250deg)]",
                    "transition-[rotate] duration-940 transform-gpu group-hover:rotate-200 group-hover:duration-1300",
                    SLOW_EASE,
                )}
            />

            {/* The label sits under the sleeve and never shows, so it carries no cover: a second copy of
                each cover, decoded at another size, doubled the image work and lagged the scroll. */}

            <svg viewBox="0 0 100 100" className="absolute inset-0 block size-full overflow-visible pointer-events-none">
                <circle cx="50" cy="50" r="19" fill="none" stroke="#1A1418" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                <circle cx="50" cy="50" r="48.6" fill="none" stroke="#1A1418" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <circle cx="50" cy="50" r="2.4" fill="#FAF6F0" stroke="#1A1418" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
        </div>
    );
};

interface AlbumCardProps {
    album: AlbumsPageItem;
    index: number;
    animate?: boolean;
}

/** An album's card in the list: sleeve and record, puffy name, artist · type · year, and a tag for
 *  Japanese and English releases. */
const AlbumCard = ({ album, index, animate = true }: AlbumCardProps) => {
    const cover = resolveCdnUrl(album.cover_path) ?? "";
    const isForeignRelease = !!album.language && album.language !== "Korean";
    const isEven = index % 2 === 0;

    return (
        <ListCard
            animate={animate}
            to={albumPath(album, album.artist_name)}
            label={`${album.name} by ${album.artist_name}, ${album.release_year}`}
            index={index}
        >
            {/* Pink dots in the card's corner */}
            <div aria-hidden className="absolute inset-0 -z-1 rounded-[inherit] overflow-hidden pointer-events-none">
                <div
                    className={cn(
                        "absolute -right-11.5 -bottom-11.5 size-47.5",
                        "bg-[radial-gradient(circle,var(--dots-c)_1.8px,transparent_2.2px)] bg-size-[9px_9px]",
                        "mask-[radial-gradient(circle_at_100%_100%,#000_0%,rgba(0,0,0,.45)_34%,transparent_64%)]",
                    )}
                />
            </div>

            {/* Sleeve and record */}
            <div className="relative aspect-[1/.86]">
                <Vinyl />

                <div className="absolute left-0 top-0 w-[86%] aspect-square overflow-hidden rounded-[13px] @max-[580px]:rounded-[10px] border-[1.5px] border-(--ink) bg-[#DCD6D2] shadow-[2px_3px_0_#1A1418]">
                    <span aria-hidden className="absolute inset-0 grid place-items-center font-bold text-[34px] leading-none text-[rgba(26,20,24,.28)]">
                        ♪
                    </span>

                    <FadeImg
                        src={cover}
                        alt={`${album.name} cover`}
                        loading="lazy"
                        decoding="async"
                        className="relative block size-full object-cover transition-[scale,opacity] duration-750 ease-(--ease-settle) group-hover:scale-108"
                    />

                    {/* A light sweep across the sleeve on hover */}
                    <div
                        aria-hidden
                        className={cn(
                            "absolute inset-y-0 left-[-60%] w-[220%] pointer-events-none",
                            "bg-[linear-gradient(118deg,rgba(255,255,255,0)_40%,rgba(255,255,255,.2)_47%,rgba(255,255,255,.06)_51%,rgba(255,255,255,0)_57%)]",
                            "transition-[translate] duration-880 transform-gpu group-hover:translate-x-[42%] group-hover:duration-1380",
                            SLOW_EASE,
                        )}
                    />
                </div>
            </div>

            <ListCardName className="grid grid-cols-[minmax(0,1fr)] text-base @max-[580px]:text-sm">{album.name}</ListCardName>

            <ListCardMeta>
                <span className="shrink min-w-0 truncate">{album.artist_name}</span>
                <span className="shrink-0 pr-0.5">{`· ${shortType(album.type)} · ${album.release_year}`}</span>
            </ListCardMeta>

            {isForeignRelease && (
                <span
                    className={cn(
                        "absolute z-3 top-3.25 right-3.25 @max-[580px]:top-2.5 @max-[580px]:right-2.5 pointer-events-none",
                        "px-1.75 py-1.25 @max-[580px]:px-1.5 @max-[580px]:py-1 rounded-lg border-2 border-[#1A1418]",
                        "bg-(--tag) text-white text-shadow-(--tag-text) font-bold text-[10px] @max-[580px]:text-[9px] leading-none whitespace-nowrap",
                        "shadow-[2px_3px_0_#1A1418,inset_0_1.5px_0_rgba(255,255,255,.6)]",
                        "group-active:shadow-[0_0_0_#1A1418,inset_0_1.5px_0_rgba(255,255,255,.6)]",
                        "transition-[translate,rotate,box-shadow] duration-520 ease-(--ease-pop) transform-gpu",
                        "group-hover:translate-x-px group-hover:-translate-y-1",
                        "group-active:translate-x-0.5 group-active:translate-y-0.75 group-active:duration-120",
                        isEven
                            ? "rotate-4 group-hover:rotate-9 group-active:rotate-4"
                            : "-rotate-4 group-hover:-rotate-9 group-active:-rotate-4",
                    )}
                >
                    {album.language === "Japanese" ? "JP release" : "EN release"}
                </span>
            )}
        </ListCard>
    );
};

export default AlbumCard;
