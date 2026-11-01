import IntentLink from "../../components/Links/IntentLink";
import { resolveCdnUrl } from "../../utils/imageUrl";
import type { AlbumsPageItem } from "../../interfaces/gameInterfaces";
import { albumPath, shortType } from "./albumsData";
import "../../components/Catalogue/catalogue.css";

// The record peeking out of the sleeve: grooves, a sheen that turns on hover, the cover as label.
function Vinyl({ cover }: { cover: string }) {
    return (
        <div aria-hidden className="cg-disc absolute top-[4%] right-1.5 w-[76%] aspect-square">
            <svg viewBox="0 0 100 100" className="absolute inset-0 block w-full h-full overflow-visible">
                <circle cx="51.6" cy="52.4" r="48.6" fill="#1A1418" />
                <circle cx="50" cy="50" r="48.6" fill="#120610" />
                <circle cx="50" cy="50" r="34" fill="none" stroke="#050003" strokeWidth="1" />
                <circle cx="50" cy="50" r="23" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth=".6" />
                <circle cx="50" cy="50" r="27.5" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth=".6" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth=".6" />
                <circle cx="50" cy="50" r="42.5" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth=".6" />
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth=".6" />
            </svg>
            <div className="cg-spin absolute inset-[1.4%] rounded-full pointer-events-none bg-[conic-gradient(from_20deg,rgba(255,255,255,0)_0deg,rgba(255,255,255,.16)_28deg,rgba(255,255,255,0)_64deg,rgba(255,255,255,0)_190deg,rgba(255,255,255,.09)_218deg,rgba(255,255,255,0)_250deg)]" />
            {/* No fill and no clip-path layer: Safari could paint those before the card faded in. */}
            <div className="cg-spin absolute inset-[31%] rounded-full overflow-hidden">
                <img src={cover} alt="" loading="lazy" decoding="async" className="block w-full h-full object-cover" />
            </div>
            <svg viewBox="0 0 100 100" className="absolute inset-0 block w-full h-full overflow-visible pointer-events-none">
                <circle cx="50" cy="50" r="19" fill="none" stroke="#1A1418" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                <circle cx="50" cy="50" r="48.6" fill="none" stroke="#1A1418" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <circle cx="50" cy="50" r="2.4" fill="#FAF6F0" stroke="#1A1418" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
        </div>
    );
}

/** A vinyl card: sleeve and record, puffy name, artist · type · year, JP/EN release tag. */
export default function AlbumCard({ album, index }: { album: AlbumsPageItem; index: number }) {
    const cover = resolveCdnUrl(album.cover_path) ?? "";
    const foreign = !!album.language && album.language !== "Korean";
    return (
        <div className="cg-card" style={{ animationDelay: `${Math.min(260 + index * 45, 900)}ms` }}>
            <div className="cg-tilt relative">
                <div aria-hidden className="absolute inset-0 rounded-(--cg-r) bg-(--side) border-2 border-(--ink)" style={{ transform: "translate(var(--cg-depth), calc(var(--cg-depth) + 1px))" }} />
                <IntentLink
                    to={albumPath(album, album.artist_name)}
                    aria-label={`${album.name} by ${album.artist_name}, ${album.release_year}`}
                    className="cg-face relative block no-underline cursor-pointer bg-(--face) text-(--face-ink) border-2 border-(--ink) rounded-(--cg-r) p-(--cg-card-pad) [box-shadow:var(--face-hl)]"
                >
                    <div aria-hidden className="absolute inset-0 -z-1 rounded-[inherit] overflow-hidden pointer-events-none">
                        <div className="absolute -right-[46px] -bottom-[46px] w-[190px] h-[190px] bg-[radial-gradient(circle,var(--dots-c)_1.8px,transparent_2.2px)] bg-size-[9px_9px] [mask-image:radial-gradient(circle_at_100%_100%,#000_0%,rgba(0,0,0,.45)_34%,transparent_64%)]" />
                    </div>
                    <div className="relative aspect-[1/.86]">
                        <Vinyl cover={cover} />
                        <div className="absolute left-0 top-0 w-[86%] aspect-square rounded-[calc(var(--cg-r)-10px)] border-[1.5px] border-(--ink) overflow-hidden bg-[#DCD6D2] [box-shadow:2px_3px_0_#1A1418]">
                            <span aria-hidden className="absolute inset-0 grid place-items-center font-bold text-[34px] leading-none text-[rgba(26,20,24,.28)]">♪</span>
                            <img src={cover} alt={`${album.name} cover`} loading="lazy" decoding="async" className="cg-img relative block w-full h-full object-cover" />
                            <div aria-hidden className="cg-sweep absolute top-0 bottom-0 -left-[60%] w-[220%] pointer-events-none bg-[linear-gradient(118deg,rgba(255,255,255,0)_40%,rgba(255,255,255,.2)_47%,rgba(255,255,255,.06)_51%,rgba(255,255,255,0)_57%)]" />
                        </div>
                    </div>
                    <div className="mt-[9px] -mb-[5px] pt-[3px] pr-2 pb-1.5 pl-[5px] grid grid-cols-[minmax(0,1fr)] font-bold text-(length:--cg-nm-fs) leading-[1.3] tracking-[-.005em]">
                        <span className="cg-name block text-white overflow-hidden text-ellipsis whitespace-nowrap pt-0.5 pr-1.5 pb-1.5 pl-0.5 -mt-0.5 -mr-1.5 -mb-1.5 -ml-0.5">{album.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 pt-1.5 px-[5px] min-w-0 whitespace-nowrap overflow-hidden">
                        <span className="shrink min-w-0 overflow-hidden text-ellipsis font-semibold text-(length:--cg-meta-fs) leading-[1.4] text-(--muted)">{album.artist_name}</span>
                        <span className="shrink-0 font-semibold text-(length:--cg-meta-fs) leading-[1.4] text-(--muted) pr-0.5">{`· ${shortType(album.type)} · ${album.release_year}`}</span>
                    </div>
                    {foreign && (
                        <span className="cg-tag absolute z-3 top-(--cg-tag-in) right-(--cg-tag-in) pointer-events-none bg-(--tag) text-white border-2 border-[#1A1418] rounded-[8px] font-bold text-(length:--cg-tag-fs) leading-none p-(--cg-tag-pad) whitespace-nowrap [text-shadow:var(--tag-text)]">
                            {album.language === "Japanese" ? "JP release" : "EN release"}
                        </span>
                    )}
                </IntentLink>
            </div>
        </div>
    );
}
