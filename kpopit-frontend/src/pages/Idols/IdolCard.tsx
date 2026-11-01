import IntentLink from "../../components/Links/IntentLink";
import { buildIdolSlug, formatCompanyName, formatGroupName } from "../../utils/formatters";
import { getNationalityFlag } from "../../utils/getFlags";
import type { IdolsPageData } from "../../interfaces/gameInterfaces";
import { groupLabel, nationalities, prefetchIdolProfile } from "./idolsData";
import "../../components/Catalogue/catalogue.css";
import FadeImg from "../../components/FadeImg";

/** A photo card: tilted, lifts on hover and presses into its pink depth; flags on the photo. */
export default function IdolCard({ idol, index, animate }: { idol: IdolsPageData; index: number; animate: boolean }) {
    const group = idol.group_name ? formatGroupName(idol.group_name, idol.is_former_group) : groupLabel(idol);
    const flags = nationalities(idol).map((n) => ({ n, src: getNationalityFlag(n) })).filter((f) => f.src);
    return (
        <div className={animate ? "cg-card" : "cg-card cg-card-still"} style={animate ? { animationDelay: `${Math.min(260 + index * 45, 900)}ms` } : undefined}>
            <div className="cg-tilt relative">
                <div aria-hidden className="absolute inset-0 rounded-(--cg-r) bg-(--side) border-2 border-(--ink)" style={{ transform: "translate(var(--cg-depth), calc(var(--cg-depth) + 1px))" }} />
                <IntentLink
                    to={`/idols/${idol.id}/${buildIdolSlug(idol.artist_name, idol.group_name)}`}
                    onIntent={() => prefetchIdolProfile(idol.id)}
                    aria-label={`${idol.artist_name}, ${group}`}
                    className="cg-face relative block no-underline cursor-pointer bg-(--face) text-(--face-ink) border-2 border-(--ink) rounded-(--cg-r) p-(--cg-card-pad) [box-shadow:var(--face-hl)]"
                >
                    <div className="relative aspect-[1/1.04]">
                        <div className="absolute inset-0 rounded-[calc(var(--cg-r)-7px)] border-[1.5px] border-(--ink) overflow-hidden bg-[#DCD6D2]">
                            <span aria-hidden className="absolute inset-0 grid place-items-center font-bold text-[40px] leading-none text-[rgba(26,20,24,.28)]">{idol.artist_name[0]}</span>
                            <FadeImg
                                src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${idol.image_path}?v=${idol.image_version}`}
                                alt={idol.artist_name}
                                loading="lazy"
                                decoding="async"
                                className="cg-img relative block w-full h-full object-cover object-[center_28%]"
                            />
                            {flags.length > 0 && (
                                <div className="absolute left-2 bottom-2 flex">
                                    {flags.map((f, j) => (
                                        <img key={f.n} src={f.src!} alt={f.n} title={f.n}
                                            className="block w-[34px] h-6 rounded-[5px] border-2 border-[#1A1418] object-cover bg-[#1A1418] [box-shadow:1.5px_2px_0_#1A1418]"
                                            style={{ marginLeft: j ? "-7px" : 0, transform: `rotate(${j ? 6 : -4}deg)` }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-[9px] -mb-[5px] pt-[3px] pr-2 pb-1.5 pl-[5px] font-bold text-[calc(var(--cg-nm-fs)+1px)] leading-[1.3] tracking-[-.005em]">
                        <span className="cg-name block text-white overflow-hidden text-ellipsis whitespace-nowrap pt-0.5 pr-1.5 pb-1.5 pl-0.5 -mt-0.5 -mr-1.5 -mb-1.5 -ml-0.5">{idol.artist_name}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 pt-1.5 px-[5px] min-w-0 whitespace-nowrap overflow-hidden">
                        <span className="shrink-0 font-semibold text-(length:--cg-meta-fs) leading-[1.4] text-(--muted)">{group}</span>
                        {idol.company_name && (
                            <span className="flex-1 min-w-0 overflow-hidden text-ellipsis font-semibold text-(length:--cg-meta-fs) leading-[1.4] text-(--muted) pr-0.5">{`· ${formatCompanyName(idol.company_name)}`}</span>
                        )}
                    </div>
                </IntentLink>
            </div>
        </div>
    );
}
