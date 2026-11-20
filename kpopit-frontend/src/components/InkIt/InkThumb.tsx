import { cn } from "../../lib/utils";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { GAME_ROWS } from "../NavBar/navigation";

const INKIT_PHOTO = GAME_ROWS.find((row) => row.id === "inkit")?.img ?? null;

/** InkIt's stand-in logo: a photo under the paper texture (until the real asset exists). The tilt,
 *  border and shadow sit on the frame; the photo and paper are clipped by an inner layer with
 *  clip-path, which stays exact under the tilt (overflow with a radius left a light rim). */
const InkThumb = ({ className }: { className?: string }) => {
    return (
        <span className={cn("relative block flex-none border-2 border-(--ink) bg-(--ink)", className)}>
            <span className="absolute inset-0 overflow-hidden [clip-path:inset(0_round_11px)]">
                <img
                    src={resolveCdnUrl(INKIT_PHOTO) ?? undefined}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 size-full object-cover object-center contrast-[1.3] grayscale"
                />
                <span aria-hidden className="inkit-paper-thumb pointer-events-none absolute inset-0" />
            </span>
        </span>
    );
};

export default InkThumb;
