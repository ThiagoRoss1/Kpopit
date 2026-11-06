import { buildIdolSlug, formatCompanyName, formatGroupName } from "../../utils/formatters";
import { getNationalityFlag } from "../../utils/getFlags";
import type { IdolsPageData } from "../../interfaces/gameInterfaces";
import { groupLabel, nationalities, prefetchIdolProfile } from "../../pages/Idols/idolsData";
import { cn } from "../../lib/utils";
import FadeImg from "../FadeImg";
import ListCard, { ListCardMeta, ListCardName } from "../ListCard/ListCard";

interface IdolsCardsProps {
    idol: IdolsPageData;
    index: number;
    animate: boolean;
    stagger?: boolean;
}

/** An idol's card in the list: the photo (zooms on hover) with the nationality flags on it, the
 *  puffy name, then group and company. */
const IdolsCards = ({ idol, index, animate, stagger }: IdolsCardsProps) => {
    const group = idol.group_name ? formatGroupName(idol.group_name, idol.is_former_group) : groupLabel(idol);
    const flags = nationalities(idol)
        .map((nationality) => ({ nationality, src: getNationalityFlag(nationality) }))
        .filter((flag) => flag.src);

    return (
        <ListCard
            to={`/idols/${idol.id}/${buildIdolSlug(idol.artist_name, idol.group_name)}`}
            label={`${idol.artist_name}, ${group}`}
            index={index}
            animate={animate}
            stagger={stagger}
            onIntent={() => prefetchIdolProfile(idol.id)}
        >
            {/* Photo */}
            <div className="relative aspect-[1/1.04]">
                <div className={cn(
                    "absolute inset-0 isolate overflow-hidden rounded-2xl @max-[580px]:rounded-[13px] border-[1.5px] border-(--ink) bg-(--panel)",
                    "transform-gpu backface-hidden mask-[linear-gradient(#000,#000)]",
                )}>
                    <span aria-hidden className="absolute inset-0 grid place-items-center font-bold text-[40px] leading-none text-[rgba(26,20,24,.28)]">
                        {idol.artist_name[0]}
                    </span>

                    <FadeImg
                        draggable={false}
                        src={`${import.meta.env.VITE_IMAGE_BUCKET_URL}${idol.image_path}?v=${idol.image_version}`}
                        alt={idol.artist_name}
                        loading="lazy"
                        decoding="async"
                        className={cn(
                            "relative block size-full object-cover object-[center_28%]",
                            "transition-[scale,opacity] duration-750 ease-(--ease-settle) group-hover:scale-108",
                        )}
                    />

                    {flags.length > 0 && (
                        <div className="absolute left-2 bottom-2 flex">
                            {flags.map((flag, flagIndex) => (
                                <img
                                    draggable={false}
                                    key={flag.nationality}
                                    src={flag.src!}
                                    alt={flag.nationality}
                                    title={flag.nationality}
                                    className={cn(
                                        "block w-8.5 h-6 rounded-[5px] border-2 border-[#1A1418] object-cover bg-[#1A1418] shadow-[1.5px_2px_0_#1A1418]",
                                        flagIndex === 0 ? "-rotate-4" : "-ml-1.75 rotate-6",
                                    )}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ListCardName className="text-[17px] @max-[580px]:text-[15px]">{idol.artist_name}</ListCardName>

            <ListCardMeta>
                <span className="shrink-0">{group}</span>

                {idol.company_name && (
                    <span className="flex-1 min-w-0 pr-0.5 truncate">{`· ${formatCompanyName(idol.company_name)}`}</span>
                )}
            </ListCardMeta>
        </ListCard>
    );
};

export default IdolsCards;
