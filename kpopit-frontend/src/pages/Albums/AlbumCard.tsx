import IntentLink from "../../components/Links/IntentLink";
import { resolveCdnUrl } from "../../utils/imageUrl";
import type { AlbumsPageItem } from "../../interfaces/gameInterfaces";
import { albumPath, shortType } from "./albumsData";
import "../../components/Catalogue/catalogue.css";

/** A vinyl card: the cover with its disc peeking out, name, artist and year. */
export default function AlbumCard({ album, index }: { album: AlbumsPageItem; index: number }) {
    const foreign = album.language && album.language !== "Korean";
    return (
        <IntentLink
            to={albumPath(album, album.artist_name)}
            className="cg-card pp-focus block no-underline text-(--face-ink) [--cg-depth:5px] @max-[580px]:[--cg-depth:4px]"
            style={{ animationDelay: `${Math.min(260 + index * 45, 900)}ms`, ["--cg-tilt" as string]: `${index % 2 ? 0.5 : -0.5}deg` }}
        >
            <div className="cg-tilt relative">
                <div aria-hidden className="absolute inset-0 rounded-[23px] @max-[580px]:rounded-[20px] bg-[#FF8AC4] border-2 border-(--ink) translate-x-(--cg-depth) translate-y-(--cg-depth)" />
                <div className="cg-face relative rounded-[23px] @max-[580px]:rounded-[20px] border-2 border-(--ink) bg-(--face) p-[7px] pb-[13px] @max-[580px]:p-1.5 @max-[580px]:pb-[11px] flex flex-col gap-2">
                    <div className="relative aspect-[1/.86] overflow-hidden rounded-[16px] bg-(--panel)">
                        <div aria-hidden className="cg-disc absolute top-[7%] right-[2%] w-[82%] aspect-square rounded-full bg-[radial-gradient(circle,#2a1a24_0_14%,#0d0008_15%_100%)] border-2 border-[#1A1418]" />
                        <div className="absolute top-[7%] left-[3%] w-[86%] aspect-square overflow-hidden rounded-[12px] border-2 border-[#1A1418] shadow-[3px_3px_0_#1A1418] bg-[#DCD6D2]">
                            <img src={resolveCdnUrl(album.cover_path) ?? ""} alt="" loading="lazy" className="block w-full h-full object-cover" />
                        </div>
                        {foreign && (
                            <span className="absolute z-2 top-2 right-2 px-[7px] py-[5px] @max-[580px]:px-1.5 @max-[580px]:py-1 rounded-full border-[1.5px] border-[#1A1418] bg-[#FFD64F] text-[#1A1418] font-bold text-[10px] @max-[580px]:text-[9px] tracking-[.06em] shadow-[2px_3px_0_#1A1418,inset_0_1.5px_0_rgba(255,255,255,.6)] rotate-4">
                                {album.language === "Japanese" ? "JP" : "EN"}
                            </span>
                        )}
                    </div>
                    <div className="px-1.5 flex flex-col gap-0.5 min-w-0">
                        <span className="font-bold text-base @max-[580px]:text-sm leading-tight text-white [text-shadow:var(--puff-name)] truncate">{album.name}</span>
                        <span className="font-semibold text-[11.5px] @max-[580px]:text-[11px] text-(--muted) truncate">{`${album.artist_name} · ${shortType(album.type)} · ${album.release_year}`}</span>
                    </div>
                </div>
            </div>
        </IntentLink>
    );
}

